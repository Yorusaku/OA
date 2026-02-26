# 阶段 0～2 Prompt：Monorepo 初始化 + 基建 + 权限壳 + 布局导航

> 用途：交给 Agent 的完整指令，让它只实现「阶段 0～2」：搭好 pnpm workspace + Turborepo monorepo、初始化 `apps/web` 前端壳子、完成登录/权限基础壳和后台布局导航。

```text
你现在是编码 Agent，请严格按照下面项目说明和约束开发代码。

【一、项目背景】
- 项目名称：全景智能 OA 协同办公平台（企业级 OA / 人事协同中台）
- 核心特性：动态表单引擎 + 可视化工作流引擎，前端引擎化、数据驱动视图、服务端状态与客户端状态彻底分离。
- 我已经在 .cursor/plans 中写好一份《全景智能 OA 开发计划》（含阶段 0～8、技术栈、功能模块清单、接口约定等），你要以那份计划为主，不要私自更换整体架构。

【二、技术栈与工程约束】
- 仓库形态：使用 pnpm workspace + Turborepo 的 monorepo。
- 构建工具：Vite 5 + TypeScript 5。
- 前端框架：Vue 3.5，必须使用 Composition API + `<script setup>`。
- 状态管理：
  - Pinia：只管理客户端 UI/会话状态（侧边栏折叠、主题、Token 等）。
  - @tanstack/vue-query：负责所有服务端状态，禁止再把接口数据塞进 Pinia。
- 路由：Vue Router 4，支持后端返回菜单/权限后动态挂载路由。
- UI：Tailwind CSS + Element Plus（按需引入），后续会用 Tailwind Design Tokens 覆写 Element Plus 主题。
- 其他：VueUse、VeeValidate 等按计划后续接入，本轮只需为后续留好目录结构。
- 流程引擎：后续基于 LogicFlow 实现（见 phase-14-migrate-to-logicflow.md）。

【三、仓库结构约束】
- 请严格使用以下结构（可做小幅调整，但不要改变核心布局）：
  - 根目录：
    - `pnpm-workspace.yaml`（packages: ["apps/*", "packages/*"]）
    - `turbo.json`（定义 build/dev/lint 等任务管道）
    - 根 `package.json`：只写 `"build": "turbo run build"`, `"dev": "turbo run dev"`, `"lint": "turbo run lint"` 等委托命令。
  - `apps/web`：OA 前端主应用（Vite + Vue + TS），包含 `src/api`、`components`、`composables`、`directives`、`layouts`、`router`、`stores`、`styles`、`types`、`views` 等目录。
  - `packages/*`：可先只建立最基础的（例如共享 tsconfig、eslint 配置），不需要立刻写功能代码。
- Turborepo 使用规则：
  - 各子包（例如 `apps/web/package.json`）里定义 `build`、`dev`、`lint` 脚本。
  - `turbo.json` 中的 `build` 任务要配置 `dependsOn: ["^build"]` 和 `outputs: ["dist/**"]`，以支持增量构建和缓存。
  - 根 `package.json` 不允许写「cd apps/web && ...」这种脚本。

【四、本次要完成的阶段/范围】
- 请只实现《开发计划》中 **阶段 0～2** 的内容，范围包括：
  1. 阶段 0：工程初始化与基建
     - 初始化 pnpm workspace + Turborepo：
       - 在根创建 `pnpm-workspace.yaml`，声明 `packages: ["apps/*", "packages/*"]`；
       - 在根创建 `turbo.json`，定义 build/dev/lint 任务及 `dependsOn`、`outputs`；
       - 在根 `package.json` 中只配置 `turbo run build/dev/lint` 等委托脚本。
     - 在 `apps/web` 下用 Vite+Vue3+TS 创建前端应用；
     - 在 `apps/web` 接入 Tailwind CSS、Element Plus（按需引入）、Vue Router 4、Pinia、@tanstack/vue-query、VueUse；
     - 在 `apps/web` 配置 Vue Query 的 QueryClient（合理的 staleTime/gcTime）；
     - 配置 ESLint + TypeScript 严格模式（可放在根或 apps/web）。
  2. 阶段 1：权限引擎基础壳
     - 创建 `useUserStore` 和 `useAppStore`，实现 Token、用户信息、侧边栏折叠/主题等基础字段（接口可先用 mock/stub）；
     - 设计静态路由 + 动态路由位点（登录、404、主布局、占位的业务页）；
     - 设计 RBAC 相关的类型结构（角色、权限码、菜单结构），本轮可以只做前端假数据；
     - 实现基础的 `v-auth` 指令骨架（暂时只支持前端权限码数组）。
  3. 阶段 2：布局与导航
     - 使用 Element Plus 的 Layout + Menu + Header 搭出后台框架布局；
     - 侧边栏菜单从一个 mock 的菜单树中渲染，并和路由联动高亮；
     - 顶栏支持显示当前用户昵称（mock）、退出按钮（清空 Token/用户信息并跳回登录）、侧边栏折叠按钮；
     - 内容区通过 `<router-view />` 渲染占位页（比如“工作台”“审批中心”等空白页面，为后续实现预留位置）。

- 其他阶段（动态表单引擎、流程编排、业务页面、性能优化等）本轮不要实现，只需要在目录层面为后续留出合理位置，比如预留 `components/dynamic-form`、`components/workflow` 等目录即可。

【五、实现与代码质量要求】
- 严格区分 Pinia 与 Vue Query 的职责，即使目前接口是 mock，也请按未来真实接口的使用方式来设计 API 层与 QueryKey。
- 所有新建/修改的文件，命名要清晰且与计划术语一致，例如：
  - store：`useUserStore`、`useAppStore`；
  - 布局：`layouts/MainLayout.vue`；
  - 路由：`router/index.ts`、`router/routes.ts` 等。
- 可以使用中文注释说明设计意图，但保持简洁，不要啰嗦解释每一行显而易见的代码。
- 如果因为没有真实后端，你需要假设接口格式，请集中在 `src/api` 下定义，并用注释写明“这是当前的假设结构，后续可根据真实接口调整”。

【六、你在这轮需要输出什么】
- 明确列出：
  - 在根目录新增/修改了哪些文件（特别是 `pnpm-workspace.yaml`、`turbo.json`、根 `package.json`）及作用。
  - 在 `apps/web` 中新增/修改了哪些核心文件（`main.ts`、`App.vue`、`router`、`stores`、布局组件等）。
- 关键配置（比如 turbo 任务、pnpm workspace、Vite/TS 配置）需要给出完整或接近完整的代码，以便我直接 review 和运行。
- 有任何无法确定的地方（例如接口字段），请在注释和文字描述里显式写出你的假设。

【七、工作方式】
- 第一步：先用不超过 10 行话复述你对本轮任务和约束的理解。
- 第二步：给出 3～6 条你打算执行的步骤。
- 第三步：按步骤执行，边改代码边简洁说明你正在做什么（例如“已创建 monorepo 基础结构”、“已完成 apps/web 基本脚手架并接入 Tailwind + Element Plus”等）。

现在，请你从阅读并理解上述约束开始，先复述你对本轮任务（阶段 0～2）的理解，然后给出你的执行步骤，再开始真正修改代码。
```
