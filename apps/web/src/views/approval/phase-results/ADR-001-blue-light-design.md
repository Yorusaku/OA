# ADR-001：审批详情页与动态表单权限引擎的深度融合

**状态**：🔵 蓝灯阶段（Phase 0）—— 设计提案  
**日期**：2026-02-27  
**作者**：AI Assistant  
**影响范围**：`ApprovalDetail.vue`、`useApprovalDetail.ts`、`DynamicForm.vue`  

---

## 📋 一、需求背景

### 1.1 业务场景
在审批流引擎中，不同审批节点对表单字段的可见性、可编辑性、必填性要求各不相同。例如：
- **部门经理节点**：可编辑 `amount`、必填 `hr_comment`，隐藏 `internal_notes`
- **HR 节点**：只读查看 `leaveType`、`days`，可编辑 `hr_comment`

### 1.2 现有能力
- ✅ `DynamicForm.vue` 组件已支持 `permissions` 属性（`hidden` / `readonly` / `editable` / `required`）
- ✅ 表单校验引擎（VeeValidate + Zod）支持动态必填规则注入
- ✅ `useApprovalDetail.ts` 已有基础数据结构（Mock 阶段）

### 1.3 未完成的集成点
- ❌ `ApprovalDetail.vue` 尚未集成 `DynamicForm`
- ❌ 权限映射表（`nodePermissions`）尚未从 Mock 数据中提取
- ❌ 审批操作（同意/驳回）未与表单校验联动

---

## 🎯 二、设计目标

| 目标 | 说明 | 验收标准 |
|------|------|----------|
| **数据完整** | 从 Mock API 返回 `formSchema` / `formData` / `nodePermissions` | `useApprovalDetail` 更新后返回完整字段 |
| **渲染准确** | `DynamicForm` 根据权限动态控制字段状态 | `hidden` 字段不渲染，`readonly` 字段禁用输入 |
| **交互严谨** | 提交前强制校验必填字段（如当前节点要求的审批意见） | 校验失败时阻止弹出确认框 |
| **状态兜底** | 处理数据加载中、审批已结束等异常场景 | 用户体验无白屏/卡死 |

---

## 🔧 三、技术架构设计

### 3.1 数据流图

```
┌─────────────────────────────────────────────────────────────────┐
│                         ApprovalDetail.vue                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │          useApprovalDetail (Query Hook)                  │    │
│  │  ┌───────────────────────────────────────────────────┐   │    │
│  │  │  Mock API Response                                │   │    │
│  │  │  {                                                 │   │    │
│  │  │    formSchema: {...},                             │   │    │
│  │  │    formData: {...},                               │   │    │
│  │  │    nodePermissions: { hr_comment: 'required' },   │   │    │
│  │  │    currentNode: {...}                             │   │    │
│  │  │    workflowInstance: {...}                        │   │    │
│  │  │  }                                                │   │    │
│  │  └───────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              DynamicForm Rendering                      │    │
│  │  ┌───────────────────────────────────────────────────┐   │    │
│  │  │  1. useSchemaAdapter (Schema → Base Rules)      │   │    │
│  │  │  2. usePermissionMutator (Base → Final Rules)   │   │    │
│  │  │  3. FormCreate Render                            │   │    │
│  │  └───────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │         Approval Actions (同意 / 驳回)                 │    │
│  │  ┌───────────────────────────────────────────────────┐   │    │
│  │  │  1. dynamicFormApi.validate()                   │   │    │
│  │  │  2.if (isValid) → ElMessageBox.confirm          │   │    │
│  │  │  3. submitApproval(formData)                    │   │    │
│  │  │  4. ElMessage.success()                         │   │    │
│  │  └───────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 类型定义扩展

#### 3.2.1 新增：审批节点级权限映射表

**文件**：`types/form-schema.ts`

```typescript
/**
 * 节点级表单权限类型
 * 用于在不同审批节点控制表单字段的可见性、可编辑性、必填性
 */
export type NodePermissionType 
  = 'hidden'    // 字段隐藏（不渲染到 DOM）
  | 'readonly'  // 字段只读（用户不可编辑）
  | 'editable'  // 字段可编辑（恢复默认状态）
  | 'required'  // 字段必填（强制校验）

/**
 * 节点权限映射表
 * key 是字段的 key，value 是权限类型
 * 示例：{ hr_comment: 'required', amount: 'readonly', secret_note: 'hidden' }
 */
