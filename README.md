# 全景智能 OA 协同办公平台

面向中大型企业审批场景的前端主导型智能协同审批平台原型。核心不是堆叠审批页面，而是把审批系统从"页面硬编码"演进为**"协议驱动 + 引擎渲染 + 状态可追踪"**的平台化交付模式，并在此基础上接入 AI 审批建议与制度知识库作为智能增强层。

[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.6-000000?logo=fastify)](https://fastify.dev/)

## 项目定位

不是"审批页面的集合"，也不是"以 AI 为主语的自动化系统"。核心能力按层次划分：

- **平台骨架**：动态表单引擎 + 流程编排引擎 + 节点权限控制 + 审批任务模型 + 流程版本治理 + 审计追踪
- **治理能力**：SLA 自动升级 + 代理审批 + 会签/或签策略 + owner/handler 双层身份拆分
- **智能增强层**：AI 审批建议（Human-in-the-Loop）+ 制度知识库（RAG）+ 流式交互
- **AI 边界**：始终停留在辅助层，不越过真实审批边界

## 当前可演示能力

### 审批主链路 ✅

- 发起审批、我的申请、待我审批、抄送我的
- 审批详情页统一承载：表单 / 动作区 / 轨迹时间线 / 协同进度 / SLA 状态 / 代理关系 / AI 建议
- `approve / reject / transfer / addSign / remind / withdraw / cancel` 全动作闭环
- 会签 `and` / 或签 `or`
- SLA 自动升级 + 全局代理审批
- 流程版本治理：发布 → 编辑 → 回滚 → 影响分析 → 规则调试
- 审计日志：before/after 快照 + TraceId + IP + UA
- SSE 实时推送：审批状态变更 / 待办更新 / 消息通知

### AI 增强 ✅

- 审批详情页 AI 建议卡片：流式理由输出 + 打字机效果
- Human-in-the-Loop 置信度三档分流（高 / 中 / manual_review）
- 知识库管理：创建知识库、上传文档、检索问答
- 首版支持 `TXT / Markdown / PDF`（PDF 文本提取在前端 Worker 完成）
- Qdrant 向量检索 + LLM 合成回答 + 来源引用展示
- 无 `ARK_API_KEY` 时全链路降级

## 架构概览

```text
┌──────────────────────────────────────────────────────────────┐
│  apps/web (Vue 3.5)                                          │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────────────┐│
│  │  views/  │  │ composables/  │  │ components/             ││
│  │ 审批中心  │  │ useFormAdapter│  │ 表单/流程/文档引擎       ││
│  │ 流程设计  │  │ useApproval   │  │ Web Workers             ││
│  │ 知识库    │  │ useAiSuggest  │  │ (PDF/Excel 重计算前置)  ││
│  └──────────┘  └──────────────┘  └─────────────────────────┘│
├──────────────────────────────────────────────────────────────┤
│  packages/contracts  (前后端共享类型契约)                     │
│  ApiEnvelope / AI建议 / RAG / SSE事件 / 审批域类型            │
├──────────────────────────────────────────────────────────────┤
│  apps/bff (Fastify 5.6)                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ approval-svc │  │ ai-service   │  │ knowledge-service   │ │
│  │ audit-svc    │  │ approval-ai  │  │ document-pipeline   │ │
│  │ metrics-svc  │  │ workflow-svc │  │ SSE RealtimeHub     │ │
│  └──────────────┘  └──────────────┘  └─────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│  packages/ai-utils  (AI 基础能力)                             │
│  LLM调用 / Embedding / 文本分块 / Qdrant向量存储              │
├──────────────────────────────────────────────────────────────┤
│  PostgreSQL 16  +  Qdrant                                    │
└──────────────────────────────────────────────────────────────┘
```

### 核心设计模式

| 模式 | 实现 | 解决的问题 |
|------|------|-----------|
| **Adapter** | `useFormSchemaAdapter` 隔离 form-create 规则结构 | 第三方依赖可替换，内部协议稳定 |
| **Composable** | 复杂逻辑下沉 composables，页面保持轻薄 | 逻辑复用、可测试、视图无关 |
| **State Machine** | AI 建议 idle→loading→streaming→success/error | 状态流转可预测 |
| **Dual Mode** | Mock (MSW) / Real (BFF) 双模式 API | 开发效率与联调能力兼顾 |
| **HITL** | AI 置信度分流 + manual_review 降级 | AI 辅助不越界 |
| **Fallback Chain** | 向量检索 → 本地文本匹配，模型调用 → manual_review | 可用性不依赖外部服务 |
| **Storage Abstraction** | RuntimeStore 接口：Postgres / InMemory | Demo 可独立运行，生产可切换 |
| **Version Governance** | 全快照式流程版本 + 发布/回滚/影响分析 | 审批流变更可追溯、可回退 |

## 技术栈

| 分类 | 选型 |
|------|------|
| 前端框架 | Vue 3.5 + Composition API + TypeScript 5.9 |
| 构建工具 | Vite 7 + pnpm 10 + Turborepo 2 (Monorepo) |
| UI 框架 | Element Plus + Tailwind CSS 4 |
| 状态管理 | Pinia (客户端) + TanStack Vue Query (服务端) |
| 动态表单 | form-create 3.2 (JSON Schema 驱动) |
| 流程编排 | LogicFlow 2.1 (可视化设计器) |
| 文档处理 | xlsx + pdfjs-dist + comlink + Web Workers |
| BFF | Fastify 5.6 |
| 数据库 | PostgreSQL 16 |
| AI 基础设施 | @oa/ai-utils + 火山方舟 Ark + Qdrant |
| 校验 | Zod 4 |
| 测试 | Vitest 4 + Playwright 1.58 |
| 文档 | VitePress + TypeDoc |

## 关键 Composables

| Composable | 职责 |
|-----------|------|
| `useFormSchemaAdapter` | Adapter 模式：设计器规则 → 内部表单协议，类型映射 + 校验转换 + 优雅降级 |
| `useApprovalDetail` | 审批详情派生：表单解析、节点权限、流程实例、进度计算、轨迹时间线、SLA 判断 |
| `useNodePermissions` | 节点字段权限管理：editable / readonly / hidden / required，150ms 防抖同步 |
| `useAiSuggestion` | AI 建议状态机：状态管理、SSE 流式消费、错误处理、重试 |
| `useApprovalSubmit` | 审批动作提交：参数组装、乐观更新、失效刷新 |

## 目录结构

```text
OA/
├── apps/
│   ├── web/                    # Vue 3.5 前端
│   │   └── src/
│   │       ├── api/            # mock/real 双模式 API
│   │       ├── composables/    # 组合式逻辑层（~30 个）
│   │       ├── views/          # 14 个业务模块
│   │       ├── components/     # 引擎组件（表单/流程/文档）
│   │       ├── workers/        # Web Workers (PDF/Excel)
│   │       ├── types/          # 应用内类型契约
│   │       └── mocks/          # MSW mock 数据
│   └── bff/                    # Fastify BFF
│       └── src/
│           ├── app.ts          # 路由注册入口
│           ├── domain.ts       # 领域模型（260+ 行）
│           ├── store.ts        # Postgres/内存双存储
│           └── services/       # 8 个业务服务
├── packages/
│   ├── contracts/              # 前后端共享契约（196 行类型）
│   ├── ai-utils/               # AI 基础能力封装
│   ├── config/                 # ESLint/Prettier 共享配置
│   └── utils/                  # 通用工具
├── docs/                       # VitePress 文档站
└── plan/                       # 规划文档
```

## 本地启动

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动基础服务

```bash
docker compose up -d
```

默认端口：PostgreSQL `5434`、Qdrant `6333/6334`

### 3. 配置 BFF 环境变量

参考 `apps/bff/.env.example` 新建 `apps/bff/.env`。不配 `ARK_API_KEY` 也能启动，AI 功能会自动降级。

### 4. 启动

```bash
pnpm dev            # 全量启动
pnpm dev:bff        # 仅 BFF
pnpm dev:hybrid     # BFF + Web 联调
```

### 真实联调模式

```powershell
$env:VITE_USE_MOCK='false'
$env:VITE_API_MODE='real'
$env:VITE_BFF_TARGET='http://127.0.0.1:8088'
$env:PORT='5174'
pnpm --filter panorama-oa-web dev
```

- Web：`http://127.0.0.1:5174`
- BFF：`http://127.0.0.1:8088`

## 验证命令

```bash
pnpm --filter @oa/ai-utils build          # AI 基础包构建
pnpm --filter @oa/contracts build         # 契约包构建
pnpm --filter panorama-oa-bff test        # BFF 单测
pnpm --filter panorama-oa-bff build       # BFF 生产构建
pnpm --filter panorama-oa-web test        # Web 单测
pnpm --filter panorama-oa-web typecheck   # Web 类型检查
pnpm verify:web                           # Web 全量验证矩阵
pnpm docs:build                           # 文档构建
```

## 已验证状态

| 验证项 | 状态 |
|--------|------|
| BFF 单测 (`panorama-oa-bff test`) | ✅ 通过 |
| BFF 构建 (`panorama-oa-bff build`) | ✅ 通过 |
| Web 单测 (`panorama-oa-web test`) | ✅ 通过 |
| Web 类型检查 (`panorama-oa-web typecheck`) | ✅ 通过 |
| AI 审批建议真实联调 | ✅ 已验证 |
| 知识库上传、检索、fallback | ✅ 已验证 |
| useAiSuggestion composable | ✅ 单测覆盖 |
| AiSuggestion.vue 组件 | ✅ 单测覆盖 |
| 知识库页基础交互 | ✅ 单测覆盖 |

## 面试防御要点

面试时如果被追问以下方向，核心回应思路：

- **"AI 会不会误判？"** → Human-in-the-Loop 设计：AI 只给建议，不驱动真实审批动作。三档置信度分流，低置信度强制 manual_review。模型异常/信息不足/解析失败统一降级。
- **"动态表单不就是用了 form-create 吗？"** → 关键是 Adapter 层隔离。`useFormSchemaAdapter` 将第三方规则结构隔离在适配层内，内部协议保持稳定。即使未来换库，业务代码不受影响。
- **"审批体系和普通审批流有什么区别？"** → owner/handler 拆分 + SLA 升级 + 代理接管 + 会签/或签策略。不是简单的"提交→通过→结束"，而是全生命周期的自动治理。
- **"知识库是你一个人做的吗？"** → BFF 层有后端同事配合。前端负责：PDF 文本提取（Web Worker）、检索界面、流式消费、引用来源展示。分工清楚，不夸大。
- **"这个项目为什么不直接上微服务？"** → 小团队 + Demo 项目，模块化单体更合理。通过 packages 拆分契约和 AI 能力，已经做到了关注点分离，后续可平滑拆分。

## 文档入口

- [AGENTS.md](AGENTS.md) — AI Agent 速查手册
- [CLAUDE.md](CLAUDE.md) — 项目开发规范与架构说明
- [架构文档](docs/architecture.md) — 详细架构设计
- [开发指南](docs/development.md) — 环境搭建与联调
- [安装指南](docs/guide/installation.md)
- [API 文档](docs/api/index.md)
