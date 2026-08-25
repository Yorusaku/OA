import { computed, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { storeToRefs } from 'pinia'
import { useKnowledgeChatStore } from '@/stores/knowledgeChat'

export function useKnowledgeChat(kbId: MaybeRefOrGetter<string | undefined>) {
  const store = useKnowledgeChatStore()
  const {
    sessions,
    currentSessionId,
    currentSession,
    messages,
    streamingContent,
    streamingSources,
    status,
    errorMessage,
    isStreaming,
  } = storeToRefs(store)
  const knowledgeBaseId = computed(() => toValue(kbId) || '')

  async function initialize(): Promise<void> {
    const id = knowledgeBaseId.value
    if (!id)
      return
    store.setKnowledgeBase(id)
    const items = await store.loadSessions(id)
    if (items.length)
      await store.selectSession(items[0].id)
  }

  watch(knowledgeBaseId, () => {
    void initialize()
  }, { immediate: true })

  return {
    sessions,
    currentSessionId,
    currentSession,
    messages,
    streamingContent,
    streamingSources,
    status,
    errorMessage,
    isStreaming,
    initialize,
    selectSession: store.selectSession,
    createSession: store.createSession,
    startDraft: store.startDraft,
    renameSession: store.renameSession,
    deleteSession: store.deleteSession,
    sendMessage: store.sendMessage,
    stop: store.stop,
    retry: store.retry,
  }
}