export type PermissionsMap = Record<string, NodePermissionType>
```

#### 3.2.2 扩展：`ApprovalDetail` 数据结构

**文件**：`composables/useApprovalDetail.ts`

```typescript
export interface ApprovalDetail {
  id: string
  title: string
  type: 'leave' | 'expense' | 'purchase'
  applicant: string
  applyTime: string
  status: 'pending' | 'approved' | 'rejected'
  
  // === 新增字段 ===
  
  /** 表单 Schema 结构（当前节点对应的 Schema） */
  formSchema?: FormSchema
  
  /** 当前表单数据（之前节点流转下来的数据） */
  formData?: Record<string, any>
  
  /** 当前登录用户在当前节点的表单权限映射表 */
  nodePermissions?: PermissionsMap
  
  /** 当前正在处理的工作流节点（用于显示节点信息） */
  currentNode?: WorkflowNode
  
  /** 工作流实例（用于判断审批流程是否结束） */
  workflowInstance?: WorkflowInstance
  
  /** 审批历史（包含所有节点的处理记录） */
  history?: ApprovalRecord[]
}
```

#### 3.2.3 扩展：`WorkflowNode` 新增字段

**文件**：`types/workflow.ts`

```typescript
export interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  name: string
  description?: string
  handler?: HandlerConfig
  formSchemaId?: string
  conditions?: ConditionExpression[]
  position?: { x: number, y: number }
  className?: string
  enabled?: boolean
  timeout?: number
  autoPassOnTimeout?: boolean
  
  // === 新增字段 ===
  
  /** 该节点的表单权限配置（密级字段保护） */
  formPermissions?: PermissionsMap
}
```

---

### 3.3 Mock 数据结构设计

#### 3.3.1 扩展 `mockWorkflowDefinitions`

**文件**：`api/mock.ts`

```typescript
export const mockWorkflowDefinitions: WorkflowDefinition[] = [
  {
    id: 'wf-001',
    name: '请假审批流程',
    description: '适用于所有员工的请假申请审批',
    status: 'active',
    formSchemaId: 'leave',
    formPermissions: {  // 流程级默认权限（可选）
      internal_notes: 'hidden',
    },
    nodes: [
      {
        id: 'start-001',
        type: 'start',
        name: '发起节点',
        description: '员工发起请假申请',
        position: { x: 400, y: 100 },
        enabled: true,
      },
      {
        id: 'approval-001',
        type: 'approval',
        name: '部门经理审批',
        description: '直属部门经理审批',
        handler: { type: 'deptManager', mode: 'or' },
        formSchemaId: 'leave-form',
        // ✅ 部门经理节点：可编辑金额，必填审批意见
        formPermissions: {
          amount: 'editable',
          manager_comment: 'required',
          hr_note: 'hidden',  // HR 专属字段，部门经理看不到
        },
        position: { x: 400, y: 250 },
        enabled: true,
      },
      {
        id: 'approval-002',
        type: 'approval',
        name: 'HR 审批',
        description: '人事部备案',
        handler: { type: 'role', roleIds: ['hr'], mode: 'or' },
        formSchemaId: 'leave-form',
        // ✅ HR 节点：只读查看leaveType，必填HR意见
        formPermissions: {
          leaveType: 'readonly',  // 不允许修改请假类型
          hr_comment: 'required', // HR 必须填写意见
          manager_comment: 'readonly', // 上一级意见只读
          secret_note: 'hidden', // HR 内部备注，不显示给部门经理
        },
        position: { x: 400, y: 400 },
        enabled: true,
      },
      {
        id: 'end-001',
        type: 'end',
        name: '结束节点',
        description: '流程结束',
        position: { x: 400, y: 550 },
        enabled: true,
      },
    ],
    edges: [
      { id: 'edge-001', source: 'start-001', target: 'approval-001' },
      { id: 'edge-002', source: 'approval-001', target: 'approval-002' },
      { id: 'edge-003', source: 'approval-002', target: 'end-001' },
    ],
    createdBy: 'admin',
    createdAt: '2026-01-15 10:00:00',
    updatedAt: '2026-02-20 14:30:00',
    version: 2,
  },
]
```

#### 3.3.2 扩展 Mock API 的 `getApprovalDetail` 返回值

**文件**：`api/approval.ts`

```typescript
export async function getApprovalDetail(id: string): Promise<ApprovalDetail | null> {
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // Mock 数据：当前用户是 HR，正在审批 ID = '1' 的请假申请
  if (id === '1') {
    return {
      id: '1',
      title: '年假申请 - 张三',
      type: 'leave',
      applicant: '张三',
      applyTime: '2026-02-23 10:30:00',
      status: 'pending',
      
      // 表单 Schema（从流程定义中关联的 Schema ID 查询）
      formSchema: {
        fields: [
          { key: 'leaveType', label: '请假类型', type: 'select', required: true, span: 12,
            options: [
              { label: '事假', value: 'personal' },
              { label: '病假', value: 'sick' },
              { label: '年假', value: 'annual' },
            ],
          },
          { key: 'days', label: '请假天数', type: 'number', required: true, span: 12 },
          { key: 'reason', label: '请假事由', type: 'textarea', required: true, span: 24 },
          { key: 'manager_comment', label: '部门经理意见', type: 'textarea', span: 24 },
          { key: 'hr_comment', label: 'HR审批意见', type: 'textarea', required: true, span: 24 },
          { key: 'amount', label: '折算金额', type: 'number', readonly: true, span: 12 },
          { key: 'internal_notes', label: '内部备注', type: 'textarea', span: 24 },
        ],
        labelWidth: '120px',
      },
      
      // 表单数据（之前节点流转下来的数据）
      formData: {
        leaveType: 'sick',
        days: 2.5,
        reason: '重感冒发烧，去医院打点滴。',
        manager_comment: '同意，请注意休息。',
        amount: 500, // 由后端根据 leaveType 和 days 计算
        internal_notes: '员工提供的病假条已审核。',
      },
      
      // ✅ 当前节点（HR）的权限配置
      nodePermissions: {
        leaveType: 'readonly',      // HR 不允许修改请假类型
        days: 'readonly',           // 天数只读
        manager_comment: 'readonly', // 上一级意见只读
        hr_comment: 'required',     // HR 意见必填
        amount: 'readonly',         // 金额只读（后端计算）
        internal_notes: 'hidden',   // 内部备注对 HR 隐藏（敏感字段）
      },
      
      // 当前正在处理的节点
      currentNode: {
        id: 'approval-002',
        type: 'approval',
        name: 'HR 审批',
        handler: { type: 'role', roleIds: ['hr'], mode: 'or' },
      } as WorkflowNode,
      
      // 工作流实例状态
      workflowInstance: {
        id: 'wi-001',
        workflowId: 'wf-001',
        workflowName: '请假审批流程',
        initiatorId: 'user-001',
        initiatorName: '张三',
        formData: {}, // 完整的表单数据
        status: 'running',
        currentNodeId: 'approval-002',
        tasks: [
          {
            id: 'task-001',
            instanceId: 'wi-001',
            nodeId: 'approval-001',
            nodeName: '部门经理审批',
            handlerId: 'user-002',
            handlerName: '李四',
            status: 'approved',
            comment: '同意请假',
            handledAt: '2026-02-26 15:00:00',
            createdAt: '2026-02-26 14:30:00',
          },
          {
            id: 'task-002',
            instanceId: 'wi-001',
            nodeId: 'approval-002',
            nodeName: 'HR 审批',
            handlerId: 'user-003',
            handlerName: '王五',
            status: 'pending',
            createdAt: '2026-02-26 16:00:00',
          },
        ],
        createdAt: '2026-02-23 10:30:00',
      } as WorkflowInstance,
      
      // 审批历史
      history: [
        {
          id: 'hist-001',
          handlerId: 'user-002',
          handlerName: '李四',
          status: 'approved',
          handledAt: '2026-02-26 15:00:00',
          comment: '同意请假',
        },
      ],
    }
  }
  
  return null
}
```

---

## 🖼 四、UI 交互设计

### 4.1 页面布局（`ApprovalDetail.vue`）

```
┌─────────────────────────────────────────────────────────────────┐
│                    审批详情页（ApprovalDetail）                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Header (标题 + 状态标签)                                 │    │
│  │  - 标题：年假申请 - 张三                                 │    │
│  │  - 状态标签： Pending (黄色)                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Basic Info (基础信息卡片)                                │    │
│  │  - 申请人：张三                   申请时间：2026-02-23   │    │
│  │  - 请假类型：病假                  请假天数：2.5 天       │    │
│  │  - 请假事由：重感冒发烧...                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Dynamic Form (动态表单 - 核心区域)                       │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │  Input: 折算金额 (¥500, readonly)               │    │    │
│  │  │  Textarea: HR审批意见 (required) ✍️             │    │    │
│  │  │  Textarea: 内部备注 (HIDDEN)                    │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Action Bar (底部操作区)                                  │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │  [驳回]                             [同意]      │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Approval History (审批历史)                              │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │  李四 (部门经理) [通过] 2026-02-26 15:00         │    │    │
│  │  │  👉 同意请假                                      │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 二次确认对话框（同意操作）

