import type {
  AiApprovalSuggestionResponse,
  AiAuditStats,
  AiPolicy,
  AiSuggestionDecision,
  AiSuggestionEvent,
  AiSuggestionRiskLevel,
  CreateKnowledgeBaseRequest,
  CreatePromptTemplateRequest,
  KnowledgeBaseItem,
  KnowledgeDocumentItem,
  PageResult,
  PromptTemplate,
  PromptTemplateTestRequest,
  PromptTemplateTestResponse,
  RagSearchRequest,
  RagSearchResponse,
  UpdatePromptTemplateRequest,
  UploadKnowledgeDocumentRequest,
} from '@oa/contracts'
import {
  remoteAcceptAiSuggestion,
  remoteActivatePromptTemplate,
  remoteCreateKnowledgeBase,
  remoteCreatePromptTemplate,
  remoteDeleteKnowledgeBase,
  remoteDeleteKnowledgeDocument,
  remoteDeletePromptTemplate,
  remoteFetchAiApprovalSuggestion,
  remoteFetchAiPolicy,
  remoteGetAiAuditDetail,
  remoteGetAiAuditLogs,
  remoteGetAiAuditStats,
  remoteGetPromptTemplate,
  remoteListKnowledgeBases,
  remoteListKnowledgeDocuments,
  remoteListPromptTemplates,
  remoteOverrideAiSuggestion,
  remoteSearchKnowledge,
  remoteStreamAiApprovalSuggestion,
  remoteTestPromptTemplate,
  remoteUpdatePromptTemplate,
  remoteUploadKnowledgeDocument,
  type AiSuggestionStreamHandlers,
} from './ai.remote'
import { useRemoteApprovalApi } from './runtime'

const MOCK_DELAY_MS = 280

interface MockKnowledgeBaseRecord extends KnowledgeBaseItem {}

interface MockKnowledgeDocumentRecord extends KnowledgeDocumentItem {
  content: string
}

interface MockKnowledgeChunkRecord {
  id: string
  kbId: string
  documentId: string
  filename: string
  content: string
}

const mockKnowledgeBases: MockKnowledgeBaseRecord[] = [
  {
    id: 'kb-mock-expense',
    name: '企业报销制度',
    description: '报销、差旅与费用审批相关制度片段',
    chunkSize: 500,
    chunkOverlap: 50,
    createdAt: new Date('2026-06-18T09:00:00.000Z').toISOString(),
  },
]

const mockKnowledgeDocuments: MockKnowledgeDocumentRecord[] = [
  {
    id: 'doc-mock-expense-001',
    kbId: 'kb-mock-expense',
    filename: '报销制度示例.txt',
    fileType: 'text/plain',
    fileSize: 320,
    chunkCount: 2,
    status: 'ready',
    errorMessage: null,
    createdAt: new Date('2026-06-18T09:10:00.000Z').toISOString(),
    content: [
      '差旅住宿标准：一线城市普通员工单晚住宿标准不超过 500 元，经理级不超过 700 元。',
      '差旅交通费用需提供行程单与发票，超预算申请必须补充业务必要性说明并由上级复核。',
    ].join('\n'),
  },
]

