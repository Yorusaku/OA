# Phase 13-15: PWA 支持、测试覆盖、性能优化设计文档

**日期**: 2026-04-24  
**作者**: Claude  
**状态**: 待审核

## 概述

为 OA 系统添加 PWA 能力、完善测试体系、优化性能表现。采用顺序实施策略，按 Phase 13 → 14 → 15 依次完成。

## 背景

**当前状态：**
- ✅ 已完成移动端适配（Phase 13 前半部分）
- ✅ 已有 Vitest 单元测试框架（15个测试文件）
- ✅ 已有 Playwright E2E 测试框架（3个测试文件）
- ✅ 已有良好的代码分割配置（vendor chunks）
- ❌ 尚未配置 PWA 支持
- ⚠️ E2E 测试覆盖不足，仅有基础 smoke 测试

**目标：**
1. 支持离线访问核心功能，提升移动办公体验
2. 建立完整的 E2E 测试体系，保障关键业务流程质量
3. 优化首屏加载和运行时性能，提升用户体验

## 实施策略

采用 **方案 A：顺序实施**

- Phase 13: PWA 离线优先支持（2-3 天）
- Phase 14: 关键业务流程 E2E 测试（3-4 天）
- Phase 15: 全面性能优化（3-4 天）

**总计**: 8-11 天

**理由：**
1. PWA 的 Service Worker 会影响性能测试结果，应先完成
2. E2E 测试可以验证 PWA 离线功能
3. 性能优化后需要测试验证效果
4. 风险最低，每个阶段可独立交付

---

## Phase 13: PWA 离线优先支持

### 目标

- 支持"添加到主屏幕"
- 离线访问核心页面（工作台、审批列表）
- 静态资源缓存，减少网络请求
- 提供离线状态提示

### 架构设计

#### 1. Manifest 配置

**文件**: `apps/web/public/manifest.json`

```json
{
  "name": "全景智能 OA",
  "short_name": "OA",
  "description": "企业级 OA 协同办公平台",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#409eff",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**图标资源**:
- 192x192: 用于应用列表
- 512x512: 用于启动画面

#### 2. Service Worker 策略

使用 `vite-plugin-pwa` + Workbox 实现。

**缓存策略**:

1. **预缓存（Precache）**
   - 所有 vendor chunks（framework、element、query 等）
   - 核心页面：`/`, `/approval/todo`, `/approval/mine`
   - 关键静态资源：logo、图标字体

2. **运行时缓存（Runtime Cache）**
   - **Cache First**: JS/CSS/字体文件（1 年过期）
   - **Network First**: API 请求（7 天过期，离线时使用缓存）
   - **Stale While Revalidate**: 图片资源（30 天过期）

3. **离线回退**
   - API 请求失败时，显示缓存数据 + 离线提示
   - 完全离线时，显示离线页面

**Workbox 配置示例**:

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'icons/*.png'],
  manifest: {
    // 引用 manifest.json
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\.example\.com\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'image-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
    ],
  },
})
```

#### 3. 离线体验优化

**离线状态指示器**:
- 顶部显示"离线模式"横幅
- 使用 `navigator.onLine` 监听网络状态
- 自动重连提示

**表单数据暂存**:
- 使用 localStorage 暂存未提交的表单
- 联网后提示用户恢复数据
- 复用现有的 `useLocalStorageFormStorage`

### 实现清单

**新增文件**:
- `apps/web/public/manifest.json` - PWA manifest
- `apps/web/public/icons/icon-192x192.png` - 应用图标
- `apps/web/public/icons/icon-512x512.png` - 应用图标
- `apps/web/src/components/OfflineIndicator.vue` - 离线状态指示器

**修改文件**:
- `apps/web/vite.config.ts` - 添加 vite-plugin-pwa
- `apps/web/package.json` - 添加依赖
- `apps/web/index.html` - 添加 manifest 引用
- `apps/web/src/App.vue` - 添加离线指示器

### 验证方法

1. Chrome DevTools → Application → Manifest 检查配置
2. Chrome DevTools → Application → Service Workers 检查注册
3. Network 面板切换到 Offline，验证离线访问
4. 移动端浏览器测试"添加到主屏幕"

