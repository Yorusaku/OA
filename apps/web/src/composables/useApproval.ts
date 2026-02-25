/**
 * @file useApproval.ts
 * @description 审批相关 Vue Query Hooks
 * 封装审批业务的数据获取和突变操作
 */

import type { MaybeRef } from 'vue'
import type { PageParams } from '@/api/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
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
 * @param params - 查询参数（页码、页数、状态）
 * @returns useQuery 返回值（data、isLoading、error 等）
 * @usage const { data, isLoading } = useApprovalList({ page: 1, pageSize: 10 })
 */
export function useApprovalList(params: MaybeRef<PageParams & { status?: string }>) {
  return useQuery({
    queryKey: computed(() => queryKeys.approval.list(unref(params))),
    queryFn: () => getApprovalList(unref(params)),
    staleTime: 30 * 1000, // 30 秒缓存，避免频繁刷新
    retry: 1, // 失败重试 1 次
  })
}

/**
 * 获取审批详情
 * @param id - 审批 ID
 * @returns useQuery 返回值
 * @usage const { data } = useApprovalDetail(approvalId)
 */
export function useApprovalDetail(id: MaybeRef<string>) {
  return useQuery({
    queryKey: computed(() => queryKeys.approval.detail(unref(id))),
    queryFn: () => getApprovalDetail(unref(id)),
    enabled: computed(() => !!unref(id)), // 有 ID 时才启用查询
    staleTime: 5 * 60 * 1000, // 5 分钟缓存
  })
}

/**
 * 获取工作台统计数据
 * @returns useQuery 返回值
 * @description 用于首页工作台显示待办、已办等统计
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
 * @returns useMutation 返回值（mutate、isPending 等）
 * @usage const { mutate } = useSubmitApproval(); mutate(formData)
 */
export function useSubmitApproval() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: submitApproval,
    onSuccess: () => {
      // 提交成功后刷新相关查询缓存
      queryClient.invalidateQueries({ queryKey: queryKeys.approval.list() })
      queryClient.invalidateQueries({ queryKey: queryKeys.approval.stats })
    },
  })
}
