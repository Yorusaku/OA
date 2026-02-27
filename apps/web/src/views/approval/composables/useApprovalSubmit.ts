/**
 * useApprovalSubmit - 审批提交逻辑
 * 支持审批通过、驳回等操作
 */

import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { Ref } from 'vue'

/**
 * 提交请求参数类型
 */
export interface SubmitPayload {
  /** 审批状态：approved 或 rejected */
  status: 'approved' | 'rejected'
  /** 提交的表单数据（评论、备注等） */
  comment: Record<string, any>
}

/**
 * 提交响应结果类型
 */
export interface SubmitResult {
  /** 是否成功 */
  success: boolean
  /** 错误消息（失败时） */
  errorMessage?: string
}

/**
 * useApprovalSubmit 返回值类型
 */
export interface UseApprovalSubmitReturn {
  /** 加载状态 */
  isLoading: Ref<boolean>
  /** 提交审批方法 */
  submitApproval: (approvalId: string, payload: SubmitPayload) => Promise<void>
}

export const useApprovalSubmit = (): UseApprovalSubmitReturn => {
  const isLoading = ref(false)

  const submitApproval = async (
    approvalId: string,
    payload: SubmitPayload
  ): Promise<void> => {
    isLoading.value = true
    try {
      // Mock 接口延迟
      await new Promise(resolve => setTimeout(resolve, 600))
      console.log('[Mock API] 提交审批:', approvalId, payload)
    } catch (err) {
      ElMessage.error('操作失败，请重试')
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, submitApproval }
}
