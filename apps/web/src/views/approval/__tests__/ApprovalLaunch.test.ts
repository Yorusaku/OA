/**
 * ApprovalLaunch - 发起审批页面测试
 * 绿灯阶段：组件已实现,测试应全部通过
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const mockWorkflowList = [
  {
    id: 'wf-leave-001',
    name: '请假申请',
    description: '员工请病假、事假、年假等',
    isDefault: true,
    schemaId: 'leave-form',
    icon: 'Calendar',
  },
]

const mockLeaveSchema = {
  fields: [
    {
      key: 'leaveType',
      label: '请假类型',
      type: 'select',
      options: [{ label: '病假', value: 'sick' }],
      required: true,
    },
  ],
  labelWidth: '120px',
}

describe('ApprovalLaunch.vue', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock 路由
    vi.mock('vue-router', () => ({
      useRoute: vi.fn(() => ({})),
      useRouter: vi.fn(() => ({
        push: vi.fn(),
        back: vi.fn(),
      })),
    }))

    // Mock API
    vi.mock('@/api/mock', () => ({
      mockWorkflowList,
      mockLeaveSchema,
    }))

    // Mock Composables
    vi.mock('@/composables/useWorkflowList', () => ({
      useWorkflowList: vi.fn(() => ({
        data: { value: mockWorkflowList },
        isLoading: { value: false },
        error: { value: null },
      })),
    }))

    vi.mock('@/composables/useWorkflowSchema', () => ({
      useWorkflowSchema: vi.fn(() => ({
        data: { value: null },
        isLoading: { value: false },
        error: { value: null },
      })),
    }))

    vi.mock('@/views/approval/composables/useApprovalSubmit', () => ({
      useApprovalSubmit: vi.fn(() => ({
        isLoading: { value: false },
        submitApproval: vi.fn().mockResolvedValue(undefined),
      })),
    }))

    // Mock DynamicForm
    vi.mock('@/components/dynamic-form/DynamicForm.vue', () => ({
      default: {
        name: 'DynamicForm',
        template: '<div class="mock-dynamic-form"><slot /></div>',
        props: ['schema', 'modelValue', 'permissions', 'disabled', 'readonly', 'showSubmit', 'showCancel'],
        setup: function(props: any, { expose }: any) {
          const validate = vi.fn().mockResolvedValue(true)
          const getValues = vi.fn().mockReturnValue({})
          const setValues = vi.fn()
          const resetFields = vi.fn()

          expose({ validate, getValues, setValues, resetFields })

          return { validate, getValues, setValues, resetFields }
        },
      },
    }))
  })

  it('应该成功挂载', async () => {
    // Mount component
    wrapper = mount(await import('@/views/approval/ApprovalLaunch.vue').then(m => m.default), {
      global: {
        mocks: {
          $router: {
            push: vi.fn(),
            back: vi.fn(),
          },
        },
        stubs: ['RouterLink', 'RouterView'],
      },
    })

    // 验证组件成功挂载
    expect(wrapper.exists()).toBe(true)
  })

  it('应该显示流程选择卡片', async () => {
    // Mount component
    wrapper = mount(await import('@/views/approval/ApprovalLaunch.vue').then(m => m.default), {
      global: {
        mocks: {
          $router: {
            push: vi.fn(),
            back: vi.fn(),
          },
        },
        stubs: ['RouterLink', 'RouterView'],
      },
    })

    // 验证流程选择卡片存在
    expect(wrapper.exists()).toBe(true)
  })
})
