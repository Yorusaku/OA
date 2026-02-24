export const mockWorkflows = [
  {
    id: '1',
    name: '请假审批流程',
    description: '员工请假审批流程',
    status: 'active',
    createTime: '2024-01-01 00:00:00',
    updateTime: '2024-01-01 00:00:00',
  },
  {
    id: '2',
    name: '报销审批流程',
    description: '费用报销审批流程',
    status: 'active',
    createTime: '2024-01-02 00:00:00',
    updateTime: '2024-01-02 00:00:00',
  },
  {
    id: '3',
    name: '采购审批流程',
    description: '物资采购审批流程',
    status: 'draft',
    createTime: '2024-01-03 00:00:00',
    updateTime: '2024-01-05 00:00:00',
  },
]

export const mockWorkflowDetail = {
  id: '1',
  name: '请假审批流程',
  description: '员工请假审批流程',
  status: 'active',
  createTime: '2024-01-01 00:00:00',
  updateTime: '2024-01-01 00:00:00',
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: '开始',
      x: 100,
      y: 200,
    },
    {
      id: 'approval1',
      type: 'approval',
      label: '部门经理审批',
      x: 300,
      y: 200,
      config: {
        approverType: 'role',
        approverValue: 'dept_manager',
      },
    },
    {
      id: 'approval2',
      type: 'approval',
      label: '总经理审批',
      x: 500,
      y: 200,
      config: {
        approverType: 'role',
        approverValue: 'general_manager',
      },
    },
    {
      id: 'cc',
      type: 'cc',
      label: '抄送人事部',
      x: 700,
      y: 200,
      config: {
        ccType: 'dept',
        ccValue: 'hr',
      },
    },
    {
      id: 'end',
      type: 'end',
      label: '结束',
      x: 900,
      y: 200,
    },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'approval1' },
    { id: 'e2', source: 'approval1', target: 'approval2' },
    { id: 'e3', source: 'approval2', target: 'cc' },
    { id: 'e4', source: 'cc', target: 'end' },
  ],
}
