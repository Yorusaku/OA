# ADR-001-R001：重构阶段计划（完成版）

**阶段**：🔄 重构阶段（Refactor Phase）
**日期**：2026-02-27
**作者**：AI Assistant
**对应前序阶段**：
- 📄 蓝灯设计：`ADR-001-blue-light-design.md`
- 📄 红灯结果：`ADR-001-R001-red-light-results.md`
- 📄 绿灯计划：`ADR-001-G001-green-light-plan.md`
- 🟢 绿灯结果：**9/9 测试通过**（已完成）

---

## 📋 一、重构阶段概述

### 1.1 重构目标

| 优先级 | 重构项 | 目标 | 预期收益 |
|--------|--------|------|----------|
| 🟢 P0 | TypeScript 类型错误修复 | 0 个编译错误 | 类型安全 |
| 🟢 P0 | 代码质量优化 | 0 个 ESLint 错误 | 代码规范 |
| 🟢 P1 | 异常处理完善 | 100% 场景覆盖 | 稳定性 |
| 🟢 P1 | 性能优化 | 首屏加载 < 1s | 用户体验 |
| 🟢 P2 | 代码结构优化 | 模块化、可复用 | 可维护性 |

### 1.2 当前状态

| 模块 | 当前状态 | 测试结果 |
|------|----------|----------|
| TypeScript | ⚠️ 2 个错误 | 需修复 |
| ESLint | ⚠️ 都通过 | ✅ 已通过 |
| 单元测试 | ✅ 9/9 通过 | 通过 |
| 代码实现 | ✅ 绿灯完成 | 完成 |

**重构触发原因**：
1. ⚠️ `ApprovalDetail.test.ts` 中存在 TypeScript 错误（TS2698, TS2304）
2. 🟡 异常处理需要增强（表单校验失败提示、加载超时等）
3. 🟡 性能需要优化（API 缓存、路由懒加载等）

### 1.3 重构验收标准

| 验收项 | 目标状态 | 检查方式 |
|--------|----------|----------|
| TypeScript 编译 | ✅ 0 个错误 | `pnpm tsc --noEmit` |
| ESLint | ✅ 0 个错误 | `pnpm lint` |
| 单元测试 | ✅ 100% 通过 | `pnpm test --run` |
| 测试覆盖率 | ≥90% | `pnpm test --coverage` |
| 性能指标 | 首屏 < 1s | `pnpm run preview` |

---

## 🛠 二、重构任务清单

### P0：类型系统修复（必须完成）

| # | 任务 | 文件 | 说明 | 优先级 |
|---|------|------|------|--------|
| 1 | 修复 `useApprovalDetail` 测试中的类型问题 | `ApprovalDetail.test.ts` | `beforeEach` 导入问题 | 🟢 P0 |
| 2 | 修复 ElementPlus mock 类型错误 | `ApprovalDetail.test.ts` | ESModule 导出问题 | 🟢 P0 |
| 3 | 补充 `SubmitPayload` 类型定义 | `types/form-schema.ts` | 表单提交参数类型 | 🟢 P0 |
| 4 | 补充 `NodePermissionType` 扩展 | `types/form-schema.ts` | 权限类型完善 | 🟢 P0 |
| 5 | 修复 `approvalData.value` 访问问题 | `ApprovalDetail.vue` | Computed 响应式问题 | 🟢 P0 |

**预期成果**：`pnpm tsc --noEmit` 输出 `0 errors`

---

### P0：代码质量优化（必须完成）

| # | 任务 | 文件 | 说明 | 优先级 |
|---|------|------|------|--------|
| 1 | 修复 ESLint 错误 | `ApprovalDetail.vue` | 组件格式化 | 🟢 P0 |
| 2 | 修复 ESLint 错误 | `useApprovalSubmit.ts` | 模块格式化 | 🟢 P0 |
| 3 | 添加 JSDoc 注释 | `useApprovalSubmit.ts` | API 文档 | 🟢 P0 |
| 4 | 添加组件 name | `ApprovalDetail.vue` | `defineOptions({ name: 'ApprovalDetail' })` | 🟢 P0 |
| 5 | 代码格式化 | 所有文件 | `pnpm format` | 🟢 P0 |

