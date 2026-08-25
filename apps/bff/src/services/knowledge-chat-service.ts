import type {
  AiUsage,
  ChatStreamEvent,
  KnowledgeChatMessage,
  KnowledgeChatSession,
  RagCitation,
} from '@oa/contracts'
import { createStreamingLLM } from '@oa/ai-utils'
import type { BffConfig } from '../config'
import type { RuntimeStore } from '../store'
import { uid } from '../utils'
import { __knowledgeState, retrieveKnowledgeSources } from './knowledge-service'

interface ChatSessionRecord extends KnowledgeChatSession {}
interface ChatMessageRecord extends KnowledgeChatMessage {}

interface KnowledgeChatState {
  sessions: ChatSessionRecord[]
  messages: ChatMessageRecord[]
}

const inMemoryChatState: KnowledgeChatState = {
  sessions: [],
  messages: [],
}

export const __knowledgeChatState = inMemoryChatState

export function __resetKnowledgeChatState(): void {
  inMemoryChatState.sessions = []
  inMemoryChatState.messages = []
}

type ChatEventHandler = (event: ChatStreamEvent) => void

function hasSqlStore(store: RuntimeStore): store is RuntimeStore & Required<Pick<RuntimeStore, 'query'>> {
  return store.storage === 'postgres' && typeof store.query === 'function'
}

