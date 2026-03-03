# 🔵 阶段 0：蓝灯阶段 - 动态表单引擎联动校验设计文档

---

## 📋 项目背景

**需求**：实现动态表单的联动校验功能（requiredWhen/visibleWhen/disabledWhen）

**业务场景**：
- 请假表单：选择「病假」时，医院证明字段必填
- 请假表单：请假天数 > 3 天时，交接人字段必填
- 员工信息：选择「已婚」时，配偶姓名字段显示
- 预算审批：非经理用户，预算字段禁用

---

## 🎯 核心业务流

### 正常情况（非联动场景）
```
1. 用户填写表单 → 2. 点击提交 → 3. 表单校验 → 4. 提交成功
```

### 联动校验场景
```
场景 A：requiredWhen（联动必填）
├── 初始状态：hospitalCert 字段非必填
├── 用户操作：leaveType 选择 "sick"（病假）
├── 系统响应：hospitalCert 字段自动变为必填
└── 校验结果：未填写 hospitalCert → 提示 "医院证明是必填项"

场景 B：visibleWhen（联动显示）
├── 初始状态：spouseName 字段隐藏
├── 用户操作：isMarried 选择 "true"（已婚）
├── 系统响应：spouseName 字段显示
└── 用户操作：isMarried 选择 "false"（未婚）
└── 系统响应：spouseName 字段隐藏

场景 C：disabledWhen（联动禁用）
├── 初始状态：budget 字段可编辑
├── 用户操作：isManager 选择 "false"（非经理）
├── 系统响应：budget 字段禁用（灰度）
└── 用户操作：isManager 选择 "true"（经理）
└── 系统响应：budget 字段启用（可编辑）
```

---

## 🏗️ 技术实现思路

### 一、架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    DynamicForm 组件                          │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │              FormSchema (外部传入)                      │  │
│  │  {                                                      │  │
│  │    fields: [                                            │  │
│  │      { key: 'leaveType', linkage: {...} }               │  │
│  │    ]                                                    │  │
│  │  }                                                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                │
│                            ▼                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │        useSchemaAdapter (Schema 适配器)                 │  │
│  │  - 类型映射 (input → inputNumber)                       │  │
│  │  - 联动校验转换 (requiredWhen → validator)              │  │
│  │  - date:disabledDate (日期限制)                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                │
│                            ▼                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │        usePermissionMutator (权限变异引擎)              │  │
│  │  - hidden → rule.hidden                                 │  │
│  │  - readonly → rule.props.disabled                       │  │
│  │  - required → rule.validate.push(...)                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                │
│                            ▼                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │               FormCreate ($form)                        │  │
│  │  - 声明式渲染                                           │  │
│  │  - 自动校验                                             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              @oa/utils - 条件判断引擎                        │
│  - checkCondition(condition, formData)                      │
│  - checkConditions(conditions[], formData)                  │
│  - getConditionFields(conditions)                           │
└─────────────────────────────────────────────────────────────┘
```

### 二、关键实现点

#### 1. 联动校验验证器

```typescript
// 使用 form-create 的 validator(验证器) 功能
function createRequiredWhenValidator(field, formDataRef) {
  return {
    validator: (rule, value, callback) => {
      const formData = formDataRef.value
      const condition = field.linkage?.requiredWhen
      
      // 使用 @oa/utils 的 checkConditions 判断条件
      if (condition && checkConditions(condition, formData)) {
        // 条件满足 → 必填校验
        if (!value) {
          callback(new Error(`${field.label}是必填项`))
        } else {
          callback()
        }
      } else {
        // 条件不满足 → 跳过校验
        callback()
      }
    },
    trigger: 'change', // 字段值变化时触发
  }
}
```

#### 2. 响应式设计

```typescript
// DynamicForm 中共享 formDataRef
const formDataRef = ref<Record<string, any>>({})

// watch modelValue → 同步 formDataRef
watch(
  () => props.modelValue,
  (newVal) => { formDataRef.value = newVal }
)

// watch formDataRef → 触发 computed 重新计算
watch(formDataRef, () => {
  // Vue 自动更新依赖的 computed
}, { deep: true })
```

#### 3. 验证器闭包共享状态

```typescript
// useSchemaAdapter 接收 formDataRef 参数
export function useSchemaAdapter(schema, formDataRef) {
  return fields.map(field => {
    if (field.linkage?.requiredWhen && formDataRef) {
      // 闭包捕获 formDataRef
      baseRule.validate.push(
        createRequiredWhenValidator(field, formDataRef)
      )
    }
  })
}
```

---

## 📦 代码文件清单

### 新增文件
| 文件路径 | 职责 | 关键功能 |
|---------|------|---------|
| `composables/useLinkageValidator.ts` | 联动校验 Composable | 纯函数辅助 + 响应式管理 |
| `composables/useSchemaAdapter.ts` | Schema 适配器（V2） | 联动校验转换 + 工具函数 |
| `DynamicForm.vue` | 动态表单组件（V2） | formDataRef 共享 + 联动响应 |
| `views/demo/DynamicFormLinkageDemo.vue` | 演示页面 | 联动校验功能演示 |

### 修改文件
| 文件路径 | 修改内容 |
|---------|---------|
| `router/index.ts` | 添加演示页面路由 |
| `composables/usePermissionMutator.ts` | 无修改（保持兼容） |

---

## 🧪 测试策略

### 单元测试覆盖
```typescript
// 测试文件：LinkageValidation.test.ts（待补充）

