import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useAiSuggestion } from '../useAiSuggestion'

vi.mock('@/api/ai', () => ({
  fetchAiApprovalSuggestion: vi.fn(),
  streamAiApprovalSuggestion: vi.fn(),
}))

describe('useAiSuggestion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('初始状态应为 idle', () => {
    const state = useAiSuggestion('APPROVE-001')
    expect(state.status.value).toBe('idle')
    expect(state.suggestion.value).toBeNull()
    expect(state.streamedReasoning.value).toBe('')
  })

  it('流式生成时应累积理由并进入 success', async () => {
    const { streamAiApprovalSuggestion } = await import('@/api/ai')
    vi.mocked(streamAiApprovalSuggestion).mockImplementation(async (_approvalId, handlers) => {
      handlers?.onMeta?.({
        type: 'meta',
        approvalId: 'APPROVE-001',
        generatedAt: '2026-06-17T00:00:00.000Z',
      })
      handlers?.onChunk?.({ type: 'chunk', content: '第一段' })
      handlers?.onChunk?.({ type: 'chunk', content: '第二段' })
      handlers?.onDone?.({
        type: 'done',
        response: {
          suggestion: 'approve',
          confidence: 0.82,
          riskLevel: 'low',
          reasoning: '第一段第二段',
          disclaimer: 'AI 建议仅供参考，最终以人工审批为准',
          generatedAt: '2026-06-17T00:00:00.000Z',
          reviewSummary: {
            title: '测试审批',
            applicant: '张三',
            approvalType: 'leave',
            currentNodeName: 'HR审批',
            timeline: ['申请人 张三 发起「测试审批」'],
          },
          riskPoints: [
            {
              level: 'low',
              title: '未发现明显规则风险',
              detail: '当前审批上下文未命中明显风险。',
              source: 'model',
            },
          ],
          evidenceItems: [
            {
              title: '1. 模型判断',
              detail: '流式响应完成后保留结构化依据。',
              source: 'model_judgment',
              confidence: 0.82,
            },
          ],
        },
      })

      return {
        suggestion: 'approve',
        confidence: 0.82,
        riskLevel: 'low',
        reasoning: '第一段第二段',
        disclaimer: 'AI 建议仅供参考，最终以人工审批为准',
        generatedAt: '2026-06-17T00:00:00.000Z',
        reviewSummary: {
          title: '测试审批',
          applicant: '张三',
          approvalType: 'leave',
          currentNodeName: 'HR审批',
          timeline: ['申请人 张三 发起「测试审批」'],
        },
        riskPoints: [
          {
            level: 'low',
            title: '未发现明显规则风险',
            detail: '当前审批上下文未命中明显风险。',
            source: 'model',
          },
        ],
        evidenceItems: [
          {
            title: '1. 模型判断',
            detail: '流式响应完成后保留结构化依据。',
            source: 'model_judgment',
            confidence: 0.82,
          },
        ],
      }
    })

    const state = useAiSuggestion('APPROVE-001')
    const result = await state.generateSuggestion()

    expect(state.status.value).toBe('success')
    expect(state.streamedReasoning.value).toBe('第一段第二段')
    expect(state.suggestion.value?.suggestion).toBe('approve')
    expect(result.reasoning).toBe('第一段第二段')
    expect(result.reviewSummary?.title).toBe('测试审批')
    expect(result.riskPoints?.[0]?.title).toBe('未发现明显规则风险')
    expect(result.evidenceItems?.[0]?.source).toBe('model_judgment')
  })

  it('失败时应进入 error 状态并保留错误信息', async () => {
    const { streamAiApprovalSuggestion } = await import('@/api/ai')
    vi.mocked(streamAiApprovalSuggestion).mockRejectedValue(new Error('ai-stream-http-500'))

    const state = useAiSuggestion('APPROVE-002')

    await expect(state.generateSuggestion()).rejects.toThrow('ai-stream-http-500')
    expect(state.status.value).toBe('error')
    expect(state.errorMessage.value).toBe('ai-stream-http-500')
  })

  it('approvalId 变化后应重置状态', async () => {
    const approvalId = ref('APPROVE-001')
    const state = useAiSuggestion(approvalId)
    state.streamedReasoning.value = '已有内容'
    state.status.value = 'success'

    approvalId.value = 'APPROVE-002'
    await nextTick()

    expect(state.status.value).toBe('idle')
    expect(state.streamedReasoning.value).toBe('')
    expect(state.suggestion.value).toBeNull()
  })
})
