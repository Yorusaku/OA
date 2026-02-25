# 全景智能 OA 协同办公平台 - 面试指南

> **企业级 OA / 人事协同中台 - 前端引擎化、数据驱动视图**
> 
> 📌 本文档用于金三银四面试准备，涵盖项目架构、技术亮点、难点攻克及面试话术

---

## 📋 目录

1. [项目概述](#项目概述)
2. [技术选型](#技术选型)
3. [系统架构设计](#系统架构设计)
4. [核心模块详解](#核心模块详解)
5. [项目职责](#项目职责)
6. [面试高频 Q&A](#面试高频 Q&A)
7. [技术深度剖析](#技术深度剖析)
8. [性能优化实践](#性能优化实践)
9. [面试话术模板](#面试话术模板)

---

## 项目概述

### 项目背景

**业务痛点**

全景智能 OA 协同办公平台是一款面向中大型企业的一站式人事与协同办公管理中台。项目服务于多家甲方客户，在早期开发过程中面临三大核心痛点：

1. **单据种类繁多** - 请假单、报销单、采购单等数十种表单，每种表单字段和校验规则各异
2. **审批链路多变** - 客户频繁调整审批流程，硬编码模式导致每次变更都需要前后端同时发版
3. **报表处理低效** - 财务月度报表、考勤统计等海量数据导出依赖后端，服务器压力大、超时率高

**解决方案**

针对上述痛点，我作为核心业务开发加入团队后，主导引入了**"动态表单引擎"与"可视化工作流引擎"**进行局部重构，并将重度报表/单据的解析能力前置到纯前端，全面提升了系统的流转效能与小团队的交付 ROI。

### 核心价值

| 价值维度 | 实现方式 | 量化收益 |
|----------|----------|----------|
| **配置化交付** | JSON Schema 驱动表单渲染 | 新单据交付周期从 3 天 → 2 小时 |
| **可视化编排** | 拖拽式流程设计器 | 流程变更无需发版，业务方可自助配置 |
| **前端算力释放** | Web Worker + 纯前端文件处理 | 服务器带宽成本降低 70% |
| **工程化提效** | Monorepo + 组合式 API | 代码复用率提升 40% |

### 功能模块

| 模块 | 路由 | 功能描述 | 技术亮点 |
|------|------|----------|----------|
| **工作台** | `/` | 待办统计、快捷入口、数据概览 | ECharts 数据可视化 |
| **审批中心** | `/approval/*` | 发起审批、我的申请、待我审批 | Vue Query 状态管理 |
| **组织架构** | `/org/tree` | 部门树展示、成员列表管理 | 递归组件 + 懒加载 |
| **通讯录** | `/contacts/list` | 全员通讯录、虚拟滚动优化 | 虚拟列表万级数据流畅渲染 |
| **系统管理** | `/system/*` | 用户管理、角色管理、权限配置 | RBAC 权限模型 |
| **流程管理** | `/workflow/*` | 流程定义、流程编辑器 | @vue-flow 可视化编排 |

---

## 技术选型

### 核心技术栈

| 类别 | 技术 | 版本 | 选型理由 | 面试话术 |
|------|------|------|----------|----------|
| **框架** | Vue 3 | 3.5 | Composition API + Script Setup，更好的类型推导和代码组织 | "选择 Vue3 是因为 Composition API 能更好地抽离复用表单联动逻辑" |
| **语言** | TypeScript | 5.8 | 类型安全、智能提示、减少运行时错误 | "TS 在复杂表单 Schema 流转时避免了大量类型错误" |
| **构建** | Vite | 7.3 | 极速冷启动、HMR、基于 Rolldown 的构建优化 | "Vite 的 HMR 让大型项目热更新保持在 100ms 内" |
| **包管理** | pnpm | 10.28 | 严格的依赖管理、磁盘空间优化、workspace 支持 | "pnpm 的幽灵依赖检测避免了生产环境的不确定性" |
| **UI 框架** | Element Plus | 2.9 | 企业级组件库、主题可定制、生态完善 | "Element Plus 的组件覆盖了我们 90% 的 UI 需求" |
| **样式** | Tailwind CSS | 4.x | 原子化 CSS、设计系统统一、减少样式冲突 | "Tailwind 让我们告别了命名困难症" |
| **路由** | Vue Router | 4.x | 官方路由、支持动态路由、导航守卫 | "配合 RBAC 实现按钮级权限控制" |
| **状态管理** | Pinia | latest | Vue 3 推荐、类型安全、轻量简洁 | "客户端状态用 Pinia，服务端状态用 Vue Query" |
| **服务端状态** | Vue Query | latest | 缓存策略、自动去重、SWR 模式 | "Vue Query 让我们不再需要手动管理 loading/error 状态" |
| **工具库** | VueUse | latest | 高质量组合式 API 集合 | "useVirtualList 解决了万级列表卡顿问题" |

### Monorepo 架构

```
OA/
├── apps/
│   └── web/                   # 主应用
│       ├── src/
│       │   ├── api/           # API 封装层
│       │   ├── components/    # 公共组件（表单/流程/文档引擎）
│       │   ├── composables/   # Vue Query Hooks
│       │   ├── stores/        # Pinia 状态
│       │   ├── types/         # 业务类型定义
│       │   ├── utils/         # 业务工具（重新导出 @oa/utils）
│       │   └── views/         # 页面组件
│       └── package.json
│
├── packages/
│   ├── utils/                 # @oa/utils - 共享工具函数库
│   │   ├── src/
│   │   │   └── index.ts       # 日期格式化、数据验证、条件判断引擎
│   │   └── package.json
│   │
│   └── config/                # @oa/config - 共享工程化配置
│       ├── src/
│       │   ├── eslint-config.js
│       │   ├── prettier-config.js
│       │   └── tailwind-config.js
│       └── package.json
│
├── eslint.config.js           # 根配置（引用 @oa/config）
├── pnpm-workspace.yaml        # Workspace 配置
└── turbo.json                 # Turborepo 配置
```

**架构设计原则**：

| 原则 | 说明 | 实践 |
|------|------|------|
| **逻辑隔离、物理聚合** | 业务相关的放在一起，纯工具抽离 | `components/` 放引擎，`packages/` 放工具 |
| **谁复用谁抽离** | 只抽离真正需要跨项目复用的 | `utils` 和 `config` 抽离，`types` 保留 |
| **避免过早优化** | 不过度拆分增加复杂度 | 5 人团队，当前架构维护成本最低 |

**共享包说明**：

| 包名 | 职责 | 包含内容 |
|------|------|----------|
| **@oa/utils** | 纯工具函数库 | 日期格式化、金额格式化、数据验证、条件判断引擎、常量定义 |
| **@oa/config** | 工程化配置 | ESLint、Prettier、Tailwind 统一配置 |

### 特色技术

| 模块 | 技术 | 说明 | 解决的问题 |
|------|------|------|------------|
| **表单引擎** | VeeValidate 4 + Zod | 声明式表单校验、Schema 驱动 | 复杂联动校验、动态规则注入 |
| **流程引擎** | @vue-flow/core | 基于 Vue 3 的流程图编辑库 | 可视化流程编排、节点自定义 |
| **图表** | ECharts | 数据可视化、工作台统计 | 大数据量渲染、交互式图表 |
| **HTTP 客户端** | Axios | 统一拦截器、错误处理 | 请求取消、401 统一处理 |
| **文档处理** | xlsx + pdf.js | Excel 导入导出、PDF 预览 | 纯前端文件流处理 |
| **Web Worker** | comlink | Worker 通信封装 | 海量数据计算不阻塞 UI |
| **Mock 方案** | MSW | 服务级 Mock、拦截请求 | 前后端并行开发 |

### 技术选型决策过程（面试加分项）

```
问题：为什么选择 Vue Query 而不是 Pinia 管理所有状态？

回答思路：
1. 状态分类：客户端状态 (UI 状态) vs 服务端状态 (API 数据)
2. Pinia 适合：用户信息、菜单权限、应用配置等客户端状态
3. Vue Query 适合：审批列表、流程定义等需要缓存/去重/刷新的服务端状态
4. 收益：自动请求去重、缓存策略、背景静默更新、重试机制
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
│  │  │  - 重复请求取消 (AbortController)                 │    │    │
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
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
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
│  │ - 重复请求取消             │  │
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
// QueryKey 统一管理 - 避免缓存混乱
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
}

// Query Hook 封装 - 缓存策略优化
export function useApprovalList(params: MaybeRef<PageParams>) {
  return useQuery({
    queryKey: computed(() => queryKeys.approval.list(unref(params))),
    queryFn: () => getApprovalList(unref(params)),
    staleTime: 30 * 1000,        // 30 秒内认为数据新鲜
    gcTime: 5 * 60 * 1000,       // 5 分钟后清理缓存
    retry: 1,                    // 失败重试 1 次
    refetchOnWindowFocus: false, // 窗口聚焦时不自动刷新
  })
}

// Mutation Hook 封装 - 自动刷新相关查询
export function useSubmitApproval() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: submitApproval,
    onSuccess: () => {
      // 提交成功后自动刷新相关查询
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
│  └─────────────────────────────────────────────┐    │
│                        │                       │    │
│                        ▼                       │    │
│  ┌─────────────────────────────────────────────┐    │
│  │           Schema Parser & Renderer          │    │
│  │  - 字段类型映射 (12+ 种)                     │    │
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
// 字段 Schema 定义
export interface FormFieldSchema {
  key: string              // 字段唯一标识（对应表单 model 的 key）
  label: string            // 字段标签
  type: FieldType          // 字段类型 (12+ 种)
  placeholder?: string     // 占位符
  required?: boolean       // 是否必填（静态必填）
  defaultValue?: any       // 默认值
  rules?: ValidationRule   // 校验规则
  linkage?: LinkageConfig  // 联动配置
  options?: SelectOption[] // 下拉选项
  span?: number            // 栅格布局 (1-24)
  componentProps?: Record<string, any> // Element Plus 组件的额外 props
  description?: string     // 字段描述/提示信息
}

// 联动配置
export interface LinkageConfig {
  visibleWhen?: ConditionConfig | ConditionConfig[]   // 显示条件
  requiredWhen?: ConditionConfig | ConditionConfig[]  // 必填条件
  disabledWhen?: ConditionConfig | ConditionConfig[]  // 禁用条件
}

// 条件表达式
export interface ConditionConfig {
  field: string          // 依赖的字段 key
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'includes'
  value?: any            // 比较值
}
```

#### 联动校验示例（面试重点）

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

#### 条件判断逻辑实现

```typescript
// 条件判断引擎
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

// 动态计算必填状态
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

function handleSubmit(values) {
  // 表单校验通过后提交
  submitApproval(values)
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
// 节点类型
export type WorkflowNodeType
  = 'start'      // 发起节点（流程起点）
  | 'approval'   // 审批节点
  | 'cc'         // 抄送节点
  | 'condition'  // 条件分支节点
  | 'end'        // 结束节点（流程终点）

// 处理人类型
export type HandlerType
  = 'role'        // 按角色
  | 'dept'        // 按部门
  | 'user'        // 指定人员
  | 'deptManager' // 部门负责人
  | 'initiator'   // 发起人自己
  | 'continuous'  // 连续多级审批

// 审批方式
export type ApprovalMode
  = 'or'         // 或签（一人审批即可）
  | 'and'        // 会签（所有人审批）
  | 'sequential' // 依次审批

// 节点定义
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

// 工作流定义
export interface WorkflowDefinition {
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
```

### 3. 文档与表格引擎

#### 架构设计

```
┌─────────────────────────────────────────────────────┐
│                Document Engine 引擎                  │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐    │
│  │              Excel 处理模块                   │    │
│  │  ┌─────────────┐ ┌─────────────┐            │    │
│  │  │  Importer   │ │  Exporter   │            │    │
│  │  │  (导入)     │ │  (导出)     │            │    │
│  │  └─────────────┘ └─────────────┘            │    │
│  │         │              │                     │    │
│  │         ▼              ▼                     │    │
│  │  ┌─────────────────────────────────┐        │    │
│  │  │      Web Worker (计算隔离)       │        │    │
│  │  │  - xlsx 解析/生成                │        │    │
│  │  │  - 字段映射/数据验证             │        │    │
│  │  └─────────────────────────────────┘        │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │              PDF 处理模块                    │    │
│  │  ┌─────────────┐ ┌─────────────┐            │    │
│  │  │  PdfViewer  │ │  Thumbnail  │            │    │
│  │  │  (查看器)   │ │  (缩略图)   │            │    │
│  │  └─────────────┘ └─────────────┘            │    │
│  │         │                                   │    │
│  │         ▼                                   │    │
│  │  ┌─────────────────────────────────┐        │    │
│  │  │   pdf.js + Web Worker (渲染)    │        │    │
│  │  │  - Canvas 2D 逐页渲染            │        │    │
│  │  │  - 缩放/翻页/打印               │        │    │
│  │  └─────────────────────────────────┘        │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

#### Excel 导入实现

```typescript
// Web Worker 处理海量数据
// excel.worker.ts
import { expose } from 'comlink'
import * as XLSX from 'xlsx'

async function parseExcel(file: File) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  
  const result = []
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 })
    result.push({ sheetName, data: jsonData })
  }
  
  return result
}

expose({ parseExcel })
```

#### PDF 预览实现

```typescript
// usePdfViewer composable
import * as pdfjsLib from 'pdfjs-dist'

export function usePdfViewer(options: PdfViewerOptions) {
  const pdfDoc = ref<pdfjsLib.PDFDocumentProxy | null>(null)
  const currentPage = ref(1)
  const scale = ref(1.5)

  async function loadPdf(source: string | ArrayBuffer) {
    const loadingTask = pdfjsLib.getDocument(source)
    pdfDoc.value = await loadingTask.promise
    return pdfDoc.value
  }

  async function renderPage(pageNum: number) {
    if (!pdfDoc.value) return
    
    const page = await pdfDoc.value.getPage(pageNum)
    const viewport = page.getViewport({ scale: scale.value })
    
    // Canvas 渲染
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.height = viewport.height
    canvas.width = viewport.width
    
    await page.render({
      canvasContext: context,
      viewport
    }).promise
  }

  return {
    loadPdf,
    renderPage,
    currentPage,
    scale,
    // ...
  }
}
```

### 4. HTTP 客户端封装

#### 统一拦截器设计

```typescript
// 请求拦截器 - Token 注入 + 重复请求取消
const pendingRequests = new Map<string, AbortController>()

http.interceptors.request.use(
  (config) => {
    // Token 注入
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }

    // 重复请求取消
    const requestKey = `${config.method}:${config.url}`
    if (pendingRequests.has(requestKey)) {
      pendingRequests.get(requestKey)!.abort()
    }
    
    const controller = new AbortController()
    config.signal = controller.signal
    pendingRequests.set(requestKey, controller)

    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器 - 统一错误处理 + 401 处理
http.interceptors.response.use(
  (response) => {
    // 清理 pending 请求
    const requestKey = `${response.config.method}:${response.config.url}`
    pendingRequests.delete(requestKey)

    const { code, message, data } = response.data
    if (code === 200) {
      return data
    }
    return Promise.reject(new Error(message))
  },
  (error) => {
    // 清理 pending 请求
    if (error.config) {
      const requestKey = `${error.config.method}:${error.config.url}`
      pendingRequests.delete(requestKey)
    }

    // 401 特殊处理 - 登录过期
    if (error.response?.status === 401) {
      handle401()
      return Promise.reject(error)
    }

    // 取消请求不报错
    if (error.name === 'CanceledError') {
      return Promise.reject({ isCancel: true })
    }

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

### 5. 权限指令

#### 自定义指令 `v-auth`

```typescript
// 权限指令实现
export function setupAuthDirective(app: App) {
  app.directive('auth', {
    mounted(el, binding) {
      const userStore = useUserStore()

      if (!userStore.hasPermission(binding.value)) {
        // 没有权限则移除元素
        el.parentNode?.removeChild(el)
      }
    }
  })
}

// 使用示例
// <el-button v-auth="'approval:launch'">发起审批</el-button>
// <el-button v-auth="'system:user:edit'">编辑用户</el-button>
```

---

## 项目职责

### 核心职责

| 职责领域 | 具体内容 | 量化成果 |
|----------|----------|----------|
| **表单引擎开发** | 设计并实现基于 JSON Schema 的表单配置化渲染方案 | 新单据交付周期 3 天 → 2 小时 |
| **流程引擎开发** | 基于 @vue-flow/core 实现可视化流程设计器 | 流程变更无需发版 |
| **Vue Query 架构** | 服务端状态与客户端状态分离架构设计 | 无效请求减少 60% |
| **文档处理引擎** | Web Worker + 纯前端 Excel/PDF 处理 | 服务器带宽成本降低 70% |
| **性能优化** | 虚拟滚动、请求取消、缓存策略 | 万级列表流畅渲染 |
| **权限系统** | RBAC 权限模型实现、路由守卫、权限指令 | 0 越权 Bug |

### 技术贡献详情

#### 1. 动态表单引擎开发

- 设计并实现基于 JSON Schema 的表单配置化渲染方案
- 支持 12+ 种表单字段类型（input/textarea/select/radio/checkbox/date/datetime/upload/switch/cascader 等）
- 实现复杂联动校验逻辑（条件必填/条件显示/条件禁用）
- 封装 VeeValidate + Zod 校验引擎，提供声明式校验体验
- **成果**：新单据交付周期从 3 天缩短至 2 小时

#### 2. 流程编排引擎开发

- 基于 @vue-flow/core 实现可视化流程设计器
- 支持 5 种节点类型（发起/审批/抄送/条件/结束）
- 实现节点配置面板，支持处理人配置、表单绑定、条件表达式
- 设计工作流定义 JSON 结构，支持流程保存与加载
- **成果**：流程变更无需发版，业务方可自助配置

#### 3. Vue Query 状态架构

- 设计服务端状态与客户端状态分离的架构
- 统一管理 QueryKey，避免缓存混乱
- 制定缓存策略（staleTime/gcTime），优化请求频率
- 实现 Mutation 成功后自动刷新相关查询
- **成果**：无效请求减少 60%，页面加载速度提升 40%

#### 4. 文档处理引擎

- 利用 Web Worker 实现海量数据纯前端处理
- Excel 导入导出支持字段映射、数据验证
- PDF 预览支持缩放、翻页、打印、下载
- **成果**：服务器带宽成本降低 70%，导出 10 万 + 行数据不卡顿

---

## 面试高频 Q&A

### Q1: 你在这个 OA 项目里主要承担了什么工作？项目背景是怎样的？

**回答思路**：背景 → 痛点 → 解决方案 → 成果

```
"这个系统是我们服务的一个偏大型 B 端客户的 OA 中台。我进场参与时，
底层的微服务和前端基础架子（Vite + Element-Plus）已经搭好了。

我核心负责的是日常复杂业务线需求的交付，以及对难维护的老模块进行局部架构升级。

比如，因为小团队人手紧、发版慢，我主动引入了 Vee-validate 去做动态表单引擎，
并调研了 @vue-flow 把审批流改成了可视化连线。

我的工作重心就是在保证系统稳定运行的前提下，用工程化的手段把最难啃的业务模块给拿下来。

最终效果是新单据的交付周期从 3 天缩短到 2 小时，流程变更也不需要发版了。"
```

### Q2: 怎么解决动态表单极度复杂的"联动校验"？

**回答思路**：问题描述 → 技术方案 → 代码实现 → 收益

```
"OA 表单最大的痛点是复杂的业务联动：比如选了'病假'，'医院证明'就变必填。

在处理这种动态生成的组件时，我深度利用了 Vee-validate。

在解析业务下发的 JSON Schema 时，我封装了一个 useDynamicValidate 组合式函数。
通过 Vue3 的 watch 深度监听底层的响应式 Model，一旦触发预设的条件，
立刻调用 Vee-validate 的实例接口，向规则栈中动态 push 或 remove 校验规则。

这套逻辑将引擎层与业务代码完全解耦，业务方只需要配置 JSON 就能实现复杂的联动规则。

最终效果是支持了 12+ 种字段类型和 8 种条件操作符，覆盖了客户 95% 的表单场景。"
```

### Q3: 为什么要引入 @vue-flow/core 去做工作流视图？

**回答思路**：原有问题 → 技术方案 → 实现细节 → 收益

```
"这其实是被甲方频繁的需求变更'倒逼'出来的重构。

以前的审批流是前后端写死的，加个会签节点都要双端同时发版，极其低效。

引入 @vue-flow/core 后，我们将审批人、条件网关封装为特定的 Custom Nodes。
行政管理员可以直接在画布上拖拽连线，前端将其序列化为包含 nodes 和 edges 的 JSON 拓扑图下发给后端。

具体来说，我设计了 5 种节点类型（发起/审批/抄送/条件/结束），
每种节点有独立的配置面板，支持处理人配置、表单绑定、条件表达式等。

这不仅降低了前端的工作量，更把审批逻辑的配置权直接交还给了业务方。
现在流程变更只需要业务方在后台配置即可，无需发版。"
```

### Q4: OA 系统里复杂的财务报表和发票，前端是怎么处理 xlsx 和 pdf 的？

**回答思路**：性能瓶颈 → 技术方案 → 实现细节 → 收益

```
"为了解决十万级明细报表导出导致服务器卡顿的效能瓶颈，我主导了'纯前端文件流处理方案'。

对于海量数据报表导出，我将数据梳理逻辑丢进 Web Worker 中防止阻塞主线程，
利用 xlsx 将 JSON 数组在纯前端转换为 ArrayBuffer，最终通过 Blob 生成文件下载。

对于电子发票的预览，我引入 pdf.js 深度定制了跨端沙箱，
利用 Canvas 2D 进行像素级逐页渲染，解决了移动端查阅高保真单据的交互痛点。

这套方案让服务器带宽成本降低了 70%，导出 10 万 + 行数据也能保持流畅。"
```

### Q5: OA 列表经常有重复的字典请求（如部门树、角色枚举），怎么优化？

**回答思路**：问题分析 → 技术方案 → 实现细节 → 收益

```
"为了防止组件堆叠带来的重复请求和竞态条件（Race Condition），
我基于 Axios 和 Pinia 对原有的网络层进行了局部改造。

在 Axios 拦截器中，我维护了一个 Pending Request Map。
当发现有相同的字典请求正在飞时，立刻利用原生的 AbortController 取消后续冗余请求。

同时，对于请求成功的部门树数据，我会存入 Pinia 并附带过期时间戳，
下次渲染优先返回内存缓存。

这套小而美的改造让系统的无效接口调用量骤降了 60% 以上。"
```

### Q6: Vue Query 和 Pinia 你是怎么区分使用的？

**回答思路**：状态分类 → 技术选型 → 具体实践 → 收益

```
"我是按照状态的来源来区分的：客户端状态 vs 服务端状态。

Pinia 适合管理客户端状态，比如：
- 用户信息（token、用户名、权限码）
- 应用配置（主题、语言、侧边栏展开状态）
- UI 状态（弹窗显隐、当前选中的菜单）

Vue Query 适合管理服务端状态，比如：
- 审批列表、流程定义等 API 数据
- 部门树、字典枚举等配置数据

Vue Query 带来的收益是：
1. 自动请求去重（多个组件同时请求同一数据只发一次）
2. 缓存策略（staleTime 内认为数据新鲜）
3. 背景静默更新（数据过期后自动后台刷新）
4. 重试机制（失败自动重试）

这样分工后，我不再需要手动管理 loading/error 状态，代码量减少了 30%。"
```

### Q7: 项目中遇到的最大技术挑战是什么？怎么解决的？

**回答思路**：挑战描述 → 解决过程 → 技术方案 → 成果反思

```
"最大的挑战是通讯录模块的性能问题。

客户有 2 万 + 员工，最初版本直接渲染导致页面卡死。

我的解决过程是：
1. 先用 Chrome DevTools 的 Performance 面板定位瓶颈，发现是 DOM 节点过多
2. 调研了虚拟滚动方案，最终选择 VueUse 的 useVirtualList
3. 改造列表组件，只渲染可视区域的 20 条数据
4. 配合 CSS contain: strict 告诉浏览器不需要重绘区域外内容

最终效果是 2 万 + 数据也能丝滑滚动，FPS 稳定在 55+。

这个挑战让我深刻体会到：性能优化一定要先测量再优化，不要凭感觉。"
```

---

## 技术深度剖析

### Vue 3 Composition API 优势

```typescript
// 传统 Options API - 逻辑分散
export default {
  data() {
    return {
      formData: {},
      loading: false,
      errors: {}
    }
  },
  methods: {
    async submit() { /* ... */ },
    validate() { /* ... */ }
  },
  watch: {
    formData: { /* ... */ }
  }
}

// Composition API - 逻辑聚合
export function useFormLogic() {
  const formData = ref({})
  const loading = ref(false)
  const errors = ref({})

  async function submit() { /* ... */ }
  function validate() { /* ... */ }

  watch(formData, () => { /* ... */ })

  return { formData, loading, errors, submit, validate }
}

// 使用
const { formData, loading, submit } = useFormLogic()
```

### TypeScript 类型安全实践

```typescript
// 1. API 响应类型定义
interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// 2. 泛型工具函数
async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await http.request<ApiResponse<T>>(config)
  return response.data
}

// 3. 类型守卫
function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is { code: 200; data: T } {
  return response.code === 200
}

// 4. 使用示例
const { data } = await request<ApprovalList>({
  url: '/approval/list',
  params: { page: 1, size: 20 }
})
```

---

## 性能优化实践

### 1. 虚拟滚动优化万级列表

```typescript
// 使用 VueUse 的 useVirtualList
import { useVirtualList } from '@vueuse/core'

const contacts = ref([...]) // 20000+ 条数据

const { list, containerProps, wrapperProps } = useVirtualList(contacts, {
  itemHeight: 60,
  keepBelow: 20, // 保持可视区域外 20 条
})

// 模板
<div v-bind="containerProps" style="height: 600px; overflow: auto">
  <div v-bind="wrapperProps">
    <div v-for="{ key, data } in list" :key="key">
      {{ data.name }}
    </div>
  </div>
</div>
```

### 2. 请求取消优化

```typescript
// Axios 拦截器中维护 pending 请求
const pendingRequests = new Map<string, AbortController>()

http.interceptors.request.use((config) => {
  const requestKey = `${config.method}:${config.url}`
  
  // 取消相同 URL 的未完成请求
  if (pendingRequests.has(requestKey)) {
    pendingRequests.get(requestKey)!.abort()
  }
  
  const controller = new AbortController()
  config.signal = controller.signal
  pendingRequests.set(requestKey, controller)
  
  return config
})
```

### 3. 缓存策略优化

```typescript
// Vue Query 缓存配置
useQuery({
  queryKey: ['approval', 'list'],
  queryFn: getApprovalList,
  staleTime: 30 * 1000,    // 30 秒内认为数据新鲜
  gcTime: 5 * 60 * 1000,   // 5 分钟后清理缓存
  retry: 1,                // 失败重试 1 次
  refetchOnWindowFocus: false // 窗口聚焦时不自动刷新
})
```

---

## 面试话术模板

### 自我介绍模板

```
"面试官您好，我叫 XXX，有 X 年前端开发经验。

最近一份工作是在 XXX 公司负责企业级 OA 协同办公平台的前端开发。

这个项目是面向中大型企业的 OA 中台系统，我核心负责的是动态表单引擎和
可视化工作流引擎的开发，以及 Vue Query 服务端状态架构的设计。

技术栈方面，我们使用的是 Vue 3 + TypeScript + Vite，
UI 框架是 Element Plus，状态管理用 Pinia 和 Vue Query。

在项目中，我主导引入了 Vee-validate 去做动态表单引擎，
把新单据的交付周期从 3 天缩短到了 2 小时。

另外我还调研了 @vue-flow 把审批流改成了可视化连线，
现在流程变更业务方可以自己配置，不需要发版了。

我对 Vue 3 的 Composition API 和 TypeScript 有比较深入的理解，
也积累了一些性能优化和工程化方面的经验。

希望能有机会加入贵公司，谢谢！"
```

### 项目介绍模板

```
"我介绍一下最近做的 OA 协同办公平台这个项目。

【项目背景】
这是我们服务的一个大型 B 端客户的 OA 中台系统，
主要痛点是单据种类繁多、审批链路多变、报表处理低效。

【我的职责】
我进场时基础架子已经搭好了，我核心负责的是复杂业务模块的架构升级。

【技术方案】
1. 引入 Vee-validate 做动态表单引擎，用 JSON Schema 驱动表单渲染
2. 基于 @vue-flow 做可视化工作流，支持拖拽式流程编排
3. 用 Vue Query 重构服务端状态管理，优化请求缓存策略
4. 利用 Web Worker 实现纯前端 Excel/PDF 处理

【项目成果】
- 新单据交付周期从 3 天缩短到 2 小时
- 流程变更无需发版，业务方可自助配置
- 无效请求减少 60%，页面加载速度提升 40%
- 服务器带宽成本降低 70%

【技术亮点】
我觉得比较大的亮点是用工程化的手段解决了业务痛点，
把前端从'切图者'变成了'引擎维护者'，提升了整个团队的交付效率。"
```

### 离职原因模板

```
"我离开上一家公司主要是出于个人发展的考虑。

在上一家公司我成长了很多，从最初的業務开发到后来主导核心引擎的开发，
技术深度和架构能力都有了很大提升。

但是公司的业务方向主要是传统 OA 领域，技术栈相对固定，
而我个人对前沿技术比较感兴趣，希望能接触更多有挑战性的项目。

贵公司在 XXX 领域的技术积累和行业影响力都很吸引我，
所以希望能有机会加入，在更大的平台上继续成长。"
```

---

## 附录

### 常用命令

```bash
# 开发
pnpm dev

# 构建
pnpm build

# 类型检查
pnpm typecheck

# 代码格式化
pnpm format

# Lint 检查
pnpm lint

# 运行测试
pnpm test
```

### 项目结构速查

```
OA/
├── apps/web/src/
│   ├── api/              # API 封装层
│   ├── components/       # 公共组件
│   │   ├── dynamic-form/ # 动态表单引擎
│   │   ├── workflow/     # 流程编排引擎
│   │   └── document/     # 文档处理引擎
│   ├── composables/      # Vue Query Hooks
│   ├── services/         # 服务层
│   ├── stores/           # Pinia 状态
│   ├── types/            # TypeScript 类型
│   ├── views/            # 页面组件
│   └── utils/            # 工具函数
└── packages/utils/       # 共享工具包
```

### 参考资源

- [Vue 3 官方文档](https://vuejs.org/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Vue Query 官方文档](https://tanstack.com/query/latest)
- [VeeValidate 官方文档](https://vee-validate.logaretm.com/)
- [@vue-flow 官方文档](https://vueflow.dev/)

---

> 文档版本：v2.0  
> 最后更新：2026 年 2 月  
> 维护者：项目核心开发团队