const mockKnowledgeChunks: MockKnowledgeChunkRecord[] = [
  {
    id: 'doc-mock-expense-001_chunk_0',
    kbId: 'kb-mock-expense',
    documentId: 'doc-mock-expense-001',
    filename: '报销制度示例.txt',
    content: '差旅住宿标准：一线城市普通员工单晚住宿标准不超过 500 元，经理级不超过 700 元。',
  },
  {
    id: 'doc-mock-expense-001_chunk_1',
    kbId: 'kb-mock-expense',
    documentId: 'doc-mock-expense-001',
    filename: '报销制度示例.txt',
    content: '差旅交通费用需提供行程单与发票，超预算申请必须补充业务必要性说明并由上级复核。',
  },
]

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function createMockId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function pickMockPayload(approvalId: string): {
  suggestion: AiSuggestionDecision
  confidence: number
  riskLevel: AiSuggestionRiskLevel
  reasoning: string
} {
  const normalized = approvalId.toLowerCase()

  if (normalized.includes('esc') || normalized.includes('risk')) {
    return {
      suggestion: 'manual_review',
      confidence: 0.42,
      riskLevel: 'high',
      reasoning: '当前审批已出现超时升级或高风险信号，建议重点核对金额依据、附件完整性与处理时效，再由人工决定。',
    }
  }

  if (normalized.includes('002') || normalized.includes('travel')) {
    return {
      suggestion: 'approve',
      confidence: 0.86,
      riskLevel: 'low',
      reasoning: '表单关键信息较完整，金额与类型匹配，当前节点职责明确，历史处理轨迹未发现明显冲突，可优先参考通过建议。',
    }
  }

  return {
    suggestion: 'manual_review',
    confidence: 0.64,
    riskLevel: 'medium',
    reasoning: '申请内容基本完整，但部分判断仍依赖人工核对，例如业务必要性、预算占用与附件真实性，因此建议结合实际情况审慎处理。',
  }
}

function buildMockResponse(approvalId: string): AiApprovalSuggestionResponse {
  const payload = pickMockPayload(approvalId)
  const segments = payload.suggestion === 'approve'
    ? [
        { content: '根据企业差旅报销制度，单日住宿标准为500元，市内交通补贴上限100元/天。本次申请住宿费450元，未超出企业标准。', source: 'knowledge_base' as const, confidence: 0.9, citation: { documentId: 'kb-mock-expense', detail: '企业差旅报销制度 v2.1' } },
        { content: '表单中"住宿费"字段为450元，"出差天数"为3天，合计金额在预算范围内。', source: 'form_data' as const, confidence: 0.95, citation: { fieldName: '住宿费', detail: '住宿费=450元，出差天数=3天' } },
        { content: '历史相似差旅审批中，同部门员工同类申请通过率为92%，处理时效约0.8天。', source: 'historical_data' as const, confidence: 0.8, citation: { approvalId: 'approval-travel-002', detail: '同类审批通过率92%' } },
        { content: '综合以上分析，当前申请金额合理、材料齐全、符合企业制度，建议通过。', source: 'model_judgment' as const, confidence: 0.7 },
      ]
    : [
        { content: '表单中"申请金额"为120000元，远超常规同类申请的平均金额（约15000元），需重点核实。', source: 'form_data' as const, confidence: 0.95, citation: { fieldName: '申请金额', detail: '金额=120000元，同类均值=15000元' } },
        { content: '根据采购审批制度，超过100000元的采购需附三方比价材料。当前申请未包含比价附件。', source: 'knowledge_base' as const, confidence: 0.9, citation: { documentId: 'kb-mock-expense', detail: '采购审批制度 v1.5' } },
        { content: '历史高金额审批中，缺少比价材料的申请驳回率为67%。', source: 'historical_data' as const, confidence: 0.8, citation: { approvalId: 'approval-risk-001', detail: '高金额缺材料驳回率67%' } },
        { content: '由于关键比价材料缺失，且金额显著异常，当前建议转人工审核，不建议直接通过或驳回。', source: 'model_judgment' as const, confidence: 0.6 },
      ]

  const uncertainties = [
    {
      topic: '附件完整性',
      level: 'medium' as const,
      description: '当前审批未包含发票/收据扫描件，无法确认费用真实性。',
      suggestedAction: '请申请人补充发票扫描件或电子发票链接',
    },
  ]

  return {
    ...payload,
    disclaimer: 'AI 建议仅供参考，最终以人工审批为准',
    generatedAt: new Date().toISOString(),
    usage: {
      inputTokens: 128,
      outputTokens: 96,
      totalTokens: 224,
    },
    reasoningSegments: segments,
    uncertainties,
  }
}

function splitReasoning(reasoning: string): string[] {
  return reasoning.match(/.{1,18}/gs) || [reasoning]
}

