# 开发指南

## 1. 环境准备

### 基础依赖

- Node.js 20+
- pnpm 10+
- Docker Desktop

安装依赖：

```bash
pnpm install
```

启动基础服务：

```bash
docker compose up -d
```

当前默认会启动：

- PostgreSQL 16，宿主机端口 `5434`
- Qdrant，宿主机端口 `6333 / 6334`

## 2. BFF 配置

参考 `apps/bff/.env.example` 新建 `apps/bff/.env`。

常用配置如下：

```env
BFF_STORAGE=postgres
BFF_HOST=127.0.0.1
BFF_PORT=8088

PG_HOST=127.0.0.1
PG_PORT=5434
PG_USER=postgres
PG_PASSWORD=postgres
PG_DATABASE=panorama_oa

QDRANT_URL=http://127.0.0.1:6333
QDRANT_COLLECTION_NAME=oa_knowledge_chunks

ARK_API_KEY=
ARK_LLM_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_LLM_MODEL=deepseek-v4-pro
ARK_REQUEST_TIMEOUT_MS=30000
ARK_EMBEDDING_MODEL=doubao-embedding-text-240715
ARK_EMBEDDING_DIMENSIONS=1024

BFF_ENABLE_RULE_TRACE_DEBUG=true
```

说明：

- 不配置 `ARK_API_KEY` 也能启动 BFF。
- 未配置时，AI 审批建议会降级，知识库搜索会走本地 fallback。

启动 BFF：

```bash
pnpm --filter panorama-oa-bff dev
```

生产构建：

```bash
pnpm --filter panorama-oa-bff build
pnpm --filter panorama-oa-bff start
```

## 3. Web 运行模式

### 默认 mock 模式

仓库默认开发体验仍以 mock 为主：

```bash
pnpm --filter panorama-oa-web dev
```

适合：

- 页面开发
- 组件调试
- 不依赖后端联调的视觉与交互调整

### 真实联调模式

如果要验证审批详情 AI 建议、知识库上传与检索，建议单独起一个真实联调实例，不要直接修改默认 `.env.development`。

PowerShell 示例：

```powershell
$env:VITE_USE_MOCK='false'
$env:VITE_API_MODE='real'
$env:VITE_BFF_TARGET='http://127.0.0.1:8088'
$env:PORT='5174'
pnpm --filter panorama-oa-web dev
```

说明：

- `VITE_USE_MOCK=false`：关闭 MSW
- `VITE_API_MODE=real`：接口直连 BFF
- `VITE_BFF_TARGET`：Vite 代理到本地 BFF
- `PORT=5174`：避免与默认开发实例冲突

## 4. 常用命令

### 根目录

```bash
pnpm dev
pnpm dev:bff
pnpm dev:hybrid
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm verify:web
```

### Web

```bash
pnpm --filter panorama-oa-web dev
pnpm --filter panorama-oa-web build
pnpm --filter panorama-oa-web typecheck
pnpm --filter panorama-oa-web test
pnpm --filter panorama-oa-web test:coverage
pnpm --filter panorama-oa-web test:smoke
```

### BFF

```bash
pnpm --filter panorama-oa-bff dev
pnpm --filter panorama-oa-bff build
pnpm --filter panorama-oa-bff typecheck
pnpm --filter panorama-oa-bff test
```

### 共享包

```bash
pnpm --filter @oa/contracts build
pnpm --filter @oa/ai-utils build
```

## 5. AI 联调重点

### 审批建议

真实联调地址示例：

- Web：`http://127.0.0.1:5174`
- BFF：`http://127.0.0.1:8088`

建议流程：

1. 登录 `admin / admin123`
2. 打开审批详情页
3. 点击“生成 AI 建议”
4. 观察流式理由与置信度状态

若未配置 `ARK_API_KEY`，预期行为：

- 建议类型为 `manual_review`
- UI 呈现灰态
- 理由提示需人工判断

### 知识库

建议流程：

1. 打开 `/knowledge`
2. 创建知识库
3. 上传 `TXT / Markdown / PDF`
4. 输入问题并开始检索
5. 确认回答与引用来源展示正常

若未配置 `ARK_API_KEY`，预期行为：

- 上传仍成功
- 文档状态为 `ready`
- 检索走本地 fallback

## 6. 测试建议

本次 AI 收尾至少应跑：

```bash
pnpm --filter panorama-oa-bff test
pnpm --filter panorama-oa-bff build
pnpm --filter panorama-oa-web test
pnpm --filter panorama-oa-web typecheck
```

说明：

- `web test` 已覆盖 `useAiSuggestion`、`AiSuggestion.vue`、知识库页基础交互。
- `bff test` 已覆盖审批建议、知识库 CRUD、fallback 上传与 fallback 检索。

## 7. 开发注意事项

### 审批域

- 不要改坏 `approve / reject / transfer / addSign / remind / withdraw / cancel` 主链路。
- AI 建议必须保持附加信息属性，不能反向驱动真实审批动作。

### 知识库

- 首版上传接口使用 JSON 提交文本内容，不是 multipart。
- `PDF` 文本提取在前端完成。
- 当前不宣称支持 Word 直传。

### 登录态

- 用户信息保存在本地存储时已使用自定义 serializer，避免出现 `"[object Object]"` 导致的登录展示异常。

## 8. 故障排查

### BFF 启动正常但 AI 建议总是灰态

优先检查：

- `ARK_API_KEY` 是否配置
- `ARK_LLM_BASE_URL` 是否可访问
- `ARK_LLM_MODEL` 是否正确

### 文档上传返回 `413`

说明单次上传内容超过当前 `10MB` 限制，需要拆分文档或先提取精简文本。

### 知识库上传成功但向量未命中

可能原因：

- 未配置 `ARK_API_KEY`
- Qdrant 未启动
- Embedding 或向量写入异常

这类情况下系统会自动回退到本地文本检索。
