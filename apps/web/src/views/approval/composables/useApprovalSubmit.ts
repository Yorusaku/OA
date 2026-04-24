/**
 * Approval submit composable.
 * - create: 发起审批（写入 mock 数据）
 * - process: 审批处理（支持 approve/reject/transfer/addSign/remind/withdraw/cancel）
 */

import type { Ref } from 'vue'
import type { ApprovalRecord } from '@/api/types'
import { useQueryClient } from '@tanstack/vue-query'
import { ElMessage } from 'element-plus'
import { ref } from 'vue'
import { processApproval, submitApproval as createApproval } from '@/api/approval'
import { queryKeys } from '@/api/queryKeys'

const MOCK_LATENCY_MS = 600
const SUBMIT_TIMEOUT_MS = 10_000
type ProcessOperation = 'approve' | 'reject' | 'transfer' | 'addSign' | 'remind' | 'withdraw' | 'cancel'

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
    const timer = setTimeout(() => reject(new Error('submit-timeout')), ms)
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

function getOperationSuccessMessage(operation: ProcessOperation): string {
  switch (operation) {
    case 'approve':
      return '审批通过成功'
    case 'reject':
      return '审批驳回成功'
    case 'transfer':
      return '审批转交成功'
    case 'addSign':
      return '加签成功'
    case 'remind':
      return '催办提醒已发送'
    case 'withdraw':
      return '审批撤回成功'
    case 'cancel':
      return '审批取消成功'
    default:
      return '操作成功'
  }
}

export const useApprovalSubmit = (): UseApprovalSubmitReturn => {
  const queryClient = useQueryClient()
  const isLoading = ref(false)

  const submitApproval = async (payload: SubmitPayload): Promise<ApprovalRecord | void> => {
    if (isLoading.value)
      return

    isLoading.value = true

    try {
      if (payload.action === 'create') {
        await withTimeout(delay(MOCK_LATENCY_MS), SUBMIT_TIMEOUT_MS)
        const record = await withTimeout(createApproval(payload.data), SUBMIT_TIMEOUT_MS)

        const invalidateTasks: Array<Promise<unknown>> = [
          queryClient.invalidateQueries({ queryKey: queryKeys.approval.list() }),
          queryClient.invalidateQueries({ queryKey: queryKeys.approval.stats }),
          queryClient.invalidateQueries({ queryKey: queryKeys.approval.notifications() }),
        ]

        await Promise.allSettled(invalidateTasks)
        ElMessage.success('审批提交成功')
        return record
      }

      if (payload.action === 'process') {
        await withTimeout(processApproval({
          id: payload.id,
          action: payload.operation,
          comment: payload.comment,
          commentText: payload.commentText,
          attachments: payload.attachments,
          targetUserId: payload.targetUserId,
          targetUserName: payload.targetUserName,
          operatorId: payload.operatorId,
          operatorName: payload.operatorName,
        }), SUBMIT_TIMEOUT_MS)

        const invalidateTasks: Array<Promise<unknown>> = [
          queryClient.invalidateQueries({ queryKey: queryKeys.approval.list() }),
          queryClient.invalidateQueries({ queryKey: queryKeys.approval.stats }),
          queryClient.invalidateQueries({ queryKey: queryKeys.approval.detail(payload.id) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.approval.notifications() }),
        ]

        await Promise.allSettled(invalidateTasks)
        ElMessage.success(getOperationSuccessMessage(payload.operation))
      }
    }
    catch (error) {
      if (error instanceof Error && error.message === 'submit-timeout')
        ElMessage.error('提交超时，请重试')
      else if (error instanceof Error && error.message === 'approval-not-found')
        ElMessage.error('审批单不存在或已被删除')
      else
        ElMessage.error('操作失败，请重试')

      throw error
    }
    finally {
      isLoading.value = false
    }
  }

  return { isLoading, submitApproval }
}
