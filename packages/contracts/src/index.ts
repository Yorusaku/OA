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

// ========== AI Policy-as-Code ==========

export type AiActionScope = 'approval_suggestion'

export type AiPolicyEffect = 'allow' | 'warn' | 'block'

export interface AiPolicyCondition {
  field: string
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'includes' | 'exists' | 'not_exists'
  value?: unknown
}

export interface AiPolicyRule {
  id: string
  description: string
  scope: AiActionScope
  effect: AiPolicyEffect
  priority: number
  conditions: AiPolicyCondition[]
  message: string
}

export interface AiPolicy {
  version: string
  updatedAt: string
  rules: AiPolicyRule[]
}

export interface AiPolicyValidationResult {
  allowed: boolean
  effect: AiPolicyEffect
  blockingRules: AiPolicyRule[]
  warningRules: AiPolicyRule[]
  disclaimer: string
}

export interface AiApprovalSuggestionRequest {
  approvalId: string
  policyCheck?: boolean
}

export interface AiApprovalSuggestionResponse {
  suggestion: AiSuggestionDecision
  confidence: number
  riskLevel: AiSuggestionRiskLevel
  reasoning: string
  disclaimer: string
  generatedAt: string
  auditEventId?: string
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
  }
  reasoningSegments?: AiReasoningSegment[]
  uncertainties?: AiUncertainty[]
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
      type: 'segment'
      segments: AiReasoningSegment[]
    }
  | {
      type: 'uncertainty'
      uncertainties: AiUncertainty[]
    }
  | {
      type: 'error'
      message: string
    }

// ========== AI 可解释性（引用溯源）==========

export type ReasoningSource = 'knowledge_base' | 'historical_data' | 'form_data' | 'model_judgment'

export interface AiReasoningSegment {
  content: string
  source: ReasoningSource
  confidence: number
  citation?: {
    documentId?: string
    chunkId?: string
    approvalId?: string
    fieldName?: string
    detail: string
  }
}

export interface AiUncertainty {
  topic: string
  level: 'low' | 'medium' | 'high'
  description: string
  suggestedAction: string
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

// ========== AI 决策审计 ==========

export interface AiAuditInputContext {
  approvalId: string
  approvalType: string
  amount?: number
  riskSignals: string[]
  knowledgeBaseHits: number
  promptTemplateId?: string
  promptTemplateVersion?: number
}

export interface AiAuditModelBehavior {
  suggestion: AiSuggestionDecision
  confidence: number
  riskLevel: AiSuggestionRiskLevel
  reasoning: string
  modelName?: string
  inputTokens?: number
  outputTokens?: number
  latencyMs: number
}

export interface AiAuditHumanIntervention {
  action?: 'accepted' | 'overridden'
  actualDecision?: string
  comment?: string
  operatorId?: string
  operatorName?: string
  overrideReason?: string
  timestamp?: string
}

export interface AiAuditOutcomeImpact {
  finalDecision?: string
  processingTimeMs?: number
  suggestionMatch?: boolean
  policyBlocked: boolean
  policyWarnings: string[]
}

export interface AiAuditContext {
  auditEventId: string
  approvalId: string
  generatedAt: string
  inputContext: AiAuditInputContext
  modelBehavior: AiAuditModelBehavior
  humanIntervention: AiAuditHumanIntervention | null
  outcomeAndImpact: AiAuditOutcomeImpact
}

export interface AiAuditStats {
  totalSuggestions: number
  acceptedCount: number
  overriddenCount: number
  acceptedRate: number
  confidenceDistribution: { low: number, medium: number, high: number }
  riskDistribution: { low: number, medium: number, high: number }
  avgLatencyMs: number
}

export interface AiSuggestionAcceptRequest {
  approvalId: string
  actualDecision?: string
  comment?: string
}

export interface AiSuggestionOverrideRequest {
  approvalId: string
  reason: string
}

// ========== Prompt 模板管理 ==========

export type PromptTemplateStatus = 'draft' | 'active' | 'archived'

export type PromptTemplateScope = 'approval_suggestion'

export interface PromptTemplateVariable {
  name: string
  label: string
  required: boolean
  defaultValue?: string
  description?: string
}

export interface PromptTemplateModelConfig {
  temperature: number
  maxTokens: number
}

export interface PromptTemplate {
  id: string
  name: string
  description?: string
  scope: PromptTemplateScope
  status: PromptTemplateStatus
  systemPrompt: string
  userPrompt: string
  variables: PromptTemplateVariable[]
  modelConfig: PromptTemplateModelConfig
  version: number
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface CreatePromptTemplateRequest {
  name: string
  description?: string
  scope: PromptTemplateScope
  systemPrompt: string
  userPrompt: string
  variables?: PromptTemplateVariable[]
  modelConfig?: PromptTemplateModelConfig
}

export interface UpdatePromptTemplateRequest {
  name?: string
  description?: string
  systemPrompt?: string
  userPrompt?: string
  variables?: PromptTemplateVariable[]
  modelConfig?: PromptTemplateModelConfig
}

export interface PromptTemplateTestRequest {
  systemPrompt: string
  userPrompt: string
  variables: Record<string, string>
  modelConfig?: PromptTemplateModelConfig
}

export interface PromptTemplateTestResponse {
  output: string
  latencyMs: number
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
  }
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
