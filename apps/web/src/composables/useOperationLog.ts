/**
 * @file useOperationLog.ts
 * @description 操作日志相关 Composable
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRef } from 'vue'
import { unref } from 'vue'
import {
  exportOperationLogs,
  getOperationLogDetail,
  getOperationLogs,
} from '@/api/log'
import type {
  OperationLog,
  OperationModule,
  OperationType,
  PageParams,
} from '@/api/types'
import { queryKeys } from '@/api/queryKeys'

type DateRange = [Date, Date]

interface OperationLogParams extends PageParams {
  operatorId?: string
  operatorName?: string
  operationType?: OperationType
  module?: OperationModule
  dateRange?: DateRange | null
}

/**
 * 获取操作日志列表
 */
export function useOperationLogs(params: MaybeRef<OperationLogParams>) {
  return useQuery({
    queryKey: queryKeys.operationLog.list(params),
    queryFn: () => getOperationLogs(unref(params)),
  })
}

/**
 * 获取操作日志详情
 */
export function useOperationLogDetail(id: MaybeRef<string>) {
  return useQuery({
    queryKey: queryKeys.operationLog.detail(unref(id)),
    queryFn: () => getOperationLogDetail(unref(id)),
    enabled: () => !!unref(id),
  })
}

/**
 * 导出操作日志
 */
export function useExportOperationLogs() {
  return useMutation({
    mutationFn: async (params: Omit<OperationLogParams, 'page' | 'pageSize'>) => {
      const blob = await exportOperationLogs(params)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `操作日志_${new Date().getTime()}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    },
  })
}
