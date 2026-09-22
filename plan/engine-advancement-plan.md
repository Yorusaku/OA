# 企业级功能补强：流程执行引擎 + 操作链路完善 — 进度记录

> 本文档用于跨会话/跨模型交接。每完成一个阶段更新一次进度。
> 状态标记：[x] 已完成并验证 / [~] 进行中 / [ ] 未开始

## 0. 背景与目标

为简历/面试叙事补齐 4 个国内标杆 OA 有、本项目没有的功能模块：

1. **流程执行引擎升级**：BFF 审批通过后沿 workflow definition 的 edges 推进到下一节点（当前是单节点模拟，审批即完结），支持 condition 节点条件路由，会签/或签在每个节点独立生效
2. **流程图运行态高亮**：审批详情页 LogicFlow 只读渲染，已走/当前/待到达/驳回着色，definition 缺失时降级轨迹时间线
3. **批量审批**：BFF 真正的批量端点（当前前端是循环调单条接口），前端改为单次请求
4. **草稿箱**：发起审批草稿保存/列表/编辑回填/删除
5. **Dockerfile + 部署说明** + **文档同步**（README/AGENTS/CLAUDE + 面试底稿 docs/数字化协同审批平台 副本.md）

## 1. 关键代码事实（已核对）

### BFF
- 存储是**单 JSONB blob**：`store.ts` 的 `runtime_state` 表按 `state_key='oa-bff-state'` 存整个 `RuntimeState`，PG/内存双实现走同一接口。**新增 drafts 只需往 RuntimeState 加字段，PG 持久化自动生效，无需新表**
- `RuntimeState` 在 `apps/bff/src/domain.ts`；初始数据在 `apps/bff/src/state.ts`（种子流程 wf-001：start → node-hr-approval(or 签 2 人) → end）
- `approval-service.ts`：
  - `resolveWorkflowByType(state, type)` 按 type 找流程定义
  - `resolveApprovalNode(workflow, nodeId)` 按 nodeId 找节点，找不到 fallback 到第一个 approval 节点
  - `resolveNodeStrategy(state, record)` 输出 `{ nodeId, nodeName, mode, assignees }`
  - `submitApproval` 创建记录 + 任务；`processApproval` approve/reject 后**直接置终态**（推进缺口在这里）
  - `closeOtherPendingTasks`、`markTaskAs`、`appendTrail`、`pushApprovalNotice`、`pushMessage` 可复用
- `workflow-service.ts` 的 `evaluateCondition(operator, fieldValue, expectValue)` 是**私有函数**（支持 eq/ne/gt/gte/lt/lte/in/contains），需 export 复用
- `WorkflowNode.type`: `'start' | 'approval' | 'cc' | 'condition' | 'end'`；`conditions` 数组挂在节点上（field/operator/value）
- 路由模式（app.ts）：zod parse → `runWriteWithIdempotency(request, path, handler)` → `realtimeHub.publish` → `writeAuditLog` → `sendOk`。幂等 key 从 `Idempotency-Key` header 取
- BFF 测试：`apps/bff/test/app.test.ts`（主）+ `test/knowledge-chat.test.ts`，Vitest

### Web
- **批量审批 UI 已存在**：`ApprovalTodo.vue` + `useApprovalTodo.runBatchAction`（当前 Promise.allSettled 循环调单条 processApproval）。本任务改为调用新批量接口，UI 基本不动
- API 双模式模式：`api/approval.ts`（入口 + mock 实现，内部 `if (useRemoteApprovalApi()) return remoteXxx`）+ `api/approval.remote.ts`（真实请求）。drafts 照此模式建 `api/draft.ts` + `api/draft.remote.ts`
- LogicFlow 封装：`components/workflow/WorkflowCanvas.vue` 有 definition→graph 转换 + readonly prop（编辑器用）。运行态图**新建独立组件** `WorkflowRuntimeChart.vue`（silent 模式 LogicFlow），不侵入编辑器组件
- web `WorkflowNode` 有 `position?` 字段，但 **BFF 流程定义节点没有 position** → 运行态图需要自动分层布局兜底（BFS 深度分列 + 同层纵向排布）
- 发起审批页：`ApprovalLaunch.vue` + `composables/useApprovalLaunch.ts`（有 formCache、handleSubmit），草稿按钮加在这里
- `ApplicationList.vue` 的 draft tab 是「应用管理」域的草稿，与审批草稿**无关**，不要混
- web 类型：`api/types.ts` 与 BFF domain 镜像，需加 `ApprovalDraft`；`workflowInstance` 缺 `workflowId` 字段需补
- web 测试 36 个文件，Vitest + @vue/test-utils

## 2. 实施计划与进度