---

## Phase 14: 关键业务流程 E2E 测试

### 目标

- 覆盖审批完整流程（发起 → 提交 → 审批 → 完成）
- 验证表单验证逻辑（必填、联动、格式）
- 测试工作流编辑功能
- 验证移动端适配效果

### 测试范围

#### 1. 审批完整流程

**测试文件**: `e2e/approval-flow.spec.ts`

**场景**:
1. 用户 A 登录 → 发起审批
   - 进入发起页 `/approval/launch`
   - 选择"请假申请"流程
   - 填写表单（姓名、部门、请假类型、开始时间、结束时间、原因）
   - 提交成功，跳转到"我的申请"

2. 用户 B（审批人）登录 → 处理审批
   - 进入待办页 `/approval/todo`
   - 看到新的待办（用户 A 提交的）
   - 点击查看详情
   - 审批通过，填写审批意见
   - 提交成功，状态变为"已通过"

3. 用户 A 查看结果
   - 进入"我的申请"
   - 看到申请状态为"已通过"
   - 查看审批轨迹

**验证点**:
- 表单提交成功
- 待办列表更新
- 审批状态正确变更
- 审批轨迹记录完整

#### 2. 表单验证场景

**测试文件**: `e2e/form-validation.spec.ts`

**场景**:
1. 必填字段验证
   - 不填写必填字段，点击提交
   - 验证错误提示显示
   - 填写后错误消失

2. 联动校验
   - 选择"病假" → 医院证明字段变为必填
   - 不上传医院证明，提交失败
   - 上传后提交成功

3. 格式验证
   - 手机号格式错误 → 提示"请输入正确的手机号"
   - 邮箱格式错误 → 提示"请输入正确的邮箱"
   - 金额格式错误 → 提示"请输入正确的金额"

**验证点**:
- 错误提示正确显示
- 联动逻辑正确触发
- 格式验证规则生效

#### 3. 工作流编辑

**测试文件**: `e2e/workflow-editor.spec.ts`

**场景**:
1. 创建新流程
   - 进入流程管理 `/workflow/list`
   - 点击"新建流程"
   - 拖拽"发起节点" → "审批节点" → "结束节点"
   - 配置审批节点（审批人、表单权限）
   - 保存流程

2. 编辑已有流程
   - 加载已有流程
   - 添加"抄送节点"
   - 修改审批节点配置
   - 保存

**验证点**:
- 节点拖拽正常
- 节点配置保存成功
- 流程定义正确加载

#### 4. 移动端适配验证

**测试文件**: `e2e/mobile-adaptation.spec.ts`

**场景**:
1. 布局切换
   - 设置 viewport 为移动端尺寸（375x667）
   - 验证底部标签栏显示
   - 验证侧边栏隐藏

2. 手势交互
   - 审批列表左滑操作
   - 下拉刷新
   - 点击"更多"打开抽屉菜单

**验证点**:
- 移动端布局正确
- 手势交互正常
- 响应式切换流畅

### 测试架构

使用 **Page Object Model (POM)** 模式组织测试代码。

**目录结构**:
```
e2e/
├── approval-flow.spec.ts
├── form-validation.spec.ts
├── workflow-editor.spec.ts
├── mobile-adaptation.spec.ts
├── pages/
│   ├── ApprovalLaunchPage.ts
│   ├── ApprovalDetailPage.ts
│   └── WorkflowEditorPage.ts
└── utils/
    ├── auth.ts
    ├── approval.ts
    └── form.ts
```

### 实现清单

**新增文件**:
- `apps/web/e2e/approval-flow.spec.ts`
- `apps/web/e2e/form-validation.spec.ts`
- `apps/web/e2e/workflow-editor.spec.ts`
- `apps/web/e2e/mobile-adaptation.spec.ts`
- `apps/web/e2e/pages/ApprovalLaunchPage.ts`
- `apps/web/e2e/pages/ApprovalDetailPage.ts`
- `apps/web/e2e/pages/WorkflowEditorPage.ts`
- `apps/web/e2e/utils/approval.ts`
- `apps/web/e2e/utils/form.ts`

