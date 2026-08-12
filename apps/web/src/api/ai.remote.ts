import type {
  AiApprovalSuggestionRequest,
  AiApprovalSuggestionResponse,
  AiPolicy,
  AiSuggestionEvent,
  CreateKnowledgeBaseRequest,
  KnowledgeBaseItem,
  KnowledgeDocumentItem,
  RagSearchRequest,
  RagSearchResponse,
  UploadKnowledgeDocumentRequest,
} from '@oa/contracts'
import { del, get, post, put } from './http'

interface StreamHandlers {
  onEvent?: (event: AiSuggestionEvent) => void
  onMeta?: (event: Extract<AiSuggestionEvent, { type: 'meta' }>) => void
  onChunk?: (event: Extract<AiSuggestionEvent, { type: 'chunk' }>) => void
  onSegment?: (event: Extract<AiSuggestionEvent, { type: 'segment' }>) => void
  onUncertainty?: (event: Extract<AiSuggestionEvent, { type: 'uncertainty' }>) => void
  onDone?: (event: Extract<AiSuggestionEvent, { type: 'done' }>) => void
  onError?: (event: Extract<AiSuggestionEvent, { type: 'error' }>) => void
}

function resolveApiBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL || '/api'
  return base.endsWith('/') ? base.slice(0, -1) : base
}

function resolveAuthToken(): string | null {
  if (typeof window === 'undefined')
    return null

  try {
    return window.localStorage.getItem('token')
  }
  catch {
    return null
  }
}

function resolveHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const token = resolveAuthToken()
  if (token)
    headers.Authorization = `Bearer ${token}`
  return headers
}

function parseSseChunk(buffer: string): { events: AiSuggestionEvent[], rest: string } {
  const segments = buffer.split('\n\n')
  const rest = segments.pop() ?? ''
  const events: AiSuggestionEvent[] = []

  for (const segment of segments) {
    const line = segment
      .split('\n')
      .map(item => item.trim())
      .find(item => item.startsWith('data:'))

    if (!line)
      continue

    const jsonText = line.slice(5).trim()
    if (!jsonText)
      continue

    try {
      events.push(JSON.parse(jsonText) as AiSuggestionEvent)
    }
    catch {
      continue
    }
  }

  return { events, rest }
}