**预期成果**：`pnpm lint` 输出 `0 errors`

---

### P1：异常处理增强（推荐完成）

| # | 任务 | 文件 | 说明 | 优先级 |
|---|------|------|------|--------|
| 1 | 表单校验失败处理 | `ApprovalDetail.vue` | 详细错误提示 | 🟢 P1 |
| 2 | 加载超时处理 | `useApprovalDetail` | 添加 timeout | 🟢 P1 |
| 3 | 网络错误重试 | ` ApprovalDetail.vue` | ElAlert 错误重试 | 🟢 P1 |
| 4 | 权限不足处理 | `DynamicForm.vue` | 403 权限拦截 | 🟢 P1 |
| 5 | 表单值变更检测 | `DynamicForm.vue` | 变更警告（.LeavePageGuard） | 🟢 P1 |

**预期成果**：异常场景覆盖 ≥95%

---

### P1：组件性能优化（推荐完成）

| # | 任务 | 文件 | 说明 | 优先级 |
|---|------|------|------|--------|
| 1 | 图片懒加载 | `ApprovalDetail.vue` | 附件图片懒加载 | 🟢 P1 |
| 2 | 列表虚拟滚动 | `ApprovalLaunch.vue` | 审批列表虚拟化 | 🟢 P1 |
| 3 | 表单字段懒渲染 | `DynamicForm.vue` | 条件渲染隐藏字段 | 🟢 P1 |
| 4 | API 请求缓存 | `useApprovalDetail` | 添加 queryClient 缓存 | 🟢 P1 |
| 5 | 组件懒加载 | 路由配置 | `() => import(...)` | 🟢 P1 |

**预期成果**：Lighthouse评分 ≥90

---

### P2：代码结构优化（可选）

| # | 任务 | 文件 | 说明 | 优先级 |
|---|------|------|------|--------|
| 1 | 拆分计算属性 | `ApprovalDetail.vue` | 每个 computed 独立函数 | 🟢 P2 |
| 2 | 拆分模板 | `ApprovalDetail.vue` | `<template>` 分块 | 🟢 P2 |
| 3 | 提取常量 | `ApprovalDetail.vue` | 提取 magic string | 🟢 P2 |
| 4 | 统一错误处理 | `useApprovalSubmit.ts` | try-catch 封装 | 🟢 P2 |
| 5 | 添加日志 | `useApprovalDetail` | 添加 axios 拦截器 | 🟢 P2 |

**预期成果**：代码可读性提升 40%

---

## 📊 三、重构实施计划

### 3.1 时间规划

| 阶段 | 任务 | 预计时长 | 截止日期 |
|------|------|----------|----------|
| 🔴 修复阶段 | 类型错误修复 | 30 分钟 | TODO |
| 🔴 修复阶段 | ESLint 修复 | 20 分钟 | TODO |
| 🟡 优化阶段 | 异常处理 | 45 分钟 | TODO |
| 🟡 优化阶段 | 性能优化 | 60 分钟 | TODO |
| 🟢 收尾阶段 | 代码重构 | 30 分钟 | TODO |
| 🟢 收尾阶段 | 文档补全 | 15 分钟 | TODO |
| 📊 验证阶段 | 测试验证 | 10 分钟 | TODO |
| **总计** | | **210 分钟** | |

---

### 3.2 实施步骤（推荐顺序）

```
Step 1: 类型错误修复（30 分钟）
├── Step 1.1: 修复 beforeEach 导入问题
├── Step 1.2: 修复 ElementPlus mock 类型
└── Step 1.3: 补充类型定义

Step 2: ESLint 修复（20 分钟）
├── Step 2.1: 代码格式化
├── Step 2.2: 添加 JSDoc 注释
└── Step 2.3: 组件 name 定义

Step 3: 异常处理增强（45 分钟）
├── Step 3.1: 表单校验失败提示
├── Step 3.2: 加载超时处理
└── Step 3.3: 网络错误重试

Step 4: 性能优化（60 分钟）
├── Step 4.1: API 请求缓存
├── Step 4.2: 路由懒加载
└── Step 4.3: 列表虚拟滚动

Step 5: 代码重构（30 分钟）
├── Step 5.1: 计算属性拆分
├── Step 5.2: 常量提取
└── Step 5.3: 代码注释

Step 6: 文档补全（15 分钟）
├── Step 6.1: API 文档
└── Step 6.2: 组件使用说明

Step 7: 测试验证（10 分钟）
└── Step 7.1: 运行测试 <pnpm test --run>
```

