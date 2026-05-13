export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'withdrawn'
  | 'transferred'

export type ApprovalAction =
  | 'approve'
  | 'reject'
  | 'transfer'
  | 'addSign'
  | 'remind'
  | 'withdraw'
  | 'cancel'

export type ApprovalTaskStatus =
  | 'pending'
  | 'processing'
  | 'approved'
  | 'rejected'
  | 'transferred'
  | 'cancelled'
  | 'auto-closed'

export interface ApprovalTaskHandledBy {
  id: string
  name: string
}

export interface ApprovalTask {
  id: string
  nodeId?: string
  handlerId: string
  handlerName?: string
  ownerId?: string
  ownerName?: string
  delegatedFromId?: string
  delegatedFromName?: string
  delegatedAt?: string
  status: string
  taskStatus?: ApprovalTaskStatus
  handledBy?: ApprovalTaskHandledBy
  handledAt?: string
  comment?: string
}

export interface ApprovalTrailItem {
  id: string
  action: ApprovalAction | 'create' | 'escalate' | 'delegate'
  status: ApprovalStatus
  operatorId?: string
  operatorName?: string
  operatedAt: string
  comment?: string
  attachments?: string[]
  targetUserId?: string
  targetUserName?: string
}

export interface ApprovalRecord {
  id: string
  title: string
  type: string
  status: ApprovalStatus
  applicant: string
  applyTime: string
  amount?: number
  applicantAvatar?: string
  currentNodeName?: string
  isUrgent?: boolean
  description?: string
  deadlineAt?: string
  escalatedAt?: string
  lastRemindAt?: string
  remindCount?: number
  latestComment?: string
  latestAttachments?: string[]
  operatorTrail?: ApprovalTrailItem[]
  workflowInstance?: {
    workflowId?: string
    workflowVersionId?: string
    currentNodeId?: string
    currentNodeMode?: 'and' | 'or'
    currentNodeAssignees?: ApprovalTaskHandledBy[]
    progress?: {
      completed: number
      total: number
    }
    tasks?: ApprovalTask[]
  }
  formSchema?: Record<string, unknown>
  nodePermissions?: Record<string, 'hidden' | 'readonly' | 'editable' | 'required'>
  formData?: Record<string, unknown>
}

export interface ApprovalDelegationRule {
  ownerId: string
  ownerName: string
  delegateId: string
  delegateName: string
  startAt: string
  endAt: string
  enabled: boolean
  updatedAt?: string
}

export interface WorkbenchStats {
  pendingCount: number
  myApplicationCount: number
  approvedCount: number
  rejectedCount: number
  overdueCount?: number
  escalatedCount?: number
  remindedCount?: number
}

export type MessageType = 'approval' | 'system' | 'cc' | 'other'
export type MessagePriority = 'low' | 'normal' | 'high'

export interface MessageRecord {
  id: string
  title: string
  content: string
  type: MessageType
  relatedId?: string
  read: boolean
  readTime?: string
  createdAt: string
  priority?: MessagePriority
}

export interface CCRecord {
  id: string
  approvalId: string
  title: string
  type: string
  status: ApprovalStatus
  applicant: string
  applicantAvatar?: string
  ccTime: string
  ccNodeName: string
  read: boolean
  readTime?: string
  amount?: number
  description?: string
}

export interface WorkflowAssignee {
  id: string
  name: string
}

export interface WorkflowNode {
  id: string
  type: 'start' | 'approval' | 'cc' | 'condition' | 'end'
  name: string
  description?: string
  handler?: {
    type: 'role' | 'dept' | 'user' | 'deptManager' | 'initiator' | 'continuous'
    mode?: 'or' | 'and' | 'sequential'
    assignees?: WorkflowAssignee[]
  }
  formSchemaId?: string
  conditions?: Array<{
    id?: string
    name?: string
    field?: string
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains'
    value: unknown
  }>
  formPermissions?: Record<string, 'hidden' | 'readonly' | 'editable' | 'required'>
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface WorkflowDefinition {
  id: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'inactive' | 'deleted'
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  formSchemaId?: string
  createdBy?: string
  createdAt?: string
  updatedBy?: string
  updatedAt?: string
  version?: number
}

export interface ApprovalNotification {
  id: string
  approvalId: string
  title: string
  content: string
  type: 'info' | 'success' | 'warning' | 'error'
  createdAt: string
}

export interface ApprovalEvent {
  id: string
  eventType: 'approval.created' | 'approval.updated' | 'approval.escalated' | 'approval.delegated'
  approvalId: string
  happenedAt: string
  durationMs?: number
  payload?: Record<string, unknown>
}

export interface RuntimeIdempotencyEntry {
  key: string
  path: string
  expiresAt: string
  response: unknown
}

export type AuditAction
  = | 'auth.login'
    | 'approval.submit'
    | 'approval.process'
    | 'approval.delegate.enable'
    | 'approval.delegate.disable'
    | 'workflow.publish'
    | 'workflow.rollback'

export type AuditResult = 'success' | 'failed'

export interface AuditSummaryLink {
  targetType: 'approval' | 'workflow' | 'delegation' | 'auth'
  targetId: string
  title?: string
  path?: string
}

export interface AuditEvent {
  id: string
  operatorId: string
  operatorName: string
  operatedAt: string
  module: 'approval' | 'workflow' | 'system' | 'auth'
  action: AuditAction
  result: AuditResult
  targetType: string
  targetId: string
  summary: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  traceId: string
  ip: string
  userAgent: string
  durationMs: number
  links?: AuditSummaryLink[]
  metadata?: Record<string, unknown>
}

export interface RuntimeState {
  users: Array<{
    id: string
    username: string
    password: string
    name: string
  }>
  approvals: ApprovalRecord[]
  approvalNotifications: ApprovalNotification[]
  messages: MessageRecord[]
  ccRecords: CCRecord[]
  approvalDelegations: ApprovalDelegationRule[]
  workflows: WorkflowDefinition[]
  workflowVersions: Array<{
    id: string
    workflowId: string
    workflowName: string
    status: 'draft' | 'published' | 'rolled_back'
    snapshot: WorkflowDefinition
    createdAt: string
    createdBy: string
    note?: string
  }>
  approvalEvents: ApprovalEvent[]
  auditLogs: AuditEvent[]
  idempotency: RuntimeIdempotencyEntry[]
}
