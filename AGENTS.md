# AGENTS.md — 全景智能 OA 协同办公平台

> 面向 AI Agent 的项目速查手册。接手任务前先读这份文件。

## 1. 项目定位

全景智能 OA 是一套前端主导的引擎化协同审批平台原型，核心目标是把审批系统从“页面硬编码”演进为“协议驱动 + 引擎渲染 + 状态可追踪”的交付模式。

- 当前阶段：审批主链路已完整，AI 审批建议与知识库 P0/P1 已落地
- 项目性质：简历 / Demo 项目，无真实生产流量
- 目标叙事：从“前端审批系统”升级为“AI 增强的企业级智能审批平台”

## 2. 当前已落地能力

### 审批域

- 动态表单引擎
- 流程设计与版本治理
- 审批中心、详情、轨迹、通知
- `approve / reject / transfer / addSign / remind / withdraw / cancel`
- 会签 `and` / 或签 `or`
- SLA 自动升级
- 全局代理审批

### AI 增强

- 审批详情页 AI 建议卡片
- `Human-in-the-Loop` 置信度分流
- 流式理由输出
- 知识库管理页
- 文档上传、分块、检索、引用来源展示
- Qdrant 向量检索
- 模型缺失时的 fallback 降级

## 3. 技术栈速览

| 分类 | 选型 | 用途 |
| --- | --- | --- |
| 前端 | Vue 3.5、TypeScript 5.9、Composition API | 主应用开发 |
| 构建 | Vite 7、pnpm 10、Turborepo 2 | Monorepo 与构建 |
| UI | Element Plus、Tailwind CSS 4 | 业务界面 |
| 状态 | Pinia、TanStack Vue Query | 客户端 / 服务端状态 |
| 动态表单 | form-create 3.2 | JSON 协议驱动表单 |
| 流程编排 | LogicFlow 2.1 | 流程设计器 |
| 文档处理 | xlsx、pdfjs-dist、comlink、Web Workers | Excel / PDF |
| BFF | Fastify 5.6、PostgreSQL 16 | 后端支撑层 |
| AI | `@oa/ai-utils`、火山方舟 Ark、Qdrant | LLM / Embedding / 向量检索 |
| 校验 | Zod 4 | BFF schema 校验 |
| 测试 | Vitest 4、Playwright 1.58 | 单测 + E2E |
| 文档 | VitePress、TypeDoc | 文档站 |

## 4. 目录结构

```text
OA/
├── apps/
│   ├── web/
│   │   ├── src/api/                 # mock / real 双模式 API
│   │   ├── src/composables/         # 组合式逻辑层
│   │   ├── src/views/approval/      # 审批中心与详情
│   │   ├── src/views/knowledge/     # 知识库管理
│   │   └── src/services/            # PDF 等文档服务
│   └── bff/
│       ├── src/app.ts               # Fastify 路由入口
│       ├── src/store.ts             # Postgres / 内存双存储
│       └── src/services/
│           ├── approval-service.ts
│           ├── approval-ai-service.ts
│           ├── ai-service.ts
│           ├── knowledge-service.ts
│           └── document-pipeline.ts
├── packages/
│   ├── ai-utils/                    # Ark / Embedding / Qdrant / chunking
│   ├── contracts/                   # 前后端共享契约
│   ├── config/
│   └── utils/
├── docs/                            # VitePress 文档站
├── plan/                            # 规划文档
└── docker-compose.yml
```

## 5. 核心架构模式

### 5.1 引擎驱动渲染

- 动态表单通过 JSON Schema 渲染，不为每类审批单独手写页面
- 同一份 Schema 在不同节点下通过权限映射动态改写
- 审批详情依据流程上下文、节点权限、表单协议动态生成

### 5.2 组合式逻辑层

复杂逻辑尽量下沉到 composables，页面尽量保持轻薄。

重点 composables：

- `useFormSchemaAdapter`
- `useApprovalDetail`
- `useNodePermissions`
- `useApprovalSubmit`
- `useAiSuggestion`

### 5.3 双模式 API

