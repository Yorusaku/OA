import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import AiSuggestion from '../components/AiSuggestion.vue'

const mockState = {
  status: ref<'idle' | 'loading' | 'streaming' | 'success' | 'error'>('idle'),
  suggestion: ref<any>(null),
  streamedReasoning: ref(''),
  errorMessage: ref(''),
  isGenerating: ref(false),
  generateSuggestion: vi.fn(),
  retry: vi.fn(),
}

vi.mock('@/composables/useAiSuggestion', () => ({
  useAiSuggestion: () => mockState,
}))

describe('AiSuggestion.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.status.value = 'idle'
    mockState.suggestion.value = null
    mockState.streamedReasoning.value = ''
    mockState.errorMessage.value = ''
    mockState.isGenerating.value = false
  })

  it('初始态应显示生成按钮与免责声明', () => {
    const wrapper = mount(AiSuggestion, {
      props: { approvalId: 'APPROVE-001' },
    })

    expect(wrapper.text()).toContain('生成 AI 建议')
    expect(wrapper.text()).toContain('最终以人工审批为准')
  })

  it('高置信度时应渲染绿色建议态', () => {
    mockState.status.value = 'success'
    mockState.suggestion.value = {
      suggestion: 'approve',
      confidence: 0.88,
      riskLevel: 'low',
      reasoning: '信息完整，可参考通过。',
      disclaimer: 'AI 建议仅供参考，最终以人工审批为准',
      generatedAt: '2026-06-17T00:00:00.000Z',
    }

    const wrapper = mount(AiSuggestion, {
      props: { approvalId: 'APPROVE-001' },
    })

    expect(wrapper.classes()).toContain('ai-suggestion-card--success')
    expect(wrapper.text()).toContain('建议通过')
    expect(wrapper.text()).toContain('88%')
  })

  it('中置信度时应渲染黄色参考态', () => {
    mockState.status.value = 'success'
    mockState.suggestion.value = {
      suggestion: 'manual_review',
      confidence: 0.66,
      riskLevel: 'medium',
      reasoning: '需要人工确认预算与附件。',
      disclaimer: 'AI 建议仅供参考，最终以人工审批为准',
      generatedAt: '2026-06-17T00:00:00.000Z',
    }

    const wrapper = mount(AiSuggestion, {
      props: { approvalId: 'APPROVE-001' },
    })

    expect(wrapper.classes()).toContain('ai-suggestion-card--warning')
    expect(wrapper.text()).toContain('建议人工判断')
  })

  it('低置信度时应渲染灰态并保留错误重试能力', async () => {
    mockState.status.value = 'error'
    mockState.errorMessage.value = 'AI 服务暂时不可用'

    const wrapper = mount(AiSuggestion, {
      props: { approvalId: 'APPROVE-001' },
    })

    expect(wrapper.classes()).toContain('ai-suggestion-card--neutral')
    expect(wrapper.text()).toContain('AI 服务暂时不可用')

    await wrapper.find('button').trigger('click')
    expect(mockState.retry).toHaveBeenCalled()
  })
})
