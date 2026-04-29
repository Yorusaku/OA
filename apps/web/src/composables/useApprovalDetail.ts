import { useQuery } from '@tanstack/vue-query'
import { getApprovalDetail } from '@/api/approval'
import { mockExpenseSchema, mockLeaveSchema, mockPurchaseSchema, mockWorkflowDefinitions } from '@/api/mock'
import type {
  ApprovalAction,
  ApprovalRecord as BaseApprovalRecord,
  ApprovalStatus,
  ApprovalSystemTrailAction,
  ApprovalTrailItem,
} from '@/api/types'
import { useUserStore } from '@/stores/user'
import type { FormSchema, PermissionsMap } from '@/types/form-schema'
import type { WorkflowDefinition, WorkflowInstance, WorkflowNode } from '@/types/workflow'
import { computed } from 'vue'

export interface ApprovalHistoryRecord {
  id: string
  handlerId: string
  handlerName: string
  status: ApprovalStatus
  handledAt: string
  comment?: string
  attachments?: string[]
}

export interface ApprovalTimelineItem {
  id: string
  action: 'create' | ApprovalAction | ApprovalSystemTrailAction
  status: ApprovalStatus
  operatorName: string
  operatedAt: string
  summary: string
  comment?: string
  attachments?: string[]
}

export interface ApprovalDetail {
  id: string
  title: string
  type: 'leave' | 'expense' | 'purchase' | 'other'
  applicant: string
  applyTime: string
  status: ApprovalStatus
  description?: string
  amount?: number
  formData?: Record<string, any>
  currentNodeName?: string

  deadlineAt?: string
  escalatedAt?: string
  lastRemindAt?: string
  remindCount: number
  isOverdue: boolean
  slaStatus: 'normal' | 'overdue' | 'escalated'

  workflowDefinition?: WorkflowDefinition
  history?: ApprovalHistoryRecord[]
  formSchema?: FormSchema
  nodePermissions?: PermissionsMap
  currentNode?: WorkflowNode
  workflowInstance?: WorkflowInstance
  currentNodeMode?: 'and' | 'or'
  currentNodeProgress: {
    completed: number
    total: number
  }
  currentNodeProgressText: string
  canCurrentUserProcess: boolean
  pendingTaskHandlerNames: string[]
  currentDelegationSummary?: string
  currentEscalationSummary?: string

  operatorTrail: ApprovalTrailItem[]
  timeline: ApprovalTimelineItem[]
}

export function useApprovalDetail(approvalId: string) {
  const userStore = useUserStore()

  return useQuery({
    queryKey: computed(() => [
      'approval-detail',
      approvalId,
      userStore.userInfo?.id || getStoredUserInfo()?.id || 'anonymous',
    ]),
    queryFn: async (): Promise<ApprovalDetail> => {
      const record = await getApprovalDetail(approvalId)
      if (!record)
        throw new Error('approval-not-found')

      const formSchema = resolveFormSchema(record)
      const nodePermissions = resolveNodePermissions(record, formSchema)
      const workflowDefinition = resolveWorkflowDefinition(record)
      const currentNode = resolveCurrentNode(record, workflowDefinition)

      const workflowInstance: WorkflowInstance = {
        id: `wi-${record.id}`,
        workflowId: workflowDefinition?.id,
        workflowName: workflowDefinition?.name,
        initiatorName: record.applicant,
        formData: record.formData || {},
        status: mapRecordStatusToInstance(record.status),
        currentNodeId: currentNode?.id || record.workflowInstance?.currentNodeId,
        tasks: (record.workflowInstance?.tasks || []).map(task => ({
          id: task.id,
          nodeId: task.nodeId,
          handlerId: task.handlerId,
          handlerName: task.handlerName,
          status: task.status as WorkflowInstance['tasks'][number]['status'],
          comment: task.comment,
          handledAt: task.handledAt,
        })),
        createdAt: record.applyTime,
      }

      const currentNodeTasks = workflowInstance.tasks.filter(task =>
        !workflowInstance.currentNodeId || task.nodeId === workflowInstance.currentNodeId,
      )
      const pendingTasks = currentNodeTasks.filter(task => task.status === 'pending' || task.status === 'processing')
      const defaultCompleted = currentNodeTasks.length - pendingTasks.length
      const progress = {
        completed: record.workflowInstance?.progress?.completed ?? defaultCompleted,
        total: record.workflowInstance?.progress?.total ?? currentNodeTasks.length,
      }
      const storageUser = getStoredUserInfo()
      const currentUserId = userStore.userInfo?.id || storageUser?.id
      const currentUserName = userStore.userInfo?.name || storageUser?.name
      const hasTaskAssignmentInfo = currentNodeTasks.length > 0
      const canCurrentUserProcess = record.status === 'pending' && (
        !hasTaskAssignmentInfo
        || pendingTasks.some(task =>
          (currentUserId && task.handlerId === currentUserId)
          || (currentUserName && task.handlerName === currentUserName),
        )
      )
      const pendingTaskHandlerNames = pendingTasks.map(task => task.handlerName || task.handlerId)
      const delegatedTask = pendingTasks.find(task => !!task.delegatedFromId)
      const escalationTrail = (record.operatorTrail || []).find(item => item.action === 'escalate')

      const history: ApprovalHistoryRecord[] = workflowInstance.tasks
        .filter(task => task.status !== 'pending' && task.status !== 'processing')
        .map(task => ({
          id: task.id,
          handlerId: task.handlerId,
          handlerName: task.handlerName || '审批人',
          status: normalizeHistoryStatus(task.status),
          handledAt: task.handledAt || record.applyTime,
          comment: task.comment,
        }))

      const operatorTrail = [...(record.operatorTrail || [])]
      const timeline = operatorTrail.map(item => ({
        id: item.id,
        action: item.action,
        status: item.status,
        operatorName: item.operatorName || '系统',
        operatedAt: item.operatedAt,
        summary: buildTimelineSummary(item),
        comment: item.comment,
        attachments: item.attachments,
      }))

      const overdue = isPendingAndOverdue(record)

      return {
        id: record.id,
        title: record.title,
        type: resolveDetailType(record.type),
        applicant: record.applicant,
        applyTime: record.applyTime,
        status: record.status,
        description: record.description,
        amount: record.amount,
        formData: record.formData || {},
        currentNodeName: record.currentNodeName,
        formSchema,
        nodePermissions,
        currentNode,
        workflowInstance,
        workflowDefinition,
        history,
        currentNodeMode: record.workflowInstance?.currentNodeMode,
        currentNodeProgress: progress,
        currentNodeProgressText: `${progress.completed}/${progress.total}`,
        canCurrentUserProcess,
        pendingTaskHandlerNames,
        currentDelegationSummary: delegatedTask
          ? `当前由 ${delegatedTask.handlerName || delegatedTask.handlerId} 代理处理（代理自 ${delegatedTask.delegatedFromName || delegatedTask.delegatedFromId}）`
          : undefined,
        currentEscalationSummary: escalationTrail?.comment,
        deadlineAt: record.deadlineAt,
        escalatedAt: record.escalatedAt,
        lastRemindAt: record.lastRemindAt,
        remindCount: record.remindCount || 0,
        isOverdue: overdue,
        slaStatus: record.escalatedAt ? 'escalated' : overdue ? 'overdue' : 'normal',
        operatorTrail,
        timeline,
      }
    },
    enabled: !!approvalId,
  })
}