- `VITE_USE_MOCK=true`：MSW mock
- `VITE_API_MODE=real`：走 BFF
- AI 与知识库接口同样保持 mock / real 双实现

### 5.4 AI 分层

- `packages/ai-utils`：纯 AI 基础能力
- `packages/contracts`：AI / RAG / SSE 契约
- `apps/bff/src/services/ai-service.ts`：模型调用与结构化解析
- `apps/bff/src/services/approval-ai-service.ts`：审批上下文组装
- `apps/bff/src/services/knowledge-service.ts`：知识库上传、索引、检索

## 6. 当前 AI 设计要点

### 审批建议

- 前端只传 `approvalId`
- BFF 内部读取审批详情、表单、流程实例、轨迹信息
- 输出统一为结构化结果：
  - `suggestion`
  - `confidence`
  - `riskLevel`
  - `reasoning`
  - `disclaimer`
  - `generatedAt`
- 解析失败、模型异常、信息不足时统一降级 `manual_review`

### 知识库

- 存储使用 `PostgreSQL + Qdrant`
- 首版支持 `TXT / Markdown / PDF`
- `PDF` 文本提取在前端完成
- 首版上传接口使用 JSON 文本提交，不是 multipart
- 向量链路失败不阻塞文档元数据落库

## 7. 环境与运行

### 基础服务

```bash
docker compose up -d
```

默认端口：

- PostgreSQL：`5434`
- Qdrant：`6333 / 6334`

### BFF 环境变量

参考 `apps/bff/.env.example`。

关键变量：

- `BFF_STORAGE`
- `PG_HOST / PG_PORT / PG_USER / PG_PASSWORD / PG_DATABASE`
- `QDRANT_URL`
- `QDRANT_COLLECTION_NAME`
- `ARK_API_KEY`
- `ARK_LLM_BASE_URL`
- `ARK_LLM_MODEL`
- `ARK_REQUEST_TIMEOUT_MS`
- `ARK_EMBEDDING_MODEL`
- `ARK_EMBEDDING_DIMENSIONS`

### 启动命令

```bash
pnpm install
pnpm dev
```

或分别启动：

```bash
pnpm dev:bff
pnpm --filter panorama-oa-web dev
```

### 真实联调模式

```powershell
$env:VITE_USE_MOCK='false'
$env:VITE_API_MODE='real'
$env:VITE_BFF_TARGET='http://127.0.0.1:8088'
$env:PORT='5174'
pnpm --filter panorama-oa-web dev
```

## 8. 常用命令

```bash
pnpm --filter @oa/ai-utils build
pnpm --filter @oa/contracts build
pnpm --filter panorama-oa-bff test
pnpm --filter panorama-oa-bff build
pnpm --filter panorama-oa-web test
pnpm --filter panorama-oa-web typecheck
pnpm docs:build
```

## 9. Agent 工作规则

### 9.1 改动前必看

- 先理解目标模块的 composable、类型和契约
- 审批域改动必须确认不破坏 7 种动作和两种节点策略
- 改 `packages/` 时确认所有引用方兼容

### 9.2 改动范围控制

- 优先最小 diff
- 逻辑优先放 composables / services
- 视图层只负责渲染和交互编排

### 9.3 审批域注意事项

- AI 只能提供建议，不能直接驱动真实审批动作
- 不要破坏 `approve / reject / transfer / addSign / remind / withdraw / cancel`
- 非当前处理人的动作边界不能被 AI 功能绕开

### 9.4 知识库注意事项

- 当前 BFF 默认优先 PostgreSQL 存储，不再只是纯内存
- 向量链路失败时要允许 fallback
- 首版不宣称支持 Word 原生直传

### 9.5 测试要求

- 审批域与 AI 接入改动必须有对应单测
- 新增 composable 需要 Vitest
- 路由和联调改动后至少跑：
  - `panorama-oa-bff test`
  - `panorama-oa-web test`
  - `panorama-oa-web typecheck`

## 10. 延伸阅读

- [README](README.md)
- [项目综合文档](plan/project-doc.md)
- [AI 集成规划](plan/ai-integration-plan.md)
- [架构文档](docs/architecture.md)
- [开发指南](docs/development.md)

