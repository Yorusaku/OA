/**
 * useApprovalLaunch 业务逻辑测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useWorkflowList } from '@/composables/useWorkflowList'
import { useWorkflowSchema } from '@/composables/useWorkflowSchema'
import { useUserStore } from '@/stores/user'
import { useApprovalLaunch } from '../composables/useApprovalLaunch'
import { useApprovalSubmit } from '@/views/approval/composables/useApprovalSubmit'
import { useRouter } from 'vue-router'

const { messageMocks, boxMocks } = vi.hoisted(() => ({
  messageMocks: {
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
  boxMocks: {
    confirm: vi.fn().mockResolvedValue('confirm'),
  },
}))

vi.mock('@/composables/useWorkflowList', () => ({
  useWorkflowList: vi.fn(),
}))

vi.mock('@/composables/useWorkflowSchema', () => ({
  useWorkflowSchema: vi.fn(),
}))

vi.mock('@/views/approval/composables/useApprovalSubmit', () => ({
  useApprovalSubmit: vi.fn(),
}))

vi.mock('@/stores/user', () => ({
  useUserStore: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: messageMocks,
  ElMessageBox: boxMocks,
}))

describe('useApprovalLaunch', () => {
  const mockPush = vi.fn()
  const mockSubmitApproval = vi.fn()

  const mockWorkflowList = [
    {
      id: 'wf-leave-001',
      name: '请假申请',
      description: '员工请病假、事假、年假等',
      isDefault: true,
      schemaId: 'leave-form',
    },
    {
      id: 'wf-reimbursement-001',
      name: '报销申请',
      description: '差旅费、业务招待费等报销',
      isDefault: false,
      schemaId: 'expense-form',
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

  beforeEach(() => {
    vi.clearAllMocks()
    boxMocks.confirm.mockResolvedValue('confirm')

    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as any)

    vi.mocked(useUserStore).mockReturnValue({
      userInfo: {
        id: 'u-001',
        name: '测试用户',
      },
    } as any)

    vi.mocked(useWorkflowList).mockReturnValue({
      data: ref(mockWorkflowList),
      isLoading: ref(false),
    } as any)

    vi.mocked(useWorkflowSchema).mockReturnValue({
      data: ref(mockLeaveSchema),
      isLoading: ref(false),
    } as any)

    mockSubmitApproval.mockResolvedValue({ id: 'new-approval-id' })
    vi.mocked(useApprovalSubmit).mockReturnValue({
      isLoading: ref(false),
      submitApproval: mockSubmitApproval,
    } as any)
  })

  it('应该返回正确的初始状态', () => {
    const result = useApprovalLaunch()

    expect(result.workflowList.value).toHaveLength(2)
    expect(result.selectedWorkflow.value).toBeUndefined()
    expect(result.formSchema.value).toEqual(mockLeaveSchema)
    expect(result.isWorkflowLoading.value).toBe(false)
    expect(result.isSchemaLoading.value).toBe(false)
  })

  it('应该支持表单数据缓存功能', async () => {
    const result = useApprovalLaunch()
    const setValues = vi.fn()
    const getValues = vi.fn()
      .mockReturnValueOnce({ leaveType: 'sick', days: 2 })
      .mockReturnValueOnce({ amount: 1200 })

    result.dynamicFormRef.value = {
      getValues,
      setValues,
    }

    await result.selectWorkflow(mockWorkflowList[0] as any)
    await result.selectWorkflow(mockWorkflowList[1] as any)
    await result.selectWorkflow(mockWorkflowList[0] as any)

    expect(setValues).toHaveBeenCalledWith({ leaveType: 'sick', days: 2 })
  })

  it('应该支持流程切换并更新选中项', async () => {
    const result = useApprovalLaunch()

    await result.selectWorkflow(mockWorkflowList[1] as any)

    expect(result.selectedWorkflow.value?.id).toBe('wf-reimbursement-001')
    expect(result.selectedWorkflow.value?.name).toBe('报销申请')
  })

  it('应该正确调用 submitApproval', async () => {
    const result = useApprovalLaunch()

    await result.selectWorkflow(mockWorkflowList[0] as any)
    result.dynamicFormRef.value = {
      validate: vi.fn().mockResolvedValue(true),
      getValues: vi.fn().mockReturnValue({ leaveType: 'sick', days: 1 }),
    }

    await result.handleSubmit()

    expect(mockSubmitApproval).toHaveBeenCalledTimes(1)
    expect(mockSubmitApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'create',
        data: expect.objectContaining({
          type: 'leave',
          applicant: '测试用户',
        }),
      }),
    )
    expect(mockPush).toHaveBeenCalledWith('/approval/mine')
  })

  it('校验失败时不应提交审批', async () => {
    const result = useApprovalLaunch()
    await result.selectWorkflow(mockWorkflowList[0] as any)
    result.dynamicFormRef.value = {
      validate: vi.fn().mockResolvedValue(false),
      getValues: vi.fn().mockReturnValue({}),
    }

    await result.handleSubmit()

    expect(messageMocks.warning).toHaveBeenCalled()
    expect(mockSubmitApproval).not.toHaveBeenCalled()
  })
})