### Phase A：BFF 执行引擎 + 批量 + 草稿 [x]
- [x] A1 `workflow-service.ts`: export `evaluateCondition`
- [x] A2 `approval-service.ts` 新增：
  - `resolveNextNodeId(workflow, fromNodeId, formData)` — 沿 edges 遍历：condition 节点按 formData 求值选命中出边（无命中走无条件默认边），cc 节点写入 CCRecord 并继续，end/无出边返回 undefined
  - `resolveStartNodeId(workflow, formData)` — 从 start 节点走边到第一个 approval 节点（condition 路由），异常 fallback 现有行为
  - `advanceWorkflow(state, record, operator)` — 签批完成后推进：找下一 approval 节点 → buildPendingTask 创建任务 → 更新 currentNodeId/Mode/Assignees/currentNodeName → appendTrail + pushApprovalNotice + pushMessage；无下一节点置终态
  - `processApproval` approve 路径签完后调用推进；reject 路径保持现状（驳回即终止）
  - `submitApproval` 起始节点用 `resolveStartNodeId`
  - `batchProcessApprovals(state, payload)` — 逐条复用 processApproval，返回逐条结果
- [x] A3 `domain.ts`: `ApprovalDraft` 接口 + `RuntimeState.drafts`
- [x] A4 `state.ts`: drafts 初始 `[]`
- [x] A5 新建 `services/draft-service.ts`: list/create/remove
- [x] A6 `app.ts`: `POST /api/v1/approval/batch-action` + `GET/POST /api/v1/drafts` + `DELETE /api/v1/drafts/:id`（zod + 幂等 + 审计 + SSE）

### Phase B：BFF 测试 [x]
- [x] B1 新建 `apps/bff/test/workflow-advancement.test.ts`：条件命中/未命中默认路由、多节点推进、会签/或签逐节点生效、向后兼容（无 definition 或异常结构不回归）
- [x] B2 新建 `apps/bff/test/batch-drafts.test.ts`：批量逐条成功/失败、草稿 CRUD
- [x] B3 跑 `pnpm --filter panorama-oa-bff test` 全绿

### Phase C：Web 前端 [x]（全部完成）
- [x] C1 `api/types.ts`: 加 `ApprovalDraft`、workflowInstance 补 `workflowId`
- [x] C2 `api/draft.ts` + `api/draft.remote.ts`（双模式 CRUD）
- [x] C3 `api/approval.ts` + `approval.remote.ts`: `batchProcessApprovals`（mock 本地循环实现 + remote 调新端点）
- [x] C4 `useApprovalTodo.ts`: runBatchAction 改调批量接口
- [x] C5 新建 `composables/useWorkflowRuntime.ts`：definition + workflowInstance → 节点状态映射（completed/current/pending/rejected）+ 自动分层布局
- [x] C6 新建 `views/approval/components/WorkflowRuntimeChart.vue`：silent LogicFlow 只读渲染 + 着色 + definition 缺失降级时间线
- [x] C7 `ApprovalDetail.vue` 嵌入运行态流程图
- [x] C8 `useApprovalLaunch.ts`/`ApprovalLaunch.vue`：保存草稿 + 草稿列表入口
- [x] C9 web 测试（useApprovalBatch→runBatchAction 改造、useWorkflowRuntime 着色映射、draft api/composable）+ typecheck 全绿

### Phase D：E2E [x]
- [x] D0 web mock 引擎补齐多节点推进 + 条件路由（`apps/web/src/api/approval.ts` + `mock.ts`）：
  - [x] `mock.ts` 新增 `wf-003` 采购流程帧：start-003 → cond-003（`budget >= 10000`，gte）→ 总监 approval-004（or，user-003）或财务 approval-005（or，admin/manager）→ end-003；edges 带 `conditionId`
  - [x] 引擎函数：`resolveWorkflowIdByType`（leave/expense/purchase → wf-001/002/003）、`resolveWorkflowById`、`evaluateMockCondition`、`evaluateNodeConditions`（AND）、`resolveNextApprovalNodeId`、`resolveStartApprovalNodeId`、`advanceWorkflow`（仅对带 workflowId 的记录生效，向后兼容守卫）
  - [x] `submitApproval` 写 `workflowId` + 条件起始路由；`processApproval` approve 后 or 任一 / and 全员通过即调 `advanceWorkflow`，有下一节点保持 pending、无则置 approved
  - [x] **修复 bug**：`resolveNextApprovalNodeId` 原实现 `follow` 对 approval 节点直接返回自身 → 推进到原地永远 pending；已改为从 fromNodeId 出边遍历（与 BFF `resolveNodeRoute` 语义一致）
  - [x] `mock.ts` wf-001 approval-002（HR）补 assignees `[{user-001 admin},{user-002 manager}]`（原仅 `roleIds:['hr']` 无 assignees，多节点推进到 HR 后任务为空、无法继续处理）
  - [x] `api/types.ts` ApprovalRecord 顶层补 `workflowId?`；`useApprovalDetail.ts` 补 purchase→wf-003 映射 + trail 文案 `advance/route`