**修改文件**:
- `apps/web/playwright.config.ts` - 添加移动端设备配置

### 验证方法

1. 运行测试：`pnpm test:e2e`
2. UI 模式调试：`pnpm test:e2e:ui`
3. 查看测试报告：`playwright-report/index.html`
4. CI 集成：GitHub Actions 自动运行

---

## Phase 15: 全面性能优化

### 目标

- 首屏加载时间 < 2s（FCP < 1.5s, LCP < 2.5s）
- 运行时流畅，列表滚动 60fps
- Bundle size < 500KB (gzipped)
- 建立性能监控体系

### 优化策略

#### 1. 首屏加载优化

**路由懒加载**:

当前所有页面组件都是静态导入，导致初始 bundle 过大。改为动态 import。

```typescript
// router/index.ts - 优化前
import ApprovalTodo from '@/views/approval/ApprovalTodo.vue'

// 优化后
const ApprovalTodo = () => import('@/views/approval/ApprovalTodo.vue')
```

**按模块分组**:
```typescript
const ApprovalTodo = () => import(
  /* webpackChunkName: "approval" */
  '@/views/approval/ApprovalTodo.vue'
)
```

**关键路由预加载**:
```typescript
// 工作台和审批列表预加载
router.beforeEach((to, from, next) => {
  if (to.path === '/') {
    import('@/views/approval/ApprovalTodo.vue')
  }
  next()
})
```

**代码分割优化**:

进一步细化 vendor chunks：
- `vendor-form-create` 按需加载（仅表单设计器使用）
- `vendor-logicflow` 按需加载（仅工作流编辑器使用）
- `vendor-docs` 按需加载（仅文档预览使用）

**关键 CSS 提取**:
- 提取首屏必需的 CSS 内联到 HTML
- 非关键 CSS 异步加载

#### 2. 运行时性能优化

**虚拟滚动**:

审批列表数据量大时，使用虚拟滚动优化渲染。

```vue
<!-- ApprovalTodo.vue -->
<template>
  <VirtualList
    :items="data.list"
    :item-height="80"
    :buffer="5"
  >
    <template #default="{ item }">
      <ApprovalCard :record="item" />
    </template>
  </VirtualList>
</template>
```

复用通讯录的虚拟滚动实现。

**图片懒加载**:

```vue
<script setup>
import { useIntersectionObserver } from '@vueuse/core'

const imgRef = ref(null)
const isVisible = ref(false)

useIntersectionObserver(imgRef, ([{ isIntersecting }]) => {
  if (isIntersecting) {
    isVisible.value = true
  }
})
</script>

<template>
  <img
    ref="imgRef"
    :src="isVisible ? actualSrc : placeholderSrc"
  />
</template>
```

**防抖/节流优化**:

```typescript
// 搜索输入防抖
const handleSearch = debounce((keyword: string) => {
  filters.keyword = keyword
}, 300)

// 滚动事件节流
const handleScroll = throttle(() => {
  // 滚动逻辑
}, 100)
```

**骨架屏**:

替代 loading 状态，提升感知性能。

```vue
<template>
  <div v-if="isLoading">
    <el-skeleton :rows="5" animated />
  </div>
  <div v-else>
    <!-- 实际内容 -->
  </div>
</template>
```

**乐观更新**:

审批操作立即更新 UI，不等待 API 响应。

```typescript
async function handleApprove(record: ApprovalRecord) {
  // 乐观更新
  record.status = 'approved'
  
  try {
    await approveApproval(record.id)
  } catch (error) {
    // 回滚
    record.status = 'pending'
    ElMessage.error('操作失败')
  }
}
```

#### 3. 构建优化

**Bundle 分析**:

```bash
pnpm add -D rollup-plugin-visualizer
```

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
})
```

**Tree-shaking 优化**:
- 移除未使用的 lodash 方法（使用 lodash-es）
- 移除未使用的 Element Plus 组件
- 移除未使用的 VueUse 工具

**压缩优化**:
- 生产环境移除 console.log
- 图片资源压缩（使用 vite-plugin-imagemin）
- 启用 Brotli 压缩

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
})
```