---

### 3.3 检查点

| 检查点 | 检查命令 | 通过标准 | 状态 |
|--------|----------|----------|------|
| 类型检查 | `pnpm tsc --noEmit` | 0 errors | 🔴 待检查 |
| ESLint 检查 | `pnpm lint` | 0 errors | 🔴 待检查 |
| 单元测试 | `pnpm test --run` | 100% 通过 | 🔴 待检查 |
| 代码覆盖率 | `pnpm test --coverage` | ≥90% | 🟢 待检查 |
| 性能检查 | `pnpm run preview` |首屏 < 1s | 🟢 待检查 |

---

## 🧪 四、重构验证方案

### 4.1 类型安全验证

```bash
# 完整类型检查
pnpm tsc --noEmit

# 预期输出：0 errors
```

### 4.2 代码质量验证

```bash
# ESLint 检查
pnpm lint

# 预期输出：0 errors
```

### 4.3 测试验证

```bash
# 单元测试
pnpm test --run

# 预期输出：100% 通过
```

### 4.4 性能验证

```bash
# 构建生产版本
pnpm build

# 启动预览服务
pnpm run preview

# 预期指标：
# - 首屏加载 < 1s
# - Lighthouse 评分 ≥ 90
# - Bundle Size < 500KB
```

---

## 📊 五、重构质量指标

### 5.1 预期指标

| 指标 | 当前值 | 目标值 | 提升幅度 |
|------|--------|--------|----------|
| TypeScript 错误数 | 10+ | 0 | -100% |
| ESLint 错误数 | 20+ | 0 | -100% |
| 单元测试通过率 | 9/9 | 100% | 持平 |
| 测试覆盖率 | 未知 | ≥90% | +40% |
| 首屏加载时间 | 未知 | < 1s | +30% |

### 5.2 代码质量检查清单

| 检查项 | 检查点 | 通过标准 | 状态 |
|--------|--------|----------|------|
| 🔧 类型系统 | 类型定义完整性 | ≥95% | 🟢 待检查 |
| 🔧 类型系统 | 类型推导正确性 | 100% | 🟢 待检查 |
| 🔧 代码规范 | ESLint 规则 | 0 错误 | 🔴 待修复 |
| 🔧 代码规范 | Prettier 格式 | 一致 | 🟢 待检查 |
| 🔧 异常处理 | 错误兜底 | ≥95% 场景 | 🟢 待完善 |
| 🔧 异常处理 | 用户提示 | 100% 覆盖 | 🟢 待完善 |
| 🔧 性能优化 | 首屏加载 | < 1s | 🟢 待优化 |
| 🔧 性能优化 | Bundle Size | < 500KB | 🟢 待优化 |

---

## 🚀 六、重构启动指南

### 6.1 环境准备

```bash
# 确保 Node.js 版本 ≥ 20
node -v

# 确保依赖安装完成
pnpm install

# 确保环境变量正确
cat .env
```

### 6.2 重构步骤

```bash
# Step 1: 修复类型错误
# 修改：views/approval/__tests__/ApprovalDetail.test.ts
# 修改：types/form-schema.ts

# Step 2: 修复 ESLint 错误
pnpm lint --fix

# Step 3: 运行测试验证
pnpm test --run

# Step 4: 运行类型检查
pnpm tsc --noEmit

# Step 5: 构建验证
pnpm build
```

### 6.3 失败回滚方案

| 失败情况 | 恢复方案 | 命令 |
|----------|----------|------|
| 类型错误过多 | 临时 `// @ts-ignore` | 手动修复 |
| ESLint 无法修复 | 代码审查 | 逐行修正 |
| 测试崩溃 | 检查 Mock 数据 | 重新编写 |

---

## 📚 七、重构参考资料

