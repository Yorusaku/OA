# CLAUDE.md - 全景智能 OA 协同办公平台

> 项目级指令，每次会话自动加载。全局约束已在用户级 CLAUDE.md 中定义，此处仅补充项目专属内容。

## 项目定位

全景智能 OA 是一套前端主导的引擎化协同审批平台原型，核心目标是把审批系统从"页面硬编码"演进为"协议驱动 + 引擎渲染 + 状态可追踪"的交付模式。

- 当前阶段：审批主链路完整，AI 审批建议与知识库 P0/P1 已落地，AI 治理 4 阶段（Policy-as-Code / 决策审计 4 维度 / Prompt 模板管理 / 可解释性溯源）已完成
- 项目性质：简历 / Demo 项目，无真实生产流量
- 目标叙事：从"前端审批系统"升级为"AI 增强的企业级智能审批平台"

## 技术栈

| 分类 | 选型 | 用途 |
|------|------|------|
| 前端 | Vue 3.5、TypeScript 5.9、Composition API | 主应用开发 |
| 构建 | Vite 7、pnpm 10、Turborepo 2 | Monorepo 与构建 |
| UI | Element Plus、Tailwind CSS 4 | 业务界面 |
| 状态 | Pinia、TanStack Vue Query | 客户端 / 服务端状态 |
| 动态表单 | form-create 3.2 | JSON 协议驱动表单 |
| 流程编排 | LogicFlow 2.1 | 流程设计器 |
| 文档处理 | xlsx、pdfjs-dist、comlink、Web Workers | Excel / PDF |
| BFF | Fastify 5.6、PostgreSQL 16 | 后端支撑层 |
| AI | @oa/ai-utils、火山方舟 Ark、Qdrant | LLM / Embedding / 向量检索 |
| 校验 | Zod 4 | BFF schema 校验 |
| 测试 | Vitest 4、Playwright 1.58 | 单测 + E2E |
| 文档 | VitePress、TypeDoc | 文档站 |

## 目录结构

```text
OA/
├── apps/
│   ├── web/                          # Vue 3.5 前端
│   │   ├── src/api/                  # mock / real 双模式 API
│   │   │   └── ai.ts                 # AI 建议与知识库 API
│   │   ├── src/composables/          # 组合式逻辑层（核心，共 33 个）
│   │   │   ├── useFormSchemaAdapter.ts   # Adapter：设计器规则 -> 内部协议
│   │   │   ├── useApprovalDetail.ts      # 审批详情派生
│   │   │   ├── useNodePermissions.ts     # 节点权限管理
│   │   │   ├── useAiSuggestion.ts        # AI 建议状态机（含溯源/不确定性）
│   │   │   ├── useAiPolicy.ts            # AI 策略查询与警告展示（治理 P1）
│   │   │   ├── useAiAudit.ts             # AI 决策审计统计与采纳/覆盖（治理 P2）
│   │   │   ├── usePromptTemplate.ts      # Prompt 模板 CRUD 与测试（治理 P3）
│   │   │   └── useApprovalSubmit.ts      # 审批动作提交
│   │   ├── src/views/approval/      # 审批中心与详情
│   │   │   └── components/ReasoningSegmentView.vue  # 推理溯源视图（治理 P4）
│   │   ├── src/views/workflow/      # 流程设计器
│   │   ├── src/views/knowledge/     # 知识库管理
│   │   ├── src/views/system/        # 系统管理
│   │   │   ├── AiAuditPanel.vue         # AI 审计看板（治理 P2）
│   │   │   ├── PromptTemplateList.vue   # Prompt 模板列表（治理 P3）
│   │   │   └── PromptTemplateDetail.vue # Prompt 模板详情/测试（治理 P3）
│   │   ├── src/components/          # 引擎组件
│   │   │   ├── document/            # 文档预览引擎
│   │   │   └── ...                  # 表单/流程引擎组件
│   │   ├── src/workers/             # Web Workers（PDF/Excel）
│   │   ├── src/types/               # 应用内类型契约
│   │   └── src/mocks/               # MSW mock 数据
│   └── bff/                          # Fastify BFF
│       ├── src/app.ts                # 路由入口（所有接口注册）
│       ├── src/domain.ts             # 领域类型（审批/流程/审计）
│       ├── src/store.ts              # Postgres / 内存双存储实现
│       ├── src/sse.ts                # SSE 实时推送 Hub
│       └── src/services/
│           ├── approval-service.ts      # 审批 CRUD
│           ├── approval-ai-service.ts   # 审批 AI 上下文组装
│           ├── ai-service.ts            # LLM 调用 + 结构化解析 + 引用溯源
│           ├── ai-policy-service.ts     # AI 策略即代码（治理 P1）
│           ├── ai-audit-service.ts      # AI 决策审计 4 维度（治理 P2）
│           ├── prompt-template-service.ts # Prompt 模板管理与版本化（治理 P3）
│           ├── knowledge-service.ts     # 知识库完整链路
│           ├── document-pipeline.ts     # 文档处理流水线
│           ├── audit-service.ts         # 审计日志
│           ├── metrics-service.ts       # 审批指标快照
│           └── workflow-service.ts      # 流程版本治理
├── packages/
│   ├── contracts/                    # 前后端共享契约
│   │   └── src/index.ts             # ApiEnvelope / AI / RAG / SSE / 审计 / Prompt 模板类型
│   ├── ai-utils/                     # AI 基础能力封装
│   │   └── src/
│   │       ├── llm/                  # Ark LLM 调用
│   │       └── rag/                  # Embedding / Qdrant / 分块
│   ├── config/                       # 共享 ESLint/Prettier 配置
│   └── utils/                        # 共享工具函数
├── docs/                             # VitePress 文档站
│   ├── architecture.md               # 架构文档
│   ├── development.md                # 开发指南
│   ├── api/                          # API 文档
│   ├── guide/                        # 用户指南
│   ├── agent-workflow/               # Agent 工作流记录
│   └── 功能验证文档/                  # 功能验证手册
└── plan/                             # 规划文档
```

