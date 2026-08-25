# 知识库对话 — 实现计划 & 进度

> 2026-08-24 制定，按步骤执行，每完成一步标记 ✅。
> **交接规则：每个 agent 执行动作前后都要更新本文件的进度与「执行日志」，保证下一个 agent 能直接接手。**
> 进度快照更新于：2026/08/25 23:41（Codex 第二次接手：chat.vue 编码损坏已彻底修复，Vite 编译恢复 200，服务已重启，进入浏览器走查阶段）

## 已确认决策

- 独立扁平路由 `/knowledge/:kbId/chat`（hidden，不显示菜单）
- `createStreamingLLM` 放 `ai-utils` 包（与 `createLLM` 同级）
- InMemory 模式下从 `knowledge-service.ts` 导出 `__knowledgeState` 共享

## 实现步骤 & 进度

### Step 1: 扩展 LLM 支持流式输出 ✅
**文件：** `packages/ai-utils/src/llm/config.ts`
- 新增 `createStreamingLLM()` 工厂函数
- 设置 `stream: true`，返回 `AsyncIterable<{ content: string; usage?: AiUsage }>`
- 解析 SSE `data: {...}` 行，提取 `choices[0].delta.content`
- 复用已有 `resolveBaseUrl()`、`resolveModel()`、`resolveTimeout()`
- 实际产物：`config.ts:111` 导出 `createStreamingLLM(options)`，类型 `StreamingLLM.stream()` 返回 AsyncIterable（2026-08-25 已核对源码存在，构建通过）

### Step 2: 新增共享类型契约 ✅
**文件：** `packages/contracts/src/index.ts`
- `KnowledgeChatSession`、`KnowledgeChatMessage`、`ChatStreamEvent`
- `CreateChatSessionRequest`、`ChatStreamRequest`
- 实际产物：`contracts/src/index.ts` 448-478 行；`ChatStreamEvent` 含 `meta / sources / chunk / done` 四种事件（2026-08-25 已核对，构建通过）

### Step 3: 新增数据库表 ✅
**文件：** `apps/bff/src/store.ts`
- `knowledge_chat_sessions` 表（id, kb_id, title, created_at, updated_at）
- `knowledge_chat_messages` 表（id, session_id, role, content, sources, usage, created_at）
- 级联删除外键
- 实际产物：`store.ts` 95-119 行，`messages.session_id` 外键 `ON DELETE CASCADE`（2026-08-25 已核对；Postgres 实测已通过，见 Step 14）

### Step 4: 新增 BFF 聊天服务 ✅
**新文件：** `apps/bff/src/services/knowledge-chat-service.ts`
- Session CRUD：create、list、delete、rename
- Message：list
- `streamChat`：验证 KB → 保存用户消息 → Qdrant 检索 → 组装上下文 → 流式 LLM → 保存 assistant 消息
- 降级：无 API Key 时回退文本匹配 + 非流式合成
- 实际产物：新文件已存在，Postgres / InMemory 双存储（`hasSqlStore` 分流）；无 `ARK_API_KEY` 时走 `getMockKnowledgeAnswer` 本地模板并分片模拟流式；复用 `knowledge-service` 的 `retrieveKnowledgeSources` 与 `__knowledgeState`（2026-08-25 已通读并实测）

### Step 5: 注册 BFF 路由 ✅
**文件：** `apps/bff/src/app.ts`
- 6 个新路由（Session CRUD + Messages + SSE Stream）
- SSE 路由复用 `approval-suggestion/stream` 模式
- 实际产物：`app.ts` 830-952 行，路由前缀 `/api/v1/knowledge/:kbId/chat`：
  - `POST /sessions`（创建）
  - `GET /sessions`（列表）
  - `PUT /sessions/:sessionId`（重命名）
  - `DELETE /sessions/:sessionId`（删除）
  - `GET /sessions/:sessionId/messages`（历史消息）
  - `POST /sessions/:sessionId/stream`（SSE 流式）
- 状态：已注册并实测通过（2026-08-25）

### Step 6: 安装 Markdown 依赖 ✅
```bash
pnpm --filter panorama-oa-web add marked highlight.js
```
- 实际产物：`apps/web/package.json` 已有 `marked@^18.0.11`、`highlight.js@^11.12.0`，`pnpm-lock.yaml` 已更新（2026-08-25 已核对）

