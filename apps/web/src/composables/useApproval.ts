import type { MaybeRef } from 'vue'
import type { PageParams } from '@/api/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
/**
 * 审批相关 Vue Query Hooks
 */
import { computed, unref } from 'vue'
import {
  getApprovalDetail,
  getApprovalList,
  getWorkbenchStats,
  submitApproval,
} from '@/api/approval'
import { queryKeys } from '@/api/queryKeys'

/**
 * 获取审批列表
 * 优化：staleTime 设为 30 秒，避免频繁刷新
 */
export function useApprovalList(params: MaybeRef<PageParams & { status?: string }>) {
  return useQuery({
    queryKey: computed(() => queryKeys.approval.list(unref(params))),
    queryFn: () => getApprovalList(unref(params)),
    staleTime: 30 * 1000, // 30 秒
    retry: 1,
  })
}

/**
 * 获取审批详情
 */
export function useApprovalDetail(id: MaybeRef<string>) {
  return useQuery({
    queryKey: computed(() => queryKeys.approval.detail(unref(id))),
    queryFn: () => getApprovalDetail(unref(id)),
    enabled: computed(() => !!unref(id)),
    staleTime: 5 * 60 * 1000, // 5 分钟
  })
}

/**
 * 获取工作台统计数据
 * 优化：缓存时间 60 秒，减少重复请求
 */
export function useWorkbenchStats() {
  return useQuery({
    queryKey: queryKeys.approval.stats,
    queryFn: getWorkbenchStats,
    staleTime: 60 * 1000, // 60 秒缓存
    refetchOnWindowFocus: false, // 窗口聚焦时不自动刷新
  })
}

/**
 * 提交审批
 */
export function useSubmitApproval() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: submitApproval,
    onSuccess: () => {
      // 提交成功后刷新相关查询
      queryClient.invalidateQueries({ queryKey: queryKeys.approval.list() })
      queryClient.invalidateQueries({ queryKey: queryKeys.approval.stats })
    },
  })
}