## 核心架构模式

### 1. 引擎驱动渲染

- 动态表单通过 JSON Schema 渲染，不为每类审批单独手写页面
- 同一份 Schema 在不同节点下通过权限映射动态改写（editable / readonly / hidden / required）
- 审批详情依据流程上下文、节点权限、表单协议动态生成

### 2. 组合式逻辑层（Composables）

复杂逻辑下沉到 composables，页面保持轻薄。重点 composables：

| Composable | 职责 |
|------------|------|
| `useFormSchemaAdapter` | Adapter 模式，隔离第三方设计器规则结构 |
| `useApprovalDetail` | 审批详情派生：表单/节点/权限/轨迹/时间线 |
| `useNodePermissions` | 节点表单权限配置，150ms 防抖同步 |
| `useApprovalSubmit` | 审批动作提交流程 |
| `useAiSuggestion` | AI 建议状态机：idle -> loading -> streaming -> success/error（含溯源/不确定性） |
| `useAiPolicy` | AI 策略查询、警告横幅展示（治理 P1） |
| `useAiAudit` | AI 决策审计统计、采纳/覆盖反馈闭环（治理 P2） |
| `usePromptTemplate` | Prompt 模板列表/详情/CRUD/在线测试（治理 P3） |

### 3. 双模式 API

- `VITE_USE_MOCK=true`（默认）：MSW mock，适合页面开发
- `VITE_API_MODE=real`：走 BFF 联调
- AI 与知识库接口同样保持 mock / real 双实现

### 4. AI 分层架构

```
packages/ai-utils                   -> 纯 AI 基础能力（LLM、Embedding、Qdrant、分块）
packages/contracts                  -> AI / RAG / SSE / 审计 / Prompt 模板共享契约
apps/bff/ai-service.ts              -> 模型调用 + Zod 结构化解析 + 引用溯源 + 降级
apps/bff/approval-ai-service.ts     -> 审批上下文组装 + 提示词裁剪
apps/bff/ai-policy-service.ts       -> Policy-as-Code：AI 能力边界声明（block/warn）
apps/bff/ai-audit-service.ts        -> AI 决策审计 4 维度（输入/模型/人工/结果）
apps/bff/prompt-template-service.ts -> Prompt 模板 CRUD + 版本 + 渲染 + 在线测试
```

AI 治理四阶段（已全部落地）：