function splitKnowledgeContent(content: string, chunkSize = 500, chunkOverlap = 50): string[] {
  const normalized = content.replace(/\r\n/g, '\n').trim()
  if (!normalized)
    return []

  if (normalized.length <= chunkSize)
    return [normalized]

  const chunks: string[] = []
  let start = 0
  while (start < normalized.length) {
    const end = Math.min(normalized.length, start + chunkSize)
    const chunk = normalized.slice(start, end).trim()
    if (chunk)
      chunks.push(chunk)
    if (end >= normalized.length)
      break
    start = Math.max(end - chunkOverlap, start + 1)
  }
  return chunks
}

function scoreKnowledgeChunk(query: string, content: string): number {
  const keywords = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!keywords.length)
    return 0

  const normalizedContent = content.toLowerCase()
  const hitCount = keywords.filter(keyword => normalizedContent.includes(keyword)).length
  return hitCount / keywords.length
}

async function mockListKnowledgeBases(): Promise<KnowledgeBaseItem[]> {
  await sleep(MOCK_DELAY_MS)
  return [...mockKnowledgeBases].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

async function mockCreateKnowledgeBase(
  payload: CreateKnowledgeBaseRequest,
): Promise<KnowledgeBaseItem> {
  await sleep(MOCK_DELAY_MS)
  const item: KnowledgeBaseItem = {
    id: createMockId('kb'),
    name: payload.name.trim(),
    description: payload.description?.trim() || '',
    chunkSize: Math.max(100, Math.floor(payload.chunkSize ?? 500)),
    chunkOverlap: Math.max(0, Math.floor(payload.chunkOverlap ?? 50)),
    createdAt: new Date().toISOString(),
  }
  mockKnowledgeBases.unshift(item)
  return item
}

async function mockDeleteKnowledgeBase(id: string): Promise<{ success: true }> {
  await sleep(MOCK_DELAY_MS)
  const targetDocIds = mockKnowledgeDocuments.filter(item => item.kbId === id).map(item => item.id)
  const nextBases = mockKnowledgeBases.filter(item => item.id !== id)
  const nextDocs = mockKnowledgeDocuments.filter(item => item.kbId !== id)
  const nextChunks = mockKnowledgeChunks.filter(item => !targetDocIds.includes(item.documentId))

  mockKnowledgeBases.splice(0, mockKnowledgeBases.length, ...nextBases)
  mockKnowledgeDocuments.splice(0, mockKnowledgeDocuments.length, ...nextDocs)
  mockKnowledgeChunks.splice(0, mockKnowledgeChunks.length, ...nextChunks)

  return { success: true }
}

async function mockListKnowledgeDocuments(kbId: string): Promise<KnowledgeDocumentItem[]> {
  await sleep(MOCK_DELAY_MS)
  return mockKnowledgeDocuments
    .filter(item => item.kbId === kbId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ content: _content, ...rest }) => rest)
}

async function mockUploadKnowledgeDocument(
  kbId: string,
  payload: UploadKnowledgeDocumentRequest,
): Promise<KnowledgeDocumentItem> {
  await sleep(MOCK_DELAY_MS)
  const base = mockKnowledgeBases.find(item => item.id === kbId)
  if (!base)
    throw new Error('knowledge-base-not-found')

  const chunks = splitKnowledgeContent(payload.content, base.chunkSize, base.chunkOverlap)
  const document: MockKnowledgeDocumentRecord = {
    id: createMockId('doc'),
    kbId,
    filename: payload.filename,
    fileType: payload.fileType,
    fileSize: payload.fileSize ?? 0,
    chunkCount: chunks.length,
    status: 'ready',
    errorMessage: null,
    createdAt: new Date().toISOString(),
    content: payload.content,
  }

  mockKnowledgeDocuments.unshift(document)
  mockKnowledgeChunks.unshift(
    ...chunks.map((chunk, index) => ({
      id: `${document.id}_chunk_${index}`,
      kbId,
      documentId: document.id,
      filename: payload.filename,
      content: chunk,
    })),
  )

  const { content: _content, ...rest } = document
  return rest
}