### Step 7: 新增前端 API 层 ✅
**文件：** `apps/web/src/api/ai.remote.ts` + `apps/web/src/api/ai.ts`
- 远程函数（Session CRUD + Stream）
- Mock 实现 + 门控函数
- 实际产物：
  - `ai.remote.ts` +126 行：远程 Session CRUD + SSE Stream（解析 `meta / sources / chunk / done`）
  - `ai.ts` 811-878 行：`listKnowledgeChatSessions / createKnowledgeChatSession / renameKnowledgeChatSession / deleteKnowledgeChatSession / listKnowledgeChatMessages / streamKnowledgeChat`，mock/real 门控与既有知识库 API 一致
- ⚠️ mock 分支（无 BFF 纯前端模式）尚未实测

### Step 8: 新增 Pinia Store ✅
**新文件：** `apps/web/src/stores/knowledgeChat.ts`
- sessions、currentSessionId、messages、streamingContent、status
- 实际产物：`useKnowledgeChatStore`，含 `kbId / sessions / currentSessionId / messages / streamingContent / streamingSources / status / errorMessage / isStreaming`；`AbortController` 管理中断；`sendMessage / stop / retry`（2026-08-25 已通读）

### Step 9: 新增 Composable ✅
**新文件：** `apps/web/src/composables/useKnowledgeChat.ts`
- 复用 `useAiSuggestion` 流式状态机模式
- sendMessage / stop / retry
- 实际产物：`useKnowledgeChat(kbId)`，watch kbId 自动 `initialize`（加载会话并选中第一个）（2026-08-25 已通读）

### Step 10: 新建 ChatMarkdown 组件 ✅
**新文件：** `apps/web/src/components/chat/ChatMarkdown.vue`
- marked + highlight.js 渲染
- 实际产物：`marked` gfm+breaks，`hljs` 代码高亮，自实现 `sanitize`（移除 script/iframe、on* 属性、javascript: 链接）（2026-08-25 已通读）

### Step 11: 新建知识库对话页面 ✅（编码损坏已彻底修复，Vite 编译通过）
**新文件：** `apps/web/src/views/knowledge/chat.vue`
- 左侧会话列表 + 主区域消息 + 底部输入栏
- 流式打字机效果 + 来源引用展示
- 实际产物：文件已存在（约 13.6KB）；含会话重命名/删除、建议问题、停止生成、重试、来源折叠卡片、移动端响应式
- ⚠️ **2026-08-25 编码损坏事故与修复（已闭环）**：文件原有 12 处中文编码损坏。第一轮 PowerShell 替换误伤文字（发票→发送票 等）；第二轮 Node 脚本恢复文字并清除替换字符，但被吞的结构字符（引号、`<`、换行）仍缺失，Vite 编译 500；第三轮修复脚本卡死未写入。最终由 `scripts-tmp-fix4.cjs` 补齐全部 11 处结构损坏（10 条规则，其中 summary 闭合 2 处），已验证无残留字符且 Vite 编译返回 200
- 浏览器走查尚未进行（待用户或 Playwright 验证渲染效果）

### Step 12: 新增路由 ✅
**文件：** `apps/web/src/router/index.ts`
- `/knowledge/:kbId/chat` 独立扁平路由，hidden
- 实际产物：`router/index.ts:40` 懒加载组件，`437-439` 行路由 `name: KnowledgeChat`（2026-08-25 已核对）；路由未挂菜单，天然 hidden

### Step 13: 知识库列表页添加入口 ✅
**文件：** `apps/web/src/views/knowledge/index.vue`
- 每个知识库 item 添加「进入对话」按钮
- 实际产物：`index.vue:325` `enterKnowledgeChat()` + `386-387` 行 `ChatDotRound` 图标「对话」按钮（2026-08-25 已核对）

