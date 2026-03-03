# 阶段 5 Prompt：可视化流程编排引擎（@vue-flow/core）📜 **历史文档**

> 用途：历史文档，记录基于 @vue-flow/core 的工作流引擎实现。
> **注意**：此文档已不再使用，当前工作流引擎已迁移至 LogicFlow（见 `phase-14-migrate-to-logicflow.md`）。

```text
你现在是编码 Agent，请严格按照下面项目说明和约束开发代码。

【一、项目背景】
- 项目名称：全景智能 OA 协同办公平台（企业级 OA / 人事协同中台）。
- 目前仓库已完成阶段 0～4：monorepo 基建、权限壳与布局、Vue Query 服务端状态架构、动态表单引擎（DynamicForm + useDynamicValidate）。
- 本轮目标是实现「可视化流程编排引擎」，让管理员可以通过画布拖拽节点 + 连线配置审批流程，并为每个节点绑定表单 Schema。

【二、技术与架构约束】
- 流程画布引擎：使用 @vue-flow/core。
- 节点与边的数据结构应与整体「工作流定义」模型对齐，便于与后端的读写。（可以先设计一个前端版的类型，后续再适配真实接口。）
- 与动态表单的关系：
  - 每个审批节点可以绑定一个表单 Schema ID（或标识符），用于后续发起审批时拉取对应表单结构。
  - 本轮不处理发起审批，只需要完成「配置与保存」侧的流程定义。

【三、本次要完成的阶段/范围】
- 仅实现《开发计划》中 **阶段 5：流程编排引擎（@vue-flow/core）**，包含：

1. 工作流类型与模型定义
   - 在 `apps/web/src/types` 下定义工作流相关类型：
     - `WorkflowDefinition`：流程 ID、名称、描述、状态（启用/停用）、节点列表、边列表等；
     - `WorkflowNode`：节点 ID、类型（发起/审批/抄送/条件）、显示名称、处理人配置（角色/部门/人员）、绑定表单 Schema ID 等；
     - `WorkflowEdge`：起点/终点节点 ID、条件表达式（对条件节点可选）、顺序等。

2. 画布组件 `<WorkflowCanvas />`
   - 在 `apps/web/src/components/workflow` 下实现画布组件：
     - 使用 @vue-flow/core 渲染节点与边；
     - 支持基础交互：添加节点、拖拽位置、连线、删除节点/连线；
     - 节点类型至少包括：发起节点、审批节点、抄送节点、条件节点（条件节点可以先只提供占位配置）。
   - 为不同类型节点设计对应的 Vue 组件（如 `<StartNode />`、`<ApprovalNode />`、`<CcNode />`、`<ConditionNode />`）。

3. 节点配置面板
   - 在选中节点时，右侧或弹窗展示「节点属性配置」：
     - 节点名称；
     - 处理人配置（角色/部门/指定人员，暂时可以用简单下拉或输入模拟）；
     - 可绑定一个表单 Schema（比如从 `formSchemaList` 中选择一个 ID，先用 mock 列表即可）。

4. 工作流定义的保存与加载
   - 提供「保存」功能，将当前画布中的节点与边序列化为 `WorkflowDefinition` 结构；
   - 使用 API 层封装一个 mock 接口（后续可换成真实接口），例如：
     - `GET /workflow/definitions`：获取流程列表；
     - `GET /workflow/definitions/:id`：获取单个流程定义（含节点与边）；
     - `POST /workflow/definitions`：创建或更新流程定义。
   - 使用 Vue Query 管理这些接口的查询与 mutation。

5. 流程配置页面
   - 在 `apps/web/src/views` 中新增流程配置模块页面，例如：
     - 列表页：`views/workflow/WorkflowList.vue`，展示流程列表（名称、状态、更新时间等），支持跳转到编辑页；
     - 编辑页：`views/workflow/WorkflowEditor.vue`，包含：
       - 顶部基础信息（流程名称、描述、启用状态）；
       - 中间画布区域（WorkflowCanvas）；
       - 右侧节点属性配置面板。

- 本轮不负责「发起审批时根据流程定义驱动实例流转」，只需保证流程定义可配置、可保存、可再次编辑。

【四、实现与代码质量要求】
- Workflow 类型设计要稳健、便于后续扩展，比如后续支持会签/或签、更多节点类型时不需要大改。
- @vue-flow/core 的使用保持组件化：
  - 节点渲染使用单独的 SFC（如 `<ApprovalNode />`）；
  - 画布组件对外暴露干净的 props/emits（如接收初始 definition，emit 修改后的 definition）。
- 所有与后端交互的部分通过 API 层 + Vue Query 完成，不要在组件内部直接写请求。
- 对关键类型、序列化结构，用简洁的中文注释说明设计意图。

【五、你在这轮需要输出什么】
- 明确列出：
  - 在 `types`、`components/workflow`、`views/workflow`、`api` 等目录下新增/修改的文件及其职责；
  - WorkflowCanvas 的 props / emits 设计，以及与编辑页面的交互方式。
- 给出关键文件（Workflow 类型定义、WorkflowCanvas、节点组件、编辑页）的完整或接近完整代码。

【六、工作方式】
- 第一步：用不超过 10 行话复述你对本轮任务（阶段 5）的理解。
- 第二步：列出 3～6 条你将要执行的步骤（例如「1. 定义工作流类型」「2. 封装 Vue Flow 画布组件」「3. 实现节点配置面板」「4. 实现保存/加载接口与 Vue Query 封装」「5. 搭建流程配置页面」等）。
- 第三步：按步骤执行，边改代码边简洁说明关键进度和设计决策。

现在，请你从阅读并理解上述约束开始，先复述你对本轮任务（阶段 5）的理解，然后给出你的执行步骤，再开始真正修改代码。
```
