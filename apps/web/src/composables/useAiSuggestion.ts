import type { AiApprovalSuggestionResponse } from '@oa/contracts'
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { fetchAiApprovalSuggestion, streamAiApprovalSuggestion } from '@/api/ai'

export type AiSuggestionStatus = 'idle' | 'loading' | 'streaming' | 'success' | 'error'

export function useAiSuggestion(approvalId: MaybeRefOrGetter<string | undefined>) {
  const status = ref<AiSuggestionStatus>('idle')
  const suggestion = ref<AiApprovalSuggestionResponse | null>(null)
  const streamedReasoning = ref('')
  const errorMessage = ref('')
  const isGenerating = computed(() => status.value === 'loading' || status.value === 'streaming')

  function resetState(): void {
    status.value = 'idle'
    suggestion.value = null
    streamedReasoning.value = ''
    errorMessage.value = ''
  }

  async function generateSuggestion(): Promise<AiApprovalSuggestionResponse> {
    const currentId = toValue(approvalId)
    if (!currentId) {
      const error = new Error('approval-id-missing')
      status.value = 'error'
      errorMessage.value = '审批单号缺失，无法生成 AI 建议'
      throw error
    }

    status.value = 'loading'
    suggestion.value = null
    streamedReasoning.value = ''
    errorMessage.value = ''

    try {
      const result = await streamAiApprovalSuggestion(currentId, {
        onMeta: () => {
          status.value = 'streaming'
        },
        onChunk: (event) => {
          status.value = 'streaming'
          streamedReasoning.value += event.content
        },
        onDone: (event) => {
          suggestion.value = {
            ...event.response,
            reasoning: streamedReasoning.value || event.response.reasoning,
          }
          status.value = 'success'
        },
        onError: (event) => {
          errorMessage.value = event.message
          status.value = 'error'
        },
      })

      if (!suggestion.value) {
        suggestion.value = {
          ...result,
          reasoning: streamedReasoning.value || result.reasoning,
        }
      }

      status.value = 'success'

      return suggestion.value
    }
    catch (error) {
      status.value = 'error'
      errorMessage.value = error instanceof Error ? error.message : 'AI 建议生成失败'
      throw error
    }
  }

  async function loadSuggestion(): Promise<AiApprovalSuggestionResponse> {
    const currentId = toValue(approvalId)
    if (!currentId) {
      const error = new Error('approval-id-missing')
      status.value = 'error'
      errorMessage.value = '审批单号缺失，无法获取 AI 建议'
      throw error
    }

    status.value = 'loading'
    errorMessage.value = ''

    try {
      const result = await fetchAiApprovalSuggestion(currentId)
      suggestion.value = result
      streamedReasoning.value = result.reasoning
      status.value = 'success'
      return result
    }
    catch (error) {
      status.value = 'error'
      errorMessage.value = error instanceof Error ? error.message : 'AI 建议获取失败'
      throw error
    }
  }

  function retry(): Promise<AiApprovalSuggestionResponse> {
    return generateSuggestion()
  }

  watch(
    () => toValue(approvalId),
    () => {
      resetState()
    },
  )

  return {
    status,
    suggestion,
    streamedReasoning,
    errorMessage,
    isGenerating,
    resetState,
    generateSuggestion,
    loadSuggestion,
    retry,
  }
}
