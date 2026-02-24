# 阶段 4 Prompt：动态表单引擎（JSON Schema + VeeValidate）

> 用途：交给 Agent 的完整指令，让它只实现「阶段 4」——基于 JSON Schema + VeeValidate 搭建动态表单引擎和联动校验 `useDynamicValidate`。

```text
你现在是编码 Agent，请严格按照下面项目说明和约束开发代码。

【一、项目背景】
- 项目名称：全景智能 OA 协同办公平台（企业级 OA / 人事协同中台）。
- 目前仓库已完成阶段 0～3：monorepo 基建、权限壳与布局、Vue Query 接管服务端状态与 API 封装。
- 本轮目标是实现「动态表单引擎」，让 OA 的请假、报销等单据可以通过 JSON Schema 驱动渲染与联动校验。

【二、技术与架构约束（与总计划保持一致）】
- 前端框架：Vue 3 + TS，必须使用 Composition API + `<script setup>`。
- 表单引擎：基于 JSON Schema 思想 + VeeValidate，实现数据驱动的表单渲染与复杂联动校验。
- UI 组件：优先使用 Element Plus（Form、Input、Select、DatePicker、Upload 等）作为底层控件。
- 状态：
  - 表单内部状态（model、errors）主要由 VeeValidate 管理；
  - 如需拉取下拉选项、字典、部门树等数据，必须通过 Vue Query 完成。

【三、本次要完成的阶段/范围】
- 仅实现《开发计划》中 **阶段 4：动态表单引擎（JSON Schema + VeeValidate）**，包含：

1. 表单 Schema 类型定义
   - 在 `apps/web/src/types` 下定义统一的表单 Schema 类型，例如：
     - 字段：`key`、`label`、`type`（input/select/date/upload 等）、`required`、`placeholder`、`options`、`componentProps` 等；
     - 联动配置：`visibleWhen`、`requiredWhen` 等条件表达式或配置结构；
   - 类型需兼顾常见 OA 单据字段，保持可拓展性。

2. `<DynamicForm />` 核心组件
   - 在 `apps/web/src/components/dynamic-form` 下实现：
     - `DynamicForm.vue`：接收 `schema`（数组或对象）、`modelValue` 或 `v-model:model`、可选 `readonly` 等；
     - 根据 schema 的 `type` 自动选择对应的 Element Plus 控件；
     - 支持基于 VeeValidate 的表单校验（useForm + useField）。
   - 要求：
     - 使用组合式 API 编写；
     - 提供提交/重置回调，或者暴露方法给父组件调用。

3. VeeValidate 整合与基础校验
   - 将 schema 中的 `required`、正则规则、长度限制等转换为 VeeValidate 的 rules；
   - 统一放在 DynamicForm 里完成，不让业务页面到处写校验逻辑。

4. 联动校验与 `useDynamicValidate` 组合式函数
   - 在 `apps/web/src/composables` 下实现 `useDynamicValidate`：
     - 接收响应式的表单 model 与 schema；
     - 使用 `watch` / `watchEffect` 监听底层字段变化；
     - 一旦满足 `requiredWhen` 等联动条件，动态调用 VeeValidate API 在规则栈中 push/remove 对应规则（例如 required: true）；
   - 示例场景（需在示例表单中体现）：
     - 选择“病假”后，“医院证明”字段变为必填；
     - 请假天数 > 3 天时，“交接人”字段变为必填。

5. 示例页面与 Demo
   - 在 `apps/web/src/views` 中创建一个「动态表单 Demo 页面」，例如 `views/demo/DynamicFormDemo.vue`：
     - 使用若干个不同类型的字段（input/select/date 等）；
     - 展示至少 2 个实际的联动校验案例；
     - 将填写结果打印到控制台或页面，方便验证。

- 本轮不需要实现「可视化表单设计器」，只需要基于静态/手写 JSON Schema 完成渲染与联动；设计器可在后续阶段扩展。

【四、实现与代码质量要求】
- DynamicForm 要做到「通用、解耦」：
  - 不写死任何业务文案（如“请假天数”），通过 schema 提供；
  - 不直接依赖某个业务模块（请假/报销），而是 purely data-driven。
- `useDynamicValidate` 必须将联动条件全部从 schema / 配置中读取，而不是写死在组件/页面逻辑里。
- 如需从后端拉取字典或部门数据，必须通过 Vue Query 封装的 hooks 调用（例如 `useDictByType('leaveType')`），不要在 DynamicForm 内部直接 axios。
- 对复杂校验或联动逻辑，建议写少量中文注释解释「意图」，便于后续你自己在面试中讲清楚。

【五、你在这轮需要输出什么】
- 明确列出：
  - 在 `types`、`components/dynamic-form`、`composables` 等目录下新增/修改的文件及其职责；
  - DynamicForm 的对外 props / emits / 暴露方法设计；
  - `useDynamicValidate` 的使用方式（父组件如何接入）。
- 给出 DynamicForm、useDynamicValidate 和 Demo 页面等关键文件的完整或接近完整代码，方便我直接运行。

【六、工作方式】
- 第一步：用不超过 10 行话复述你对本轮任务（阶段 4）的理解。
- 第二步：列出 3～6 条你将要执行的步骤（例如「1. 定义 Schema 类型」「2. 实现 DynamicForm」「3. 接入 VeeValidate」「4. 实现 useDynamicValidate」「5. 编写 Demo 页面」等）。
- 第三步：按步骤执行，边改代码边简洁说明关键进度和设计决策。

现在，请你从阅读并理解上述约束开始，先复述你对本轮任务（阶段 4）的理解，然后给出你的执行步骤，再开始真正修改代码。
```
