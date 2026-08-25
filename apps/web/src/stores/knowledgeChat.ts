import type {
  CreateChatSessionRequest,
  KnowledgeChatMessage,
  KnowledgeChatSession,
  RagCitation,
} from '@oa/contracts'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import {
  createKnowledgeChatSession,
  deleteKnowledgeChatSession,
  listKnowledgeChatMessages,
  listKnowledgeChatSessions,
  renameKnowledgeChatSession,
  streamKnowledgeChat,
} from '@/api/ai'

export type KnowledgeChatStatus = 'idle' | 'loading' | 'streaming' | 'success' | 'error' | 'cancelled'

export const useKnowledgeChatStore = defineStore('knowledgeChat', () => {
  const kbId = ref('')
  const sessions = ref<KnowledgeChatSession[]>([])
  const currentSessionId = ref('')
  const messages = ref<KnowledgeChatMessage[]>([])
  const streamingContent = ref('')
  const streamingSources = ref<RagCitation[]>([])
  const status = ref<KnowledgeChatStatus>('idle')
  const errorMessage = ref('')
  const activeController = shallowRef<AbortController | null>(null)

  const currentSession = computed(() => sessions.value.find(item => item.id === currentSessionId.value) || null)
  const isStreaming = computed(() => status.value === 'streaming' || (status.value === 'loading' && activeController.value !== null))

  function setKnowledgeBase(id: string): void {
    if (kbId.value === id)
      return
    stop()
    kbId.value = id
    sessions.value = []
    currentSessionId.value = ''
    messages.value = []
    streamingContent.value = ''
    streamingSources.value = []
    status.value = 'idle'
    errorMessage.value = ''
  }

  async function loadSessions(id = kbId.value): Promise<KnowledgeChatSession[]> {
    if (!id)
      return []
    kbId.value = id
    status.value = 'loading'
    errorMessage.value = ''
    try {
      sessions.value = await listKnowledgeChatSessions(id)
      if (currentSessionId.value && !sessions.value.some(item => item.id === currentSessionId.value))
        currentSessionId.value = ''
      status.value = 'success'
      return sessions.value
    }
    catch (error) {
      status.value = 'error'
      errorMessage.value = error instanceof Error ? error.message : '会话列表加载失败'
      throw error
    }
  }

  async function selectSession(sessionId: string): Promise<void> {
    if (!kbId.value || !sessionId)
      return
    activeController.value?.abort()
    currentSessionId.value = sessionId
    messages.value = []
    streamingContent.value = ''
    streamingSources.value = []
    status.value = 'loading'
    errorMessage.value = ''
    try {
      messages.value = await listKnowledgeChatMessages(kbId.value, sessionId)
      status.value = 'success'
    }
    catch (error) {
      status.value = 'error'
      errorMessage.value = error instanceof Error ? error.message : '消息加载失败'
      throw error
    }
  }

  async function createSession(payload: CreateChatSessionRequest = { firstMessage: '' }): Promise<KnowledgeChatSession> {
    if (!kbId.value)
      throw new Error('knowledge-base-id-missing')
    const session = await createKnowledgeChatSession(kbId.value, payload)
    sessions.value = [session, ...sessions.value.filter(item => item.id !== session.id)]
    currentSessionId.value = session.id
    messages.value = []
    status.value = 'success'
    return session
  }

  function startDraft(): void {
    stop()
    currentSessionId.value = ''
    messages.value = []
    streamingContent.value = ''
    streamingSources.value = []
    status.value = 'idle'
    errorMessage.value = ''
  }

  async function renameSession(sessionId: string, title: string): Promise<KnowledgeChatSession> {
    if (!kbId.value)
      throw new Error('knowledge-base-id-missing')
    const session = await renameKnowledgeChatSession(kbId.value, sessionId, title)
    const index = sessions.value.findIndex(item => item.id === sessionId)
    if (index >= 0)
      sessions.value[index] = session
    return session
  }

  async function deleteSession(sessionId: string): Promise<void> {
    if (!kbId.value)
      return
    await deleteKnowledgeChatSession(kbId.value, sessionId)
    sessions.value = sessions.value.filter(item => item.id !== sessionId)
    messages.value = messages.value.filter(item => item.sessionId !== sessionId)
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = sessions.value[0]?.id || ''
      messages.value = []
      if (currentSessionId.value)
        await selectSession(currentSessionId.value)
    }
  }

  async function sendMessage(content: string): Promise<KnowledgeChatMessage> {
    const message = content.trim()
    if (!kbId.value)
      throw new Error('knowledge-base-id-missing')
    if (!message)
      throw new Error('chat-message-empty')
    activeController.value?.abort()
    const controller = new AbortController()
    activeController.value = controller
    status.value = 'loading'
    errorMessage.value = ''
    streamingContent.value = ''
    streamingSources.value = []

    let sessionId = currentSessionId.value
    if (!sessionId) {
      const session = await createSession({ firstMessage: message })
      sessionId = session.id
    }

    const userMessage: KnowledgeChatMessage = {
      id: `local-${Date.now()}`,
      sessionId,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    }
    messages.value.push(userMessage)

    try {
      const result = await streamKnowledgeChat(kbId.value, sessionId, message, {
        onMeta: () => { status.value = 'streaming' },
        onChunk: (event) => {
          status.value = 'streaming'
          streamingContent.value += event.content
        },
        onSources: (event) => {
          streamingSources.value = event.sources
        },
      }, { signal: controller.signal })
      messages.value.push(result)
      streamingContent.value = ''
      streamingSources.value = []
      const session = sessions.value.find(item => item.id === sessionId)
      if (session)
        session.updatedAt = result.createdAt
      status.value = 'success'
      return result
    }
    catch (error) {
      if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
        status.value = 'cancelled'
        throw error
      }
      status.value = 'error'
      errorMessage.value = error instanceof Error ? error.message : '对话生成失败'
      throw error
    }
    finally {
      if (activeController.value === controller)
        activeController.value = null
    }
  }

  function stop(): void {
    activeController.value?.abort()
    activeController.value = null
    if (isStreaming.value)
      status.value = 'cancelled'
  }

  function retry(): Promise<KnowledgeChatMessage> {
    const lastUserMessage = [...messages.value].reverse().find(item => item.role === 'user')
    if (!lastUserMessage)
      return Promise.reject(new Error('chat-message-missing'))
    if (messages.value.at(-1)?.role === 'assistant')
      messages.value.pop()
    return sendMessage(lastUserMessage.content)
  }

  return {
    kbId,
    sessions,
    currentSessionId,
    currentSession,
    messages,
    streamingContent,
    streamingSources,
    status,
    errorMessage,
    isStreaming,
    setKnowledgeBase,
    loadSessions,
    selectSession,
    createSession,
    startDraft,
    renameSession,
    deleteSession,
    sendMessage,
    stop,
    retry,
  }
})
