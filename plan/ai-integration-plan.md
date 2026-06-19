# AI 能力融入 OA 项目实施计划

> 创建时间：2026-06-16
> 修订时间：2026-06-19
> 状态：P0 已完成，P1 已完成，P2/P3 未执行

---

## 1. 当前结论

AI 集成主线已经从“规划”进入“已落地”阶段，本仓库当前已完成两段能力：

- `P0`：审批详情页 AI 审批建议
- `P1`：制度知识库上传、检索与问答

这次实现坚持了最初设定的主线，没有去稀释为通用聊天项目：

- AI 审批建议采用 `Human-in-the-Loop` 模式，只给建议，不改真实审批动作。
- 知识库服务审批场景，重点是“制度查询 + 人工复核”。
- 前后端保持现有 `monorepo + contracts + Fastify BFF + Vue API 分层 + mock/real 双模式` 架构。

---

## 2. 已完成范围

### 2.1 P0 已完成

已落地内容：

- 新增 `packages/ai-utils`，封装火山方舟 LLM 与 Embedding、Qdrant、分块等 AI 基础能力。
- 扩展 `@oa/contracts`，补齐 AI 审批建议、流式事件、知识库与 RAG 契约。
- BFF 新增审批 AI 服务：
  - `POST /api/v1/ai/approval-suggestion`
  - `POST /api/v1/ai/approval-suggestion/stream`
- 前端审批详情页新增 `AiSuggestion.vue` 卡片。
- 新增 `useAiSuggestion` composable，负责流式状态、重试、错误处理。
- 流式协议采用 `POST + fetch + ReadableStream` 消费 `text/event-stream`，不依赖 `EventSource`。

实际实现与初稿的差异：

- 本轮没有做通用 `ai/chat` 页面与聊天入口，保留了“审批 AI 主线优先”的策略。
- 审批建议请求只传 `approvalId`，审批上下文由 BFF 内部组装，不让前端上传整包业务数据。

### 2.2 P1 已完成

已落地内容：

- `docker-compose.yml` 已加入 `PostgreSQL + Qdrant`。
- BFF 已支持知识库与文档接口：
  - `GET /api/v1/knowledge`
  - `POST /api/v1/knowledge`
  - `DELETE /api/v1/knowledge/:id`
  - `GET /api/v1/knowledge/:kbId/documents`
  - `POST /api/v1/knowledge/:kbId/documents`
  - `DELETE /api/v1/knowledge/:kbId/documents/:id`
  - `POST /api/v1/knowledge/:kbId/search`
- `apps/bff/src/store.ts` 已补知识库表结构。
- 前端新增 `apps/web/src/views/knowledge/index.vue`，提供：
  - 知识库列表
  - 文档上传与删除
  - 检索测试区
  - 回答与引用来源展示
- 前端 API 同时支持 mock 与 real 模式。

实际实现与初稿的差异：

- 首版上传范围以当前真实实现为准：`TXT / Markdown / PDF`。
- `PDF` 在前端先抽取文本，再以 JSON 形式发送到 BFF。
- `Word` 尚未直接接入上传链路，因此文档与演示不再宣称“已支持 Word 直传”。

---

## 3. 当前架构落地方式

### 3.1 AI 审批建议

链路如下：

1. 审批人打开审批详情页。
2. 手动点击“生成 AI 建议”。
3. 前端调用 `POST /api/v1/ai/approval-suggestion/stream`。
4. BFF 根据 `approvalId` 读取审批详情、表单摘要、轨迹摘要、流程摘要并组装提示词。
5. LLM 返回结构化建议，前端按置信度渲染三档 UI。

UI 分层规则：

- `confidence >= 0.8`：绿色，高置信度建议
- `0.5 < confidence < 0.8`：黄色，中置信度建议
- `confidence <= 0.5`：灰色，建议人工判断

固定原则：

- AI 建议只做辅助，不影响 `approve / reject / transfer / addSign / remind / withdraw / cancel` 等真实动作。
- 卡片底部始终展示免责声明，明确最终以人工审批为准。

### 3.2 知识库检索

链路如下：

1. 前端创建知识库。
2. 上传制度文档。
3. BFF 分块并尝试向量化写入 Qdrant。
4. 检索时优先走向量召回，再交给 LLM 合成回答。
5. 前端展示回答与引用来源片段。

当前分块策略：

- 默认 `chunkSize = 500`
- 默认 `chunkOverlap = 50`

---

## 4. 当前降级策略

这是本次收尾里补强过的重要部分。

### 4.1 未配置 `ARK_API_KEY`

审批建议：

- 同步与流式审批建议都不会把服务打挂。
- BFF 会降级返回：
  - `suggestion = 'manual_review'`
  - `confidence <= 0.5`
  - 明确提示需人工判断