### Step 14: 验证 ✅
- 验证结果（2026-08-25）：
  - [x] `@oa/contracts` / `@oa/ai-utils` build 通过
  - [x] `panorama-oa-bff test`：21/21 通过（新增 `apps/bff/test/knowledge-chat.test.ts` 6 个用例：创建/列表、404、SSE 事件序列 + 消息落库、不存在会话 error 事件、重命名校验、级联删除）
  - [x] `panorama-oa-web typecheck` 通过
  - [x] `panorama-oa-web test`：141/141 通过（24 个文件）
  - [x] InMemory 模式真实 HTTP 联调（BFF 8088）：建库→传文档→建会话→SSE 流，事件序列 `meta → sources → chunk* → done` 正确，中文全链路无损，无 ARK_API_KEY 时 fallback 答案正常
  - [x] **Postgres 模式实测**（2026-08-25 通过）：启动 Docker Desktop + `docker compose up -d`，curl 全流程通过（事件序列 `meta → sources → chunk* → done`、中文无损），psql 确认两张新表结构、`ON DELETE CASCADE` 外键与数据落库
  - [x] **Mock 模式实测**：`VITE_USE_MOCK=true` 启动，进入对话页发送中文问题，确认 Mock 会话创建、流式回复、来源引用和新建会话均正常
  - [x] **浏览器走查**：桌面端完成登录 → 知识库列表 →「对话」入口 → 提问/来源卡片/Markdown/重命名/新建会话；移动端确认侧栏隐藏、输入框与发送入口可用
  - [ ] 有 ARK_API_KEY 时的真实 LLM 流式（可选，需要 key）

## 工作区注意事项（交接给下一个 agent）

- 工作区还存在与本计划**无关**的未提交改动，属于用户/之前任务，**不要回滚**：
  `ai-audit-service.ts`、`useAiSuggestion.ts`、`AiSuggestion.vue`、`AiAuditPanel.vue`、`docs/数字化协同审批平台 副本.md`
- 未提交的本计划产物（untracked）：
  `apps/bff/src/services/knowledge-chat-service.ts`、`apps/bff/test/knowledge-chat.test.ts`、`apps/web/src/components/chat/`、`apps/web/src/composables/useKnowledgeChat.ts`、`apps/web/src/stores/knowledgeChat.ts`、`apps/web/src/views/knowledge/chat.vue`
- 全部改动尚未 commit，验证通过后建议按功能拆分提交（知识库对话一个提交，无关改动保持不动）
- 联调命令见 `AGENTS.md` 第 7 节「真实联调模式」
- PowerShell 写中文文件注意：`-Body` 传字符串会被默认编码转码，需用 `[Text.Encoding]::UTF8.GetBytes()`；字符串插值里 `$变量?` 会把 `?` 吃进变量名，拼接特殊字符优先用 Node 脚本或 here-string
- **apply_patch 工具在此环境不可用**（内容传不进去）；写/改文件用 PowerShell here-string + `[IO.File]::WriteAllText(…, [Text.UTF8Encoding]::new($false))`，或写临时 `.cjs` 用 node 执行
- `vue-tsc` typecheck **查不出模板语法错误**，必须以 Vite 编译（curl 模块 URL）或浏览器实际渲染为准
- PowerShell 双引号字符串里 `$变量?` 会把 `?` 吃进变量名；`$pid` 是只读变量；`node -e` 内联含 `{}`/引号会被 PS 解析报错，脚本一律落盘执行
- `Invoke-RestMethod -Body` 传中文字符串会转码损坏，必须 `[Text.Encoding]::UTF8.GetBytes($json)`
- 当前运行中的服务（2026-08-25 下午重启）：BFF Postgres 模式 `http://127.0.0.1:8088`（exec session 77113）；Web real 模式 `http://localhost:5173/`（exec session 4463，代理→8088）；Docker 容器 panorama-oa-postgres(5434) / panorama-oa-qdrant(6333)
- PG 库里有更早联调留下的乱码知识库记录（"??????"×2）：只记录、不擅自删
- 临时文件（全部验证通过后删除）：`scripts-tmp-fix3.cjs`（卡死版）、`scripts-tmp-fix4.cjs`（最终修复版）、`apps/web/e2e-debug-chat.mjs`、`apps/web/e2e-walkthrough-chat.mjs`、`apps/web/e2e-walkthrough-shots/`

## 执行日志

- **2026-08-25（Codex）**：
  1. 补记 Step 1-13 完成状态（此前代码已在工作区完成但未记录），逐文件核对产物
  2. 构建 `@oa/contracts`、`@oa/ai-utils` 通过
  3. 跑通 `panorama-oa-bff test`（原 15 用例）与 `panorama-oa-web test`（141 用例）、`panorama-oa-web typecheck`
  4. 新增 `apps/bff/test/knowledge-chat.test.ts`（6 用例），BFF 测试 21/21 通过
  5. 启动 BFF（InMemory，8088），真实 HTTP 联调：知识库→文档→会话→SSE 流全链路通过，确认无 Key fallback、事件序列、中文无损、消息落库
  6. 发现 `chat.vue` 12 处中文编码损坏（`U+FFFD?`），用 Node 脚本修复并全库扫描确认无残留，typecheck 复跑通过
  7. 启动前端 real 模式 dev server（http://localhost:5173/，代理指向 8088），待浏览器走查
  8. 全局偏好补充：`~/.codex/AGENTS.md` 增加「内部思考、推理、计划也默认使用中文」
  9. 遗留：Postgres 实测（等 Docker）、Mock 模式实测、浏览器走查、commit
