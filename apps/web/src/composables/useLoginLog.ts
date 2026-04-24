/**
 * @file useLoginLog.ts
 * @description 登录日志相关 Composables
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRef } from 'vue'
import { unref } from 'vue'
import type { LoginLog, LoginStatus, PageParams, PageResult } from '@/api/types'
import {
  exportLoginLogs,
  getLoginLogs,
  recordLoginLog,
} from '@/api/log'

/**
 * 登录日志查询参数
 */
export interface LoginLogParams extends PageParams {
  username?: string
  status?: LoginStatus
  dateRange?: [Date, Date] | null
}

/**
 * 获取登录日志列表
 */
export function useLoginLogs(params: MaybeRef<LoginLogParams>) {
  return useQuery({
    queryKey: ['loginLogs', params],
    queryFn: () => getLoginLogs(unref(params)),
  })
}

/**
 * 记录登录日志
 */
export function useRecordLoginLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<LoginLog, 'id' | 'loginTime'>) => recordLoginLog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loginLogs'] })
    },
  })
}

/**
 * 导出登录日志
 */
export function useExportLoginLogs() {
  return useMutation({
    mutationFn: (params: {
      username?: string
      status?: LoginStatus
      dateRange?: [Date, Date] | null
    }) => exportLoginLogs(params),
  })
}