**缓存策略**:
- 文件名 hash 化（已有）
- 长期缓存 vendor chunks
- HTML 使用协商缓存

### 性能指标

**目标**:
- FCP (First Contentful Paint) < 1.5s
- LCP (Largest Contentful Paint) < 2.5s
- TTI (Time to Interactive) < 3.5s
- FID (First Input Delay) < 100ms
- CLS (Cumulative Layout Shift) < 0.1
- Bundle size < 500KB (gzipped)

**监控方案**:

使用 Lighthouse CI 集成到 CI/CD。

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm build
      - run: pnpm lighthouse:ci
```

**性能预算**:

```json
// lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "first-contentful-paint": ["error", { "maxNumericValue": 1500 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "interactive": ["error", { "maxNumericValue": 3500 }],
        "total-byte-weight": ["error", { "maxNumericValue": 512000 }]
      }
    }
  }
}
```

### 实现清单

**新增文件**:
- `apps/web/src/components/VirtualList.vue` - 虚拟滚动组件
- `apps/web/src/components/LazyImage.vue` - 懒加载图片组件
- `apps/web/lighthouserc.json` - Lighthouse 配置
- `.github/workflows/lighthouse.yml` - Lighthouse CI

**修改文件**:
- `apps/web/src/router/index.ts` - 路由懒加载
- `apps/web/vite.config.ts` - 构建优化配置
- `apps/web/package.json` - 添加依赖
- `apps/web/src/views/approval/ApprovalTodo.vue` - 虚拟滚动
- `apps/web/src/views/contacts/ContactList.vue` - 复用虚拟滚动

### 验证方法

1. Lighthouse 测试：Chrome DevTools → Lighthouse
2. Bundle 分析：`pnpm build` 后查看 stats.html
3. 网络限速测试：Chrome DevTools → Network → Throttling
4. 性能监控：Lighthouse CI 报告

---

## 实施时间表

| 阶段 | 任务 | 预计时间 |
|------|------|----------|
| Phase 13 | PWA 离线优先支持 | 2-3 天 |
| Phase 14 | 关键业务流程 E2E 测试 | 3-4 天 |
| Phase 15 | 全面性能优化 | 3-4 天 |
| **总计** | | **8-11 天** |

## 风险与依赖

**风险**:
1. Service Worker 缓存策略可能影响开发调试
2. 虚拟滚动可能影响现有列表交互
3. 路由懒加载可能导致页面切换延迟

**缓解措施**:
1. 开发环境禁用 Service Worker
2. 虚拟滚动保留降级方案
3. 关键路由预加载

**依赖**:
- vite-plugin-pwa
- rollup-plugin-visualizer
- @lhci/cli (Lighthouse CI)

## 验收标准

**Phase 13 (PWA)**:
- ✅ 可以"添加到主屏幕"
- ✅ 离线时可访问工作台和审批列表
- ✅ 静态资源缓存命中率 > 80%
- ✅ 离线状态指示器正常显示

**Phase 14 (测试)**:
- ✅ 审批完整流程测试通过
- ✅ 表单验证测试通过
- ✅ 工作流编辑测试通过
- ✅ 移动端适配测试通过
- ✅ 测试覆盖率 > 70%（E2E 关键路径）

**Phase 15 (性能)**:
- ✅ FCP < 1.5s, LCP < 2.5s, TTI < 3.5s
- ✅ Bundle size < 500KB (gzipped)
- ✅ 列表滚动流畅（60fps）
- ✅ Lighthouse 分数 > 90

---

## 附录

### 参考资料

- [PWA 最佳实践](https://web.dev/progressive-web-apps/)
- [Playwright 文档](https://playwright.dev/)
- [Vite 性能优化](https://vitejs.dev/guide/performance.html)
- [Web Vitals](https://web.dev/vitals/)

### 相关文档

- [Phase 13 移动端适配计划](C:\Users\starB1ue\.claude\plans\plan-gemeni-turborepo-scalable-parrot.md)
- [README.md](e:\frontend\allstack\OA\README.md)

