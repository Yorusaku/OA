# ADR-001: Monorepo 共享包架构优化

**日期**: 2026-02-24  
**状态**: 已实施  
**影响范围**: 项目架构、开发流程、代码组织

---

## 背景

随着项目功能模块的增加，我们发现：
1. 工具函数（日期格式化、数据验证等）在多个位置重复定义
2. ESLint/Prettier/Tailwind 配置分散，难以保持一致性
3. 未来可能有多条产品线，需要复用基础设施

## 决策

将 `apps/web/src/utils` 和根目录配置抽离到独立的 packages：

```
packages/
├── utils/      # @oa/utils - 纯工具函数库
└── config/     # @oa/config - 工程化配置
```

## 判断标准

### ✅ 抽离到 packages 的条件

| 条件 | 说明 | 示例 |
|------|------|------|
| **无业务依赖** | 不依赖具体业务逻辑 | 日期格式化、金额格式化 |
| **可跨项目复用** | 多个项目/包都需要 | 数据验证、条件判断引擎 |
| **纯函数** | 无副作用、无状态 | `formatDate()`, `isEmail()` |
| **配置统一** | 需要多项目共享 | ESLint、Prettier、Tailwind |

### ❌ 保留在 apps/web 的内容

| 内容 | 理由 |
|------|------|
| **types/** | FormSchema/WorkflowDefinition 是业务特定的 |
| **components/** | 引擎虽然通用，但深度绑定 Element Plus |
| **composables/** | useApproval/useWorkflow 依赖具体后端接口 |
| **stores/** | Pinia 状态是应用特定的 |

## 实施方案

### 1. @oa/utils

**职责**: 纯工具函数库，无业务逻辑依赖

**包含内容**:
```typescript
// 日期时间格式化
formatDate(), formatDateTime(), formatMoney(), formatFileSize()

// 数据验证
isMobilePhone(), isEmail(), isIdCard(), isUrl(), isNumber()

// 条件判断引擎 (表单联动核心)
checkCondition(), checkConditions(), getConditionFields()

// 常量定义
API_PREFIX, ERROR_CODES, FORM_FIELD_TYPES, STORAGE_KEYS, ROUTES
```

**使用方式**:
```typescript
// 在 apps/web 中
import { formatDate, isEmail } from '@oa/utils'

// 在 packages/config 中
import { camelToKebab } from '@oa/utils'
```

### 2. @oa/config

**职责**: 统一的工程化配置

**包含内容**:
```javascript
// eslint-config.js    - ESLint 配置
// prettier-config.js  - Prettier 配置
// tailwind-config.js  - Tailwind 主题配置
```

**使用方式**:
```javascript
// eslint.config.js (根目录)
import config from '@oa/config/eslint'

export default {
  ...config,
  vue: true,
  typescript: true,
}

// apps/web/tailwind.config.cjs
const config = require('@oa/config/tailwind')

module.exports = {
  ...config.default,
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
}
```

## 架构原则

### 1. 逻辑隔离、物理聚合

```
业务相关的放在一起，纯工具抽离

apps/web/src/
├── components/     # ✅ 业务组件（含引擎）
├── types/          # ✅ 业务类型定义
└── utils/          # ⚠️ 重新导出 @oa/utils（保持向后兼容）

packages/
├── utils/          # ✅ 纯工具函数
└── config/         # ✅ 工程化配置
```

### 2. 谁复用谁抽离

只抽离真正需要跨项目复用的内容，避免过度拆分。

**当前决策**:
- ✅ `utils` 抽离 - 纯函数，可跨项目复用
- ✅ `config` 抽离 - 统一规范，避免配置漂移
- ❌ `types` 保留 - 业务特定的类型定义
- ❌ `components` 保留 - 引擎深度绑定 Element Plus
- ❌ `composables` 保留 - 依赖具体后端接口

**未来演进**:
```
如果未来有 2 个 + OA 系统，考虑：
- 将 dynamic-form 抽离到 packages/ui
- 将 workflow 抽离到 packages/ui
- 将 document 抽离到 packages/ui
```

### 3. 避免过早优化

**团队规模**: 5 人  
**当前优先级**: 业务交付速度 > 架构完美度

**权衡考虑**:
- 不过度拆分增加 CI/CD 复杂度
- 不引入复杂的依赖管理（如 eslint-plugin-boundaries）
- 不使用 changesets 管理多包版本（当前单应用）

## 迁移步骤

### Step 1: 创建 packages

```bash
packages/utils/
└── src/
    └── index.ts    # 250+ 行纯函数

packages/config/
└── src/
    ├── eslint-config.js
    ├── prettier-config.js
    └── tailwind-config.js
```

### Step 2: 更新依赖

```json
// apps/web/package.json
{
  "dependencies": {
    "@oa/utils": "workspace:*"
  },
  "devDependencies": {
    "@oa/config": "workspace:*"
  }
}
```

### Step 3: 重新导出（保持向后兼容）

```typescript
// apps/web/src/utils/formatters.ts
export {
  formatDate,
  formatMoney,
  // ...
} from '@oa/utils'

// 现有代码无需修改，仍然可以：
import { formatDate } from '@/utils/formatters'
```

### Step 4: 更新配置引用

```javascript
// eslint.config.js
import config from '@oa/config/eslint'

export default antfu({
  ...config,
  vue: true,
  typescript: true,
})
```

## 收益

| 收益维度 | 说明 |
|----------|------|
| **代码复用** | 工具函数一处定义，多处使用 |
| **规范统一** | ESLint/Prettier/Tailwind 配置集中管理 |
| **向后兼容** | 通过重新导出，现有代码无需修改 |
| **未来扩展** | 为多产品线复用做好准备 |

## 成本

| 成本项 | 说明 |
|--------|------|
| **构建时间** | 增加约 1-2 秒（可接受） |
| **学习成本** | 新成员需要了解 Monorepo 结构 |
| **维护成本** | 需要维护 packages 的 package.json |

## 后续计划

### 短期（1-3 个月）
- [ ] 观察架构稳定性
- [ ] 收集团队反馈
- [ ] 优化构建速度

### 中期（3-6 个月）
- [ ] 如果有第 2 个应用，将引擎抽离到 `packages/ui`
- [ ] 引入 changesets 管理多包版本
- [ ] 添加 packages 的单元测试

### 长期（6-12 个月）
- [ ] 考虑将 `@oa/utils` 开源（如果通用性足够）
- [ ] 评估是否需要 `packages/hooks`（复用 composables）

## 参考资源

- [Monorepo 最佳实践](https://monorepo.tools/)
- [pnpm workspace](https://pnpm.io/workspaces)
- [Turborepo 文档](https://turbo.build/repo)

---

**决策者**: 核心开发团队  
**审核者**: 技术负责人  
**实施者**: 前端团队
