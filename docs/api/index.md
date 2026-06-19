# API 文档

这里整理的是当前项目内与开发最相关的接口和模块说明，重点覆盖审批域、前端状态层和基础 HTTP 封装。

## 文档入口

- [Composables](/api/composables)
- [Stores](/api/stores)
- [HTTP 与 API](/api/http)

## 当前新增的 AI / 知识库接口

后端新增：

- `POST /api/v1/ai/approval-suggestion`
- `POST /api/v1/ai/approval-suggestion/stream`
- `GET /api/v1/knowledge`
- `POST /api/v1/knowledge`
- `DELETE /api/v1/knowledge/:id`
- `GET /api/v1/knowledge/:kbId/documents`
- `POST /api/v1/knowledge/:kbId/documents`
- `DELETE /api/v1/knowledge/:kbId/documents/:id`
- `POST /api/v1/knowledge/:kbId/search`

共享契约位于 `@oa/contracts`，前后端统一消费。
