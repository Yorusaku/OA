# 全景智能 OA 架构文档

## 总览

全景智能 OA 是一个基于 `Vue 3 + Fastify + Monorepo` 的前端主导审批平台原型。当前系统不是传统“页面堆业务”的做法，而是围绕以下几个核心能力组织：

- 动态表单引擎
- 流程设计与版本治理
- 审批域闭环
- 文档与报表处理
- AI 审批建议
- 制度知识库检索

## 架构分层

### 1. 前端应用层 `apps/web`

职责：

- 业务视图渲染
- 路由与权限控制
- 表单和流程编辑交互
- 审批详情与处理操作
- 知识库管理界面
- AI 建议展示与流式消费

关键设计：

- Vue 组件尽量轻薄
- 复杂逻辑下沉到 composables
- API 层保留 mock / real 双模式

### 2. BFF 服务层 `apps/bff`

职责：

- 审批域读写接口
- 流程治理与审计接口
- SSE 推送
- AI 审批建议服务
- 知识库文档上传与检索服务

关键设计：

- Fastify 手动注册路由
- 服务层以纯函数风格为主
- Demo 项目同时支持内存态与 PostgreSQL 态

### 3. 共享契约层 `packages/contracts`

职责：

- API 返回结构
- 审批域共享类型
- AI 审批建议类型
- SSE 事件类型
- 知识库与 RAG 类型

共享契约保证了前后端在审批与 AI 能力扩展时仍能保持统一的数据边界。

### 4. AI 基础能力层 `packages/ai-utils`

职责：

- Ark LLM 调用封装
- Ark Embedding 服务
- 文本分块
- Qdrant 向量存储封装

这个包只负责 AI 基础能力，不承载审批业务本身。

## 核心业务架构

### 动态表单

动态表单基于 `form-create`，通过 JSON Schema 驱动渲染。前端不会为每一种审批单独写一套页面，而是复用统一的表单引擎。

结合 `useFormSchemaAdapter` 与节点权限映射，同一份表单可以在不同节点下呈现不同状态：

- `editable`
- `readonly`
- `hidden`
- `required`

### 流程设计

流程设计器基于 `LogicFlow`，负责节点、连线、条件规则和流程定义 JSON 的可视化编辑。

流程治理已经具备：

- 创建
- 编辑
- 发布
- 回滚
- 版本查询
- 影响分析
- 规则调试

### 审批域闭环

审批域是平台的主线，BFF 侧以 `approval-service.ts` 为核心，支撑：

- 发起审批
- 待办过滤
- 审批处理
- 会签 / 或签
- 代理审批
- SLA 自动升级
- 通知联动
- 审计落库

前端详情页根据审批上下文动态组合：

- 表单
- 动作区
- 轨迹
- 协同信息
- AI 建议

## AI 架构

### 1. AI 审批建议

AI 审批建议采用 `HITL` 设计，不替代审批引擎。

后端链路：

1. 前端提交 `approvalId`
2. `approval-ai-service.ts` 读取审批详情
3. 组装表单摘要、轨迹摘要、流程摘要
4. `ai-service.ts` 调用 Ark LLM
5. Zod 校验结构化结果
6. 返回建议或降级结果

前端链路：

1. `AiSuggestion.vue` 作为详情页附加卡片
2. `useAiSuggestion` 管理状态机
3. `ai.remote.ts` 用 `fetch + ReadableStream` 消费 SSE
4. 根据 `confidence` 渲染三档 UI

### 2. AI 审批建议流式协议

流式接口：

- `POST /api/v1/ai/approval-suggestion/stream`

事件类型：

- `meta`
- `chunk`
- `done`
- `error`

选择 `POST + SSE` 的原因：

- 请求体需要携带 `approvalId`
- 当前仓库更适合 `fetch` 手工处理流
- 避免 `EventSource` 只能 `GET` 的限制

### 3. 知识库与检索

知识库链路由 `knowledge-service.ts` 和 `document-pipeline.ts` 承担。

主流程：

1. 创建知识库元数据
2. 上传文档内容
3. 文本分块
4. Embedding 向量化
5. Qdrant 存储
6. 检索召回
7. LLM 合成答案

前端知识库页负责：

- 库列表
- 文档管理
- 检索测试
- 回答与来源展示

## 数据存储

### PostgreSQL

当前用于：

- 审批主数据
- 流程定义与版本
- 审计日志
- 知识库元数据
- 文档原文与状态

知识库相关表：

- `knowledge_bases`
- `knowledge_documents`

### Qdrant

当前用于：

- 文档分块向量存储
- 按知识库维度执行向量检索

## 降级与容错

### 无 `ARK_API_KEY`

审批建议：

- 自动降级为 `manual_review`
- 不影响详情页正常使用

知识库：

- 上传不失败
- 文档仍可标记为 `ready`
- 搜索自动退回本地文本匹配

### 向量链路失败

- 不阻塞元数据持久化
- 记录 `vector-index-skipped`
- 搜索继续可用

### 请求体过大

- 文档上传接口显式设置 `10MB` body limit
- 统一返回 `413`

## 运行模式

### Web mock 模式

适合日常页面开发，默认不依赖 BFF。

### Web real / hybrid 模式

适合审批与 AI 联调，直接走 BFF。

### BFF 存储模式

- `postgres`
- `inmemory`

演示环境推荐 `postgres + qdrant`。

## 当前最值得讲的设计点

1. 用统一表单协议和节点权限驱动审批详情，而不是为每个角色硬编码页面。
2. AI 审批建议只做辅助，不入侵真实审批动作。
3. 知识库首版即具备向量检索与本地 fallback 双链路，适合在演示和面试中讲清“可用性设计”。