- [x] D0.5 新增 `apps/web/src/api/__tests__/engine-advancement.test.ts`（5 测试）：条件起始路由（<10000→财务 / >=10000→总监）、财务 or 通过即完结、wf-001 and 会签全通过推进到 HR 节点再通过完结、wf-002 单节点完结兼容 —— 全绿
- [x] D1 新增 `apps/web/e2e/engine-advancement.spec.ts`：条件路由、财务节点推进、批量通过与选中态复位；`pnpm --filter panorama-oa-web exec playwright test e2e/engine-advancement.spec.ts --workers=1 --timeout=25000 --reporter=list` 全绿

### Phase E：Docker + 部署 [x]
- [x] E1 根 `Dockerfile`（多阶段：Node 20 + pnpm build → BFF 运行）
- [x] E2 `docker-compose.yml` 加 bff 服务（depends_on postgres/qdrant）
- [x] E3 `docs/deployment.md`；镜像构建、`/health` 和 Compose healthcheck 已验证

### Phase F：文档同步 [x]
- [x] F1 README/AGENTS/CLAUDE 补 4 项能力与部署说明
- [x] F2 `docs/数字化协同审批平台 副本.md` 补执行引擎/条件路由/批量审批叙事与防御问答
- [x] F3 更新本进度文档为完成态

## 3. 设计决策记录

- **存储**：drafts 走 RuntimeState blob（JSONB），不建新表——与既有 store 架构一致
- **推进语义**：approve 全员签完 → 推进下一节点；reject → 立即终止（或签一人驳回即拒、会签一人驳回即拒，与现状一致）；无 definition/异常 → 保持旧行为
- **cc 节点**：推进途中经过 cc 节点时自动写 CCRecord + 消息，不产生任务，不阻塞推进
- **condition 路由**：节点上 `conditions` 全部命中才走该出边（AND 语义）；未命中走第一条无条件边；都没有 → 视为无出边（向后 fallback 完结或保持 pending 由现有逻辑兜底）
- **批量接口**：逐条执行互不影响，返回 `{ results: [{ id, success, error? }], succeeded, failed }`；幂等走同一路径 key
- **运行态图**：新组件而非复用编辑器 WorkflowCanvas（隔离交互逻辑）；position 缺失用分层自动布局

## 4. 验证命令

```bash
pnpm --filter panorama-oa-bff test        # BFF 单测
pnpm --filter panorama-oa-web test        # Web 单测
pnpm --filter panorama-oa-web typecheck   # 类型检查
docker compose up -d                      # 容器化验证（Phase E 后）
```

## 5. 交接注意事项

### 最新进度（2026-09-21 出门前暂停点）
- 已完成：Phase A/B/C/D 全绿；Phase D 的 mock 引擎补强（D0/D0.5）与 E2E（D1）均已完成并验证
- 最新验证：`panorama-oa-web test` = **170 测试全绿**（新增 5 个 engine-advancement）；`panorama-oa-web typecheck` EXIT=0；`pnpm --filter panorama-oa-web exec playwright test e2e/engine-advancement.spec.ts --workers=1 --timeout=25000 --reporter=list` = **2 通过**；`panorama-oa-bff test`（34 测试）+ build 此前已验证全绿
- **卡点/下一步（严格按序）**：① Phase E：根 `Dockerfile` + `docker-compose.yml` 加 bff 服务 + `docs/deployment.md`；② Phase F：README/AGENTS/CLAUDE/`docs/数字化协同审批平台 副本.md` 同步 + 勾选本进度文档完成态；③ 收尾 4 条命令全绿 + 清理临时文件
- **Docker 说明**：Phase E 的真实容器验证才需要 Docker；如本机环境不可用，可先验证 Dockerfile、Compose 配置结构，并将真实容器启动列为待人工验证项
- **清理项**：根目录 `typecheck.log` / `test-e.log` / `test-full.log` 为本次临时日志，最后收尾时删除（勿提交）

### 既有注意事项
- web 端 `ApprovalTodo.vue` 的批量按钮 disabled 判断已存在（selectedIds.size===0），改造后 UI 不变
- `docs/数字化协同审批平台 副本.md` 和 `docs/类figma项目文档.md`（已删除）有大量与本项目无关的未提交改动，不要动
- 三份文档（README/AGENTS/CLAUDE）此前已有未提交修改（Copilot 审查卡相关），Phase F 是在其基础上叠加
- 仓库 git status 干净度：提交前确认无临时文件残留
