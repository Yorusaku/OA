import { useQuery } from '@tanstack/vue-query'
import type { WorkflowDefinition } from '@/types/workflow'

export interface ApprovalRecord {
  id: string
  handlerId: string
  handlerName: string
  status: 'approved' | 'rejected' | 'pending'
  handledAt: string
  comment?: string
  attachments?: string[]
}

export interface ApprovalDetail {
  id: string
  title: string
  type: 'leave' | 'expense' | 'other'
  applicant: string
  applyTime: string
  status: 'pending' | 'approved' | 'rejected'
  description?: string
  amount?: number
  formData?: Record<string, any>
  workflowDefinition?: WorkflowDefinition
  history?: ApprovalRecord[]
}

export function useApprovalDetail(approvalId: string) {
  return useQuery({
    queryKey: ['approval-detail', approvalId],
    queryFn: async (): Promise<ApprovalDetail> => {
      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // 返回 Mock 数据
      return {
        id: approvalId,
        title: '请假申请',
        type: 'leave',
        applicant: '张三',
        applyTime: '2026-02-26 14:30:00',
        status: 'pending',
        description: '因身体不适需要请假休息',
        amount: 0,
        formData: {
          leaveType: 'sick',
          days: 2.5,
          reason: '重感冒发烧，去医院打点滴。',
        },
        workflowDefinition: {
          id: 'wf-001',
          name: '请假审批流程',
          status: 'active',
          nodes: [],
          edges: [],
        },
        history: [
          {
            id: 'hist-001',
            handlerId: 'user-002',
            handlerName: '李四',
            status: 'approved',
            handledAt: '2026-02-26 15:00:00',
            comment: '同意请假',
          }
        ]
      }
    },
    enabled: !!approvalId,
  })
}