```typescript
// 伪代码：同意按钮点击逻辑
async function handleApprove() {
  // Step 1: 先触发表单校验
  const isValid = await dynamicFormApi.value?.validate()
  
  if (!isValid) {
    ElMessage.warning('请填写完整的必填信息（如 HR 审批意见）')
    return
  }
  
  // Step 2: 获取表单数据
  const values = dynamicFormApi.value?.getValues()
  
  // Step 3: 弹出二次确认框
  const confirm = await ElMessageBox.confirm(
    `确认同意 [${approval.value?.title}] 的申请？`,
    '确认操作',
    {
      type: 'success',
      confirmButtonText: '确认同意',
      cancelButtonText: '取消',
    }
  )
  
  if (confirm === 'confirm') {
    // Step 4: 提交审批
    await submitApprovalMutation.mutateAsync({
      approvalId: approvalId.value,
      status: 'approved',
      comment: values?.hr_comment, // 从表单中获取意见
    })
    
    // Step 5: 成功提示 + 页面跳转
    ElMessage.success('审批通过成功')
    router.push({ name: 'ApprovalTodo' })
  }
}
```

### 4.3 二次确认对话框（驳回操作）

```typescript
// 驳回操作 similar logic，但意见字段可能是必填
async function handleReject() {
  const isValid = await dynamicFormApi.value?.validate()
  
  if (!isValid) {
    ElMessage.warning('驳回时请填写驳回原因')
    return
  }
  
  const values = dynamicFormApi.value?.getValues()
  
  const confirm = await ElMessageBox.confirm(
    `确认驳回 [${approval.value?.title}] 的申请？驳回后申请人可修改后重提。`,
    '确认操作',
    {
      type: 'warning',
      confirmButtonText: '确认驳回',
      cancelButtonText: '取消',
    }
  )
  
  if (confirm === 'confirm') {
    await submitApprovalMutation.mutateAsync({
      approvalId: approvalId.value,
      status: 'rejected',
      comment: values?.reject_reason,
    })
    
    ElMessage.success('审批驳回成功')
    router.push({ name: 'ApprovalTodo' })
  }
}
```

