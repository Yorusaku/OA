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
    id: '1',
    title: '年假申请 - 张三',
    type: 'leave',
    status: 'pending',
    applicant: '张三',
    applyTime: '2026-02-23 10:30:00',
    amount: 5,
  },
  {
    id: '2',
    title: '办公用品采购',
    type: 'purchase',
    status: 'approved',
    applicant: '李四',
    applyTime: '2026-02-22 14:20:00',
    amount: 500,
  },
  {
    id: '3',
    title: '差旅费报销',
    type: 'expense',
    status: 'rejected',
    applicant: '王五',
    applyTime: '2026-02-21 09:15:00',
    amount: 1200,
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
    formSchemaId: 'leave-form',
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
    formSchemaId: 'expense-form',
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
