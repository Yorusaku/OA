# 全景智能 OA 协同办公平台 - 项目文档

> **企业级 OA / 人事协同中台 - 前端引擎化、数据驱动视图**

---

## 📋 目录

1. [项目概述](#项目概述)
2. [技术选型](#技术选型)
3. [系统架构设计](#系统架构设计)
4. [核心模块详解](#核心模块详解)
5. [项目职责](#项目职责)
6. [项目难点与亮点](#项目难点与亮点)
7. [面试高频问题](#面试高频问题)
8. [开发规范](#开发规范)
9. [部署与运维](#部署与运维)
10. [附录](#附录)

---

## 项目概述

### 项目背景

全景智能 OA 协同办公平台是一款面向中大型企业的**企业级 OA 协同办公系统**，旨在通过**前端引擎化**和**数据驱动视图**的设计理念，为企业提供灵活、高效、可扩展的办公协同解决方案。

### 核心价值

- **动态表单引擎**：基于 JSON Schema 的表单配置化渲染，支持 12+ 种字段类型和复杂联动校验
- **可视化流程编排**：拖拽式流程设计器，支持发起/审批/抄送/条件分支等多种节点类型
- **服务端状态管理**：采用 Vue Query 实现服务端状态与客户端状态的彻底分离
- **Monorepo 架构**：基于 pnpm workspace + Turborepo 的现代化构建体系

### 功能模块

| 模块 | 路由 | 功能描述 |
|------|------|----------|
| 工作台 | `/` | 待办统计、快捷入口、数据概览 |
| 审批中心 | `/approval/*` | 发起审批、我的申请、待我审批、已审批 |
| 组织架构 | `/org/tree` | 部门树展示、成员列表管理 |
| 通讯录 | `/contacts/list` | 全员通讯录、虚拟滚动优化 |
| 系统管理 | `/system/*` | 用户管理、角色管理、权限配置 |
| 流程管理 | `/workflow/*` | 流程定义、流程编辑器、流程配置 |

### 权限模型

采用 **RBAC（基于角色的访问控制）** 模型，权限码示例：

```typescript
// 权限码规范：模块：资源：操作
'dashboard:view'           // 查看工作台
'approval:launch'          // 发起审批
'approval:todo'            // 待我审批
'system:user:view'         // 用户管理
'system:role:view'         // 角色管理
'workflow:view'            // 查看流程
```

---

## 技术选型

### 核心技术栈

| 类别 | 技术 | 版本 | 选型理由 |
|------|------|------|----------|
| **框架** | Vue 3 | 3.5 | Composition API + Script Setup，更好的类型推导和代码组织 |
| **语言** | TypeScript | 5.8 | 类型安全、智能提示、减少运行时错误 |
| **构建** | Vite | 7.3 | 极速冷启动、HMR、基于 Rolldown 的构建优化 |
| **包管理** | pnpm | 10.28 | 严格的依赖管理、磁盘空间优化、workspace 支持 |
| **UI 框架** | Element Plus | 2.9 | 企业级组件库、主题可定制、生态完善 |
| **样式** | Tailwind CSS | 4.x | 原子化 CSS、设计系统统一、减少样式冲突 |
| **路由** | Vue Router | 4.x | 官方路由、支持动态路由、导航守卫 |
| **状态管理** | Pinia | latest | Vue 3 推荐、类型安全、轻量简洁 |
| **服务端状态** | Vue Query | latest | 缓存策略、自动去重、SWR 模式 |
| **工具库** | VueUse | latest | 高质量组合式 API 集合 |

### 特色技术

| 模块 | 技术 | 说明 |
|------|------|------|
| **表单引擎** | VeeValidate 4 + Zod | 声明式表单校验、Schema 驱动 |
| **流程引擎** | @vue-flow/core | 基于 Vue 3 的流程图编辑库 |
| **图表** | ECharts | 数据可视化、工作台统计 |
| **HTTP 客户端** | Axios | 统一拦截器、错误处理 |
| **Mock 方案** | MSW | 服务级 Mock、拦截请求 |
| **代码质量** | ESLint + Prettier | @antfu/eslint-config 统一规范 |
| **构建加速** | Turborepo | 增量构建、任务管道 |

### 开发工具链

```json
{
  "lint": "eslint .",
  "format": "prettier --write .",
  "typecheck": "vue-tsc --noEmit",
  "test": "vitest",
  "dev": "vite",
  "build": "vite build"
}
```

---

## 系统架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         全景智能 OA 系统                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                     表现层 (Presentation)                │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐    │    │
│  │  │  动态表单   │ │  流程编排   │ │   业务页面      │    │    │
│  │  │  Engine     │ │  Designer   │ │   Views         │    │    │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                     状态管理层 (State)                   │    │
│  │  ┌─────────────────────┐ ┌─────────────────────────┐    │    │
│  │  │   Pinia (客户端)     │ │  Vue Query (服务端)     │    │    │
│  │  │   - 用户信息         │ │  - 审批列表             │    │    │
│  │  │   - 权限菜单         │ │  - 流程定义             │    │    │
│  │  │   - 应用配置         │ │  - 字典/部门            │    │    │
│  │  └─────────────────────┘ └─────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                     服务层 (Service)                     │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │              Axios HTTP Client                  │    │    │
│  │  │  - 请求拦截 (Token 注入)                         │    │    │
│  │  │  - 响应拦截 (统一错误处理)                        │    │    │
│  │  │  - 401 统一登录过期处理                           │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                     数据层 (Data)                        │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐    │    │
│  │  │  API Module │ │  Mock API   │ │   Types         │    │    │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Monorepo 结构                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  apps/                                                  │    │
│  │  └── web/           # 主应用                            │    │
│  │      ├── src/                                           │    │
│  │      │   ├── api/         # API 封装层                   │    │
│  │      │   ├── components/  # 公共组件 (表单/流程引擎)     │    │
│  │      │   ├── composables/ # Vue Query Hooks             │    │
│  │      │   ├── layouts/     # 布局组件                    │    │
│  │      │   ├── router/      # 路由配置                    │    │
│  │      │   ├── stores/      # Pinia 状态                  │    │
│  │      │   ├── types/       # TypeScript 类型             │    │
│  │      │   ├── utils/       # 工具函数                    │    │
│  │      │   └── views/       # 页面组件                    │    │
│  │      └── package.json                                   │    │
│  │                                                         │    │
│  │  packages/                                              │    │
│  │  └── utils/         # 共享工具包 (@oa/utils)            │    │
│  │      └── src/index.ts                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Monorepo 架构

```
OA/
├── apps/                      # 应用层
│   └── web/                   # 主应用
│       ├── src/
│       │   ├── api/           # API 封装层
│       │   │   ├── approval.ts
│       │   │   ├── dept.ts
│       │   │   ├── dict.ts
│       │   │   ├── http.ts    # HTTP 客户端
│       │   │   ├── queryKeys.ts
│       │   │   └── types.ts
│       │   ├── components/    # 公共组件
│       │   │   ├── dynamic-form/   # 动态表单引擎
│       │   │   └── workflow/       # 流程编排引擎
│       │   ├── composables/   # 组合式函数 (Vue Query hooks)
│       │   │   ├── useApproval.ts
│       │   │   ├── useWorkflow.ts
│       │   │   ├── useDept.ts
│       │   │   ├── useDict.ts
│       │   │   └── useNotification.ts
│       │   ├── constants/     # 常量配置
│       │   ├── directives/    # 自定义指令
│       │   ├── layouts/       # 布局组件
│       │   │   └── MainLayout.vue
│       │   ├── mocks/         # Mock 数据
│       │   ├── router/        # 路由配置
│       │   │   └── index.ts
│       │   ├── stores/        # Pinia 状态
│       │   │   ├── app.ts
│       │   │   ├── user.ts
│       │   │   └── notification.ts
│       │   ├── types/         # TypeScript 类型
│       │   │   ├── form-schema.ts
│       │   │   └── workflow.ts
│       │   ├── utils/         # 工具函数
│       │   ├── views/         # 页面组件
│       │   │   ├── approval/
│       │   │   ├── auth/
│       │   │   ├── contacts/
│       │   │   ├── dashboard/
│       │   │   ├── org/
│       │   │   ├── system/
│       │   │   └── workflow/
│       │   ├── App.vue
│       │   └── main.ts
│       └── package.json
├── packages/                  # 共享包
│   └── utils/                 # @oa/utils
│       ├── src/
│       │   └── index.ts
│       └── package.json
├── plan/                      # 开发计划文档
├── eslint.config.js           # ESLint 配置
├── package.json               # 根配置
├── pnpm-workspace.yaml        # Workspace 配置
├── turbo.json                 # Turborepo 配置
└── README.md
```

### 数据流设计

```
用户交互
    │
    ▼
┌─────────────┐
│  Vue 组件    │
└─────────────┘
    │
    ├──────────────────────┐
    ▼                      ▼
┌─────────────┐      ┌─────────────┐
│  Pinia Store │      │ Vue Query   │
│  (客户端状态) │      │ (服务端状态) │
└─────────────┘      └─────────────┘
    │                      │
    │                      ▼
    │              ┌─────────────┐
    │              │ Composables │
    │              │ (useXxx)    │
    │              └─────────────┘
    │                      │
    │                      ▼
    │              ┌─────────────┐
    │              │ API Module  │
    │              └─────────────┘
    │                      │
    ▼                      ▼
┌─────────────────────────────────┐
│       Axios HTTP Client         │
│  ┌───────────────────────────┐  │
│  │ 请求拦截器                 │  │
│  │ - Token 注入               │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 响应拦截器                 │  │
│  │ - 统一错误处理             │  │
│  │ - 401 登录过期处理          │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
    │
    ▼
┌─────────────┐      ┌─────────────┐
│  Backend    │      │  Mock API   │
│   API       │      │  (MSW)      │
└─────────────┘      └─────────────┘
```

### Vue Query 状态管理架构

```typescript
// QueryKey 统一管理
export const queryKeys = {
  approval: {
    list: (params?: any) => ['approval', 'list', params],
    detail: (id: string) => ['approval', 'detail', id],
    stats: ['approval', 'stats'],
  },
  workflow: {
    list: (params?: any) => ['workflow', 'list', params],
    detail: (id: string) => ['workflow', 'detail', id],
  },
  // ...
}

// Composable 封装
export function useApprovalList(params: MaybeRef<PageParams>) {
  return useQuery({
    queryKey: computed(() => queryKeys.approval.list(unref(params))),
    queryFn: () => getApprovalList(unref(params)),
    staleTime: 30 * 1000,        // 30 秒缓存
    retry: 1,
  })
}

// Mutation 封装
export function useSubmitApproval() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: submitApproval,
    onSuccess: () => {
      // 自动刷新相关查询
      queryClient.invalidateQueries({ queryKey: queryKeys.approval.list() })
      queryClient.invalidateQueries({ queryKey: queryKeys.approval.stats })
    },
  })
}
```

---

## 核心模块详解

### 1. 动态表单引擎

#### 架构设计

```
┌─────────────────────────────────────────────────────┐
│                  DynamicForm 引擎                    │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐    │
│  │              JSON Schema 配置                │    │
│  │  {                                          │    │
│  │    fields: [                                │    │
│  │      { key, label, type, rules, linkage }   │    │
│  │    ]                                        │    │
│  │  }                                          │    │
│  └─────────────────────────────────────────────┘    │
│                        │                             │
│                        ▼                             │
│  ┌─────────────────────────────────────────────┐    │
│  │           Schema Parser & Renderer          │    │
│  │  - 字段类型映射 (12+ 种)                      │    │
│  │  - 组件动态渲染                              │    │
│  │  - 布局栅格处理                              │    │
│  └─────────────────────────────────────────────┘    │
│                        │                             │
│                        ▼                             │
│  ┌─────────────────────────────────────────────┐    │
│  │            VeeValidate 校验引擎              │    │
│  │  - 静态校验规则                             │    │
│  │  - 联动校验 (requiredWhen/visibleWhen)       │    │
│  │  - 自定义校验器                             │    │
│  └─────────────────────────────────────────────┘    │
│                        │                             │
│                        ▼                             │
│  ┌─────────────────────────────────────────────┐    │
│  │              Element Plus 组件               │    │
│  │  Input | Select | Date | Upload | ...       │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

#### Schema 类型定义

```typescript
// apps/web/src/types/form-schema.ts
export interface FormFieldSchema {
  key: string              // 字段唯一标识
  label: string            // 字段标签
  type: FieldType          // 字段类型 (12+ 种)
  placeholder?: string     // 占位符
  required?: boolean       // 是否必填
  defaultValue?: any       // 默认值
  rules?: ValidationRule   // 校验规则
  linkage?: LinkageConfig  // 联动配置
  options?: SelectOption[] // 下拉选项
  span?: number            // 栅格布局 (1-24)
  // ...
}

export interface LinkageConfig {
  visibleWhen?: ConditionConfig | ConditionConfig[]   // 显示条件
  requiredWhen?: ConditionConfig | ConditionConfig[]  // 必填条件
  disabledWhen?: ConditionConfig | ConditionConfig[]  // 禁用条件
}

export interface ConditionConfig {
  field: string          // 依赖字段
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'includes'
  value?: any            // 比较值
}
```

#### 联动校验示例

```typescript
// 请假表单 Schema
const leaveFormSchema: FormSchema = {
  fields: [
    {
      key: 'leaveType',
      label: '请假类型',
      type: 'select',
      required: true,
      options: [
        { label: '事假', value: 'personal' },
        { label: '病假', value: 'sick' },
        { label: '年假', value: 'annual' },
      ]
    },
    {
      key: 'leaveDays',
      label: '请假天数',
      type: 'number',
      required: true,
      rules: { min: 0.5, max: 30 }
    },
    {
      // 联动必填：选择病假时，医院证明必填
      key: 'hospitalCert',
      label: '医院证明',
      type: 'upload',
      linkage: {
        requiredWhen: { 
          field: 'leaveType', 
          operator: 'eq', 
          value: 'sick' 
        }
      }
    },
    {
      // 联动必填：请假天数 > 3 天时，交接人必填
      key: 'handoverPerson',
      label: '工作交接人',
      type: 'input',
      linkage: {
        requiredWhen: { 
          field: 'leaveDays', 
          operator: 'gt', 
          value: 3 
        }
      }
    }
  ]
}
```

#### 使用示例

```vue
<script setup lang="ts">
import { DynamicForm } from '@/components/dynamic-form'
import type { FormSchema } from '@/types/form-schema'

const schema: FormSchema = {
  fields: [
    { key: 'name', label: '姓名', type: 'input', required: true },
    { key: 'dept', label: '部门', type: 'select', options: [...] }
  ]
}

const formData = ref({})

function handleSubmit() {
  // 表单校验通过后提交
}
</script>

<template>
  <DynamicForm 
    v-model="formData" 
    :schema="schema" 
    @submit="handleSubmit" 
  />
</template>
```

### 2. 可视化流程编排引擎

#### 架构设计

```
┌─────────────────────────────────────────────────────┐
│               Workflow Designer 引擎                 │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐    │
│  │            @vue-flow/core 画布               │    │
│  │  - 节点拖拽                                  │    │
│  │  - 连线编辑                                  │    │
│  │  - 缩放平移                                  │    │
│  │  - 小地图/网格/工具栏                        │    │
│  └─────────────────────────────────────────────┘    │
│                        │                             │
│         ┌──────────────┼──────────────┐             │
│         ▼              ▼              ▼             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐      │
│  │ StartNode  │ │ApprovalNode│ │  CcNode    │      │
│  │ (发起节点)  │ │ (审批节点)  │ │ (抄送节点)  │      │
│  └────────────┘ └────────────┘ └────────────┘      │
│                                                      │
│  ┌────────────┐ ┌────────────┐                      │
│  │ConditionNode│ │  EndNode   │                      │
│  │(条件分支)   │ │ (结束节点)  │                      │
│  └────────────┘ └────────────┘                      │
│                        │                             │
│                        ▼                             │
│  ┌─────────────────────────────────────────────┐    │
│  │           NodeConfigPanel 配置面板           │    │
│  │  - 节点属性编辑                             │    │
│  │  - 处理人配置                               │    │
│  │  - 表单 Schema 绑定                           │    │
│  │  - 条件表达式配置                           │    │
│  └─────────────────────────────────────────────┘    │
│                        │                             │
│                        ▼                             │
│  ┌─────────────────────────────────────────────┐    │
│  │          Workflow Definition JSON           │    │
│  │  { nodes: [...], edges: [...] }             │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

#### 节点类型定义

```typescript
// apps/web/src/types/workflow.ts
export type WorkflowNodeType 
  = 'start'      // 发起节点（流程起点）
  | 'approval'   // 审批节点
  | 'cc'         // 抄送节点
  | 'condition'  // 条件分支节点
  | 'end'        // 结束节点（流程终点）

export type HandlerType 
  = 'role'        // 按角色
  | 'dept'        // 按部门
  | 'user'        // 指定人员
  | 'deptManager' // 部门负责人
  | 'initiator'   // 发起人自己
  | 'continuous'  // 连续多级审批

export type ApprovalMode 
  = 'or'         // 或签（一人审批即可）
  | 'and'        // 会签（所有人审批）
  | 'sequential' // 依次审批

export interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  name: string
  handler?: HandlerConfig       // 处理人配置
  formSchemaId?: string         // 绑定的表单 Schema
  conditions?: ConditionExpression[] // 条件表达式
  position?: { x: number, y: number }
  timeout?: number              // 超时配置（小时）
  autoPassOnTimeout?: boolean   // 超时自动通过
}
```

#### 工作流定义结构

```typescript
interface WorkflowDefinition {
  id: string
  name: string
  status: 'draft' | 'active' | 'inactive' | 'deleted'
  nodes: WorkflowNode[]    // 节点列表
  edges: WorkflowEdge[]    // 边列表
  formSchemaId?: string    // 流程级别的表单 Schema
  createdBy?: string
  createdAt?: string
  version?: number
}

interface WorkflowEdge {
  id: string
  source: string    // 起始节点 ID
  target: string    // 目标节点 ID
  label?: string    // 条件分支标签
  conditionId?: string // 条件表达式 ID
}
```

#### 使用示例

```vue
<script setup lang="ts">
import { WorkflowCanvas, NodeConfigPanel } from '@/components/workflow'
import { ref } from 'vue'

const workflow = ref<WorkflowDefinition>({
  id: '1',
  name: '请假审批流程',
  status: 'draft',
  nodes: [
    { id: '1', type: 'start', name: '发起人' },
    { id: '2', type: 'approval', name: '部门经理审批', handler: { type: 'role', roleIds: ['manager'] } },
    { id: '3', type: 'approval', name: 'HR 审批', handler: { type: 'role', roleIds: ['hr'] } },
    { id: '4', type: 'end', name: '结束' }
  ],
  edges: [
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-3', source: '2', target: '3' },
    { id: 'e3-4', source: '3', target: '4' }
  ]
})

function handleSave() {
  // 保存流程定义
}
</script>

<template>
  <div class="workflow-editor">
    <WorkflowCanvas 
      v-model="workflow" 
      :config="{ showGrid: true, showMinimap: true }"
    />
    <NodeConfigPanel v-model:selected-node="selectedNode" />
  </div>
</template>
```

### 3. HTTP 客户端封装

#### 统一拦截器设计

```typescript
// apps/web/src/api/http.ts
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

// 请求拦截器 - Token 注入
http.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器 - 统一错误处理
http.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { code, message, data } = response.data
    if (code === 200) {
      return data
    }
    return Promise.reject(new Error(message))
  },
  (error) => {
    // 401 特殊处理 - 登录过期
    if (error.response?.status === 401) {
      handle401()
      return Promise.reject(error)
    }
    // 其他错误统一处理
    return handleError(error)
  }
)

// 401 统一处理
function handle401() {
  const userStore = useUserStore()
  userStore.clearUser()  // 清除用户状态
  
  // 跳转到登录页
  const redirect = encodeURIComponent(window.location.pathname)
  window.location.href = `/login?redirect=${redirect}`
}
```

### 4. 权限指令

#### 自定义指令 `v-auth`

```typescript
// apps/web/src/directives/auth.ts
export function setupAuthDirective(app: App) {
  app.directive('auth', {
    mounted(el, binding) {
      const userStore = useUserStore()
      
      if (!userStore.hasPermission(binding.value)) {
        el.parentNode?.removeChild(el)
      }
    }
  })
}

// 使用示例
// <el-button v-auth="'approval:launch'">发起审批</el-button>
```

---

## 项目职责

### 核心职责

| 职责领域 | 具体内容 |
|----------|----------|
| **架构设计** | Monorepo 架构搭建、技术选型、目录结构设计、构建配置优化 |
| **核心引擎开发** | 动态表单引擎、可视化流程编排引擎的设计与实现 |
| **状态管理** | Vue Query 服务端状态架构设计、QueryKey 统一管理、缓存策略优化 |
| **组件开发** | 公共组件库建设、业务组件封装、UI 一致性保障 |
| **API 层设计** | HTTP 客户端封装、统一拦截器、错误处理机制 |
| **权限系统** | RBAC 权限模型实现、路由守卫、权限指令 |
| **性能优化** | 虚拟滚动、组件懒加载、构建优化、缓存策略 |
| **代码质量** | ESLint/Prettier 规范、TypeScript 类型安全、代码审查 |

### 技术贡献

#### 1. 动态表单引擎开发

- 设计并实现基于 JSON Schema 的表单配置化渲染方案
- 支持 12+ 种表单字段类型，覆盖企业 OA 常见场景
- 实现复杂联动校验逻辑（条件必填/条件显示/条件禁用）
- 封装 VeeValidate + Zod 校验引擎，提供声明式校验体验

#### 2. 流程编排引擎开发

- 基于 @vue-flow/core 实现可视化流程设计器
- 支持 5 种节点类型（发起/审批/抄送/条件/结束）
- 实现节点配置面板，支持处理人配置、表单绑定、条件表达式
- 设计工作流定义 JSON 结构，支持流程保存与加载

#### 3. Vue Query 状态架构

- 设计服务端状态与客户端状态分离的架构
- 统一管理 QueryKey，避免缓存混乱
- 制定缓存策略（staleTime/gcTime），优化请求频率
- 实现 Mutation 成功后自动刷新相关查询

#### 4. Monorepo 基建

- 搭建 pnpm workspace + Turborepo 构建体系
- 创建 @oa/utils 共享包，沉淀通用工具函数
- 配置增量构建，提升开发效率

---

## 项目难点与亮点

### 难点一：动态表单联动校验

**问题描述**

请假表单中，当用户选择"病假"时，"医院证明"字段需要变为必填；当请假天数超过 3 天时，"工作交接人"字段需要变为必填。这种联动校验逻辑复杂，且需要在多个表单中复用。

**解决方案**

```typescript
// 1. 定义联动配置接口
interface LinkageConfig {
  requiredWhen?: ConditionConfig | ConditionConfig[]
  visibleWhen?: ConditionConfig | ConditionConfig[]
  disabledWhen?: ConditionConfig | ConditionConfig[]
}

interface ConditionConfig {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'includes'
  value?: any
}

// 2. 实现条件判断逻辑
function evaluateCondition(
  condition: ConditionConfig, 
  formData: Record<string, any>
): boolean {
  const fieldValue = formData[condition.field]
  
  switch (condition.operator) {
    case 'eq': return fieldValue === condition.value
    case 'ne': return fieldValue !== condition.value
    case 'gt': return fieldValue > condition.value
    case 'gte': return fieldValue >= condition.value
    case 'lt': return fieldValue < condition.value
    case 'lte': return fieldValue <= condition.value
    case 'in': return condition.value.includes(fieldValue)
    case 'includes': return fieldValue?.includes(condition.value)
    default: return false
  }
}

// 3. 在表单校验时动态计算必填状态
function isFieldRequired(field: FormFieldSchema, formData: Record<string, any>): boolean {
  // 静态必填
  if (field.required) return true
  
  // 联动必填
  if (field.linkage?.requiredWhen) {
    const conditions = Array.isArray(field.linkage.requiredWhen) 
      ? field.linkage.requiredWhen 
      : [field.linkage.requiredWhen]
    
    return conditions.some(cond => evaluateCondition(cond, formData))
  }
  
  return false
}
```

**亮点**

- 配置化的联动规则，无需在业务代码中写死校验逻辑
- 支持多种条件操作符，覆盖常见业务场景
- 可组合多个条件，实现复杂校验规则

---

### 难点二：流程设计器节点配置联动

**问题描述**

流程设计器中，选中不同类型的节点（审批/抄送/条件分支）时，右侧配置面板需要显示不同的配置项。同时，节点配置修改后需要实时同步到画布上的节点状态。

**解决方案**

```vue
<script setup lang="ts">
import { computed } from 'vue'

const selectedNode = ref<WorkflowNode | null>(null)

// 根据节点类型动态返回配置项
const configFields = computed(() => {
  if (!selectedNode.value) return []
  
  switch (selectedNode.value.type) {
    case 'approval':
      return [
        { key: 'name', label: '节点名称', type: 'input' },
        { key: 'handler.type', label: '处理人类型', type: 'select', options: [...] },
        { key: 'handler.mode', label: '审批方式', type: 'radio', options: [...] },
        { key: 'timeout', label: '超时时间 (小时)', type: 'number' },
      ]
    case 'cc':
      return [
        { key: 'name', label: '节点名称', type: 'input' },
        { key: 'handler.type', label: '抄送人类型', type: 'select', options: [...] },
      ]
    case 'condition':
      return [
        { key: 'name', label: '条件名称', type: 'input' },
        { key: 'conditions', label: '条件表达式', type: 'condition-builder' },
      ]
    default:
      return []
  }
})

// 配置修改后同步到画布
function handleConfigChange(key: string, value: any) {
  if (selectedNode.value) {
    set(selectedNode.value, key, value) // 使用 lodash set 处理嵌套路径
  }
}
</script>
```

**亮点**

- 配置面板与节点类型解耦，易于扩展新节点类型
- 使用计算属性动态生成配置项，避免硬编码
- 配置修改实时同步，画布状态即时更新

---

### 难点三：Vue Query 缓存策略优化

**问题描述**

审批列表、字典数据、部门树等数据在多个页面间共享，但不同场景下的缓存策略不同：
- 审批列表：需要较短的缓存时间，避免数据陈旧
- 字典数据：变化频率低，可以长期缓存
- 部门树：中等缓存时间，组织架构调整不频繁

**解决方案**

```typescript
// 1. 全局默认配置
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,      // 默认 60 秒
      gcTime: 5 * 60 * 1000,     // 5 分钟后清理
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// 2. 按场景定制缓存策略
export function useApprovalList(params: MaybeRef<PageParams>) {
  return useQuery({
    queryKey: computed(() => queryKeys.approval.list(unref(params))),
    queryFn: () => getApprovalList(unref(params)),
    staleTime: 30 * 1000,        // 审批列表 30 秒
  })
}

export function useDictByType(dictType: MaybeRef<string>) {
  return useQuery({
    queryKey: computed(() => queryKeys.dict.byType(unref(dictType))),
    queryFn: () => getDictByType(unref(dictType)),
    staleTime: 10 * 60 * 1000,   // 字典数据 10 分钟
    gcTime: 30 * 60 * 1000,      // 30 分钟后清理
  })
}

export function useDeptTree() {
  return useQuery({
    queryKey: queryKeys.dept.tree,
    queryFn: getDeptTree,
    staleTime: 5 * 60 * 1000,    // 部门树 5 分钟
  })
}

// 3. Mutation 成功后刷新相关查询
export function useSubmitApproval() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: submitApproval,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approval.list() })
      queryClient.invalidateQueries({ queryKey: queryKeys.approval.stats })
    },
  })
}
```

**亮点**

- 统一 QueryKey 管理，避免缓存键混乱
- 按数据特性定制缓存策略，平衡实时性与性能
- Mutation 成功后自动刷新相关查询，保持数据一致性

---

### 难点四：通讯录虚拟滚动性能优化

**问题描述**

通讯录列表可能包含数千条员工数据，直接渲染会导致页面卡顿、滚动不流畅。

**解决方案**

```vue
<script setup lang="ts">
import { useVirtualList } from '@vueuse/core'
import { computed, ref } from 'vue'

const allContacts = ref<Contact[]>([]) // 全量数据

// 使用 VueUse 的虚拟列表
const containerRef = ref<HTMLElement | null>(null)
const { list, containerProps, wrapperProps } = useVirtualList(
  allContacts,
  {
    itemHeight: 60,           // 每项高度
    overscan: 10,             // 预加载 10 项
  }
)

// 搜索过滤
const searchKeyword = ref('')
const filteredContacts = computed(() => {
  if (!searchKeyword.value) return allContacts.value
  return allContacts.value.filter(c => 
    c.name.includes(searchKeyword.value) || 
    c.dept.includes(searchKeyword.value)
  )
})
</script>

<template>
  <div ref="containerRef" v-bind="containerProps" class="h-[600px] overflow-y-auto">
    <div v-bind="wrapperProps">
      <div 
        v-for="contact in list" 
        :key="contact.data.id"
        class="h-[60px] flex items-center border-b"
      >
        <!-- 联系人卡片 -->
      </div>
    </div>
  </div>
</template>
```

**亮点**

- 使用 @vueuse/core 的 `useVirtualList` 组合式函数
- 只渲染可视区域内的 DOM 节点，大幅提升性能
- 支持预加载（overscan），滚动更流畅

---

### 亮点一：引擎化设计

**表单引擎化**

- 业务页面只需传入 JSON Schema，无需关心表单渲染细节
- 表单校验逻辑与业务逻辑分离，代码更清晰
- 新增字段类型只需在引擎层注册，业务层无感知

**流程引擎化**

- 流程定义与业务逻辑解耦
- 支持动态配置审批节点、条件分支
- 流程变更无需修改代码，配置即可

---

### 亮点二：TypeScript 类型安全

```typescript
// 完整的类型定义
interface FormFieldSchema { ... }
interface FormSchema { ... }
interface WorkflowDefinition { ... }
interface WorkflowNode { ... }

// 类型安全的 API 调用
async function getApprovalList(params: PageParams): Promise<ApprovalItem[]> {
  return http.get('/approval/list', { params })
}

// 类型推导的 Composables
const { data, isLoading, error } = useApprovalList({ page: 1, size: 20 })
// data 的类型自动推导为 Ref<ApprovalItem[] | undefined>
```

**收益**

- 智能提示、跳转定义
- 编译期发现错误
- 重构更安全

---

### 亮点三：Monorepo 架构

```
apps/web          # 主应用
  └── depends on → @oa/utils
packages/utils    # 共享工具包
```

**收益**

- 代码复用：工具函数在 packages 中维护，多应用共享
- 独立版本：每个包可独立发布版本
- 构建加速：Turborepo 增量构建，只构建变更部分

---

## 面试高频问题

### Vue 3 相关

#### Q1: 为什么选择 Composition API + Script Setup？

**参考答案**

```typescript
// Options API vs Composition API

// ❌ Options API - 逻辑分散
export default {
  data() {
    return { count: 0, user: null }
  },
  methods: {
    increment() { this.count++ }
  },
  mounted() { /* ... */ }
}

// ✅ Composition API + Script Setup - 逻辑聚合
<script setup lang="ts">
const count = ref(0)
const user = ref(null)
const increment = () => count.value++

// 相关逻辑组织在一起
useUserRelatedLogic(user)
</script>
```

**优势**：
1. **逻辑复用**：组合式函数（Composables）可以轻松复用逻辑
2. **类型推导**：Script Setup 有更好的 TypeScript 支持
3. **代码组织**：相关逻辑可以组织在一起，而不是分散在 data/methods/mounted 中
4. **Tree-shaking**：未使用的 API 会被自动移除

---

#### Q2: Vue 3 的响应式原理是什么？

**参考答案**

```typescript
// Vue 2: Object.defineProperty
// 缺点：无法检测对象属性的添加/删除，数组索引变化

// Vue 3: Proxy
const obj = { count: 0 }
const proxy = new Proxy(obj, {
  get(target, key, receiver) {
    console.log(`读取 ${key}`)
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    console.log(`设置 ${key} = ${value}`)
    return Reflect.set(target, key, value, receiver)
  }
})

// 优势：
// 1. 可以拦截对象的任意操作（get/set/has/deleteProperty 等）
// 2. 支持数组索引和长度的变化
// 3. 支持 Map/Set 等数据结构
```

---

#### Q3: computed 和 watch 的区别？

**参考答案**

| 特性 | computed | watch |
|------|----------|-------|
| 用途 | 派生状态（有缓存） | 监听变化执行副作用 |
| 缓存 | ✅ 有缓存 | ❌ 无缓存 |
| 异步 | ❌ 不支持 | ✅ 支持 |
| 返回值 | ✅ 有返回值 | ❌ 无返回值 |
| 立即执行 | ❌ 否 | ✅ 可配置 immediate |

```typescript
// computed - 派生状态
const fullName = computed(() => `${firstName.value} ${lastName.value}`)

// watch - 监听副作用
watch(userId, async (newId) => {
  userData.value = await fetchUser(newId)
}, { immediate: true })

// watchEffect - 自动收集依赖
watchEffect(() => {
  console.log(`用户 ID: ${userId.value}`)
})
```

---

### Vue Query 相关

#### Q4: 为什么使用 Vue Query？它解决了什么问题？

**参考答案**

**传统方案的问题**：
```typescript
// ❌ 手动管理状态
const data = ref(null)
const loading = ref(false)
const error = ref(null)

async function fetchData() {
  loading.value = true
  try {
    data.value = await api.get()
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
}

// 问题：
// 1. 每个组件都要重复写这些代码
// 2. 没有缓存，重复请求
// 3. 没有请求去重
// 4. 没有背景更新
```

**Vue Query 的解决方案**：
```typescript
// ✅ Vue Query
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['user', id],
  queryFn: () => fetchUser(id),
  staleTime: 60 * 1000,  // 1 分钟内认为数据新鲜
})

// 优势：
// 1. 自动缓存，避免重复请求
// 2. 请求去重（相同 queryKey 只发一次请求）
// 3. SWR 模式（stale-while-revalidate）
// 4. 窗口聚焦时自动重新获取
// 5. Mutation 后自动刷新相关查询
```

---

#### Q5: Vue Query 的缓存策略有哪些？

**参考答案**

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 1. staleTime - 数据保持"新鲜"的时间
      staleTime: 60 * 1000,  // 60 秒内认为是新鲜数据
      
      // 2. gcTime - 无效数据在缓存中保留的时间
      gcTime: 5 * 60 * 1000,  // 5 分钟后清理
      
      // 3. refetchOnWindowFocus - 窗口聚焦时是否重新获取
      refetchOnWindowFocus: false,
      
      // 4. retry - 失败重试次数
      retry: 1,
      
      // 5. retryDelay - 重试延迟
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})
```

---

### 工程化相关

#### Q6: Monorepo 的优势是什么？

**参考答案**

**优势**：
1. **代码复用**：共享代码放在 packages 中，多应用共享
2. **依赖管理**：统一版本，避免依赖不一致
3. **原子提交**：相关修改可以在一个提交中完成
4. **构建加速**：增量构建，只构建变更部分

**本项目实践**：
```
OA/
├── apps/web           # 主应用
├── packages/utils     # 共享工具包
│   └── src/index.ts   # 导出工具函数
└── pnpm-workspace.yaml

# apps/web/package.json
{
  "dependencies": {
    "@oa/utils": "workspace:*"  // 使用 workspace 协议
  }
}
```

---

#### Q7: 如何做 TypeScript 类型安全？

**参考答案**

**1. 严格的 tsconfig 配置**：
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**2. 完整的类型定义**：
```typescript
// 定义完整的接口
interface FormFieldSchema {
  key: string
  label: string
  type: FieldType
  // ...
}

// 避免使用 any
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null) {
    // 类型守卫
  }
}
```

**3. 类型推导优先**：
```typescript
// 让 TypeScript 自动推导类型
const count = ref(0)  // Ref<number>

// 必要时添加类型注解
const users = ref<User[]>([])
```

---

### 性能优化相关

#### Q8: 如何优化长列表渲染性能？

**参考答案**

**1. 虚拟滚动**：
```typescript
import { useVirtualList } from '@vueuse/core'

const { list, containerProps, wrapperProps } = useVirtualList(
  allData,
  { itemHeight: 60, overscan: 10 }
)
```

**2. 分页加载**：
```typescript
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['list'],
  queryFn: ({ pageParam = 1 }) => getList({ page: pageParam }),
  getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined
})
```

**3. 懒加载**：
```typescript
// 路由懒加载
const WorkflowEditor = () => import('@/views/workflow/WorkflowEditor.vue')

// 组件懒加载
const HeavyComponent = defineAsyncComponent(() => import('./HeavyComponent.vue'))
```

---

#### Q9: 如何优化构建体积？

**参考答案**

**1. 路由懒加载**：
```typescript
const routes = [
  {
    path: '/workflow/editor/:id',
    component: () => import('@/views/workflow/WorkflowEditor.vue')
  }
]
```

**2. 组件按需导入**：
```typescript
// 使用 unplugin-vue-components 自动按需导入
// 无需手动 import，自动 tree-shaking
```

**3. 分析构建体积**：
```bash
# vite 构建分析
pnpm build --mode analysis
```

**4. 第三方库优化**：
```typescript
// ❌ 全量导入
import _ from 'lodash'

// ✅ 按需导入
import debounce from 'lodash/debounce'
```

---

### 业务场景相关

#### Q10: 如何实现表单联动校验？

**参考答案**

见「项目难点一：动态表单联动校验」章节。

关键点：
1. 定义联动配置接口（requiredWhen/visibleWhen/disabledWhen）
2. 实现条件判断逻辑（支持多种操作符）
3. 在表单校验时动态计算必填状态

---

#### Q11: 如何处理 401 登录过期？

**参考答案**

```typescript
// HTTP 响应拦截器统一处理
http.interceptors.response.use(
  (response) => {
    const { code } = response.data
    if (code === 200) return response.data
    return Promise.reject(new Error(response.data.message))
  },
  (error) => {
    if (error.response?.status === 401) {
      // 1. 清除用户状态
      userStore.clearUser()
      
      // 2. 跳转到登录页
      const redirect = encodeURIComponent(window.location.pathname)
      window.location.href = `/login?redirect=${redirect}`
    }
    return Promise.reject(error)
  }
)
```

---

## 开发规范

### 代码风格

```typescript
// 1. 使用 Composition API + Script Setup
<script setup lang="ts">
const count = ref(0)
</script>

// 2. 类型安全，避免 any
interface User {
  id: string
  name: string
}

// 3. 组合式函数命名规范
function useApprovalList() { ... }
function useSubmitApproval() { ... }

// 4. 组件命名规范（PascalCase）
// DynamicForm.vue, WorkflowCanvas.vue
```

### 目录规范

```
src/
├── api/           # API 封装
├── components/    # 公共组件
├── composables/   # 组合式函数
├── layouts/       # 布局组件
├── router/        # 路由配置
├── stores/        # Pinia 状态
├── types/         # TypeScript 类型
├── utils/         # 工具函数
└── views/         # 页面组件
```

### Git 提交规范

```bash
# 格式：<type>(<scope>): <subject>

# 示例
feat(workflow): 添加流程编辑器节点拖拽功能
fix(approval): 修复审批列表分页错误
docs(readme): 更新项目文档
refactor(utils): 重构工具函数
style(format): 代码格式化
test(workflow): 添加工作流引擎单元测试
```

---

## 部署与运维

### 环境配置

```bash
# .env.development
VITE_API_BASE_URL=/api
VITE_USE_MOCK=true

# .env.production
VITE_API_BASE_URL=https://api.example.com
VITE_USE_MOCK=false
```

### 构建命令

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 生产构建
pnpm build

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint

# 格式化
pnpm format
```

### Docker 部署

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN pnpm install && pnpm build

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 附录

### A. 技术栈版本

| 技术 | 版本 |
|------|------|
| Vue | 3.5 |
| TypeScript | 5.8 |
| Vite | 7.3 |
| pnpm | 10.28 |
| Element Plus | 2.9 |
| Tailwind CSS | 4.x |
| Pinia | latest |
| Vue Query | latest |
| VeeValidate | 4.15 |

### B. 相关资源

- [Vue 3 官方文档](https://vuejs.org/)
- [Vite 官方文档](https://vitejs.dev/)
- [Vue Query 官方文档](https://tanstack.com/query/latest/docs/vue/overview)
- [Element Plus](https://element-plus.org/)
- [VueUse](https://vueuse.org/)
- [@vue-flow/core](https://vueflow.dev/)

### C. 项目地址

```bash
# 本地启动
git clone <repository-url>
cd OA
pnpm install
pnpm dev
```

---

**文档版本**: v1.0  
**最后更新**: 2026 年 2 月 23 日  
**维护者**: 前端团队