---

## ⚠️ 五、异常状态处理方案

### 5.1 加载中状态（Loading State）

```vue
<template>
  <ElCard v-loading="isLoading">
    <!-- 内容 -->
  </ElCard>
</template>

<script setup lang="ts">
const { data: approval, isLoading } = useApprovalDetail(approvalId)

// ✅ Loading 时显示骨架屏或文字提示
if (isLoading) {
  return h('div', { class: 'p-8 text-center text-gray-400' }, [
    h('span', '正在加载审批详情...'),
  ])
}
</script>
```

### 5.2 数据为空状态（Empty State）

```vue
<template>
  <div v-if="!isLoading && !approval" class="empty-state">
    <h3>❌ 审批单不存在</h3>
    <p>可能的原因：ID 错误 / 单据已被删除 / 权限不足</p>
    <el-button @click="router.push({ name: 'ApprovalTodo' })">
      返回待办列表
    </el-button>
  </div>
</template>
```

### 5.3 审批状态已结束（Terminal State）

```typescript
// 在 ApprovalDetail.vue 中判断
const isApprovalFinished = computed(() => {
  return approval.value?.status === 'approved' || approval.value?.status === 'rejected'
})

const isInactiveWorkflowInstance = computed(() => {
  return approval.value?.workflowInstance?.status 
    && ['approved', 'rejected', 'cancelled', 'expired'].includes(
        approval.value.workflowInstance.status
      )
})

// UI 展示
if (isInactiveWorkflowInstance.value) {
  ElMessage.info('该审批单已处理完毕，无法进行当前操作')
  
  // 禁用底部操作按钮
  return h('div', { class: 'mt-8 text-center' }, [
    h('el-tag', { type: 'success', effect: 'dark' }, '流程已结束'),
  ])
}
```

### 5.4 权限不足（Permission Denied）

```typescript
// 在审批按钮显示前判断
const canApprove = computed(() => {
  // 1. 审批单状态必须是pending
  if (approval.value?.status !== 'pending') return false
  
  // 2. 当前用户必须是当前节点的处理人（ Mock 数据中 hardcode）
  const currentUser = 'user-003' // 假设当前登录用户是王五
  return approval.value?.currentNode?.handler?.userIds?.includes(currentUser)
})

// UI 展示
if (!canApprove.value) {
  return h('div', { class: 'text-warning' }, [
    h('span', '当前用户无权处理此审批单'),
  ])
}
```

