export interface ApiEnvelope<T = unknown> {
  code: number
  message: string
  data: T
  traceId: string
}

export interface ApiError {
  code: number
  message: string
  traceId: string
  details?: unknown
}

export const API_ERROR = {
  BAD_REQUEST: 400001,
  UNAUTHORIZED: 401001,
  FORBIDDEN: 403001,
  NOT_FOUND: 404001,
  CONFLICT: 409001,
  INTERNAL_ERROR: 500001,
} as const

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface IdempotencyMeta {
  key: string
  expiresAt: string
}

export type WorkflowVersionStatus = 'draft' | 'published' | 'rolled_back'

export interface WorkflowVersion {
  id: string
  workflowId: string
  workflowName: string
  status: WorkflowVersionStatus
  snapshot: unknown
  createdAt: string
  createdBy: string
  note?: string
}

export interface RuleTraceFieldResult {
  fieldKey: string
  visible: boolean
  readonly: boolean
  required: boolean
  source: string[]
  hitConditions: string[]
}

export interface RuleTrace {
  workflowId: string
  nodeId?: string
  matched: boolean
  summary: string
  fields: RuleTraceFieldResult[]
}

export interface ApprovalMetricSnapshot {
  generatedAt: string
  slaHitRate: number
  nodeDurationP50: number
  nodeDurationP95: number
  rejectRate: number
  delegationTakeoverRate: number
  totals: {
    approvals: number
    completed: number
    rejected: number
    escalated: number
    delegated: number
  }
  alerts: Array<{
    id: string
    level: 'warning' | 'critical'
    metric: string
    threshold: number
    current: number
    message: string
    createdAt: string
  }>
}

export type SseTopic =
  | 'approval.created'
  | 'approval.updated'
  | 'approval.todo.changed'
  | 'message.new'

export interface SseApprovalEvent<TPayload = unknown> {
  eventId: string
  topic: SseTopic
  timestamp: string
  payload: TPayload
}
