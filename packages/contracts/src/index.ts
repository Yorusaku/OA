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

export type AiSuggestionRiskLevel = 'low' | 'medium' | 'high'
export type AiSuggestionDecision = 'approve' | 'reject' | 'manual_review'

export interface AiApprovalSuggestionRequest {
  approvalId: string
}

export interface AiApprovalSuggestionResponse {
  suggestion: AiSuggestionDecision
  confidence: number
  riskLevel: AiSuggestionRiskLevel
  reasoning: string
  disclaimer: string
  generatedAt: string
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
  }
}

export type AiSuggestionEvent =
  | {
      type: 'meta'
      approvalId: string
      generatedAt: string
    }
  | {
      type: 'chunk'
      content: string
    }
  | {
      type: 'done'
      response: AiApprovalSuggestionResponse
    }
  | {
      type: 'error'
      message: string
    }

export interface RagCitation {
  documentId: string
  filename: string
  chunkId: string
  score: number
  content: string
}

export interface RagSearchRequest {
  query: string
  topK?: number
}

export interface RagSearchResponse {
  answer: string
  sources: RagCitation[]
}

export interface KnowledgeBaseItem {
  id: string
  name: string
  description: string
  chunkSize: number
  chunkOverlap: number
  createdAt: string
}

export interface KnowledgeDocumentItem {
  id: string
  kbId: string
  filename: string
  fileType: string
  fileSize: number
  chunkCount: number
  status: 'processing' | 'ready' | 'error'
  errorMessage?: string | null
  createdAt: string
}

export interface CreateKnowledgeBaseRequest {
  name: string
  description?: string
  chunkSize?: number
  chunkOverlap?: number
}

export interface UploadKnowledgeDocumentRequest {
  filename: string
  fileType: string
  fileSize?: number
  content: string
}
