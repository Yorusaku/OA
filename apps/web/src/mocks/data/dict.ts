export const mockDictData = {
  approval_status: [
    { value: 'pending', label: '待审批' },
    { value: 'approved', label: '已通过' },
    { value: 'rejected', label: '已驳回' },
  ],
  approval_type: [
    { value: 'leave', label: '请假' },
    { value: 'expense', label: '报销' },
    { value: 'purchase', label: '采购' },
  ],
  workflow_status: [
    { value: 'draft', label: '草稿' },
    { value: 'active', label: '已发布' },
    { value: 'inactive', label: '已停用' },
  ],
  node_type: [
    { value: 'start', label: '开始节点' },
    { value: 'end', label: '结束节点' },
    { value: 'approval', label: '审批节点' },
    { value: 'cc', label: '抄送节点' },
    { value: 'condition', label: '条件节点' },
  ],
}
