import type { AiApprovalSuggestionResponse, AiReasoningSegment, AiUncertainty } from '@oa/contracts'
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { fetchAiApprovalSuggestion, streamAiApprovalSuggestion } from '@/api/ai'

export type AiSuggestionStatus = 'idle' | 'loading' | 'streaming' | 'success' | 'error' | 'cancelled'

export function useAiSuggestion(approvalId: MaybeRefOrGetter<string | undefined>) {
  const status = ref<AiSuggestionStatus>('idle')
  const suggestion = ref<AiApprovalSuggestionResponse | null>(null)
  const streamedReasoning = ref('')
  const reasoningSegments = ref<AiReasoningSegment[]>([])
  const uncertainties = ref<AiUncertainty[]>([])
  const errorMessage = ref('')
  let activeController: AbortController | null = null
  const isGenerating = computed(() => status.value === 'loading' || status.value === 'streaming')

  function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError'
      || error instanceof Error && error.name === 'AbortError'
  }

  function resetState(): void {
    activeController?.abort()
    activeController = null
    status.value = 'idle'
    suggestion.value = null
    streamedReasoning.value = ''
    reasoningSegments.value = []
    uncertainties.value = []
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
    activeController?.abort()
    const controller = new AbortController()
    activeController = controller
    suggestion.value = null
    streamedReasoning.value = ''
    reasoningSegments.value = []
    uncertainties.value = []
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
        onSegment: (event) => {
          reasoningSegments.value = event.segments
        },
        onUncertainty: (event) => {
          uncertainties.value = event.uncertainties
        },
        onDone: (event) => {
          suggestion.value = {
            ...event.response,
            reasoning: streamedReasoning.value || event.response.reasoning,
          }
          // 如果 SSE 没有发送 segment/uncertainty 事件（如 policy blocked），从 response 取值
          if (!reasoningSegments.value.length && event.response.reasoningSegments?.length) {
            reasoningSegments.value = event.response.reasoningSegments
          }
          if (!uncertainties.value.length && event.response.uncertainties?.length) {
            uncertainties.value = event.response.uncertainties
          }
          status.value = 'success'
        },
        onError: (event) => {
          errorMessage.value = event.message
          status.value = 'error'
        },
      }, { signal: controller.signal })

      if (!suggestion.value) {
        suggestion.value = {
          ...result,
          reasoning: streamedReasoning.value || result.reasoning,
        }
        if (result.reasoningSegments?.length) {
          reasoningSegments.value = result.reasoningSegments
        }
        if (result.uncertainties?.length) {
          uncertainties.value = result.uncertainties
        }
      }

      if (activeController === controller)
        activeController = null
      status.value = 'success'

      return suggestion.value
    }
    catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        if (activeController === controller)
          activeController = null
        status.value = 'cancelled'
        errorMessage.value = ''
        throw error
      }
      if (activeController === controller)
        activeController = null
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
      reasoningSegments.value = result.reasoningSegments || []
      uncertainties.value = result.uncertainties || []
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

  function stop(): void {
    if (!activeController || !isGenerating.value)
      return
    activeController.abort()
    status.value = 'cancelled'
    suggestion.value = null
    errorMessage.value = ''
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
    reasoningSegments,
    uncertainties,
    errorMessage,
    isGenerating,
    resetState,
    generateSuggestion,
    loadSuggestion,
    retry,
    stop,
  }
}