- **2026-08-25（前一个 agent 执行、未记录，由本次 Codex 据交接摘要补记）**：
  1. Postgres 模式实测通过：启动 Docker Desktop + `docker compose up -d`，curl 走通建库→文档→会话→SSE 流，psql 确认新表结构、级联外键与数据落库（Step 14 对应项由此完成）
  2. 浏览器走查发现 chat.vue 动态导入失败（Vite 500）：第二轮修复只恢复文字、未补回被吞的结构字符
  3. 编写走查脚本 `apps/web/e2e-walkthrough-chat.mjs`（用 `button[title="进入对话"]` 定位入口）与 `e2e-debug-chat.mjs`
  4. 第三轮修复脚本 `scripts-tmp-fix3.cjs` 卡死（文件未写入），留下 4 个卡死进程；用户要求暂停
- **2026/08/25 23:41（Codex 第二次接手）**：
  1. 核对现状：计划文件落后于实际进度；chat.vue 仍有 11 处结构损坏；4 个卡死进程残留；Docker/BFF/Web 全部已停
  2. 杀掉 4 个卡死进程（102984 powershell / 82320 cmd / 109412、109600 node）
  3. 通读 chat.vue 全文定位剩余损坏：侧栏标题缺引号（`'知识库对话 }}`）、重命名 tooltip 缺引号、h1/p/ElTag/summary(×2) 缺 `<`、ElEmpty description 缺闭合引号、两处按钮文字与 `</ElButton>` 挤一行、「报销缺少发送票」错字
  4. 写幂等修复脚本 `scripts-tmp-fix4.cjs` 运行：10 条规则全部命中（共 11 处），写回成功，替换字符残留为 0
  5. 重启 Docker Desktop（daemon 29.2.0）→ `docker compose up -d`（postgres healthy / qdrant running）
  6. 重启 BFF（Postgres 模式 8088，session 77113）与 Web real 模式（5173，session 4463）
  7. 验证：`GET /src/views/knowledge/chat.vue` 返回 200（修复前 500），编译产物约 52KB
  8. 下一步：Playwright 走查 → 截图核对 → Mock 模式验证 → 清理临时文件 → 建议 commit

- **2026/8/26 00:02:22（Codex 第三次接手，进行中）**：
  1. 核对现状：BFF 8088 / Web real 5173 / Web mock 5175 三服务均在运行；计划文件头部快照 23:41
  2. 复跑 Mock 走查（E2E_BASE=5175）：失败，等待助手回复超时；error.png 显示停在生成中
  3. 写 e2e-debug-mock2/3.mjs 排查：点击路径下 Enter 发送被吞（DOM keydown 触发但 submitMessage 未执行），点击「发送」按钮则全链路正常（用户消息+mock 回复+会话创建）
  4. 同脚本对照 real 5173：Enter 正常 → 定位根因：mock 的 loadSessions 有 MOCK_DELAY_MS 延迟，期间 status='loading' 被 isStreaming 视为流式 → canSend=false，Enter 被静默吞掉；real 模式 BFF 响应快所以不易触发。属真实 UX bug
  5. 修复方案（进行中）：stores/knowledgeChat.ts 的 activeController 改 shallowRef，isStreaming 仅表示真实发送/流式（loading 且有 activeController 才算），会话列表加载不再锁发送
- **2026/8/26（Codex 第四次接手）**：
  1. 复跑 `panorama-oa-web typecheck` 与 `panorama-oa-web build`，均通过；确认 `chat.vue` 模板已可被 Vite 正常编译
  2. 启动 Mock 模式前端（5175），完成知识库列表 → 对话 → 中文提问 → 流式回复 → 来源卡片 → 新建会话走查
  3. 修复 Mock 中文检索：中文查询按 2-4 字词组切分，避免空格分词导致来源命中为 0；新增走查确认命中《报销制度示例.txt》
  4. 完成桌面端会话重命名与移动端布局走查：侧栏按响应式规则隐藏，输入框和发送按钮可用
  5. 清理本轮调试脚本、临时修复脚本和走查截图目录；保留正式 `e2e-walkthrough-chat.mjs`
