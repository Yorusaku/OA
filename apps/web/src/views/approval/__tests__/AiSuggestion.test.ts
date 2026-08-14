import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import AiSuggestion from '../components/AiSuggestion.vue'

const auditMutationMocks = vi.hoisted(() => ({
  accept: vi.fn(),
  override: vi.fn(),
}))

const mockState = {
  status: ref<'idle' | 'loading' | 'streaming' | 'success' | 'error'>('idle'),
  suggestion: ref<any>(null),
  streamedReasoning: ref(''),
  reasoningSegments: ref<any[]>([]),
  uncertainties: ref<any[]>([]),
  errorMessage: ref(''),
  isGenerating: ref(false),
  generateSuggestion: vi.fn(),
  retry: vi.fn(),
}

const mockPolicyState = {
  showWarningBanner: ref(false),
  policyDisclaimer: ref(''),
}

vi.mock('@/composables/useAiSuggestion', () => ({
  useAiSuggestion: () => mockState,
}))

vi.mock('@/composables/useAiPolicy', () => ({
  useAiPolicy: () => mockPolicyState,
}))

vi.mock('@/composables/useAiAudit', () => ({
  useAiAuditStats: () => ({
    stats: ref(undefined),
    isLoading: ref(false),
    error: ref(null),
  }),
  useAiAuditLogs: () => ({
    data: ref(undefined),
    isLoading: ref(false),
  }),
  useAcceptAiSuggestion: () => ({
    mutate: auditMutationMocks.accept,
    isPending: ref(false),
  }),
  useOverrideAiSuggestion: () => ({
    mutate: auditMutationMocks.override,
    isPending: ref(false),
  }),
}))

describe('AiSuggestion.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.status.value = 'idle'
    mockState.suggestion.value = null
    mockState.streamedReasoning.value = ''
    mockState.reasoningSegments.value = []
    mockState.uncertainties.value = []
    mockState.errorMessage.value = ''
    mockState.isGenerating.value = false
    auditMutationMocks.accept.mockImplementation((_input, options) => {
      options?.onSuccess?.()
    })
  })

  it('初始态应显示生成按钮与免责声明', () => {
    const wrapper = mount(AiSuggestion, {
      props: { approvalId: 'APPROVE-001' },
    })

    expect(wrapper.text()).toContain('生成 Copilot 审查')
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

  it('成功态应渲染 Copilot 审查摘要、风险点与依据来源', () => {
    mockState.status.value = 'success'
    mockState.suggestion.value = {
      suggestion: 'manual_review',
      confidence: 0.62,
      riskLevel: 'medium',
      reasoning: '高金额审批需要人工复核。',
      disclaimer: 'AI 建议仅供参考，最终以人工审批为准',
      generatedAt: '2026-06-17T00:00:00.000Z',
      reviewSummary: {
        title: '高金额采购审批',
        applicant: '王五',
        approvalType: 'purchase',
        amount: 80000,
        currentNodeName: '采购部审批',
        timeline: ['申请人 王五 发起「高金额采购审批」', '当前流转至 采购部审批'],
      },
      riskPoints: [
        {
          level: 'high',
          title: '高金额审批',
          detail: '当前金额超过高金额复核阈值，需要核对预算和附件。',
          source: 'policy',
        },
      ],
      evidenceItems: [
        {
          title: '1. 制度知识库',
          detail: '超过 50000 的采购需要补充比价材料。',
          source: 'knowledge_base',
          confidence: 0.88,
        },
      ],
    }

    const wrapper = mount(AiSuggestion, {
      props: { approvalId: 'APPROVE-001' },
    })

    expect(wrapper.text()).toContain('审批 Copilot')
    expect(wrapper.text()).toContain('审查摘要')
    expect(wrapper.text()).toContain('高金额采购审批')
    expect(wrapper.text()).toContain('风险点')
    expect(wrapper.text()).toContain('高金额审批')
    expect(wrapper.text()).toContain('依据来源')
    expect(wrapper.text()).toContain('制度知识库')
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

  it('存在审计事件时应支持采纳 Copilot 建议', async () => {
    mockState.status.value = 'success'
    mockState.suggestion.value = {
      suggestion: 'manual_review',
      confidence: 0.66,
      riskLevel: 'medium',
      reasoning: '需要人工确认预算与附件。',
      disclaimer: 'AI 建议仅供参考，最终以人工审批为准',
      generatedAt: '2026-06-17T00:00:00.000Z',
      auditEventId: 'audit-test-001',
    }

    const wrapper = mount(AiSuggestion, {
      props: { approvalId: 'APPROVE-001' },
    })
    const acceptButton = wrapper.findAll('button').find(button => button.text().includes('采纳建议'))

    expect(acceptButton).toBeDefined()
    await acceptButton!.trigger('click')

    expect(auditMutationMocks.accept).toHaveBeenCalledWith(
      {
        approvalId: 'APPROVE-001',
        auditEventId: 'audit-test-001',
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    )
    expect(wrapper.text()).toContain('已采纳 AI 建议')
    expect(wrapper.text()).not.toContain('忽略建议')
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