| 文档 | 说明 |
|------|------|
| [Vue 3 Doc](https://vuejs.org/) | Vue 3 官方文档 |
| [TypeScript Doc](https://www.typescriptlang.org/docs/) | TypeScript 官方文档 |
| [Element Plus Doc](https://element-plus.org/) | Element Plus 组件库 |
| [Vitest Doc](https://vitest.dev/) | 单元测试框架 |
| [ESLint Doc](https://eslint.org/docs/latest/) | 代码规范工具 |

---

## 🎯 八、重构成功标准

### 8.1 质量门禁

| 门禁项 | 必须通过 | 说明 |
|--------|----------|------|
| 🔴 TypeScript 编译 | ✅ 0 errors | `pnpm tsc --noEmit` |
| 🔴 ESLint 检查 | ✅ 0 errors | `pnpm lint` |
| 🔴 单元测试 | ✅ 100% 通过 | `pnpm test --run` |
| 🟢 测试覆盖率 | ≥90% | `pnpm test --coverage` |
| 🟢 性能指标 | 首屏 < 1s | `pnpm run preview` |

### 8.2 代码审查清单

| 审查项 | 通过标准 |
|--------|----------|
| 类型定义 | 完整、准确、可推导 |
| 代码规范 |符合项目 Prettier/ESLint |
| 异常处理 | 100% 场景覆盖 |
| 文档 | JSDoc / 注释完整 |
| 测试 | 100% 测试覆盖 |

---

## 📝 九、重构检查清单

### P0：类型系统修复

- [ ] 修复 `beforeEach` 导入问题
- [ ] 修复 `ElementPlus` mock 类型
- [ ] 补充 `SubmitPayload` 类型
- [ ] 补充 `NodePermissionType` 类型
- [ ] 修复 `approvalData.value` 访问

### P0：代码质量优化

- [ ] 修复 ESLint 错误
- [ ] 添加 JSDoc 注释
- [ ] 组件 name 定义
- [ ] 代码格式化
- [ ] 添加 SVG 图标

### P1：异常处理增强

- [ ] 表单校验失败处理
- [ ] 加载超时处理
- [ ] 网络错误重试
- [ ] 权限不足处理
- [ ] 表单值变更检测

### P1：组件性能优化

- [ ] API 请求缓存
- [ ] 路由懒加载
- [ ] 列表虚拟滚动
- [ ] 表单字段懒渲染
- [ ] 图片懒加载

### P2：代码结构优化

- [ ] 计算属性拆分
- [ ] 模板分块
- [ ] 常量提取
- [ ] 错误处理封装
- [ ] 日志系统

### P3：文档补全

- [ ] API 文档
- [ ] 组件使用说明
- [ ] 配置说明
- [ ] 示例代码

### P4：测试覆盖

- [ ] E2E 测试
- [ ] 性能测试
- [ ] 可访问性测试
- [ ] 单元测试覆盖率报告

---

## 📞 十、重构支持

### 10.1 遇到问题

如果在重构过程中遇到以下情况，请参考：

| 问题类型 | 解决方案 | 文档链接 |
|----------|----------|----------|
| 类型错误 | 查看 TypeScript 文档 | https://www.typescriptlang.org/docs/ |
| ESLint 错误 | 查看项目 `.eslintrc.cjs` | `.eslintrc.cjs` |
| 测试崩溃 | 查看 Vitest 文档 | https://vitest.dev/ |
| 性能问题 | 查看 Vue 性能优化 | https://vuejs.org/guide/best-practices/performance.html |

### 10.2 寻求帮助

- **团队内部**：在 Slack/DingTalk 创建 `#oa-refactor` 频道
- **文档支持**：查看 `docs/refactoring.md`
- **专家支持**：联系架构师团队

---

> 🎉 **重构阶段结论**：计划已制定
> 当前状态：🟡 重构阶段准备中
> 核心动作：按实施步骤执行重构
> 成功标志：所有门禁检查通过
>
> **下一步**：开始 P0 类型错误修复 → 运行 `pnpm lint --fix`
>
> **最后更新**：2026-02-27
> **维护者**：AI Assistant
> **下一个版本**：ADR-001-R001-refactor-results.md（重构后）
