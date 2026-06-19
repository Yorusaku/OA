import type {
  AiApprovalSuggestionResponse,
  AiSuggestionDecision,
  AiSuggestionEvent,
  AiSuggestionRiskLevel,
  CreateKnowledgeBaseRequest,
  KnowledgeBaseItem,
  KnowledgeDocumentItem,
  RagSearchRequest,
  RagSearchResponse,
  UploadKnowledgeDocumentRequest,
} from '@oa/contracts'
import {
  remoteCreateKnowledgeBase,
  remoteDeleteKnowledgeBase,
  remoteDeleteKnowledgeDocument,
  remoteFetchAiApprovalSuggestion,
  remoteListKnowledgeBases,
  remoteListKnowledgeDocuments,
  remoteSearchKnowledge,
  remoteStreamAiApprovalSuggestion,
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
  return {
    ...payload,
    disclaimer: 'AI 建议仅供参考，最终以人工审批为准',
    generatedAt: new Date().toISOString(),
    usage: {
      inputTokens: 128,
      outputTokens: 96,
      totalTokens: 224,
    },
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

  await sleep(60)
  dispatchMockEvent({
    type: 'done',
    response,
  }, handlers)

  return response
}

export async function fetchAiApprovalSuggestion(
  approvalId: string,
): Promise<AiApprovalSuggestionResponse> {
  if (useRemoteApprovalApi())
    return remoteFetchAiApprovalSuggestion(approvalId)

  await sleep(MOCK_DELAY_MS)
  return buildMockResponse(approvalId)
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

export type { AiSuggestionStreamHandlers }
