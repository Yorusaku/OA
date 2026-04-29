/**
 * Approval submit composable.
 * - create: 发起审批（写入 mock 数据）
 * - process: 审批处理（支持 approve/reject/transfer/addSign/remind/withdraw/cancel）
 */

import type { Ref } from 'vue'
import type { ApprovalRecord } from '@/api/types'
import type { ProcessApprovalPayload } from '@/api/approval'
import { useQueryClient } from '@tanstack/vue-query'
import { ElMessage } from 'element-plus'
import { ref } from 'vue'
import { processApproval, submitApproval as createApproval } from '@/api/approval'
import { queryKeys } from '@/api/queryKeys'
import { useUserStore } from '@/stores/user'

const MOCK_LATENCY_MS = 600
const SUBMIT_TIMEOUT_MS = 10_000
type ProcessOperation = 'approve' | 'reject' | 'transfer' | 'addSign' | 'remind' | 'withdraw' | 'cancel'
type SubmitErrorCode
  = | 'submit-timeout'
    | 'approval-not-found'
    | 'approval-target-user-required'

interface ProcessOperationConfig {
  successMessage: string
  requiresTargetUser?: boolean
  defaultCommentText?: string
}

interface OperatorIdentity {
  id?: string
  name?: string
}

const PROCESS_OPERATION_CONFIG: Record<ProcessOperation, ProcessOperationConfig> = {
  approve: {
    successMessage: '审批通过成功',
  },
  reject: {
    successMessage: '审批驳回成功',
  },
  transfer: {
    successMessage: '审批转交成功',
    requiresTargetUser: true,
  },
  addSign: {
    successMessage: '加签成功',
    requiresTargetUser: true,
  },
  remind: {
    successMessage: '催办提醒已发送',
    defaultCommentText: '发起催办提醒',
  },
  withdraw: {
    successMessage: '审批撤回成功',
  },
  cancel: {
    successMessage: '审批取消成功',
  },
}

export type SubmitPayload
  = | {
    action: 'create'
    data: Omit<ApprovalRecord, 'id' | 'status' | 'applyTime'>
  }
    | {
      action: 'process'
      id: string
      operation: ProcessOperation
      comment?: unknown
      commentText?: string
      attachments?: string[]
      targetUserId?: string
      targetUserName?: string
      operatorId?: string
      operatorName?: string
    }

export interface UseApprovalSubmitReturn {
  isLoading: Ref<boolean>
  submitApproval: (payload: SubmitPayload) => Promise<ApprovalRecord | void>
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('submit-timeout' satisfies SubmitErrorCode)), ms)
    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

function normalizeTargetUser(value?: string): string | undefined {
  const nextValue = value?.trim()
  return nextValue ? nextValue : undefined
}

function buildProcessPayload(
  payload: Extract<SubmitPayload, { action: 'process' }>,
  defaultOperator: OperatorIdentity,
): ProcessApprovalPayload {
  const config = PROCESS_OPERATION_CONFIG[payload.operation]
  const targetUserId = normalizeTargetUser(payload.targetUserId)
  const targetUserName = normalizeTargetUser(payload.targetUserName)

  if (config.requiresTargetUser && !targetUserId && !targetUserName)
    throw new Error('approval-target-user-required' satisfies SubmitErrorCode)

  return {
    id: payload.id,
    action: payload.operation,
    comment: payload.comment,
    commentText: payload.commentText?.trim() || config.defaultCommentText,
    attachments: payload.attachments,
    targetUserId: targetUserId || targetUserName,
    targetUserName: targetUserName || targetUserId,
    operatorId: payload.operatorId || defaultOperator.id,
    operatorName: payload.operatorName || defaultOperator.name,
  }
}

async function invalidateAfterCreate(queryClient: ReturnType<typeof useQueryClient>): Promise<void> {
  const invalidateTasks: Array<Promise<unknown>> = [
    queryClient.invalidateQueries({ queryKey: queryKeys.approval.list() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.approval.stats }),
    queryClient.invalidateQueries({ queryKey: queryKeys.approval.notifications() }),
  ]

  await Promise.allSettled(invalidateTasks)
}

async function invalidateAfterProcess(queryClient: ReturnType<typeof useQueryClient>, id: string): Promise<void> {
  const invalidateTasks: Array<Promise<unknown>> = [
    queryClient.invalidateQueries({ queryKey: queryKeys.approval.list() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.approval.stats }),
    queryClient.invalidateQueries({ queryKey: queryKeys.approval.detail(id) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.approval.notifications() }),
  ]

  await Promise.allSettled(invalidateTasks)
}

function handleSubmitError(error: unknown): void {
  if (error instanceof Error && error.message === 'submit-timeout')
    ElMessage.error('提交超时，请重试')
  else if (error instanceof Error && error.message === 'approval-not-found')
    ElMessage.error('审批单不存在或已被删除')
  else if (error instanceof Error && error.message === 'approval-target-user-required')
    ElMessage.warning('请选择目标处理人后再提交')
  else
    ElMessage.error('操作失败，请重试')
}

export const useApprovalSubmit = (): UseApprovalSubmitReturn => {
  const queryClient = useQueryClient()
  const userStore = useUserStore()
  const isLoading = ref(false)
  let currentSubmitPromise: Promise<ApprovalRecord | void> | null = null

  const submitApproval = async (payload: SubmitPayload): Promise<ApprovalRecord | void> => {
    if (currentSubmitPromise)
      return currentSubmitPromise

    isLoading.value = true

    currentSubmitPromise = (async () => {
      try {
        if (payload.action === 'create') {
          await withTimeout(delay(MOCK_LATENCY_MS), SUBMIT_TIMEOUT_MS)
          const record = await withTimeout(createApproval(payload.data), SUBMIT_TIMEOUT_MS)

          await invalidateAfterCreate(queryClient)
          ElMessage.success('审批提交成功')
          return record
        }

        if (payload.action === 'process') {
          const processPayload = buildProcessPayload(payload, {
            id: userStore.userInfo?.id,
            name: userStore.userInfo?.name,
          })
          await withTimeout(processApproval(processPayload), SUBMIT_TIMEOUT_MS)

          await invalidateAfterProcess(queryClient, payload.id)
          ElMessage.success(PROCESS_OPERATION_CONFIG[payload.operation].successMessage)
        }
      }
      catch (error) {
        handleSubmitError(error)
        throw error
      }
      finally {
        isLoading.value = false
        currentSubmitPromise = null
      }
    })()

    return currentSubmitPromise
  }

  return { isLoading, submitApproval }
}
