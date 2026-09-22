/**
 * useApprovalLaunch 草稿能力测试（保存 / 列表 / 回填 / 删除）
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useWorkflowList } from '@/composables/useWorkflowList'
import { useWorkflowSchema } from '@/composables/useWorkflowSchema'
import { useUserStore } from '@/stores/user'
import { useApprovalLaunch } from '../composables/useApprovalLaunch'
import { useApprovalSubmit } from '@/views/approval/composables/useApprovalSubmit'
import { useRouter } from 'vue-router'
import { createDraft, listDrafts, removeDraft } from '@/api/draft'
import type { ApprovalDraft } from '@/api/types'

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

vi.mock('@/api/draft', () => ({
  createDraft: vi.fn(),
  listDrafts: vi.fn(),
  removeDraft: vi.fn(),
}))

describe('useApprovalLaunch 草稿能力', () => {
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

  beforeEach(() => {
    vi.clearAllMocks()
    boxMocks.confirm.mockResolvedValue('confirm')
    vi.mocked(listDrafts).mockResolvedValue([])
    vi.mocked(createDraft).mockResolvedValue({ id: 'draft-1' } as ApprovalDraft)
    vi.mocked(removeDraft).mockResolvedValue({ success: true })

    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any)
    vi.mocked(useUserStore).mockReturnValue({
      userInfo: { id: 'u-001', name: '测试用户' },
    } as any)
    vi.mocked(useWorkflowList).mockReturnValue({
      data: ref(mockWorkflowList),
      isLoading: ref(false),
    } as any)
    vi.mocked(useWorkflowSchema).mockReturnValue({
      data: ref({ fields: [] }),
      isLoading: ref(false),
    } as any)
    mockSubmitApproval.mockResolvedValue({ id: 'new-approval-id' })
    vi.mocked(useApprovalSubmit).mockReturnValue({
      isLoading: ref(false),
      submitApproval: mockSubmitApproval,
    } as any)
  })

  it('未选择流程时保存草稿应提示且不调用接口', async () => {
    const result = useApprovalLaunch()
    await result.saveDraft()

    expect(messageMocks.warning).toHaveBeenCalled()
    expect(createDraft).not.toHaveBeenCalled()
  })

  it('保存草稿：携带表单数据、流程与申请人信息', async () => {
    const result = useApprovalLaunch()
    await result.selectWorkflow(mockWorkflowList[0] as any)
    result.dynamicFormRef.value = {
      getValues: vi.fn().mockReturnValue({ leaveType: 'sick', days: 2, reason: '事假' }),
    }

    await result.saveDraft()

    expect(createDraft).toHaveBeenCalledTimes(1)
    expect(createDraft).toHaveBeenCalledWith(expect.objectContaining({
      workflowId: 'wf-leave-001',
      workflowType: '请假申请',
      title: '请假申请 - 草稿',
      applicant: '测试用户',
      formData: { leaveType: 'sick', days: 2, reason: '事假' },
      amount: 2,
      description: '事假',
    }))
    expect(messageMocks.success).toHaveBeenCalled()
    // 保存后刷新草稿列表
    expect(listDrafts).toHaveBeenCalled()
  })

  it('loadDrafts：填充草稿列表', async () => {
    const drafts: ApprovalDraft[] = [
      {
        id: 'draft-a',
        title: '请假申请 - 草稿',
        applicant: '测试用户',
        workflowId: 'wf-leave-001',
        formData: { leaveType: 'annual', days: 1 },
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T10:00:00.000Z',
      },
    ]
    vi.mocked(listDrafts).mockResolvedValue(drafts)

    const result = useApprovalLaunch()
    await result.loadDrafts()

    expect(result.drafts.value).toHaveLength(1)
    expect(result.drafts.value[0]?.id).toBe('draft-a')
  })

  it('loadDraft：回填表单数据并关闭草稿面板', async () => {
    const draft: ApprovalDraft = {
      id: 'draft-a',
      title: '请假申请 - 草稿',
      applicant: '测试用户',
      workflowId: 'wf-leave-001',
      formData: { leaveType: 'annual', days: 1 },
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    }

    const result = useApprovalLaunch()
    const setValues = vi.fn()
    result.dynamicFormRef.value = { setValues }
    result.showDraftPanel.value = true

    await result.loadDraft(draft)

    expect(setValues).toHaveBeenCalledWith({ leaveType: 'annual', days: 1 })
    expect(result.selectedWorkflow.value?.id).toBe('wf-leave-001')
    expect(result.showDraftPanel.value).toBe(false)
    expect(messageMocks.success).toHaveBeenCalled()
  })

  it('removeDraftItem：调用删除接口并刷新列表', async () => {
    const result = useApprovalLaunch()
    await result.removeDraftItem('draft-a')

    expect(removeDraft).toHaveBeenCalledWith('draft-a')
    expect(listDrafts).toHaveBeenCalled()
    expect(messageMocks.success).toHaveBeenCalled()
  })
})