function mapSession(row: Record<string, any>): KnowledgeChatSession {
  return {
    id: row.id,
    kbId: row.kb_id,
    title: row.title,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

function mapMessage(row: Record<string, any>): KnowledgeChatMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    sources: row.sources || undefined,
    usage: row.usage || undefined,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

function buildTitle(message: string): string {
  const title = message.replace(/\s+/g, ' ').trim()
  return title.length > 24 ? `${title.slice(0, 24)}...` : title || '新对话'
}

function getMockKnowledgeAnswer(query: string, sources: RagCitation[]): string {
  if (!sources.length)
    return '未检索到足够相关的制度内容，建议补充问题背景后再试，或转人工确认。'
  return `根据知识库检索结果，关于“${query}”可以优先参考《${sources[0].filename}》中的相关制度片段。当前命中 ${sources.length} 条依据，具体适用范围仍建议结合业务上下文人工确认。`
}

async function ensureKnowledgeBase(store: RuntimeStore, kbId: string): Promise<void> {
  if (!hasSqlStore(store)) {
    if (!__knowledgeState.bases.some(item => item.id === kbId))
      throw new Error('knowledge-base-not-found')
    return
  }

  const result = await store.query('SELECT id FROM knowledge_bases WHERE id = $1', [kbId])
  if (result.rowCount === 0)
    throw new Error('knowledge-base-not-found')
}

export async function createChatSession(
  store: RuntimeStore,
  kbId: string,
  firstMessage: string,
  title?: string,
): Promise<KnowledgeChatSession> {
  await ensureKnowledgeBase(store, kbId)
  const item: KnowledgeChatSession = {
    id: uid('chat'),
    kbId,
    title: title?.trim() || buildTitle(firstMessage),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  if (!hasSqlStore(store)) {
    inMemoryChatState.sessions.unshift(item)
    return item
  }

  await store.query(
    'INSERT INTO knowledge_chat_sessions(id, kb_id, title) VALUES ($1, $2, $3)',
    [item.id, item.kbId, item.title],
  )
  return item
}

export async function listChatSessions(store: RuntimeStore, kbId: string): Promise<KnowledgeChatSession[]> {
  await ensureKnowledgeBase(store, kbId)
  if (!hasSqlStore(store))
    return inMemoryChatState.sessions.filter(item => item.kbId === kbId)

  const result = await store.query(
    'SELECT * FROM knowledge_chat_sessions WHERE kb_id = $1 ORDER BY updated_at DESC',
    [kbId],
  )
  return result.rows.map(mapSession)
}

export async function renameChatSession(
  store: RuntimeStore,
  sessionId: string,
  title: string,
): Promise<KnowledgeChatSession> {
  const nextTitle = title.trim()
  if (!nextTitle)
    throw new Error('chat-title-empty')

  if (!hasSqlStore(store)) {
    const item = inMemoryChatState.sessions.find(session => session.id === sessionId)
    if (!item)
      throw new Error('chat-session-not-found')
    item.title = nextTitle
    item.updatedAt = new Date().toISOString()
    return item
  }

  const result = await store.query(
    `UPDATE knowledge_chat_sessions
     SET title = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [sessionId, nextTitle],
  )
  if (result.rowCount === 0)
    throw new Error('chat-session-not-found')
  return mapSession(result.rows[0])
}

export async function deleteChatSession(store: RuntimeStore, sessionId: string): Promise<void> {
  if (!hasSqlStore(store)) {
    inMemoryChatState.sessions = inMemoryChatState.sessions.filter(item => item.id !== sessionId)
    inMemoryChatState.messages = inMemoryChatState.messages.filter(item => item.sessionId !== sessionId)
    return
  }
  await store.query('DELETE FROM knowledge_chat_sessions WHERE id = $1', [sessionId])
}

export async function listChatMessages(store: RuntimeStore, sessionId: string): Promise<KnowledgeChatMessage[]> {
  if (!hasSqlStore(store))
    return inMemoryChatState.messages.filter(item => item.sessionId === sessionId)

  const result = await store.query(
    'SELECT * FROM knowledge_chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
    [sessionId],
  )
  return result.rows.map(mapMessage)
}

async function getSession(store: RuntimeStore, sessionId: string): Promise<KnowledgeChatSession> {
  if (!hasSqlStore(store)) {
    const item = inMemoryChatState.sessions.find(session => session.id === sessionId)
    if (!item)
      throw new Error('chat-session-not-found')
    return item
  }

  const result = await store.query(
    'SELECT * FROM knowledge_chat_sessions WHERE id = $1',
    [sessionId],
  )
  if (result.rowCount === 0)
    throw new Error('chat-session-not-found')
  return mapSession(result.rows[0])
}

async function saveMessage(store: RuntimeStore, message: KnowledgeChatMessage): Promise<void> {
  if (!hasSqlStore(store)) {
    inMemoryChatState.messages.push(message)
    return
  }

  await store.query(
    `INSERT INTO knowledge_chat_messages(id, session_id, role, content, sources, usage)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
    [
      message.id,
      message.sessionId,
      message.role,
      message.content,
      JSON.stringify(message.sources || null),
      JSON.stringify(message.usage || null),
    ],
  )
}

async function touchSession(store: RuntimeStore, sessionId: string): Promise<void> {
  if (!hasSqlStore(store)) {
    const item = inMemoryChatState.sessions.find(session => session.id === sessionId)
    if (item)
      item.updatedAt = new Date().toISOString()
    return
  }
  await store.query('UPDATE knowledge_chat_sessions SET updated_at = NOW() WHERE id = $1', [sessionId])
}

function buildPrompt(
  messages: KnowledgeChatMessage[],
  query: string,
  sources: RagCitation[],
): { role: 'system' | 'user' | 'assistant', content: string }[] {
  const sourceText = sources.length
    ? sources.map((source, index) => `依据${index + 1}（${source.filename}）：${source.content}`).join('\n')
    : '暂无命中制度依据。'
  const history = messages.slice(-8).map(message => ({
    role: message.role,
    content: message.content,
  }))
  return [
    {
      role: 'system',
      content: [
        '你是企业制度知识库助手。',
        '请优先依据提供的制度片段回答，不要编造不存在的条款。',
        '如果制度依据不足，请明确说明需要人工确认。',
        '回答使用中文，结构清晰但不要输出 JSON。',
        `本轮检索依据：\n${sourceText}`,
      ].join('\n'),
    },
    ...history,
    { role: 'user', content: query },
  ]
}

export async function streamChat(
  store: RuntimeStore,
  config: BffConfig,
  payload: { sessionId: string, message: string },
  onEvent: ChatEventHandler,
  isAborted: () => boolean = () => false,
): Promise<KnowledgeChatMessage> {
  const session = await getSession(store, payload.sessionId)
  const message = payload.message.trim()
  if (!message)
    throw new Error('chat-message-empty')

  const history = await listChatMessages(store, session.id)
  const userMessage: KnowledgeChatMessage = {
    id: uid('msg'),
    sessionId: session.id,
    role: 'user',
    content: message,
    createdAt: new Date().toISOString(),
  }
  await saveMessage(store, userMessage)
  await touchSession(store, session.id)

  const sources = await retrieveKnowledgeSources(store, config, {
    kbId: session.kbId,
    query: message,
    topK: 5,
  })
  const assistantId = uid('msg')
  onEvent({ type: 'meta', sessionId: session.id, messageId: assistantId })
  if (sources.length)
    onEvent({ type: 'sources', sources })

  let content = ''
  let usage: AiUsage | undefined
  if (!process.env.ARK_API_KEY?.trim()) {
    content = getMockKnowledgeAnswer(message, sources)
    for (const chunk of content.match(/.{1,18}/gs) || [content]) {
      if (isAborted())
        break
      content = content
      onEvent({ type: 'chunk', content: chunk })
    }
  }
  else {
    const llm = createStreamingLLM({ temperature: 0.2, maxTokens: 700 })
    for await (const chunk of llm.stream(buildPrompt(history, message, sources))) {
      if (isAborted())
        break
      if (chunk.content) {
        content += chunk.content
        onEvent({ type: 'chunk', content: chunk.content })
      }
      if (chunk.usage)
        usage = chunk.usage
    }
  }

  if (!content)
    content = getMockKnowledgeAnswer(message, sources)

  const assistantMessage: KnowledgeChatMessage = {
    id: assistantId,
    sessionId: session.id,
    role: 'assistant',
    content,
    sources,
    usage,
    createdAt: new Date().toISOString(),
  }
  await saveMessage(store, assistantMessage)
  await touchSession(store, session.id)
  onEvent({ type: 'done', message: assistantMessage })
  return assistantMessage
}