1. **Policy-as-Code**：声明式规则定义 AI 能力边界，`block` 直接阻断、`warn` 降低置信度，规则可配置
2. **决策审计 4 维度**：输入上下文 / 模型行为 / 人工干预 / 结果影响，全链路留痕可追溯
3. **Prompt 模板管理**：模板版本化 + 变量渲染（`{{var}}` / `{{#cond}}...{{/cond}}`）+ 在线测试 + 默认 fallback
4. **可解释性增强**：推理来源溯源（知识库 / 表单数据 / 历史数据 / 模型判断 4 类来源）+ 不确定性标注

### 5. Human-in-the-Loop 设计

- 前端只传 `approvalId`，BFF 内部读取完整审批上下文
- 输出统一结构化结果：suggestion / confidence / riskLevel / reasoning / disclaimer
- 三档置信度分流：
  - `≥ 0.8` 高置信度（可直接采纳）
  - `0.5 - 0.8` 中置信度（建议参考）
  - `< 0.5` manual_review（人工判断）
- 解析失败、模型异常、信息不足 -> 统一降级 `manual_review`
- AI 建议可被人工采纳或忽略，决策回写审计（治理 P2 反馈闭环）

### 6. 降级与容错

- 无 `ARK_API_KEY`：AI 建议自动 `manual_review`，知识库搜索走本地文本匹配
- 向量链路失败：不阻塞文档元数据落库，记录 `vector-index-skipped`，搜索继续可用
- 上传内容超 10MB -> 统一返回 413
- Prompt 模板缺失或渲染失败 -> 回退硬编码默认 prompt（治理 P3 fallback）

### 7. 审批域设计

- 7 种审批动作：approve / reject / transfer / addSign / remind / withdraw / cancel
- 2 种节点策略：会签 `and` / 或签 `or`
- SLA 自动升级 + 全局代理审批
- owner/handler 双层身份拆分
- 流程版本治理：发布 -> 编辑 -> 回滚 -> 影响分析
- 审计日志：AuditEvent 模型，before/after 快照 + TraceId + IP + UA

## 常用命令

```bash
# 根目录
pnpm install                # 安装依赖
pnpm dev                    # 启动前端 + BFF
pnpm dev:bff                # 仅启动 BFF
pnpm dev:hybrid             # 启动 BFF + Web（联调用）
pnpm build                  # 构建所有包
pnpm test                   # 运行所有测试
pnpm typecheck              # 类型检查
pnpm lint                   # ESLint 检查
pnpm lint:fix               # ESLint 自动修复
pnpm format                 # Prettier 格式化
pnpm verify:web             # Web 端全量验证矩阵

# Web 端
pnpm --filter panorama-oa-web dev
pnpm --filter panorama-oa-web typecheck
pnpm --filter panorama-oa-web test
pnpm --filter panorama-oa-web test:coverage
pnpm --filter panorama-oa-web test:smoke

# BFF 端
pnpm --filter panorama-oa-bff dev
pnpm --filter panorama-oa-bff build
pnpm --filter panorama-oa-bff typecheck
pnpm --filter panorama-oa-bff test

# 共享包
pnpm --filter @oa/contracts build
pnpm --filter @oa/ai-utils build

# 文档
pnpm docs:dev                # 启动文档站
pnpm docs:build              # 构建文档
```

## 真实联调模式

```powershell
$env:VITE_USE_MOCK='false'
$env:VITE_API_MODE='real'
$env:VITE_BFF_TARGET='http://127.0.0.1:8088'
$env:PORT='5174'
pnpm --filter panorama-oa-web dev
```

联调地址：
- Web：`http://127.0.0.1:5174`
- BFF：`http://127.0.0.1:8088`

## 修改约定

### 改之前先看

1. 相关 composable 的类型定义和现有测试
2. `packages/contracts` 中涉及的共享契约
3. `apps/bff/src/domain.ts` 中的领域类型
4. 审批域改动必须确认不破坏 7 种动作和两种节点策略

### 改的时候

- 逻辑优先放 composables / services，视图层只负责渲染和交互编排
- 优先最小 diff，不改动无关代码
- 延续现有命名、目录和组合式 API 风格
- 改 `packages/` 时确认所有引用方（web、bff）兼容

### 不要做的事

- AI 只能提供建议，不能直接驱动真实审批动作
- 不要破坏 approve / reject / transfer / addSign / remind / withdraw / cancel 主链路
- 非当前处理人的动作边界不能被 AI 功能绕开
- 不要为每类审批单据单独写页面--必须通过引擎渲染
- 不要在 AI 功能中假设可以绕过 Schema 校验
- 首版不宣称支持 Word 原生直传
- 不要让 AI 生成逻辑越过 Schema 直接写数据