知识库上传：

- 文档仍可上传成功。
- BFF 会本地计算 `chunkCount`，文档状态记为 `ready`。
- 即使没有完成向量入库，也不会因为 Embedding 失败导致整单 `500`。

知识库检索：

- 若向量链路不可用或失败，会自动走本地文本 fallback 检索。
- 仍会返回 `answer + sources`，适合演示和面试说明。

### 4.2 Qdrant 或向量链路异常

- 上传不会阻塞元数据落库。
- 文档会以 `ready` 收口，并记录 `vector-index-skipped: ...` 错误信息。
- 检索阶段自动回退到本地文本分块检索。

### 4.3 大文档请求体

- `POST /api/v1/knowledge/:kbId/documents` 已显式放宽 `bodyLimit` 到 `10MB`。
- 超限时统一返回明确的 `413`，避免 Fastify 默认错误信息对前端不友好。

---

## 5. 已完成验证

### 5.1 自动化验证

已通过：

```bash
pnpm --filter @oa/contracts build
pnpm --filter @oa/ai-utils build
pnpm --filter panorama-oa-bff build
pnpm --filter panorama-oa-bff test
pnpm --filter panorama-oa-web test
pnpm --filter panorama-oa-web typecheck
```

关键覆盖点：

- 审批 AI 建议同步与流式接口
- `approvalId` 不存在时的 `404`
- 无 `ARK_API_KEY` 时审批建议降级
- 知识库 CRUD
- 文档上传、删除、检索
- 无 `ARK_API_KEY` 时知识库 fallback 上传与检索
- `useAiSuggestion` composable
- `AiSuggestion.vue` 三档状态渲染
- 知识库页基础交互

### 5.2 手工联调验收

已在真实联调模式下验证：

- BFF：`http://127.0.0.1:8088`
- Web real：`http://127.0.0.1:5174`

已确认：

- 审批详情页可展示 AI 审批建议卡片
- 未配置 `ARK_API_KEY` 时审批建议正确降级为灰态人工判断
- 知识库页可创建知识库
- 文档上传成功后状态为“就绪”
- 检索“出差住宿标准是多少”可返回回答和引用来源

---

## 6. 当前运行方式

### 6.1 基础依赖

```bash
pnpm install
docker compose up -d
```

### 6.2 BFF

参考 `apps/bff/.env.example` 准备 `.env`：

```bash
pnpm --filter panorama-oa-bff dev
```

### 6.3 前端 mock 模式

默认开发模式仍保留 mock 体验：

```bash
pnpm --filter panorama-oa-web dev
```

### 6.4 前端 real 联调模式

建议单独起一个真实联调实例，不要覆盖默认 `.env.development`：

```bash
$env:VITE_USE_MOCK='false'
$env:VITE_API_MODE='real'
$env:VITE_BFF_TARGET='http://127.0.0.1:8088'
$env:PORT='5174'
pnpm --filter panorama-oa-web dev
```

---

## 7. 当前文件范围

### 7.1 新增的关键文件

```text
packages/ai-utils/
apps/bff/.env.example
apps/bff/src/env.ts
apps/bff/src/services/ai-service.ts
apps/bff/src/services/approval-ai-service.ts
apps/bff/src/services/document-pipeline.ts
apps/bff/src/services/knowledge-service.ts
apps/web/src/api/ai.ts
apps/web/src/api/ai.remote.ts
apps/web/src/composables/useAiSuggestion.ts
apps/web/src/views/approval/components/AiSuggestion.vue
apps/web/src/views/knowledge/index.vue
```

### 7.2 改动的关键文件

```text
apps/bff/src/app.ts
apps/bff/src/server.ts
apps/bff/src/store.ts
apps/bff/test/app.test.ts
apps/web/src/views/approval/ApprovalDetail.vue
apps/web/src/stores/user.ts
apps/web/src/router/index.ts
packages/contracts/src/index.ts
docker-compose.yml
```

---

## 8. 简历叙事建议

做完当前这版之后，OA 项目已经可以稳定升级为：

> 设计并实现 AI 增强的企业级智能审批平台，在原有动态表单与流程引擎基础上，补充 Human-in-the-Loop AI 审批建议、制度知识库检索问答与 SSE 流式交互能力。

面试时最值得展开的两个点：

1. AI 审批建议的置信度分流与人工兜底
2. 制度知识库的上传、检索、引用来源与降级策略

---

## 9. 后续待选项

未执行但可继续扩展：

- `P2`：混合检索、审批页内嵌问答、查询重写
- `P3`：异步管道、权限隔离、断点续传、死任务恢复

当前建议仍然不变：

- 简历项目到 `P0 + P1` 已经足够有亮点
- 后续扩展优先做“可讲深度”的能力，而不是堆功能清单
