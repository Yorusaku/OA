# 全景智能 OA 项目综合说明

## 项目定位

全景智能 OA 是一个前端主导的企业协同审批平台原型，核心目标不是做若干孤立页面，而是沉淀一套可复用的审批引擎能力：

- 动态表单
- 流程设计与版本治理
- 审批闭环与协同处理
- 审计与通知
- AI 审批辅助与制度知识库

项目目前已经从“动态表单 + 流程审批”升级到“AI 增强审批”阶段，适合作为简历中的平台型项目主案例。

## 当前能力图谱

### 审批主链路

已完成并可演示：

- 发起审批
- 待我审批
- 我的申请
- 抄送与通知
- 审批详情
- `approve / reject / transfer / addSign / remind / withdraw / cancel`
- 会签 `and` / 或签 `or`
- SLA 自动升级
- 代理审批
- 审计日志

### AI 增强能力

已完成并可演示：

- AI 审批建议
- 审批页流式理由输出
- 知识库管理
- 文档上传与分块
- Qdrant 向量检索
- 检索问答与引用来源展示
- 无模型配置时的本地 fallback

## AI 集成后的核心叙事

### 1. Human-in-the-Loop AI 审批

审批详情页新增 AI 建议卡片，用户手动触发生成，不会在页面打开时自动消耗 token。

后端只接收 `approvalId`，审批上下文由 BFF 内部读取并裁剪，避免前端把整包业务数据直接传给模型。

输出统一落成结构化结果：

- `suggestion`
- `confidence`
- `riskLevel`
- `reasoning`
- `disclaimer`
- `generatedAt`

前端按置信度展示三档状态：

- 高置信度：建议明确，可参考
- 中置信度：仅供参考
- 低置信度：建议人工判断

AI 不会替代审批动作，只提供辅助意见，人类审批人保持最终决策权。

### 2. 企业制度知识库

知识库模块主要服务审批场景下的制度查询与人工复核。

当前链路：

1. 创建知识库
2. 上传制度文档
3. 文档分块
4. Embedding 与向量存储
5. 检索召回
6. LLM 合成回答
7. 前端展示答案与来源片段

首版支持：

- `TXT`
- `Markdown`
- `PDF`

其中 `PDF` 由前端先提取文本，再通过 JSON 提交给 BFF。

### 3. SSE 流式交互

AI 审批建议的理由区采用流式输出，前端使用 `fetch + ReadableStream` 消费 `text/event-stream`，实现更贴近实际产品的打字机体验。

这套方式同时兼容当前仓库的 `POST` 请求形态，避免 `EventSource` 只能 `GET` 的限制。

## 当前技术栈补充

在原有技术栈基础上，AI 相关新增：

- `@oa/ai-utils`
- 火山方舟 Ark API
- Qdrant
- 轻量文本分块
- BFF 侧 AI 服务封装

## 当前部署与运行前提

### 基础服务

- `PostgreSQL 16`
- `Qdrant`

通过根目录 `docker-compose.yml` 启动。

### BFF 环境变量

关键变量：

- `BFF_STORAGE`
- `PG_HOST / PG_PORT / PG_USER / PG_PASSWORD / PG_DATABASE`
- `QDRANT_URL / QDRANT_COLLECTION_NAME`
- `ARK_API_KEY`
- `ARK_LLM_BASE_URL`
- `ARK_LLM_MODEL`
- `ARK_REQUEST_TIMEOUT_MS`
- `ARK_EMBEDDING_MODEL`
- `ARK_EMBEDDING_DIMENSIONS`

## 当前降级策略

这是项目升级后很适合在面试里展开的一点。

### 未配置 `ARK_API_KEY`

审批建议：

- 自动降级为 `manual_review`
- 返回低置信度与人工判断提示

知识库：

- 上传仍可成功
- 文档仍可进入 `ready`
- 搜索自动走本地文本 fallback

### 向量链路异常

- 不阻塞文档元数据落库
- 检索可继续运行
- 通过 `vector-index-skipped` 记录跳过原因

### 大文档提交

- 上传接口已放宽到 `10MB`
- 超限时统一返回 `413`

## 目前最有价值的简历表达

推荐表述：

> 设计并开发 AI 增强的企业级智能审批平台，在动态表单与流程引擎基础上，补充 Human-in-the-Loop AI 审批建议、制度知识库检索问答与 SSE 流式交互能力，形成“审批执行 + AI 辅助 + 制度复核”的完整闭环。

## 当前完成状态

- `P0`：已完成
- `P1`：已完成
- `P2`：未开始
- `P3`：明确不做

如果继续演进，优先顺序建议仍是：

1. 强化知识库问答体验
2. 增加审批页内嵌制度问答
3. 再考虑混合检索与查询重写