describe('useLinkageValidator - 纯函数测试', () => {
  it('checkCondition - eq 操作符', () => {
    // 测试字段值等于条件值
  })
  
  it('checkCondition - gt 操作符', () => {
    // 测试字段值大于条件值
  })
  
  it('checkConditions - 数组条件（OR 逻辑）', () => {
    // 测试多个条件满足其一
  })
})

describe('createRequiredWhenValidator - 验证器测试', () => {
  it('条件满足时 - 未填写应返回错误', () => {
    // 模拟 leaveType = 'sick'
    //hospitalCert 未填写
    // 断言 callback 被调用且包含错误信息
  })
  
  it('条件不满足时 - 应跳过校验', () => {
    // 模拟 leaveType = 'personal'
    // hospitalCert 未填写
    // 断言 callback 被调用且无错误
  })
})

describe('DynamicForm - 集成测试', () => {
  it('requiredWhen：leaveType = sick → hospitalCert 必填', () => {
    // 模拟用户选择病假
    // 提交表单（不填 hospitalCert）
    // 断言校验失败
  })
})
```

### 手动测试场景
```markdown
## 手动测试清单

### 场景 1：病假必填医院证明
1. 选择「请假类型」= 病假
2. 不填写「医院证明」
3. 点击提交
4. ✅ 预期：提示 "医院证明是必填项"

### 场景 2：请假天数 > 3 天必填交接人
1. 填写「请假天数」= 5
2. 不填写「交接人」
3. 点击提交
4. ✅ 预期：提示 "交接人是必填项"

### 场景 3：已婚显示配偶姓名
1. 初始状态：「配偶姓名」字段隐藏
2. 选择「是否已婚」= 是
3. ✅ 预期：「配偶姓名」字段显示

### 场景 4：非经理禁用预算审批
1. 初始状态：预算审批字段可编辑
2. 选择「是否经理」= 否
3. ✅ 预期：预算审批字段禁用（灰度）
4. 选择「是否经理」= 是
5. ✅ 预期：预算审批字段启用（可编辑）
```

---

## 🚀 部署验证流程

```bash
# 1. 启动开发服务器
pnpm dev

# 2. 访问演示页面
http://localhost:5173/demo/dynamic-form-linkage

# 3. 手动测试联动校验功能
- 测试 requiredWhen（联动必填）
- 测试 visibleWhen（联动显示）
- 测试 disabledWhen（联动禁用）

# 4. 运行类型检查
pnpm typecheck

# 5. 运行 ESLint
pnpm lint
```

---

## ⚠️ 注意事项

### 1. 形式参数顺序
```typescript
// ❌ 错误：formDataRef 是可选参数，可能导致类型推断错误
export function useSchemaAdapter(schema, formDataRef?)

// ✅ 正确：保持向后兼容，formDataRef 使用默认值
export function useSchemaAdapter(schema, formDataRef = { value: {} }) {
  // 或者作为第二个参数，调用时显式传递
}
```

### 2. 日期禁用 Bug 修复
```typescript
// ❌ Bug：setHours 修改原日期对象
disabledDate: (date) => date.getTime() < today.setHours(0, 0, 0, 0)

// ✅ 修复：克隆日期对象
disabledDate: (date) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date.getTime() < today.getTime()
}
```

### 3. form-create 的 validator 机制
- form-create 的 `validator` 是异步回调
- 必须调用 `callback()`，否则表单卡死
- `callback(error)` 表示校验失败
- `callback()` 表示校验通过

---

## 📊 估算工作量

| 任务 | 工作量 | 备注 |
|------|-------|------|
| 纯函数逻辑（@oa/utils） | 0.5h | 已有 `checkCondition` |
| useLinkageValidator | 2h | 纯函数 + 响应式 |
| useSchemaAdapter V2 | 3h | 联动校验转换 |
| DynamicForm V2 | 3h | formDataRef 共享 |
| test 文件（_LINKAGEValidation.test.ts | 4h | 红绿灯 TDD |
| 手动测试 & 调试 | 2h | 边界场景 |
| 文档撰写 | 1h | README + 注释 |

**总计：15.5 小时（约 2 个工作日）**

---

## ✅ 阶段结束语

**以上是《动态表单引擎联动校验》的需求分析与技术设计方案，包含：**

1. **业务流程**：3 个核心场景（requiredWhen/visibleWhen/disabledWhen）
2. **技术架构**：Schema 适配器 + 条件判断引擎 + 响应式管理
3. **测试策略**：单元测试 + 手动测试 + 部署验证
4. **工作量估算**：约 2 个工作日

**请问是否同意本设计方案？**

- ✅ **同意** → 我将开始编写**红灯测试代码**
- ❌ **不同意** → 请说明修改意见，我将重新设计

---

## 🎯 下一步（Agreement 后）

**进入 🔴 阶段 1：红灯测试（仅写测试）**

我将编写以下测试文件：
```typescript
// LinkageValidation.test.ts

describe('useLinkageValidator - 纯函数测试', () => {
  it('should return true for eq operator', () => { /* */ })
  it('should return true for gt operator', () => { /* */ })
  it('should handle array conditions (OR)', () => { /* */ })
})

describe('DynamicForm - 联动必填测试', () => {
  it('requiredWhen 满足时，未填写应校验失败', () => { /* */ })
})

describe('DynamicForm - 联动显示测试', () => {
  it('visibleWhen 满足时，字段应显示', () => { /* */ })
})

describe('DynamicForm - 联动禁用测试', () => {
  it('disabledWhen 满足时，字段应禁用', () => { /* */ })
})
```

**执行命令**：
```bash
pnpm test -- LinkageValidation.test.ts
```

**预期结果**：所有测试显示 **FAIL**（红灯）

---

**等待用户审批...** ⏸️