function resolveDetailType(type: string): ApprovalDetail['type'] {
  if (type === 'leave' || type === 'expense' || type === 'purchase')
    return type
  return 'other'
}

function resolveFormSchema(record: BaseApprovalRecord): FormSchema {
  if (record.formSchema)
    return record.formSchema

  if (record.type === 'leave')
    return mockLeaveSchema as FormSchema
  if (record.type === 'expense')
    return mockExpenseSchema as FormSchema
  if (record.type === 'purchase')
    return mockPurchaseSchema as FormSchema

  return {
    fields: [
      { key: 'reason', label: '申请说明', type: 'textarea', required: true },
    ],
    labelWidth: '120px',
  }
}

function resolveNodePermissions(record: BaseApprovalRecord, schema: FormSchema): PermissionsMap {
  if (record.nodePermissions)
    return record.nodePermissions

  const defaults: PermissionsMap = {}
  schema.fields.forEach((field) => {
    defaults[field.key] = 'editable'
  })
  return defaults
}

function resolveWorkflowDefinition(record: BaseApprovalRecord): WorkflowDefinition | undefined {
  if (record.type === 'leave')
    return mockWorkflowDefinitions.find(item => item.id === 'wf-001')
  if (record.type === 'expense')
    return mockWorkflowDefinitions.find(item => item.id === 'wf-002')
  return undefined
}

function resolveCurrentNode(
  record: BaseApprovalRecord,
  workflowDefinition?: WorkflowDefinition,
): WorkflowNode | undefined {
  if (!workflowDefinition)
    return undefined

  const currentNodeId = record.workflowInstance?.currentNodeId
  if (currentNodeId) {
    const byId = workflowDefinition.nodes.find(node => node.id === currentNodeId)
    if (byId)
      return byId
  }

  return workflowDefinition.nodes.find(node => node.type === 'approval')
}

function mapRecordStatusToInstance(status: ApprovalStatus): WorkflowInstance['status'] {
  if (status === 'approved')
    return 'approved'
  if (status === 'rejected')
    return 'rejected'
  if (status === 'cancelled' || status === 'withdrawn')
    return 'cancelled'
  return 'running'
}

function isPendingAndOverdue(record: BaseApprovalRecord): boolean {
  if (record.status !== 'pending')
    return false
  if (!record.deadlineAt)
    return false
  const deadline = new Date(record.deadlineAt.replace(' ', 'T'))
  if (Number.isNaN(deadline.getTime()))
    return false
  return deadline.getTime() < Date.now()
}

function buildTimelineSummary(item: ApprovalTrailItem): string {
  const actionLabels: Record<ApprovalTimelineItem['action'], string> = {
    create: '发起审批',
    approve: '审批通过',
    reject: '审批驳回',
    transfer: '审批转交',
    addSign: '发起加签',
    remind: '催办提醒',
    withdraw: '发起人撤回',
    cancel: '审批取消',
    escalate: '系统自动升级',
    delegate: '代理同步',
  }

  const base = actionLabels[item.action] || item.action
  const target = item.targetUserName || item.targetUserId

  if ((item.action === 'transfer' || item.action === 'addSign') && target)
    return `${base} -> ${target}`

  return base
}

function getStoredUserInfo(): { id?: string, name?: string } | null {
  if (typeof window === 'undefined')
    return null

  try {
    const raw = window.localStorage.getItem('userInfo')
    if (!raw)
      return null

    const parsed = JSON.parse(raw) as { id?: string, name?: string } | null
    if (!parsed)
      return null

    return {
      id: parsed.id,
      name: parsed.name,
    }
  }
  catch {
    return null
  }
}

function normalizeHistoryStatus(status: string): ApprovalStatus {
  if (
    status === 'approved'
    || status === 'rejected'
    || status === 'pending'
    || status === 'cancelled'
    || status === 'withdrawn'
    || status === 'transferred'
  ) {
    return status
  }
  if (status === 'auto-closed')
    return 'cancelled'
  return 'rejected'
}
