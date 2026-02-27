import { useQuery } from '@tanstack/vue-query'
import type { WorkflowDefinition, WorkflowNode, WorkflowInstance } from '@/types/workflow'
import type { FormSchema, PermissionsMap } from '@/types/form-schema'

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
  
  // === 新增字段（ADR-001：审批权限引擎集成）===
  
  /** 表单 Schema 结构（当前节点对应的 Schema） */
  formSchema?: FormSchema
  
  /** 当前登录用户在当前节点的表单权限映射表 */
  nodePermissions?: PermissionsMap
  
  /** 当前正在处理的工作流节点（用于显示节点信息） */
  currentNode?: WorkflowNode
  
  /** 工作流实例（用于判断审批流程是否结束） */
  workflowInstance?: WorkflowInstance
}

export function useApprovalDetail(approvalId: string, timeout = 5000) {
  return useQuery({
    queryKey: ['approval-detail', approvalId],
    queryFn: async (): Promise<ApprovalDetail> => {
      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 300))

      // 表单 Schema - HR 节点
      const formSchema: FormSchema = {
        fields: [
          { key: 'leaveType', label: '请假类型', type: 'select', required: true, span: 12,
            defaultValue: 'sick',  // 默认值：病假
            options: [
              { label: '事假', value: 'personal' },
              { label: '病假', value: 'sick' },
              { label: '年假', value: 'annual' },
            ],
          },
          { key: 'days', label: '请假天数', type: 'number', required: true, span: 12,
            defaultValue: 0,  // 默认值：0天
          },
          { key: 'reason', label: '请假事由', type: 'textarea', required: true, span: 24,
            defaultValue: '',  // 默认值：空字符串
          },
          { key: 'manager_comment', label: '部门经理意见', type: 'textarea', span: 24,
            defaultValue: '同意,请注意休息。',  // 默认值：从历史数据中获取
          },
          { key: 'hr_comment', label: 'HR审批意见', type: 'textarea', required: true, span: 24,
            defaultValue: '',  // 默认值：空字符串（HR 需要填写）
          },
          { key: 'amount', label: '折算金额', type: 'number', readonly: true, span: 12,
            defaultValue: 0,  // 默认值：0
          },
          { key: 'internal_notes', label: '内部备注', type: 'textarea', span: 24,
            defaultValue: '',  // 默认值：空字符串
          },
        ],
        labelWidth: '120px',
      }

      // 当前 HR 节点的权限映射表
      const nodePermissions: PermissionsMap = {
        leaveType: 'readonly',        // HR 不允许修改请假类型
        days: 'readonly',             // 天数只读
        manager_comment: 'readonly',  // 上一级意见只读
        hr_comment: 'required',       // HR 意见必填
        amount: 'readonly',           // 金额只读（后端计算）
        internal_notes: 'hidden',     // 内部备注对 HR 隐藏（敏感字段）
      }

      // 当前正在处理的节点
      const currentNode: WorkflowNode = {
        id: 'approval-002',
        type: 'approval',
        name: 'HR 审批',
        description: '人事部备案',
        handler: { type: 'role', roleIds: ['hr'], mode: 'or' },
        formSchemaId: 'leave-form',
      }

      // 工作流实例状态
      const workflowInstance: WorkflowInstance = {
        id: 'wi-001',
        workflowId: 'wf-001',
        workflowName: '请假审批流程',
        initiatorId: 'user-001',
        initiatorName: '张三',
        formData: {},
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
      }

      // 返回 Mock 数据（包含 ADR-001 新增字段）
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
          manager_comment: '同意，请注意休息。',
          hr_comment: '',  // HR 意见为空，需要审批人填写
          amount: 0,
          internal_notes: '',
        },
        formSchema,               // ✅ ADR-001：新增表单 Schema
        nodePermissions,          // ✅ ADR-001：新增权限映射表
        currentNode,              // ✅ ADR-001：新增当前节点
        workflowInstance,         // ✅ ADR-001：新增工作流实例
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