### 5.5 表单校验失败（Validation Failed）

```typescript
async function handleSubmitAction() {
  try {
    const isValid = await dynamicFormApi.value?.validate()
    
    if (!isValid) {
      // ❌ 校验失败：阻止后续操作，高亮报错字段
      ElMessage({
        message: '表单校验失败，请检查必填字段和格式',
        type: 'warning',
        duration: 3000,
      })
      return
    }
    
    // ✅ 校验通过：继续
  } catch (error) {
    console.error('Validation error:', error)
    ElMessage.error('表单校验异常，请重试')
  }
}
```

### 5.6 网络错误（Network Error）

```typescript
const { data: approval, isLoading, error } = useApprovalDetail(approvalId)

if (error.value) {
  return h('div', { class: 'error-state p-8' }, [
    h('h3', { class: 'text-red-500' }, '❌ 加载失败'),
    h('p', { class: 'text-gray-500' }, error.value.message),
    h('el-button', {
      onClick: () => refetch(), // 主动重试
    }, '重试'),
  ])
}
```

---

## 🧪 六、测试策略（TDD 红灯-绿灯-重构）

### 6.1 单元测试：`useApprovalDetail.ts`

**测试目标**：
- ✅ Mock API 返回完整的 `formSchema` / `formData` / `nodePermissions`
- ✅ `formPermissions` 从 `workflowDefinition.nodes` 中正确提取

```typescript
// __tests__/useApprovalDetail.test.ts
describe('useApprovalDetail - Mock Data Structure', () => {
  it('应返回完整的 ApprovalDetail 结构（包含 formSchema / formData / nodePermissions）', async () => {
    const { result } = renderHook(() => useApprovalDetail('1'))
    
    await waitFor(() => {
      expect(result.data.value?.formSchema).toBeDefined()
      expect(result.data.value?.formData).toBeDefined()
      expect(result.data.value?.nodePermissions).toBeDefined()
    })
  })
  
  it('HR 节点的 nodePermissions 应包含 { hr_comment: "required", internal_notes: "hidden" }', async () => {
    const { result } = renderHook(() => useApprovalDetail('1'))
    
    await waitFor(() => {
      const permissions = result.data.value?.nodePermissions
      expect(permissions?.hr_comment).toBe('required')
      expect(permissions?.internal_notes).toBe('hidden')
    })
  })
})
```

### 6.2 组件测试：`ApprovalDetail.vue`

**测试场景**：
1. ✅ 加载状态：显示 `ElCard loading` 效果
2. ✅ 数据为空：显示 "审批单不存在" 提示
3. ✅ 权限映射：`DynamicForm` 渲染出正确的 `readonly` / `required` / `hidden` 字段
4. ✅ 校验联动：未填写必填意见时，点击"同意"按钮不弹出确认框
5. ✅ 状态防呆：已通过/已驳回的单据，底部按钮应禁用

```typescript
// __tests__/ApprovalDetail.test.ts
describe('ApprovalDetail - Integration Tests', () => {
  it('应正确渲染 DynamicForm 并应用 nodePermissions', async () => {
    const wrapper = mount(ApprovalDetail, {
      global: { plugins: [ElementPlus, router] },
      stubs: ['-router-link', 'router-view'],
    })
    
    // 模拟 Mock 数据
    const mockData = {
      formSchema: { fields: [...] },
      formData: { hr_comment: '' },
      nodePermissions: { hr_comment: 'required' },
    }
    
    vi.mock('@/composables/useApprovalDetail', () => ({
      useApprovalDetail: vi.fn().mockReturnValue({
        data: ref(mockData),
        isLoading: ref(false),
      }),
    }))
    
    await nextTick()
    
    // 检查 DynamicForm 是否收到正确的 props
    const dynamicForm = wrapper.findComponent(DynamicForm)
    expect(dynamicForm.props('schema')).toEqual(mockData.formSchema)
    expect(dynamicForm.props('permissions')).toEqual(mockData.nodePermissions)
  })
  
  it('点击"同意"按钮时，若 hr_comment 为空，应阻止弹出确认框', async () => {
    const wrapper = mount(ApprovalDetail, { global: [...] })
    
    // 模拟表单校验失败
    const dynamicFormApi = { validate: vi.fn().mockResolvedValue(false) }
    wrapper.vm.dynamicFormApi = dynamicFormApi
    
    const approveBtn = wrapper.find('[data-test="approve-btn"]')
    await approveBtn.trigger('click')
    
    // 检查 ElMessageBox.confirm 是否未被调用
    expect(ElMessageBox.confirm).not.toHaveBeenCalled()
    expect(ElMessage.warning).toHaveBeenCalledWith('请填写完整的必填信息')
  })
})
```

