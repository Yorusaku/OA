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

3. **文档与表格引擎** - 纯前端文档处理
   - Web Worker + 流式处理海量数据
   - Excel 导入导出（支持字段映射、数据验证）
   - PDF 跨端预览（支持缩放、翻页、打印）
   - 电子发票/审批单在线预览

4. **PWA 离线优先架构** - 渐进式 Web 应用 🆕
   - Service Worker 离线缓存（Cache First + Network First + SWR）
   - 可安装到桌面/主屏幕
   - 离线状态提示与优雅降级
   - 静态资源预缓存，API 请求智能缓存

5. **性能优化体系** - 首屏 + 运行时 + 构建优化 🆕
   - 路由懒加载 + 预加载（webpackPrefetch）
   - 虚拟滚动（VirtualList）处理大列表
   - 图片懒加载（v-lazy 指令 + Intersection Observer）
   - Vite 构建优化（Terser 压缩、代码分割、Tree Shaking）
   - Lighthouse CI 性能监控（FCP < 2s, LCP < 2.5s）

6. **Vue Query 服务端状态架构**
   - 服务端状态与客户端状态彻底分离
   - 统一 QueryKey 管理
   - SWR 缓存策略优化
   - 自动请求去重与缓存

7. **Monorepo + Turborepo 构建**
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
| **PWA** | Service Worker + Web App Manifest |
| **测试** | Playwright (E2E) + Vitest (单元测试) |
| **性能** | Lighthouse CI + Virtual Scrolling + Lazy Loading |
| **工具** | VueUse |

## 📁 目录结构

```
OA/
├── apps/
│   └── web/                    # 主应用
│       ├── public/
│       │   ├── manifest.json   # PWA 配置
│       │   └── sw.js           # Service Worker
│       ├── e2e/                # E2E 测试
│       │   ├── pages/          # Page Object Model
│       │   ├── approval-flow.spec.ts
│       │   ├── form-validation.spec.ts
│       │   ├── workflow-editor.spec.ts
│       │   └── mobile-adaptation.spec.ts
│       ├── src/
│       │   ├── api/            # API 封装层
│       │   ├── components/     # 公共组件
│       │   │   ├── dynamic-form/   # 动态表单引擎
│       │   │   ├── workflow/       # 流程编排引擎
│       │   │   ├── document/       # 文档处理引擎
│       │   │   ├── common/
│       │   │   │   └── VirtualList.vue  # 虚拟滚动组件
│       │   │   └── OfflineIndicator.vue # 离线状态提示
│       │   ├── composables/    # 组合式函数 (Vue Query hooks)
│       │   │   ├── useApproval.ts
│       │   │   ├── useWorkflow.ts
│       │   │   ├── useExcelImport.ts
│       │   │   ├── useExcelExport.ts
│       │   │   ├── usePdfViewer.ts
│       │   │   └── useLazyImage.ts  # 图片懒加载
│       │   ├── directives/     # 自定义指令
│       │   │   ├── auth.ts     # 权限指令
│       │   │   └── lazy.ts     # 图片懒加载指令
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
│       ├── lighthouserc.json   # Lighthouse CI 配置
│       ├── playwright.config.ts # Playwright 配置
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
# 生产构建
pnpm build

# 构建并分析包体积
pnpm build:analyze
```

### 测试

```bash
# 单元测试
pnpm test

# E2E 测试
pnpm test:e2e

# E2E 测试 UI 模式
pnpm test:e2e:ui

# 冒烟测试
pnpm test:smoke
```

### 性能审计

```bash
# Lighthouse CI 性能审计
pnpm lighthouse
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

### 3. 文档与表格引擎 (`src/components/document`)

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

### 4. PWA 离线支持 (`public/sw.js`, `public/manifest.json`) 🆕

```typescript
// 离线状态监听
import { OfflineIndicator } from '@/components/OfflineIndicator.vue'

<OfflineIndicator />
```

**缓存策略：**
- **Cache First** - 静态资源（JS/CSS/字体/图标）优先使用缓存
- **Network First** - API 请求优先网络，失败时降级到缓存
- **Stale While Revalidate** - 图片资源先返回缓存，后台更新

**PWA 特性：**
- 可安装到桌面/主屏幕（manifest.json）
- 离线访问核心功能
- 后台同步（Background Sync）
- 自动更新提示

### 5. 性能优化 🆕

#### 5.1 路由懒加载 + 预加载

```typescript
// src/router/index.ts
const Dashboard = () => import(
  /* webpackChunkName: "dashboard", webpackPrefetch: true */
  '@/views/dashboard/Workbench.vue'
)
```

高优先级路由（工作台、待办、发起审批）使用 `webpackPrefetch` 预加载。

#### 5.2 虚拟滚动

```vue
<script setup>
import { VirtualList } from '@/components/common/VirtualList.vue'

const items = ref([...]) // 10000+ 条数据
</script>

<template>
  <VirtualList :items="items" :item-height="60">
    <template #default="{ item }">
      <div>{{ item.name }}</div>
    </template>
  </VirtualList>
</template>
```

只渲染可见区域 + 缓冲区，支持海量数据列表。

#### 5.3 图片懒加载

```vue
<!-- 指令方式 -->
<img v-lazy="imageUrl" alt="description" />

<!-- Composable 方式 -->
<script setup>
import { useLazyImage } from '@/composables/useLazyImage'

const { observe, unobserve } = useLazyImage()
</script>
```

基于 Intersection Observer API，自动加载可见区域图片。

#### 5.4 构建优化

```typescript
// vite.config.ts
build: {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,  // 移除 console.log
      drop_debugger: true
    }
  },
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-framework': ['vue', 'vue-router', 'pinia'],
        'vendor-element': ['element-plus'],
        'vendor-logicflow': ['@logicflow/core', '@logicflow/extension'],
        // ...
      }
    }
  }
}
```

**优化效果：**
- 首屏加载时间 < 2s（FCP）
- 最大内容绘制 < 2.5s（LCP）
- 累积布局偏移 < 0.1（CLS）
- 总阻塞时间 < 300ms（TBT）

### 6. E2E 测试 (`e2e/`) 🆕

```typescript
// Page Object Model 示例
import { test, expect } from '@playwright/test'
import { LoginPage, ApprovalListPage } from './pages/ApprovalPages'

test('提交审批流程', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.login('admin', 'admin123')
  
  const listPage = new ApprovalListPage(page)
  await listPage.goto()
  await listPage.clickLaunchButton()
  // ...
})
```

**测试覆盖：**
- 审批流程（提交、审批、驳回、转交、批量操作）
- 表单验证（必填、数字、日期、联动规则）
- 流程编辑器（节点操作、连线、配置、验证）
- 移动端适配（响应式布局、手势交互）

### 7. Vue Query Hooks (`src/composables`)

```typescript
// 审批相关
import { useApprovalList, useSubmitApproval } from '@/composables/useApproval'

// 流程相关
import { useWorkflowList, useSaveWorkflow } from '@/composables/useWorkflow'

// 字典/部门
import { useDictByType } from '@/composables/useDict'
import { useDeptTree } from '@/composables/useDept'
```

### 8. 共享工具库 (`@oa/utils`)

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
- [x] 阶段 11: 应用中心与模板市场
- [x] 阶段 12: 可视化动态表单设计器
- [x] 阶段 13: PWA 支持（Service Worker、离线缓存、可安装）
- [x] 阶段 14: E2E 测试覆盖（Playwright、Page Object Model）
- [x] 阶段 15: 性能优化（路由懒加载、虚拟滚动、图片懒加载、构建优化）

## 📄 License

MIT
