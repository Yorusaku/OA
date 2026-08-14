# Claude 接手 Prompt：审批 Copilot 审查卡收尾
你现在接手的是 `E:\frontend\allstack\OA` 项目。项目是 Vue 3 + Fastify 的 OA 场景数字化协同审批平台原型，当前目标是把审批详情页的 AI 建议升级为“审批 Copilot 审查卡”，用于几天内完成可演示、可写进简历、可在面试中讲清楚的 AI 业务增强。
## 一、当前已完成
1. 已在 `packages/contracts/src/index.ts` 扩展 `AiApprovalSuggestionResponse`：
   - `reviewSummary`
   - `riskPoints`
   - `evidenceItems`
2. 已在 `apps/bff/src/services/approval-ai-service.ts` 增加：
   - `buildReviewSummary`
   - `buildRiskPoints`
   - `buildEvidenceItems`
   - `enrichWithCopilotReview`
   - 普通 AI 接口和 SSE done 响应均携带 Copilot 字段。
3. 已实现确定性风险规则：
   - 金额 `>= 50000`：高金额审批；
   - 存在 `escalatedAt`：SLA 升级风险；
   - `remindCount >= 3`：多次催办；
   - 缺少 `description`：描述信息不足；
   - 缺少 `latestAttachments`：附件材料待核对。
4. 已保持 AI 边界：
   - Policy `block` 命中时直接返回 `manual_review`，不调用 LLM；
   - 模型异常、解析失败、信息不足时降级 `manual_review`；
   - AI 永远不能直接触发 `approve`、`reject` 等真实审批动作。
5. 已在 `apps/web/src/views/approval/components/AiSuggestion.vue` 展示：
   - 审批 Copilot；
   - 审查摘要；
   - 风险点；
   - 依据来源；
   - 原有建议、置信度、风险等级、推理文本、溯源、不确定性和采纳/忽略反馈。
6. 已在 `apps/web/src/api/ai.ts` 同步 mock 数据，mock 模式可以演示 Copilot 卡片。
   - mock 响应已补充 `auditEventId`，采纳/忽略反馈可真实切换状态。
7. 已补充测试：
   - `apps/bff/test/app.test.ts`
   - `apps/web/src/views/approval/__tests__/AiSuggestion.test.ts`
   - `apps/web/src/composables/__tests__/useAiSuggestion.test.ts`
   - 已覆盖存在审计事件时的采纳反馈状态。
8. 已更新 `docs/数字化协同审批平台 副本.md`：
   - 保留表单类型、角色与权限设计；
   - 保留并扩展 Q1-Q19 高频面试 QA；
   - 增加审批 Copilot 讲法和简历 bullet；
   - 标题使用编号层级；
   - 全文空行数必须保持为 0；
   - `1.3 项目职责` 视为冻结区，不要改写四字总结、描述长度或排版。
9. 已完成 Playwright mock 页面验收：
   - 审批详情页可生成审查摘要、风险点和依据来源；
   - 推理溯源和不确定性仍可用；
   - 采纳建议可切换为“已采纳 AI 建议”；
   - 已修复推理来源标签和不确定性标签的图标重叠。
## 二、已通过的验证
以下命令已在当前工作区执行并通过：
```bash
pnpm --filter @oa/contracts build
pnpm --filter panorama-oa-bff test
pnpm --filter panorama-oa-web test
pnpm --filter panorama-oa-web typecheck
pnpm --filter panorama-oa-web build
```
当前结果：
- BFF：15 个测试通过；
- Web：24 个测试文件、141 个测试通过；
- contracts build、web typecheck、web build 均通过；
- 面试稿空行数量为 0。
- 浏览器验收截图：`output/playwright/approval-copilot-final-verified.png`。
## 三、你接下来要做的事情
1. 先执行 `git status --short` 和 `git diff --stat`，阅读当前改动，不要回滚已有修改。
2. 重点检查以下文件之间的字段是否一致：
   - `packages/contracts/src/index.ts`
   - `apps/bff/src/services/approval-ai-service.ts`
   - `apps/web/src/api/ai.ts`
   - `apps/web/src/api/ai.remote.ts`
   - `apps/web/src/composables/useAiSuggestion.ts`
   - `apps/web/src/views/approval/components/AiSuggestion.vue`
3. 如需修复，只做与审批 Copilot 收尾相关的最小改动：
   - 不新增数据库表；
   - 不重做通用 RAG；
   - 不新增通用聊天机器人；
   - 不让 AI 写回表单或自动审批；
   - 不破坏 `approve / reject / transfer / addSign / remind / withdraw / cancel`；
   - 不改 `1.3 项目职责`。
4. 做一次 mock 模式手动验收：
   - 启动前端；
   - 进入审批详情页；
   - 点击“生成 Copilot 审查”；
   - 确认能看到“审查摘要 / 风险点 / 依据来源”；
   - 确认原有“推理溯源 / 不确定性 / 采纳 / 忽略”仍可用。
5. 重点验证至少两个风险场景：
   - 高金额审批能出现“高金额审批”；
   - 缺少描述或附件时能出现对应风险点；
   - Policy `block` 命中时不会调用 LLM，并返回 `manual_review`。
6. 最后再次执行：
```powershell
(Get-Content -Encoding UTF8 'docs/数字化协同审批平台 副本.md' | Where-Object { $_ -match '^\s*$' }).Count
```
结果必须为 `0`。
## 四、项目叙事边界
面试时不要把项目说成“全量 OA 系统”或“AI 自动审批系统”。推荐说法：
> 这是一个面向 OA 场景的数字化协同审批平台，重点建设动态表单、流程编排、节点权限、审批闭环和流程治理，并在审批详情页增加 AI Copilot 审查卡，为审批人提供摘要、风险点和依据来源，但最终决策仍由人工完成。
推荐简历表述：
```text
将审批详情页 AI 建议升级为审批 Copilot 审查卡，聚合审批摘要、风险点、制度/表单/历史依据与人工反馈闭环，提升审批人复核效率与 AI 输出可解释性。
基于审批上下文和 Policy-as-Code 生成可解释风险点，模型异常或策略阻断时降级 manual_review，保证 AI 不越权、不影响审批主链路。
```
## 五、工作区注意事项
- `AGENTS.md`、`CLAUDE.md`、`README.md` 当前已有改动，不要回滚或顺手重写。
- `plan/` 目录中可能存在之前手动验证留下的截图和脚本，正式规划产物是 `plan/approval-copilot-review-card-plan.md`，本交接文件是 `plan/approval-copilot-claude-handoff-prompt.md`。
- 如果发现问题，先修复并重新跑受影响的验证命令，再报告结果。