### 测试要求

- 审批域与 AI 接入改动必须有对应单测
- 新增 composable 需要 Vitest
- 路由和联调改动后至少跑：
  - `panorama-oa-bff test`
  - `panorama-oa-web test`
  - `panorama-oa-web typecheck`

## 已落地能力一览

### 审批域 ✅

- 动态表单引擎（JSON 协议驱动，非硬编码）
- 流程设计器（节点/连线/条件/版本治理）
- 审批中心（发起/待办/已办/抄送/详情）
- 7 种审批动作全链路
- 会签 and / 或签 or
- SLA 自动升级
- 全局代理审批
- 流程版本治理（发布/回滚/影响分析/规则调试）
- 审计日志（before/after 快照 + TraceId）
- 通知与消息联动
- SSE 实时推送

### AI 增强 ✅

- 审批详情页 AI 建议卡片
- Human-in-the-Loop 置信度三档分流
- 流式理由输出（SSE + 打字机效果）
- 知识库管理（CRUD + 文档上传）
- TXT / Markdown / PDF 文档支持
- Qdrant 向量检索 + LLM 合成回答
- 来源引用展示
- 无 API Key 时的全链路降级

### AI 治理 ✅

- **Policy-as-Code（P1）**：声明式规则定义 AI 能力边界，`block` 阻断 / `warn` 降置信，规则可配置
- **决策审计 4 维度（P2）**：输入上下文 / 模型行为 / 人工干预 / 结果影响，全链路留痕可追溯
- **采纳/覆盖反馈闭环（P2）**：AI 建议可被采纳或忽略，人工决策回写审计
- **Prompt 模板管理（P3）**：模板 CRUD + 版本化 + 变量渲染（`{{var}}` / `{{#cond}}`）+ 在线测试 + 默认 fallback
- **可解释性增强（P4）**：推理来源溯源（知识库 / 表单数据 / 历史数据 / 模型判断 4 类来源）+ 不确定性标注面板
- **AI 审计看板（P2）**：统计看板（采纳率 / 置信度分布 / 风险分布 / 平均延迟）+ 日志查询

## 阅读顺序建议

如果要完整理解项目，按这个顺序读：

1. `AGENTS.md` / `CLAUDE.md` - 项目概览与约定
2. `packages/contracts/src/index.ts` - 共享类型契约（API/AI/RAG/SSE/审计/Prompt 模板）
3. `apps/bff/src/domain.ts` - 领域模型定义
4. `apps/bff/src/store.ts` - 存储抽象（Postgres/内存双实现）
5. `apps/bff/src/services/ai-*.ts` + `prompt-template-service.ts` - AI 治理链路
6. `apps/web/src/composables/` - 组合式逻辑层（核心）
7. `apps/web/src/views/approval/` - 审批业务视图
8. `apps/bff/src/services/` - BFF 服务层

## 面试防御要点

- AI 始终是辅助层，不越过审批边界 -> Human-in-the-Loop
- 动态表单不是"用了 form-create"，而是"通过 Adapter 层隔离第三方依赖"
- 流程编排不是"画了个图"，而是"可编辑模型 -> 可执行模型的双向映射"
- 审批治理不是"做了审批流"，而是"owner/handler 拆分 + SLA 升级 + 代理接管 + 会签或签"
- 版本治理不是"存了个快照"，而是"全快照 + 发布/回滚 + 影响分析 + 审计追踪"
- SSE 选择 POST + fetch + ReadableStream：请求体需要 approvalId，EventSource 只支持 GET
- PDF 文本提取放前端 Worker：复用审批附件预览链路，减少主线程阻塞
- 降级策略是设计出来的，不是报错后补的：无 API Key / 向量失败 / 模型异常 / Prompt 模板缺失都有 fallback
- AI 治理不是"做了 AI 建议"，而是"Policy-as-Code 声明边界 + 4 维度审计留痕 + Prompt 模板版本化 + 推理溯源可解释"
- Prompt 工程不是"写死在代码里"，而是"模板化 + 版本化 + 变量渲染 + 在线测试 + 默认 fallback"
- 可解释性不是"输出一段理由"，而是"4 类来源溯源（知识库/表单/历史/模型判断）+ 不确定性标注 + 置信度分级"