function dispatchEvent(event: AiSuggestionEvent, handlers: StreamHandlers): void {
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

export function remoteFetchAiApprovalSuggestion(
  approvalId: string,
): Promise<AiApprovalSuggestionResponse> {
  const payload: AiApprovalSuggestionRequest = { approvalId }
  return post('/v1/ai/approval-suggestion', payload)
}

export function remoteFetchAiPolicy(): Promise<AiPolicy> {
  return get('/v1/ai/policy')
}

export function remoteListKnowledgeBases(): Promise<KnowledgeBaseItem[]> {
  return get('/v1/knowledge')
}

export function remoteCreateKnowledgeBase(
  payload: CreateKnowledgeBaseRequest,
): Promise<KnowledgeBaseItem> {
  return post('/v1/knowledge', payload)
}

export function remoteDeleteKnowledgeBase(id: string): Promise<{ success: true }> {
  return del(`/v1/knowledge/${id}`)
}

export function remoteListKnowledgeDocuments(kbId: string): Promise<KnowledgeDocumentItem[]> {
  return get(`/v1/knowledge/${kbId}/documents`)
}

export function remoteUploadKnowledgeDocument(
  kbId: string,
  payload: UploadKnowledgeDocumentRequest,
): Promise<KnowledgeDocumentItem> {
  return post(`/v1/knowledge/${kbId}/documents`, payload)
}

export function remoteDeleteKnowledgeDocument(
  kbId: string,
  id: string,
): Promise<{ success: true }> {
  return del(`/v1/knowledge/${kbId}/documents/${id}`)
}

export function remoteSearchKnowledge(
  kbId: string,
  payload: RagSearchRequest,
): Promise<RagSearchResponse> {
  return post(`/v1/knowledge/${kbId}/search`, payload)
}

export async function remoteStreamAiApprovalSuggestion(
  approvalId: string,
  handlers: StreamHandlers = {},
): Promise<AiApprovalSuggestionResponse> {
  const payload: AiApprovalSuggestionRequest = { approvalId }
  const response = await fetch(`${resolveApiBaseUrl()}/v1/ai/approval-suggestion/stream`, {
    method: 'POST',
    headers: resolveHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`ai-stream-http-${response.status}`)
  }

  if (!response.body) {
    throw new Error('ai-stream-body-missing')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let doneResponse: AiApprovalSuggestionResponse | null = null

  while (true) {
    const { value, done } = await reader.read()
    if (done)
      break

    buffer += decoder.decode(value, { stream: true })
    const parsed = parseSseChunk(buffer)
    buffer = parsed.rest

    for (const event of parsed.events) {
      dispatchEvent(event, handlers)
      if (event.type === 'error')
        throw new Error(event.message)
      if (event.type === 'done')
        doneResponse = event.response
    }
  }

  if (buffer.trim()) {
    const parsed = parseSseChunk(`${buffer}\n\n`)
    for (const event of parsed.events) {
      dispatchEvent(event, handlers)
      if (event.type === 'error')
        throw new Error(event.message)
      if (event.type === 'done')
        doneResponse = event.response
    }
  }

  if (!doneResponse)
    throw new Error('ai-stream-incomplete')

  return doneResponse
}

// ==================== AI 审计 ====================

export interface AiAuditAcceptInput {
  approvalId: string
  auditEventId: string
  comment?: string
}

export interface AiAuditOverrideInput {
  approvalId: string
  auditEventId: string
  reason: string
}

export function remoteAcceptAiSuggestion(
  input: AiAuditAcceptInput,
): Promise<{ auditEventId: string }> {
  return post('/v1/ai/audit/accept', input)
}

export function remoteOverrideAiSuggestion(
  input: AiAuditOverrideInput,
): Promise<{ auditEventId: string }> {
  return post('/v1/ai/audit/override', input)
}

export function remoteGetAiAuditStats(): Promise<import('@oa/contracts').AiAuditStats> {
  return get('/v1/ai/audit/stats')
}

export function remoteGetAiAuditLogs(query: Record<string, unknown>): Promise<import('@oa/contracts').PageResult<unknown>> {
  return get('/v1/ai/audit/logs', { params: query })
}

export function remoteGetAiAuditDetail(approvalId: string): Promise<unknown[]> {
  return get(`/v1/ai/audit/${approvalId}`)
}

// ==================== Prompt 模板管理 ====================

export function remoteListPromptTemplates(query?: Record<string, unknown>): Promise<import('@oa/contracts').PromptTemplate[]> {
  return get('/v1/ai/prompt-templates', { params: query })
}

export function remoteCreatePromptTemplate(payload: import('@oa/contracts').CreatePromptTemplateRequest): Promise<import('@oa/contracts').PromptTemplate> {
  return post('/v1/ai/prompt-templates', payload)
}

export function remoteGetPromptTemplate(id: string): Promise<import('@oa/contracts').PromptTemplate> {
  return get(`/v1/ai/prompt-templates/${id}`)
}

export function remoteUpdatePromptTemplate(id: string, payload: import('@oa/contracts').UpdatePromptTemplateRequest): Promise<import('@oa/contracts').PromptTemplate> {
  return put(`/v1/ai/prompt-templates/${id}`, payload)
}

export function remoteDeletePromptTemplate(id: string): Promise<{ success: true }> {
  return del(`/v1/ai/prompt-templates/${id}`)
}

export function remoteActivatePromptTemplate(id: string): Promise<import('@oa/contracts').PromptTemplate> {
  return post(`/v1/ai/prompt-templates/${id}/activate`)
}

export function remoteTestPromptTemplate(payload: import('@oa/contracts').PromptTemplateTestRequest): Promise<import('@oa/contracts').PromptTemplateTestResponse> {
  return post('/v1/ai/prompt-templates/test', payload)
}

export type { StreamHandlers as AiSuggestionStreamHandlers }
