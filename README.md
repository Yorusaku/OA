# 全景智能 OA 协同办公平台
> 面向中大型企业的数字化协同审批平台原型，聚焦动态表单、流程编排与审批域闭环演进。
[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Element Plus](https://img.shields.io/badge/Element_Plus-2.9-409EFF?logo=element)](https://element-plus.org/)
## 1. 项目概述
全景智能 OA 是一套前端主导的引擎化协同审批平台原型，核心目标是解决企业审批场景中“单据变化快、流程规则复杂、前端硬编码维护成本高”的问题。项目基于 Vue 3、TypeScript、Vite、Pinia、TanStack Vue Query、form-create 与 LogicFlow 构建，将表单、流程、权限、审批状态和测试闭环统一到同一套前端中台能力中。
- 业务价值：把审批系统从“页面硬编码”演进为“协议驱动 + 引擎渲染 + 状态可追踪”的交付模式。
- 当前状态：已具备动态表单、流程设计、审批中心、文档预览、报表处理等核心能力。
- 审批域现状：已形成“发起 -> 处理 -> 协同 -> 升级 -> 代理”的完整演示闭环。
- 质量状态：审批专项已具备 Vitest + Playwright 主链路覆盖，可支持现场演示与面试讲解。
### 1.1 当前可演示链路
1. 发起审批并生成动态表单数据。
2. 按会签或签规则进入多人协同处理。
3. 按当前处理人过滤待办，保证“待我审批”语义正确。
4. 超时单据触发 SLA 自动升级并重分派。
5. 全局代理规则生效后自动接管存量与新增待办。
6. 列表、详情、统计、通知、轨迹状态保持一致。
## 2. 核心能力
### 2.1 动态表单引擎
- 基于 form-create 落地 JSON 协议驱动表单渲染，替代大规模硬编码页面。
- 支持复杂字段联动、动态必填、隐显控制和字典注入。
- 支持同一份表单协议在不同审批节点下动态切换只读、隐藏、禁用和补充字段。
### 2.2 流程编排引擎
- 基于 LogicFlow 构建可视化流程设计器，支持发起、审批、抄送、条件分支、结束等节点。
- 支持自定义节点配置、连线规则校验和流程定义持久化。
- 通过连接规则拦截非法链路，降低后端收到脏拓扑的风险。
### 2.3 审批域闭环
- 支持 `approve`、`reject`、`transfer`、`addSign`、`remind`、`withdraw`、`cancel` 7 类审批动作。
- 支持会签 `and` 与或签 `or` 两类节点策略，具备多人任务编排与节点级决策规则。
- 支持按当前审批人过滤待办、详情页动作权限控制、轨迹与通知联动。
- 支持 SLA 自动升级与全局代理审批，补齐企业级审批运营链路。
### 2.4 文档与报表能力
- 基于 `xlsx`、`pdf.js`、`comlink` 和 Web Worker 处理 Excel 导入导出与 PDF 预览。
- 支持字段映射、数据验证、电子单据跨端预览和重计算任务主线程隔离。
## 3. 技术栈
| 分类 | 选型 | 说明 |
| --- | --- | --- |
| 3.1 工程基建 | Vue 3 + TypeScript + Vite + pnpm workspace + Turborepo | 负责前端架构、构建与 Monorepo 管理 |
| 3.2 应用架构 | Pinia + Vue Router + TanStack Vue Query + VueUse | 管理客户端状态、路由权限与服务端状态缓存 |
| 3.3 业务引擎 | form-create + LogicFlow + Element Plus | 支撑动态表单、流程设计与审批交互 |
| 3.4 文档能力 | xlsx + pdf.js + comlink + Web Worker | 支撑报表导入导出与文档预览 |
| 3.5 质量保障 | Vitest + Playwright + ESLint + Prettier | 覆盖单元、组件、审批专项 E2E 与代码规范 |
## 4. 个人职责
- 主导审批中心、动态表单引擎与流程编排引擎的前端重构，推动页面式开发向协议驱动开发演进。
- 引入 form-create 替代大规模硬编码表单，实现表单字段联动、动态校验、字典注入和节点权限适配。
- 引入 LogicFlow 重构流程设计器，开发节点配置与连接规则校验，提升流程定义的可配置性与可控性。
- 自研 `useFormSchemaAdapter`、节点权限适配与审批详情渲染逻辑，打通“流程上下文 -> 表单协议 -> 视图权限”链路。
- 重构审批域提交与处理链路，统一查询失效、错误分流、评论附件流转和移动端交互逻辑。
- 推进审批域演进到会签或签、SLA 自动升级、全局代理审批，并补齐轨迹、通知、统计和测试闭环。
## 5. 项目亮点
### 5.1 动态表单的逻辑下沉
- 问题：传统 OA 表单跨字段联动复杂，视图层容易堆积大量 `v-if`、`watch` 和分支逻辑。
- 做法：将隐显、必填、联动条件下沉到 JSON 规则层，通过 form-create 解析引擎完成依赖追踪和渲染。
- 价值：实现视图与规则解耦，显著降低新单据接入与历史单据维护成本。
### 5.2 流程图引擎的底层防腐
- 问题：业务人员可视化配置流程时，容易画出死循环、越权连线和不合法分支。
- 做法：基于 LogicFlow 挂载连接规则，限制特定节点出入度、禁止非法回环并在交互源头直接拦截。
- 价值：把错误扼杀在前端设计阶段，保证流程定义下发前已经满足基本业务约束。
### 5.3 流表联动的智能自适应
- 问题：同一张审批单在不同节点下需要呈现不同字段权限与附加信息，手写多套页面不可持续。
- 做法：以流程节点作为主态，运行时动态改写表单 Schema，按节点权限注入 `readonly`、`hidden`、必填与附加字段。
- 价值：实现同一份表单协议在不同节点下的自适应展示，支撑复杂审批链路的持续扩展。
## 6. 当前审批域新增能力
1. 协同审批编排：节点支持 `mode=and|or` 与多人 `assignees[]`，可以表达会签与或签两类多人审批策略。
2. 节点决策规则：`and` 模式下全员通过才过节点、任一驳回即驳回；`or` 模式下任一通过即完成并关闭其余任务、全部驳回才结束。
3. 待办语义修正：审批列表支持按当前 `assigneeId` 过滤，只展示当前用户真正可处理的 pending 任务。
4. 详情页权限边界：详情页可展示会签或签进度、代理关系、升级摘要，并对非当前处理人隐藏或禁用动作入口。
5. SLA 自动升级：在审批相关 API 访问时统一触发自动治理，对超时且未升级单据执行自动升级与改派。
6. 全局代理审批：支持有效期代理规则，覆盖存量与新增待办，原处理人不可见，代理失效后自动回归原 owner。
7. 状态一致性：列表、详情、统计、通知、轨迹统一联动，最近一轮审批专项验证已覆盖主要场景。
## 7. 本地启动与验证
### 7.1 启动项目
```bash
pnpm install
pnpm dev
```
### 7.2 常用检查
```bash
pnpm lint
pnpm format
pnpm --filter panorama-oa-web typecheck
pnpm verify:web
```
### 7.3 审批专项验证
```bash
pnpm --filter panorama-oa-web test --run src/api/__tests__/approval-automation.test.ts src/api/__tests__/approval-collaboration.test.ts src/views/approval/__tests__/ApprovalDetail.actions.test.ts src/views/approval/__tests__/useApprovalSubmit.test.ts
pnpm --filter panorama-oa-web exec playwright test e2e/approval-detail.spec.ts e2e/approval-detail-process.spec.ts e2e/approval-actions.spec.ts e2e/approval-todo-actions.spec.ts e2e/approval-collaboration.spec.ts e2e/approval-delegation.spec.ts
```
## 8. 延伸阅读
- [架构文档](docs/architecture.md)
- [开发文档](docs/development.md)
- [审批能力矩阵](apps/web/src/views/approval/phase-results/approval-capability-matrix.md)
- [审批核心时序](apps/web/src/views/approval/phase-results/approval-core-sequence.md)
- [SLA 与代理能力矩阵](apps/web/src/views/approval/phase-results/approval-sla-delegation-matrix.md)
- [SLA 与代理时序](apps/web/src/views/approval/phase-results/approval-sla-delegation-sequence.md)
