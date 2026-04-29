import type { ApprovalRecord } from '@/api/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ElMessage } from 'element-plus'
import { processApproval, submitApproval as createApproval } from '@/api/approval'
import { useQueryClient } from '@tanstack/vue-query'
import { useUserStore } from '@/stores/user'
import { useApprovalSubmit } from '../composables/useApprovalSubmit'

vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: vi.fn(),
}))

vi.mock('@/api/approval', () => ({
  processApproval: vi.fn(),
  submitApproval: vi.fn(),
}))

vi.mock('@/stores/user', () => ({
  useUserStore: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

function createDeferred<T>() {
  let resolve: ((value: T | PromiseLike<T>) => void) | null = null
  let reject: ((reason?: unknown) => void) | null = null
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return {
    promise,
    resolve: (value: T) => resolve?.(value),
    reject: (reason?: unknown) => reject?.(reason),
  }
}

describe('useApprovalSubmit', () => {
  const invalidateQueries = vi.fn().mockResolvedValue(undefined)

  const createData: Omit<ApprovalRecord, 'id' | 'status' | 'applyTime'> = {
    title: '请假审批',
    type: 'leave',
    applicant: '张三',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    vi.mocked(useUserStore).mockReturnValue({
      userInfo: {
        id: 'user-001',
        name: 'admin',
      },
    } as any)
    vi.mocked(useQueryClient).mockReturnValue({
      invalidateQueries,
    } as any)
  })

  it('create：应提交成功并统一刷新列表/统计/通知', async () => {
    vi.useFakeTimers()
    const mockRecord = {
      id: 'APPROVE-TEST-001',
      status: 'pending',
      applyTime: '2026-04-29 12:00:00',
      ...createData,
    } as ApprovalRecord
    vi.mocked(createApproval).mockResolvedValue(mockRecord)

    const { submitApproval } = useApprovalSubmit()
    const submitPromise = submitApproval({ action: 'create', data: createData })

    await vi.advanceTimersByTimeAsync(600)
    const result = await submitPromise

    expect(result).toEqual(mockRecord)
    expect(createApproval).toHaveBeenCalledWith(createData)
    expect(invalidateQueries).toHaveBeenCalledTimes(3)
    expect(ElMessage.success).toHaveBeenCalledWith('审批提交成功')
  })

  it('process：7 类动作应正确映射参数、提示并刷新四类查询', async () => {
    vi.mocked(processApproval).mockResolvedValue({} as ApprovalRecord)
    const { submitApproval } = useApprovalSubmit()

    const cases = [
      { operation: 'approve', success: '审批通过成功' },
      { operation: 'reject', success: '审批驳回成功' },
      { operation: 'transfer', success: '审批转交成功', targetUserId: 'user-002', targetUserName: '李四' },
      { operation: 'addSign', success: '加签成功', targetUserId: 'user-003', targetUserName: '王五' },
      { operation: 'remind', success: '催办提醒已发送' },
      { operation: 'withdraw', success: '审批撤回成功' },
      { operation: 'cancel', success: '审批取消成功' },
    ] as const

    for (const item of cases) {
      vi.clearAllMocks()
      await submitApproval({
        action: 'process',
        id: 'APPROVE-TEST-002',
        operation: item.operation,
        targetUserId: item.targetUserId,
        targetUserName: item.targetUserName,
      })

      expect(processApproval).toHaveBeenCalledTimes(1)
      expect(processApproval).toHaveBeenCalledWith(expect.objectContaining({
        id: 'APPROVE-TEST-002',
        action: item.operation,
      }))
      expect(invalidateQueries).toHaveBeenCalledTimes(4)
      expect(ElMessage.success).toHaveBeenCalledWith(item.success)
    }
  })

  it('process：transfer/addSign 缺少目标人时应拦截并提示', async () => {
    const { submitApproval } = useApprovalSubmit()

    await expect(submitApproval({
      action: 'process',
      id: 'APPROVE-TEST-003',
      operation: 'transfer',
    })).rejects.toThrowError('approval-target-user-required')

    expect(processApproval).not.toHaveBeenCalled()
    expect(ElMessage.warning).toHaveBeenCalledWith('请选择目标处理人后再提交')
  })

  it('process：submit-timeout 应提示超时', async () => {
    vi.useFakeTimers()
    vi.mocked(processApproval).mockReturnValue(new Promise(() => {}))
    const { submitApproval } = useApprovalSubmit()

    const submitPromise = submitApproval({
      action: 'process',
      id: 'APPROVE-TEST-004',
      operation: 'approve',
    })
    const assertion = expect(submitPromise).rejects.toThrowError('submit-timeout')

    await vi.advanceTimersByTimeAsync(10_000)
    await assertion
    expect(ElMessage.error).toHaveBeenCalledWith('提交超时，请重试')
  })

  it('process：approval-not-found 应提示审批单不存在', async () => {
    vi.mocked(processApproval).mockRejectedValue(new Error('approval-not-found'))
    const { submitApproval } = useApprovalSubmit()

    await expect(submitApproval({
      action: 'process',
      id: 'APPROVE-TEST-005',
      operation: 'approve',
    })).rejects.toThrowError('approval-not-found')

    expect(ElMessage.error).toHaveBeenCalledWith('审批单不存在或已被删除')
  })

  it('并发提交：同一时刻重复调用应复用同一 promise 并仅发起一次请求', async () => {
    vi.useFakeTimers()
    const deferred = createDeferred<ApprovalRecord>()
    vi.mocked(createApproval).mockReturnValue(deferred.promise)
    const { submitApproval } = useApprovalSubmit()

    const firstSubmit = submitApproval({ action: 'create', data: createData })
    const secondSubmit = submitApproval({ action: 'create', data: createData })

    await vi.advanceTimersByTimeAsync(600)
    expect(createApproval).toHaveBeenCalledTimes(1)

    deferred.resolve({
      id: 'APPROVE-TEST-006',
      status: 'pending',
      applyTime: '2026-04-29 13:00:00',
      ...createData,
    } as ApprovalRecord)

    await expect(Promise.all([firstSubmit, secondSubmit])).resolves.toEqual([
      expect.objectContaining({ id: 'APPROVE-TEST-006' }),
      expect.objectContaining({ id: 'APPROVE-TEST-006' }),
    ])
  })

  it('process：未显式传入操作人时应自动注入当前登录人', async () => {
    vi.mocked(processApproval).mockResolvedValue({} as ApprovalRecord)
    const { submitApproval } = useApprovalSubmit()

    await submitApproval({
      action: 'process',
      id: 'APPROVE-TEST-007',
      operation: 'approve',
    })

    expect(processApproval).toHaveBeenCalledWith(expect.objectContaining({
      operatorId: 'user-001',
      operatorName: 'admin',
    }))
  })
})
