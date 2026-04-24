/**
 * @file useApprovalCC.ts
 * @description 抄送相关 Composable
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRef } from 'vue'
import { unref } from 'vue'
import {
  batchMarkCCAsRead,
  getCCList,
  getCCUnreadCount,
  markCCAsRead,
} from '@/api/approval'
import type {
  ApprovalStatus,
  CCRecord,
  PageParams,
} from '@/api/types'
import { queryKeys } from '@/api/queryKeys'

type DateRange = [Date, Date]

interface CCListParams extends PageParams {
  keyword?: string
  status?: ApprovalStatus
  read?: boolean
  dateRange?: DateRange | null
}

/**
 * 获取抄送列表
 */
export function useCCList(params: MaybeRef<CCListParams>) {
  return useQuery({
    queryKey: queryKeys.cc.list(params),
    queryFn: () => getCCList(unref(params)),
  })
}

/**
 * 获取抄送未读数量
 */
export function useCCUnreadCount() {
  return useQuery({
    queryKey: queryKeys.cc.unreadCount,
    queryFn: getCCUnreadCount,
    refetchInterval: 30000, // 每30秒刷新一次
  })
}

/**
 * 标记抄送为已读
 */
export function useMarkCCAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markCCAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cc.list() })
      queryClient.invalidateQueries({ queryKey: queryKeys.cc.unreadCount })
    },
  })
}

/**
 * 批量标记抄送为已读
 */
export function useBatchMarkCCAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: batchMarkCCAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cc.list() })
      queryClient.invalidateQueries({ queryKey: queryKeys.cc.unreadCount })
    },
  })
}
