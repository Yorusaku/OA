# 全景智能 OA 协同办公平台

> 企业级 OA / 人事协同中台 - 前端引擎化、数据驱动视图

[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Element Plus](https://img.shields.io/badge/Element_Plus-2.9-409EFF?logo=element)](https://element-plus.org/)

## 🌟 项目亮点

### 核心特性

1. **动态表单引擎** - 基于 JSON Schema + Element Plus 表单验证
   - 支持 12+ 种表单字段类型
   - 联动校验（如：选择病假→医院证明必填）
   - 数据驱动渲染，可配置化生成表单

2. **可视化流程编排引擎** - 基于 LogicFlow
   - 拖拽式流程设计器
   - 支持发起/审批/抄送/条件分支节点
   - 节点绑定表单 Schema
   - 流程定义保存与加载
   - 框架无关的图形引擎，避免响应式冲突

3. **文档与表格引擎** - 纯前端文档处理 🆕
   - Web Worker + 流式处理海量数据
   - Excel 导入导出（支持字段映射、数据验证）
   - PDF 跨端预览（支持缩放、翻页、打印）
   - 电子发票/审批单在线预览

4. **Vue Query 服务端状态架构**
   - 服务端状态与客户端状态彻底分离
   - 统一 QueryKey 管理
   - SWR 缓存策略优化
   - 自动请求去重与缓存

5. **Monorepo + Turborepo 构建**
   - pnpm workspace 依赖管理
   - Turbo 加速构建
   - **共享包：@oa/utils（工具库）、@oa/config（工程化配置）**

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| **框架** | Vue 3.5 + TypeScript + Composition API |
| **构建** | Vite 7.3 + Turborepo |
| **包管理** | pnpm workspace |
| **UI** | Element Plus 2.9 + Tailwind CSS |
| **状态** | Pinia (客户端) + Vue Query (服务端) |
| **路由** | Vue Router 4 |
| **表单** | Element Plus async-validator |
| **流程** | LogicFlow |
| **文档** | xlsx (SheetJS) + pdf.js + comlink |
| **工具** | VueUse |

## 📁 目录结构

```
OA/
├── apps/
│   └── web/                    # 主应用
│       ├── src/
│       │   ├── api/            # API 封装层
│       │   ├── components/     # 公共组件
│       │   │   ├── dynamic-form/   # 动态表单引擎
│       │   │   ├── workflow/       # 流程编排引擎
│       │   │   └── document/       # 文档处理引擎
│       │   ├── composables/    # 组合式函数 (Vue Query hooks)
│       │   │   ├── useApproval.ts
│       │   │   ├── useWorkflow.ts
│       │   │   ├── useExcelImport.ts
│       │   │   ├── useExcelExport.ts
│       │   │   └── usePdfViewer.ts
│       │   ├── services/       # 服务层
│       │   │   └── document/
│       │   ├── workers/        # Web Worker
│       │   │   ├── excel.worker.ts
│       │   │   └── pdf.worker.ts
│       │   ├── layouts/        # 布局组件
│       │   ├── router/         # 路由配置
│       │   ├── stores/         # Pinia 状态
│       │   ├── types/          # TypeScript 类型
│       │   ├── utils/          # 工具函数 (重新导出 @oa/utils)
│       │   ├── views/          # 页面组件
│       │   └── main.ts         # 入口文件
│       └── package.json
│
├── packages/                   # 共享包
│   ├── utils/                  # @oa/utils - 工具函数库
│   │   ├── src/
│   │   │   └── index.ts        # 日期格式化、数据验证、条件判断引擎
│   │   └── package.json
│   │
│   └── config/                 # @oa/config - 工程化配置
│       ├── src/
│       │   ├── eslint-config.js
│       │   ├── prettier-config.js
│       │   └── tailwind-config.js
│       └── package.json
│
├── plan/                       # 开发计划文档
├── eslint.config.js            # ESLint 配置 (引用 @oa/config)
├── pnpm-workspace.yaml         # Workspace 配置
├── turbo.json                  # Turborepo 配置
└── package.json                # 根配置
```

## 🚀 快速开始

### 环境要求

- Node.js >= 20
- pnpm >= 9

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

访问 http://localhost:5173

### 构建

```bash
pnpm build
```

### 类型检查

```bash
pnpm typecheck
```

### 代码格式化

```bash
pnpm format
```

## 📦 核心模块说明

### 1. 动态表单引擎 (`src/components/dynamic-form`)

```typescript
// 使用示例
import { DynamicForm } from '@/components/dynamic-form'
import type { FormSchema } from '@/types/form-schema'

const schema: FormSchema = {
  fields: [
    { key: 'name', label: '姓名', type: 'input', required: true },
    { key: 'dept', label: '部门', type: 'select', options: [...] }
  ]
}
```

**联动校验示例：**
```typescript
{
  key: 'hospitalCert',
  label: '医院证明',
  type: 'upload',
  linkage: {
    requiredWhen: { field: 'leaveType', operator: 'eq', value: 'sick' }
  }
}
```

### 2. 流程编排引擎 (`src/components/workflow`)

```typescript
// 使用示例
import { WorkflowCanvas, NodeConfigPanel } from '@/components/workflow'
```

**支持节点类型：**
- `start` - 发起节点
- `approval` - 审批节点
- `cc` - 抄送节点
- `condition` - 条件分支
- `end` - 结束节点

### 3. 文档与表格引擎 (`src/components/document`) 🆕

```typescript
// Excel 导入
import { ExcelImporter } from '@/components/document'
import type { ExcelValidationRule } from '@/types/document'

const validationRules: ExcelValidationRule[] = [
  { field: 'amount', required: true, type: 'number' },
  { field: 'date', required: true, type: 'date' },
]

// PDF 预览
import { DocumentPreview } from '@/components/document'

<DocumentPreview :source="invoiceUrl" type="pdf" />
```

**核心功能：**
- `ExcelImporter` - Excel 导入（拖拽上传、数据预览、字段验证）
- `ExcelExporter` - Excel 导出（自定义列、格式化数据）
- `ExcelFieldMapper` - 字段映射（适配外部系统数据）
- `PdfViewer` - PDF 查看器（缩放、翻页、打印、下载）
- `DocumentPreview` - 统一文档预览（自动识别 Excel/PDF）

**技术亮点：**
- Web Worker 隔离计算，不阻塞 UI
- 流式处理大文件，避免内存溢出
- 支持海量数据（10 万 + 行）解析

### 4. Vue Query Hooks (`src/composables`)

```typescript
// 审批相关
import { useApprovalList, useSubmitApproval } from '@/composables/useApproval'

// 流程相关
import { useWorkflowList, useSaveWorkflow } from '@/composables/useWorkflow'

// 字典/部门
import { useDictByType } from '@/composables/useDict'
import { useDeptTree } from '@/composables/useDept'
```

### 5. 共享工具库 (`@oa/utils`)

```typescript
// 日期格式化
import { formatDate, formatMoney } from '@oa/utils'

formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss')
formatMoney(1234567.89) // 1,234,567.89

// 数据验证
import { isMobilePhone, isEmail, isIdCard } from '@oa/utils'

isMobilePhone('13800138000') // true
isEmail('test@example.com') // true

// 条件判断引擎
import { checkCondition, checkConditions } from '@oa/utils'

checkCondition(
  { field: 'leaveType', operator: 'eq', value: 'sick' },
  { leaveType: 'sick' }
) // true
```

## 🗂️ 业务模块

| 模块 | 路由 | 说明 |
|------|------|------|
| 工作台 | `/` | 待办统计、快捷入口 |
| 发起审批 | `/approval/launch` | 选择流程并填写表单 |
| 我的申请 | `/approval/mine` | 查看我发起的申请 |
| 待我审批 | `/approval/todo` | 需要我处理的审批 |
| 组织架构 | `/org/tree` | 部门树与成员列表 |
| 通讯录 | `/contacts/list` | 人员列表（虚拟滚动优化） |
| 用户管理 | `/system/users` | 用户 CRUD |
| 角色管理 | `/system/roles` | 角色与权限配置 |
| 流程管理 | `/workflow/list` | 流程定义列表 |
| 流程编辑 | `/workflow/editor/:id` | 流程画布编辑器 |

## 🔐 权限说明

采用 RBAC 模型，权限码示例：

- `dashboard:view` - 查看工作台
- `approval:launch` - 发起审批
- `approval:todo` - 待我审批
- `workflow:view` - 查看流程
- `system:user:view` - 用户管理

## 🎨 主题定制

通过 Tailwind Design Tokens 统一 Element Plus 主题：

```javascript
// packages/config/src/tailwind-config.js
colors: {
  primary: 'rgb(var(--el-color-primary-rgb, 64 158 255))',
  success: 'rgb(var(--el-color-success-rgb, 103 194 58))',
  // ...
}
```

## 📝 开发计划

- [x] 阶段 0-2: Monorepo 基建、权限壳与布局
- [x] 阶段 3: Vue Query 服务端状态架构
- [x] 阶段 4: 动态表单引擎
- [x] 阶段 5: 可视化流程编排引擎
- [x] 阶段 6: 业务功能模块
- [x] 阶段 7: 性能优化（虚拟列表、主题统一）
- [x] 阶段 8: 联调收尾（异常处理、401 处理、文档）
- [x] 阶段 9: 文档与表格引擎（Excel 导入导出、PDF 预览）
- [x] 阶段 10: Monorepo 架构优化（@oa/utils、@oa/config）

## 📄 License

MIT
