# 阶段 12 Prompt：Monorepo 公共包与 Mock 数据（packages/utils + axios 封装 + Mock API）

&gt; 用途：交给 Agent 的完整指令，让它只实现「阶段 12」——创建 packages/utils 公共包、封装 axios HTTP 客户端、建立完整的 Mock API 体系，让项目数据全部通过接口调用，为后续联调真实后端做好准备。

```text
你现在是编码 Agent，请严格按照下面项目说明和约束开发代码。

【一、项目背景】
- 项目名称：全景智能 OA 协同办公平台（企业级 OA / 人事协同中台）。
- 当前状态：阶段 0～11 已完成，包括：
  - 完整的架构、权限引擎、动态表单、工作流引擎、性能优化、代码质量提升、功能扩展、DevOps 等。
- 本轮目标：建立 monorepo 的公共包体系，封装统一的 HTTP 客户端，建立完整的 Mock API 数据层，让所有数据通过接口调用，而不是硬编码在前端。

【二、技术与约束方向】
- 公共包方向：
  - 创建 `packages/utils` 包，存放可复用的工具函数、常量、类型定义；
  - 公共包使用 TypeScript，支持独立构建和类型导出；
  - 公共包可以被 `apps/web` 以及未来的其他 apps 引用。
- HTTP 客户端方向：
  - 基于 axios 封装统一的 HTTP 客户端；
  - 支持请求/响应拦截器、错误处理、Token 管理；
  - 支持请求取消、重试机制、超时配置。
- Mock 数据方向：
  - 使用 MSW (Mock Service Worker) 建立 Mock API 层；
  - Mock 数据结构与真实后端 API 保持一致；
  - 支持 Mock 数据的开关控制，方便切换真实后端。

【三、本次要完成的阶段/范围】
仅实现《开发计划》中 **阶段 12：Monorepo 公共包与 Mock 数据**，包含：

1. 创建 packages/utils 公共包
   - 初始化 packages/utils 包结构：
     - 创建 `packages/utils/package.json`，配置为 TypeScript 库；
     - 创建 `packages/utils/tsconfig.json`，配置类型导出；
     - 创建 `packages/utils/src/index.ts` 作为入口文件；
     - 在根 `pnpm-workspace.yaml` 中确认包含 `packages/*`。
   - 工具函数模块：
     - `packages/utils/src/constants.ts` - 项目常量（API 前缀、错误码、枚举等）；
     - `packages/utils/src/formatters.ts` - 数据格式化函数（日期、金额、文件大小等）；
     - `packages/utils/src/validators.ts` - 通用校验函数（手机号、邮箱、身份证等）；
     - `packages/utils/src/storage.ts` - localStorage/sessionStorage 封装；
     - `packages/utils/src/helpers.ts` - 通用帮助函数（防抖、节流、深拷贝等）。
   - 类型定义模块：
     - `packages/utils/src/types/api.ts` - API 通用响应类型；
     - `packages/utils/src/types/common.ts` - 通用业务类型；
     - `packages/utils/src/types/index.ts` - 类型导出入口。
   - 配置公共包导出：
     - 在 `packages/utils/src/index.ts` 中统一导出所有模块；
     - 配置 `package.json` 的 `main`、`module`、`types` 字段；
     - 在 `apps/web/package.json` 中添加对 `@oa/utils` 的依赖。

2. 封装 axios HTTP 客户端
   - 创建 HTTP 客户端模块（位于 `packages/utils/src/http/`）：
     - `packages/utils/src/http/client.ts` - axios 实例创建和基础配置；
     - `packages/utils/src/http/interceptors.ts` - 请求/响应拦截器；
     - `packages/utils/src/http/errors.ts` - 错误类定义和错误处理；
     - `packages/utils/src/http/index.ts` - HTTP 客户端导出。
   - 请求拦截器功能：
     - 自动添加 Token 到请求头；
     - 自动添加 Content-Type 和其他通用请求头；
     - 支持请求取消（AbortController）；
     - 支持请求重试机制（可配置重试次数和间隔）。
   - 响应拦截器功能：
     - 统一处理响应数据格式（解构 data）；
     - 统一处理错误状态码（401、403、500 等）；
     - 401 时自动清理 Token 并跳转到登录页；
     - 支持响应数据的类型断言。
   - 错误处理：
     - 定义 `HttpError` 类，继承自 `Error`；
     - 区分网络错误、业务错误、超时错误等；
     - 提供友好的错误信息和错误码。
   - 导出 HTTP 方法：
     - `get`、`post`、`put`、`delete`、`patch` 等通用方法；
     - 支持泛型类型，确保类型安全；
     - 支持请求配置（timeout、headers、cancelToken 等）。

3. 建立 MSW Mock API 体系
   - 安装和配置 MSW：
     - 在 `apps/web` 中安装 `msw` 依赖；
     - 创建 `apps/web/src/mocks/` 目录结构；
     - 创建 `apps/web/src/mocks/browser.ts` - 浏览器端 Mock 服务；
     - 创建 `apps/web/src/mocks/server.ts` - 服务端 Mock 服务（可选）。
   - Mock 数据模块：
     - `apps/web/src/mocks/data/` - Mock 数据存放目录；
     - `apps/web/src/mocks/data/user.ts` - 用户相关 Mock 数据；
     - `apps/web/src/mocks/data/approval.ts` - 审批相关 Mock 数据；
     - `apps/web/src/mocks/data/workflow.ts` - 工作流相关 Mock 数据；
     - `apps/web/src/mocks/data/org.ts` - 组织架构相关 Mock 数据；
     - `apps/web/src/mocks/data/dict.ts` - 字典相关 Mock 数据。
   - Mock API 处理函数：
     - `apps/web/src/mocks/handlers/` - Mock API 处理函数目录；
     - `apps/web/src/mocks/handlers/user.ts` - 用户相关 API；
     - `apps/web/src/mocks/handlers/approval.ts` - 审批相关 API；
     - `apps/web/src/mocks/handlers/workflow.ts` - 工作流相关 API；
     - `apps/web/src/mocks/handlers/org.ts` - 组织架构相关 API；
     - `apps/web/src/mocks/handlers/dict.ts` - 字典相关 API；
     - `apps/web/src/mocks/handlers/index.ts` - 所有 handlers 聚合。
   - Mock API 设计规范：
     - RESTful API 风格（GET/POST/PUT/DELETE）；
     - 统一的响应格式：`{ code: number, message: string, data: any }`；
     - 支持分页参数（page、pageSize）；
     - 支持查询参数（keyword、status 等）；
     - 支持延迟响应，模拟网络延迟（`delay(300)`）。
   - Mock 开关控制：
     - 创建环境变量 `VITE_USE_MOCK=true/false`；
     - 在 `main.ts` 中根据环境变量决定是否启用 MSW；
     - 提供开发/生产环境的不同配置。

4. 重构现有 API 层
   - 迁移现有 API 调用到新的 HTTP 客户端：
     - 将 `apps/web/src/api/http.ts` 的逻辑迁移到 `@oa/utils/http`；
     - 重构 `apps/web/src/api/` 下的所有 API 模块；
     - 使用新的 HTTP 客户端替换原有的请求方式。
   - API 模块重构示例：
     - `apps/web/src/api/user.ts` - 使用新的 HTTP 客户端；
     - `apps/web/src/api/approval.ts` - 使用新的 HTTP 客户端；
     - `apps/web/src/api/workflow.ts` - 使用新的 HTTP 客户端；
     - 其他 API 模块类似重构。
   - composables 重构：
     - 更新 `apps/web/src/composables/useApproval.ts`；
     - 更新 `apps/web/src/composables/useWorkflow.ts`；
     - 更新 `apps/web/src/composables/useDept.ts`；
     - 更新 `apps/web/src/composables/useDict.ts`；
     - 确保使用新的 API 模块和类型定义。
   - 类型定义迁移：
     - 将 `apps/web/src/api/types.ts` 的类型迁移到 `@oa/utils/types`；
     - 确保所有模块都使用公共包的类型定义；
     - 删除重复的类型定义。

5. 验证和测试
   - 验证公共包：
     - 确保 `@oa/utils` 可以被正确导入和使用；
     - 确保类型定义可以正常工作；
     - 运行 TypeScript 编译，确保无错误。
   - 验证 HTTP 客户端：
     - 测试请求/响应拦截器正常工作；
     - 测试错误处理正常工作；
     - 测试 Token 管理正常工作。
   - 验证 Mock API：
     - 确保所有 API 都有对应的 Mock 实现；
     - 确保 Mock 数据结构合理；
     - 确保 Mock 开关正常工作。
   - 验证功能完整性：
     - 登录功能正常工作；
     - 审批流程正常工作；
     - 工作流编辑正常工作；
     - 所有页面数据正常加载。

【四、实现与代码质量要求】
- 公共包必须是"可复用"的：
  - 公共包不依赖 `apps/web` 或其他具体应用；
  - 公共包的 API 设计要稳定，考虑未来扩展性；
  - 公共包要有清晰的文档和注释。
- HTTP 客户端必须是"健壮"的：
  - 要有完善的错误处理机制；
  - 要有良好的类型支持；
  - 要支持常见的 HTTP 功能（拦截器、取消、重试等）。
- Mock API 必须是"真实"的：
  - Mock 数据结构要与真实后端保持一致；
  - Mock API 要支持常见的查询和操作；
  - Mock 数据要足够丰富，能演示完整功能。
- 重构必须是"渐进式"的：
  - 保持现有功能不破坏；
  - 可以分模块逐步重构；
  - 每个模块重构后要测试验证。

【五、你在这轮需要输出什么】
- 明确列出：
  - 新增的 `packages/utils` 包结构和文件；
  - HTTP 客户端的封装实现；
  - MSW Mock API 的实现；
  - 重构的 API 模块和 composables。
- 给出核心代码：
  - `packages/utils` 的入口和主要模块；
  - HTTP 客户端的拦截器和错误处理；
  - Mock API 的 handlers 和数据；
  - 重构后的 API 模块示例。

【六、工作方式】
- 第一步：用不超过 10 行话复述你对本轮任务（阶段 12）的理解。
- 第二步：列出 3～6 条你将要执行的步骤（例如「1. 创建 packages/utils 包」「2. 封装 axios HTTP 客户端」「3. 建立 MSW Mock API」「4. 重构现有 API 层」「5. 验证测试」等）。
- 第三步：按步骤执行，边改代码边简洁说明关键进度和设计决策。

现在，请你从阅读并理解上述约束开始，先复述你对本轮任务（阶段 12）的理解，然后给出你的执行步骤，再开始真正修改代码。
```
