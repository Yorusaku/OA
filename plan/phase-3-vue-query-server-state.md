# 阶段 3 Prompt：Vue Query 服务端状态架构与 API 层

> 用途：交给 Agent 的完整指令，让它只实现「阶段 3」——用 @tanstack/vue-query 全面接管服务端状态，搭建 API 封装和 QueryKey 体系，并在一个简单页面中落地示例。

```text
你现在是编码 Agent，请严格按照下面项目说明和约束开发代码。

【一、项目背景】
- 项目名称：全景智能 OA 协同办公平台（企业级 OA / 人事协同中台）
- 核心特性：动态表单引擎 + 可视化工作流引擎，前端引擎化、数据驱动视图、服务端状态与客户端状态彻底分离。
- 仓库已经完成阶段 0～2（monorepo + 基础壳子 + 权限壳 + 布局），你要在此基础上实现「服务端状态与请求层」。

【二、技术栈与工程约束（延续前置阶段）】
- 仓库形态：pnpm workspace + Turborepo，根目录已有 `pnpm-workspace.yaml`、`turbo.json`、根 `package.json`。
- 前端应用：`apps/web`（Vite + Vue 3 + TypeScript），已接入 Vue Router 4、Pinia、@tanstack/vue-query、Element Plus 等。
- 状态管理严格区分：
  - Pinia：只负责 UI/会话状态（侧边栏折叠、主题、Token、当前用户基本信息等）。
  - @tanstack/vue-query：必须负责所有与后端同步的数据（列表、详情、字典、组织树等）。
- 你不能把接口返回的数据塞进 Pinia；如果发现历史代码有这样的趋势，应在本次改动中纠正为 Vue Query 管理。

【三、本次要完成的阶段/范围】
- 仅实现《开发计划》中 **阶段 3：服务端状态与请求层（Vue Query 全面接管）**，包含但不限于：
  1. API 层与类型定义
     - 在 `apps/web/src/api` 下建立清晰的 API 模块划分，例如：
       - `api/http.ts`：axios/fetch 封装，统一请求/响应拦截（可以先做基础版）；
       - `api/types.ts`：通用类型（分页、通用响应结构等）；
       - `api/approval.ts`、`api/dept.ts`、`api/dict.ts` 等模块文件（可以先只实现 1～2 个模块和少量接口）。
     - 接口字段可以根据计划中的“接口约定建议”做合理论证，暂时不需要完全覆盖所有接口，只要结构清晰、便于后续扩展即可。
  2. Vue Query 封装与 QueryKey 体系
     - 在 `apps/web/src` 内增加 `composables` 或 `api/query` 目录，用来封装 Vue Query hooks，例如：
       - `useApprovalList`、`useDeptTree`、`useDictByType` 等；
     - 统一设计 `queryKey` 命名规范（比如：`['approval', 'list', params]`、`['dept', 'tree']`），避免魔法字符串散落。
  3. SWR 与缓存策略
     - 为「高频共享数据」设计合理的 `staleTime`，例如部门树、字典；
     - 保证相同 `queryKey` 的请求自动去重、命中缓存，多处复用同一数据源。
  4. Mutation 与失效策略
     - 实现至少一个 `useMutation` 示例（比如“提交一个 mock 审批单”或“更新某个配置”）；
     - 在 `onSuccess` 中使用 `invalidateQueries` 或 `setQueryData`，触发待办列表/统计等的静默刷新。
  5. 示例页面落地
     - 在某个简单页面（例如“工作台统计”或一个新建的页面）中：
       - 使用 Vue Query 的查询 hook 去展示列表或统计数据；
       - 明确演示缓存命中、loading/error 状态处理；
       - 不要再在组件里手写 `isLoading`、`isError` 状态管理逻辑，而是直接依赖 Vue Query 的返回值。

- 本轮不需要实现动态表单引擎、流程编排等后续阶段，只为这些模块预留良好的 API 结构即可。

【四、实现与代码质量要求】
- 所有服务端数据访问，必须通过统一的 API 封装 + Vue Query hooks 完成，不要出现“组件内直接 axios 请求”的散乱写法。
- QueryKey 必须命名规范、集中管理（建议抽一个 `queryKeys` 常量文件或统一函数）。
- 为避免幻觉和不必要的复杂度：
  - 接口数量不求多，但结构要「可扩展」；
  - 用注释清楚写明当前字段是基于什么业务假设。
- 组件中使用数据时，优先解构 Vue Query 返回的 `data`、`isLoading`、`isError` 等，不要再额外维护重复状态。

【五、你在这轮需要输出什么】
- 清单式说明：
  - 在 `apps/web/src/api` 下新增/修改了哪些文件（路径 + 作用概述）；
  - 在 `apps/web/src/composables` 或 `api/query` 下新增了哪些 Vue Query hooks；
  - 哪些页面组件开始使用 Vue Query 替代原有请求逻辑。
- 给出关键文件的完整或接近完整代码（例如：`http.ts` 封装、一个典型的 `useXXXQuery` 实现、一个示例页面）。
- 如需对已有代码做重构（比如从 axios 直调迁到 Vue Query），请简要说明重构步骤和注意点。

【六、工作方式】
- 第一步：先用不超过 10 行话复述你对本轮任务（阶段 3）的理解。
- 第二步：列出 3～6 条你将要执行的步骤（例如「1. 搭建 http 封装」「2. 定义 queryKeys」「3. 编写 useDeptTree/useDictByType」「4. 改造工作台页面使用 Vue Query」等）。
- 第三步：按步骤执行，边改代码边简洁说明关键进度和设计决策。

现在，请你从阅读并理解上述约束开始，先复述你对本轮任务（阶段 3）的理解，然后给出你的执行步骤，再开始真正修改代码。
```
