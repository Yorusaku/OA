import type { ApprovalRecord, Department, DictionaryItem, WorkbenchStats } from './types'
import type { WorkflowDefinition } from '@/types/workflow'

export const mockDepartments: Department[] = [
  {
    id: '1',
    name: '技术部',
    children: [
      { id: '1-1', name: '前端组', parentId: '1' },
      { id: '1-2', name: '后端组', parentId: '1' },
    ],
  },
  {
    id: '2',
    name: '产品部',
    children: [{ id: '2-1', name: '产品设计组', parentId: '2' }],
  },
  {
    id: '3',
    name: '人事部',
  },
]

export const mockDictItems: Record<string, DictionaryItem[]> = {
  approval_type: [
    {
      id: '1',
      dictType: 'approval_type',
      dictCode: 'leave',
      dictLabel: '请假申请',
      dictValue: 'leave',
    },
    {
      id: '2',
      dictType: 'approval_type',
      dictCode: 'expense',
      dictLabel: '报销申请',
      dictValue: 'expense',
    },
    {
      id: '3',
      dictType: 'approval_type',
      dictCode: 'purchase',
      dictLabel: '采购申请',
      dictValue: 'purchase',
    },
  ],
  status: [
    { id: '4', dictType: 'status', dictCode: '1', dictLabel: '启用', dictValue: '1' },
    { id: '5', dictType: 'status', dictCode: '0', dictLabel: '禁用', dictValue: '0' },
  ],
}

export const mockApprovalRecords: ApprovalRecord[] = [
  {
    id: 'APPROVE-20260228-001',
    title: '第一季度办公用品采购申请',
    type: 'purchase',
    status: 'pending',
    applicant: '李四',
    applicantAvatar: 'https://api.multiavatar.com/李四.png',
    applyTime: '2026-02-28 09:30:00',
    currentNodeName: '部门经理审批',
    amount: 5000,
    isUrgent: false,
    workflowInstance: {
      currentNodeId: 'node-approval-001',
      tasks: [
        { id: 'task-001', handlerId: 'user-001', status: 'pending' },
      ],
    },
  },
  {
    id: 'APPROVE-20260228-002',
    title: '张三的年假申请',
    type: 'leave',
    status: 'pending',
    applicant: '张三',
    applicantAvatar: 'https://api.multiavatar.com/张三.png',
    applyTime: '2026-02-28 08:15:00',
    currentNodeName: '部门经理审批',
    amount: 5,
    isUrgent: false,
    workflowInstance: {
      currentNodeId: 'node-approval-002',
      tasks: [
        { id: 'task-002', handlerId: 'user-002', status: 'pending' },
      ],
    },
  },
  {
    id: 'APPROVE-20260227-001',
    title: '王五的差旅费报销',
    type: 'expense',
    status: 'approved',
    applicant: '王五',
    applicantAvatar: 'https://api.multiavatar.com/王五.png',
    applyTime: '2026-02-27 14:20:00',
    currentNodeName: '财务审批',
    amount: 1200,
    isUrgent: false,
    workflowInstance: {
      currentNodeId: 'node-approval-003',
      tasks: [
        { id: 'task-003', handlerId: 'user-003', status: 'approved' },
      ],
    },
  },
  {
    id: 'APPROVE-20260226-001',
    title: '项目采购申请 - 服务器设备',
    type: 'purchase',
    status: 'rejected',
    applicant: '赵六',
    applicantAvatar: 'https://api.multiavatar.com/赵六.png',
    applyTime: '2026-02-26 10:00:00',
    currentNodeName: '采购部审批',
    amount: 25000,
    isUrgent: true,
    workflowInstance: {
      currentNodeId: 'node-approval-004',
      tasks: [
        { id: 'task-004', handlerId: 'user-004', status: 'rejected' },
      ],
    },
  },
]

export const mockWorkbenchStats: WorkbenchStats = {
  pendingCount: 3,
  myApplicationCount: 5,
  approvedCount: 12,
  rejectedCount: 2,
}

/**
 * Mock 流程定义数据
 */
