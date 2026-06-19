# 全景智能 OA 协同办公平台

面向中大型企业审批场景的引擎化协同办公平台原型，当前已从“动态表单 + 流程审批”升级为“AI 增强审批 + 制度知识库检索”。

[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.6-000000?logo=fastify)](https://fastify.dev/)

## 项目概述

全景智能 OA 是一个前端主导的企业审批平台 Demo，核心目标不是做零散页面，而是沉淀一套可复用的审批引擎能力：

- 动态表单引擎
- 流程设计与版本治理
- 审批域闭环
- SLA 升级与代理审批
- AI 审批建议
- 制度知识库上传、检索与问答

当前项目适合作为“平台型前端项目 + AI 增强业务场景”的简历主案例。

## 当前可演示能力

### 审批主链路

- 发起审批、我的申请、待我审批、抄送我的
- 审批详情动态渲染
- `approve / reject / transfer / addSign / remind / withdraw / cancel`
- 会签 `and` / 或签 `or`
- SLA 自动升级
- 全局代理审批
- 审计日志与通知联动

### AI 增强能力

- 审批详情页 AI 建议卡片
- `Human-in-the-Loop` 置信度分流
- 审批建议流式理由输出
- 知识库管理页
- 文档上传、文本分块、向量入库
- Qdrant 检索 + LLM 合成回答
- 无 `ARK_API_KEY` 时的降级与 fallback

## 技术栈

| 分类 | 选型 |
| --- | --- |
| 前端 | Vue 3、TypeScript、Vite、Vue Router、Pinia、TanStack Vue Query |
| UI | Element Plus、Tailwind CSS |
| 业务引擎 | form-create、LogicFlow |
| 文档处理 | xlsx、pdfjs-dist、comlink、Web Workers |
| BFF | Fastify、PostgreSQL |
| AI | 自建 `@oa/ai-utils`、火山方舟 Ark、Qdrant |
| 工程化 | pnpm workspace、Turborepo、ESLint、Prettier |
| 测试 | Vitest、Playwright |
| 文档 | VitePress、TypeDoc |

## AI 升级后的亮点

### 1. Human-in-the-Loop AI 审批建议

- 前端只传 `approvalId`
- BFF 内部读取审批上下文、轨迹、流程信息并组装提示词
- 模型统一输出结构化结果：
  - `suggestion`
  - `confidence`
  - `riskLevel`
  - `reasoning`
  - `disclaimer`
- 前端按三档置信度展示：
  - `>= 0.8` 高置信度
  - `0.5 - 0.8` 中置信度
  - `<= 0.5` 人工判断

### 2. 企业制度知识库

- 支持创建知识库、上传文档、检索问答
- 首版支持 `TXT / Markdown / PDF`
- `PDF` 文本提取在前端完成，再以 JSON 发往 BFF
- 向量链路可用时走 Embedding + Qdrant
- 模型未配置或向量异常时自动降级到本地文本 fallback

### 3. 流式交互体验

- BFF 提供 `POST + text/event-stream`
- 前端使用 `fetch + ReadableStream` 消费流式事件
- 审批建议理由区支持打字机效果

## 目录结构

```text
OA/
├── apps/
│   ├── web/               # Vue 前端
│   └── bff/               # Fastify BFF
├── packages/
│   ├── ai-utils/          # AI 基础能力封装
│   ├── contracts/         # 前后端共享契约
│   ├── config/            # 共享配置
│   └── utils/             # 共享工具
├── docs/                  # VitePress 文档
├── plan/                  # 规划与阶段文档
├── docker-compose.yml     # PostgreSQL + Qdrant
└── package.json
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

默认会启动：

- PostgreSQL：`5434`
- Qdrant：`6333 / 6334`

### 3. 配置 BFF 环境变量

参考 `apps/bff/.env.example` 新建 `apps/bff/.env`。

### 4. 启动项目

```bash
pnpm dev
```

或分别启动：

```bash
pnpm dev:bff
pnpm --filter panorama-oa-web dev
```

## 真实联调模式

默认前端是 mock 模式。如需联调 BFF，可单独起一个 real 实例：

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

## 关键验证命令

```bash
pnpm --filter @oa/ai-utils build
pnpm --filter panorama-oa-bff test
pnpm --filter panorama-oa-bff build
pnpm --filter panorama-oa-web test
pnpm --filter panorama-oa-web typecheck
pnpm docs:build
```

## 当前已验证状态

- `panorama-oa-bff test` 通过
- `panorama-oa-bff build` 通过
- `panorama-oa-web test` 通过
- `panorama-oa-web typecheck` 通过
- AI 审批建议真实联调已验证
- 知识库上传、检索、fallback 已验证

## 文档入口

- [架构文档](docs/architecture.md)
- [开发指南](docs/development.md)
- [项目综合说明](plan/project-doc.md)
- [AI 集成规划](plan/ai-integration-plan.md)