async function mockDeleteKnowledgeDocument(
  kbId: string,
  id: string,
): Promise<{ success: true }> {
  await sleep(MOCK_DELAY_MS)
  const nextDocs = mockKnowledgeDocuments.filter(item => !(item.kbId === kbId && item.id === id))
  const nextChunks = mockKnowledgeChunks.filter(item => item.documentId !== id)
  mockKnowledgeDocuments.splice(0, mockKnowledgeDocuments.length, ...nextDocs)
  mockKnowledgeChunks.splice(0, mockKnowledgeChunks.length, ...nextChunks)
  return { success: true }
}

async function mockSearchKnowledge(
  kbId: string,
  payload: RagSearchRequest,
): Promise<RagSearchResponse> {
  await sleep(MOCK_DELAY_MS)
  const hits = mockKnowledgeChunks
    .filter(item => item.kbId === kbId)
    .map(item => ({
      documentId: item.documentId,
      filename: item.filename,
      chunkId: item.id,
      score: scoreKnowledgeChunk(payload.query, item.content),
      content: item.content,
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, payload.topK ?? 5)

  const answer = hits.length
    ? `根据当前命中的制度片段，建议优先参考“${hits[0].filename}”中的相关条款，并结合原始附件做人工确认。`
    : '当前没有检索到足够相关的制度片段，建议补充关键词或由人工判断。'

  return {
    answer,
    sources: hits,
  }
}

function dispatchMockEvent(event: AiSuggestionEvent, handlers: AiSuggestionStreamHandlers): void {
  handlers.onEvent?.(event)

  if (event.type === 'meta')
    handlers.onMeta?.(event)
  else if (event.type === 'chunk')
    handlers.onChunk?.(event)
  else if (event.type === 'segment')
    handlers.onSegment?.(event)
  else if (event.type === 'uncertainty')
    handlers.onUncertainty?.(event)
  else if (event.type === 'done')
    handlers.onDone?.(event)
  else if (event.type === 'error')
    handlers.onError?.(event)
}

async function mockStreamAiApprovalSuggestion(
  approvalId: string,
  handlers: AiSuggestionStreamHandlers = {},
): Promise<AiApprovalSuggestionResponse> {
  const response = buildMockResponse(approvalId)

  dispatchMockEvent({
    type: 'meta',
    approvalId,
    generatedAt: response.generatedAt,
  }, handlers)

  for (const chunk of splitReasoning(response.reasoning)) {
    await sleep(90)
    dispatchMockEvent({
      type: 'chunk',
      content: chunk,
    }, handlers)
  }

  // 发送溯源 segments
  if (response.reasoningSegments?.length) {
    await sleep(40)
    dispatchMockEvent({
      type: 'segment',
      segments: response.reasoningSegments,
    }, handlers)
  }

  // 发送不确定性标注
  if (response.uncertainties?.length) {
    await sleep(40)
    dispatchMockEvent({
      type: 'uncertainty',
      uncertainties: response.uncertainties,
    }, handlers)
  }

  await sleep(60)
  dispatchMockEvent({
    type: 'done',
    response,
  }, handlers)

  return response
}

const mockAiPolicy: AiPolicy = {
  version: '1.0.0',
  updatedAt: '2026-08-12T00:00:00.000Z',
  rules: [
    {
      id: 'rule-escalated-block',
      description: '已超时升级的审批单禁止 AI 生成建议',
      scope: 'approval_suggestion',
      effect: 'block',
      priority: 100,
      conditions: [{ field: 'escalatedAt', operator: 'exists' }],
      message: '当前审批已超时升级，AI 建议不可用，请人工紧急处理',
    },
    {
      id: 'rule-high-amount-warn',
      description: '金额超过 50000 的审批单触发 AI 警告',
      scope: 'approval_suggestion',
      effect: 'warn',
      priority: 90,
      conditions: [{ field: 'amount', operator: 'gte', value: 50000 }],
      message: '当前审批金额较高（≥50,000），AI 建议仅供有限参考，务必人工核对金额依据',
    },
    {
      id: 'rule-delegation-warn',
      description: '代理审批场景下 AI 建议附加警告',
      scope: 'approval_suggestion',
      effect: 'warn',
      priority: 80,
      conditions: [{ field: 'isDelegated', operator: 'eq', value: true }],
      message: '当前为代理审批，AI 建议可能未考虑代理人与原审批人的权限差异，请审慎参考',
    },
    {
      id: 'rule-high-remind-warn',
      description: '催办超过 3 次的审批单降低 AI 置信度',
      scope: 'approval_suggestion',
      effect: 'warn',
      priority: 70,
      conditions: [{ field: 'remindCount', operator: 'gte', value: 3 }],
      message: '当前审批已被多次催办（≥3 次），可能存在处理争议，AI 建议仅供参考',
    },
    {
      id: 'rule-no-description-warn',
      description: '缺少审批描述的审批单触发警告',
      scope: 'approval_suggestion',
      effect: 'warn',
      priority: 60,
      conditions: [{ field: 'description', operator: 'not_exists' }],
      message: '当前审批缺少详细描述，AI 可能因信息不足而无法给出准确建议',
    },
  ],
}

export async function fetchAiApprovalSuggestion(
  approvalId: string,
): Promise<AiApprovalSuggestionResponse> {
  if (useRemoteApprovalApi())
    return remoteFetchAiApprovalSuggestion(approvalId)

  await sleep(MOCK_DELAY_MS)
  return buildMockResponse(approvalId)
}

export async function fetchAiPolicy(): Promise<AiPolicy> {
  if (useRemoteApprovalApi())
    return remoteFetchAiPolicy()

  await sleep(120)
  return { ...mockAiPolicy }
}

export async function streamAiApprovalSuggestion(
  approvalId: string,
  handlers: AiSuggestionStreamHandlers = {},
): Promise<AiApprovalSuggestionResponse> {
  if (useRemoteApprovalApi())
    return remoteStreamAiApprovalSuggestion(approvalId, handlers)

  return mockStreamAiApprovalSuggestion(approvalId, handlers)
}

export async function listKnowledgeBases(): Promise<KnowledgeBaseItem[]> {
  if (useRemoteApprovalApi())
    return remoteListKnowledgeBases()
  return mockListKnowledgeBases()
}

export async function createKnowledgeBase(
  payload: CreateKnowledgeBaseRequest,
): Promise<KnowledgeBaseItem> {
  if (useRemoteApprovalApi())
    return remoteCreateKnowledgeBase(payload)
  return mockCreateKnowledgeBase(payload)
}

export async function deleteKnowledgeBase(id: string): Promise<{ success: true }> {
  if (useRemoteApprovalApi())
    return remoteDeleteKnowledgeBase(id)
  return mockDeleteKnowledgeBase(id)
}

export async function listKnowledgeDocuments(kbId: string): Promise<KnowledgeDocumentItem[]> {
  if (useRemoteApprovalApi())
    return remoteListKnowledgeDocuments(kbId)
  return mockListKnowledgeDocuments(kbId)
}

export async function uploadKnowledgeDocument(
  kbId: string,
  payload: UploadKnowledgeDocumentRequest,
): Promise<KnowledgeDocumentItem> {
  if (useRemoteApprovalApi())
    return remoteUploadKnowledgeDocument(kbId, payload)
  return mockUploadKnowledgeDocument(kbId, payload)
}

export async function deleteKnowledgeDocument(
  kbId: string,
  id: string,
): Promise<{ success: true }> {
  if (useRemoteApprovalApi())
    return remoteDeleteKnowledgeDocument(kbId, id)
  return mockDeleteKnowledgeDocument(kbId, id)
}

export async function searchKnowledge(
  kbId: string,
  payload: RagSearchRequest,
): Promise<RagSearchResponse> {
  if (useRemoteApprovalApi())
    return remoteSearchKnowledge(kbId, payload)
  return mockSearchKnowledge(kbId, payload)
}

// ==================== AI 审计 API ====================

export interface AcceptAiSuggestionInput {
  approvalId: string
  auditEventId: string
  comment?: string
}

export interface OverrideAiSuggestionInput {
  approvalId: string
  auditEventId: string
  reason: string
}

export async function acceptAiSuggestion(
  input: AcceptAiSuggestionInput,
): Promise<{ auditEventId: string }> {
  if (useRemoteApprovalApi())
    return remoteAcceptAiSuggestion(input)
  await sleep(160)
  return { auditEventId: `audit-${Date.now()}-accept` }
}

export async function overrideAiSuggestion(
  input: OverrideAiSuggestionInput,
): Promise<{ auditEventId: string }> {
  if (useRemoteApprovalApi())
    return remoteOverrideAiSuggestion(input)
  await sleep(160)
  return { auditEventId: `audit-${Date.now()}-override` }
}

export async function getAiAuditStats(): Promise<AiAuditStats> {
  if (useRemoteApprovalApi())
    return remoteGetAiAuditStats()
  await sleep(200)
  return {
    totalSuggestions: 12,
    acceptedCount: 8,
    overriddenCount: 4,
    acceptedRate: 0.67,
    confidenceDistribution: { low: 3, medium: 5, high: 4 },
    riskDistribution: { low: 4, medium: 5, high: 3 },
    avgLatencyMs: 850,
  }
}

export async function getAiAuditLogs(
  query: Record<string, unknown> = {},
): Promise<PageResult<unknown>> {
  if (useRemoteApprovalApi())
    return remoteGetAiAuditLogs(query)
  await sleep(260)
  return {
    list: [],
    total: 12,
    page: (query.page as number) || 1,
    pageSize: (query.pageSize as number) || 20,
  }
}

export async function getAiAuditDetail(
  approvalId: string,
): Promise<unknown[]> {
  if (useRemoteApprovalApi())
    return remoteGetAiAuditDetail(approvalId)
  await sleep(180)
  return []
}

// ==================== Prompt 模板 API ====================

export async function listPromptTemplates(
  query?: Record<string, unknown>,
): Promise<PromptTemplate[]> {
  if (useRemoteApprovalApi())
    return remoteListPromptTemplates(query)
  await sleep(200)
  return []
}

export async function createPromptTemplate(
  payload: CreatePromptTemplateRequest,
): Promise<PromptTemplate> {
  if (useRemoteApprovalApi())
    return remoteCreatePromptTemplate(payload)
  await sleep(260)
  return {
    id: createMockId('tmpl'),
    name: payload.name,
    description: payload.description,
    scope: payload.scope,
    status: 'draft',
    systemPrompt: payload.systemPrompt,
    userPrompt: payload.userPrompt,
    variables: payload.variables || [],
    modelConfig: payload.modelConfig || { temperature: 0.2, maxTokens: 512 },
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin',
  }
}

export async function getPromptTemplate(id: string): Promise<PromptTemplate> {
  if (useRemoteApprovalApi())
    return remoteGetPromptTemplate(id)
  await sleep(180)
  throw new Error('prompt-template-not-found')
}

export async function updatePromptTemplate(
  id: string,
  payload: UpdatePromptTemplateRequest,
): Promise<PromptTemplate> {
  if (useRemoteApprovalApi())
    return remoteUpdatePromptTemplate(id, payload)
  await sleep(260)
  throw new Error('prompt-template-not-found')
}

export async function deletePromptTemplate(id: string): Promise<{ success: true }> {
  if (useRemoteApprovalApi())
    return remoteDeletePromptTemplate(id)
  await sleep(160)
  return { success: true }
}

export async function activatePromptTemplate(id: string): Promise<PromptTemplate> {
  if (useRemoteApprovalApi())
    return remoteActivatePromptTemplate(id)
  await sleep(200)
  throw new Error('prompt-template-not-found')
}

export async function testPromptTemplate(
  payload: PromptTemplateTestRequest,
): Promise<PromptTemplateTestResponse> {
  if (useRemoteApprovalApi())
    return remoteTestPromptTemplate(payload)
  await sleep(600)
  return {
    output: '{"suggestion":"approve","confidence":0.85,"riskLevel":"low","reasoning":"表单信息完整，金额与类型匹配，历史轨迹清晰，可参考通过建议。"}',
    latencyMs: 620,
    usage: { inputTokens: 245, outputTokens: 72, totalTokens: 317 },
  }
}

export type { AiSuggestionStreamHandlers }