export const mockWorkflowDefinitions: WorkflowDefinition[] = [
  {
    id: 'wf-001',
    name: '请假审批流程',
    description: '适用于所有员工的请假申请审批',
    status: 'active',
    formSchemaId: 'leave',
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
          leaveType: 'readonly',      // HR 不允许修改请假类型
          days: 'readonly',           // 天数只读
          manager_comment: 'readonly', // 上一级意见只读
          hr_comment: 'required',     // HR 意见必填
          amount: 'readonly',         // 金额只读（后端计算）
          internal_notes: 'hidden',   // 内部备注对 HR 隐藏（敏感字段）
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
  {
    id: 'wf-002',
    name: '报销审批流程',
    description: '适用于所有费用报销申请',
    status: 'active',
    formSchemaId: 'expense',
    nodes: [
      {
        id: 'start-002',
        type: 'start',
        name: '发起节点',
        position: { x: 400, y: 100 },
        enabled: true,
      },
      {
        id: 'approval-003',
        type: 'approval',
        name: '财务审批',
        handler: { type: 'role', roleIds: ['finance'], mode: 'or' },
        position: { x: 400, y: 300 },
        enabled: true,
      },
      {
        id: 'end-002',
        type: 'end',
        name: '结束节点',
        position: { x: 400, y: 500 },
        enabled: true,
      },
    ],
    edges: [
      { id: 'edge-004', source: 'start-002', target: 'approval-003' },
      { id: 'edge-005', source: 'approval-003', target: 'end-002' },
    ],
    createdBy: 'admin',
    createdAt: '2026-01-10 09:00:00',
    updatedAt: '2026-02-18 11:20:00',
    version: 1,
  },
]

/**
 * Mock 表单 Schema 列表
 */
export const mockFormSchemas: Array<{ id: string, name: string }> = [
  { id: 'leave-form', name: '请假申请表' },
  { id: 'expense-form', name: '报销申请表' },
  { id: 'purchase-form', name: '采购申请表' },
  { id: 'overtime-form', name: '加班申请表' },
]

// ==================== 发起审批 Mock 数据 ====================
/**
 * 流程列表 (用于发起审批页面)
 */
export const mockWorkflowList = [
  {
    id: 'wf-leave-001',
    name: '请假申请',
    description: '员工请病假、事假、年假等',
    isDefault: true,
    schemaId: 'leave-form',
    icon: 'Calendar',
  },
  {
    id: 'wf-reimbursement-001',
    name: '报销申请',
    description: '差旅费、业务招待费等报销',
    isDefault: false,
    schemaId: 'expense-form',
    icon: 'Money',
  },
  {
    id: 'wf-purchase-001',
    name: '采购申请',
    description: '办公用品、设备采购',
    isDefault: false,
    schemaId: 'purchase-form',
    icon: 'Cart',
  },
]

/**
 * 请假表单 Schema
 */
export const mockLeaveSchema = {
  fields: [
    {
      key: 'leaveType',
      label: '请假类型',
      type: 'select',
      options: [
        { label: '病假', value: 'sick' },
        { label: '事假', value: 'personal' },
        { label: '年假', value: 'annual' },
      ],
      required: true,
    },
    {
      key: 'days',
      label: '请假天数',
      type: 'number',
      required: true,
      componentProps: { min: 0.5, step: 0.5, placeholder: '请输入请假天数' },
    },
    {
      key: 'startTime',
      label: '开始时间',
      type: 'date',
      required: true,
      componentProps: { placeholder: '请选择开始时间' },
    },
    {
      key: 'reason',
      label: '请假事由',
      type: 'textarea',
      required: true,
      placeholder: '请详细说明请假原因',
    },
  ],
  labelWidth: '120px',
}

/**
 * 报销表单 Schema
 */
export const mockExpenseSchema = {
  fields: [
    {
      key: 'expenseType',
      label: '报销类型',
      type: 'select',
      options: [
        { label: '差旅费', value: 'travel' },
        { label: '业务招待费', value: 'dinner' },
        { label: '交通费', value: 'transport' },
      ],
      required: true,
    },
    {
      key: 'amount',
      label: '报销金额',
      type: 'inputNumber',
      required: true,
      componentProps: { min: 0, placeholder: '请输入报销金额' },
    },
    {
      key: 'date',
      label: '发生日期',
      type: 'date',
      required: true,
      componentProps: { placeholder: '请选择发生日期' },
    },
    {
      key: 'description',
      label: '报销说明',
      type: 'textarea',
      required: true,
      placeholder: '请详细说明报销详情',
    },
  ],
  labelWidth: '120px',
}

/**
 * 采购表单 Schema
 */
export const mockPurchaseSchema = {
  fields: [
    {
      key: 'projectName',
      label: '项目名称',
      type: 'input',
      required: true,
      placeholder: '请输入项目名称',
    },
    {
      key: 'items',
      label: '采购清单',
      type: 'textarea',
      required: true,
      placeholder: '请逐项列出采购物品',
    },
    {
      key: 'budget',
      label: '预算金额',
      type: 'inputNumber',
      required: true,
      componentProps: { min: 0, placeholder: '请输入预算金额' },
    },
    {
      key: 'needByDate',
      label: ' required 日期',
      type: 'date',
      required: true,
      componentProps: { placeholder: '请选择需要日期' },
    },
  ],
  labelWidth: '120px',
}