---

## 📚 七、扩展性设计（Future Roadmap）

### 7.1 联动规则引擎（Linkage Rules）

未来可支持字段间的联动控制：

```typescript
// 例如：hr_comment 的联动必填
nodePermissions: {
  hr_comment: {
    required: true,
    requiredWhen: {
      field: 'amount',
      operator: 'gt',
      value: 1000,
    },
  },
}
```

### 7.2 权限继承机制

```typescript
// 流程级权限（所有节点继承）
workflowDefinition.formPermissions = {
  secret_note: 'hidden',
}

// 节点级权限（覆盖流程级）
node.formPermissions = {
  hr_comment: 'required',
}
```

### 7.3 表单权限与按钮权限的联动

```typescript
// 当前节点的按钮权限（用于后续按钮级权限控制）
const nodeActions = computed(() => {
  return approval.value?.currentNode?.actions || ['approve', 'reject', 'transfer']
})

// UI 展示
if (!nodeActions.value.includes('approve')) {
  <el-button disabled>同意</el-button>
}
```

---

## 🔄 八、实施计划（Phase 0 → Phase 1）

| 阶段 | 任务 | 产出 | 验收标准 |
|------|------|------|----------|
| **Phase 0 (Blue Light)** | ✅ 设计提案输出 | 本文档 | 完成评审 |
| **Phase 1 (Red Light)** | 🔴 Mock 数据结构扩展 | `api/mock.ts`、`api/approval.ts` | 单元测试通过 |
| **Phase 2 (Red Light)** | 🔴 `useApprovalDetail` Logic | `composables/useApprovalDetail.ts` | TypeScript 类型无误 |
| **Phase 3 (Red Light)** | 🔴 `ApprovalDetail` UI 整合 | `views/approval/ApprovalDetail.vue` | 所有异常状态处理完成 |
| **Phase 4 (Green Light)** | 🟢 联调测试 | `__tests__/ApprovalDetail.test.ts` | E2E 测试通过 |
| **Phase 5 (Refactor)** | 🔄 代码审查与优化 | Clean Code | ESLint + Prettier 无警告 |

---

## 📌 九、评审清单（Pre-merge Checklist）

- [ ] ✅ **类型定义完整**：`NodePermissionType` / `PermissionsMap` 已扩展
- [ ] ✅ **Mock 数据准确**：`getApprovalDetail` 返回完整的权限映射表
- [ ] ✅ **权限引擎集成**：`DynamicForm` 的 `permissions` prop 正确应用
- [ ] ✅ **校验联动**：提交前强制校验必填字段（如 `hr_comment`）
- [ ] ✅ **异常兜底**：加载状态、数据为空、审批结束、权限不足等场景全覆盖
- [ ] ✅ **单元测试**：覆盖 80%+ 的核心逻辑分支
- [ ] ✅ **E2E 测试**：使用 Playwright/Cypress 覆盖用户操作路径
- [ ] ✅ **类型检查**：`pnpm type-check` 无错误
- [ ] ✅ **代码规范**：`pnpm lint` 无警告

---

## 📖 十、参考资料

| 文档 | 链接 | 说明 |
|------|------|------|
| 动态表单引擎 Design Doc | `docs/04-dynamic-form-engine.md` | Schema 驱动、联动校验 |
| Vue Query 官方文档 | https://tanstack.com/query/latest | 缓存策略、 Invalidate Queries |
| Element Plus Message | https://element-plus.org/en-US/component/message.html | 消息提示 API |
| FormCreate 文档 | https://form-create.com/ | 声明式表单构建 |
| 《Mock API 数据规范》 | `api/mock.ts` | Mock 数据结构 |

---

## 📝 历史记录

| 日期 | 版本 | 作者 | 变更描述 |
|------|------|------|----------|
| 2026-02-27 | v0.1 | AI Assistant | 初始草案（Blue Light Phase 0） |

---

> 💡 **Design Philosophy**: 数据驱动视图，权限引擎前置，异常状态兜底，TDD 红灯先行。
