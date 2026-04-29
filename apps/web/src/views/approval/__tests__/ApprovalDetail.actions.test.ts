import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ApprovalDetail from '../ApprovalDetail.vue'

let currentStatus: 'pending' | 'approved' = 'pending'
let currentCanProcess = true
let currentNodeMode: 'and' | 'or' = 'and'
let currentNodeProgressText = '1/2'
let currentPendingHandlers = ['manager']
let currentDelegationSummary = ''

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: 'APPROVE-DETAIL-001' },
  }),
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}))

vi.mock('@/composables/useDevice', () => ({
  useDevice: () => ({
    isMobile: ref(false),
  }),
}))

vi.mock('@/composables/useApprovalDetail', () => ({
  useApprovalDetail: () => ({
    data: ref({
      id: 'APPROVE-DETAIL-001',
      title: '审批详情动作测试',
      type: 'leave',
      applicant: '张三',
      applyTime: '2026-04-29 10:00:00',
      status: currentStatus,
      canCurrentUserProcess: currentCanProcess,
      currentNodeMode,
      currentNodeProgressText,
      currentNodeProgress: {
        completed: 1,
        total: 2,
      },
      pendingTaskHandlerNames: currentPendingHandlers,
      currentDelegationSummary,
      remindCount: 0,
      timeline: [],
      formData: {},
      formSchema: {
        fields: [
          { key: 'reason', label: '申请原因', type: 'textarea', required: true },
        ],
      },
      nodePermissions: {
        reason: 'editable',
      },
      slaStatus: 'normal',
    }),
    isLoading: ref(false),
    error: ref(null),
    refetch: vi.fn(),
  }),
}))

vi.mock('@/views/approval/composables/useApprovalSubmit', () => ({
  useApprovalSubmit: () => ({
    isLoading: ref(false),
    submitApproval: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/components/dynamic-form/DynamicForm.vue', () => ({
  default: {
    name: 'DynamicForm',
    template: '<div class="dynamic-form-mock"></div>',
    setup(_: unknown, { expose }: { expose: (value: unknown) => void }) {
      expose({
        validate: vi.fn().mockResolvedValue(true),
        getValues: vi.fn().mockReturnValue({}),
      })
      return {}
    },
  },
}))

describe('ApprovalDetail 动作显示规则', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentStatus = 'pending'
    currentCanProcess = true
    currentNodeMode = 'and'
    currentNodeProgressText = '1/2'
    currentPendingHandlers = ['manager']
    currentDelegationSummary = ''
  })

  it('pending 且当前处理人应显示同意/驳回按钮', () => {
    const wrapper = mount(ApprovalDetail)
    expect(wrapper.find('.approve-btn').exists()).toBe(true)
    expect(wrapper.find('.reject-btn').exists()).toBe(true)
  })

  it('非 pending 状态应隐藏动作按钮并展示结束提示', () => {
    currentStatus = 'approved'
    const wrapper = mount(ApprovalDetail)

    expect(wrapper.find('.approve-btn').exists()).toBe(false)
    expect(wrapper.find('.reject-btn').exists()).toBe(false)
    expect(wrapper.text()).toContain('审批已结束')
  })

  it('pending 但非当前处理人时应隐藏动作并提示待处理人', () => {
    currentCanProcess = false
    const wrapper = mount(ApprovalDetail)

    expect(wrapper.find('.approve-btn').exists()).toBe(false)
    expect(wrapper.find('.reject-btn').exists()).toBe(false)
    expect(wrapper.text()).toContain('manager')
  })

  it('应展示会签/或签策略与节点进度', () => {
    currentNodeMode = 'and'
    currentNodeProgressText = '1/2'
    const wrapper = mount(ApprovalDetail)

    expect(wrapper.text()).toContain('会签')
    expect(wrapper.text()).toContain('1/2')
  })

  it('存在代理接管信息时应展示代理摘要', () => {
    currentDelegationSummary = '当前由 manager 代理处理（代理自 admin）'
    const wrapper = mount(ApprovalDetail)
    expect(wrapper.text()).toContain('代理处理')
    expect(wrapper.text()).toContain('manager')
  })
})
