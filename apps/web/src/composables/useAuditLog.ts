/**
 * @file useAuditLog.ts
 * @description 审计日志 Composable (BFF)
 */

import { useMutation, useQuery } from '@tanstack/vue-query'
import type { MaybeRef } from 'vue'
import { unref } from 'vue'
import { getAuditLogDetail, getAuditLogs, exportAuditLogsCsv } from '@/api/audit'
import type { AuditAction, AuditResult } from '@/api/types'
import { queryKeys } from '@/api/queryKeys'
import type { AuditQuery } from '@/api/audit'

/**
 * 获取审计日志列表
 */
export function useAuditLogs(params: MaybeRef<AuditQuery>) {
  return useQuery({
    queryKey: queryKeys.auditLog.list(params),
    queryFn: () => getAuditLogs(unref(params)),
  })
}

/**
 * 获取审计日志详情
 */
export function useAuditLogDetail(id: MaybeRef<string>) {
  return useQuery({
    queryKey: queryKeys.auditLog.detail(unref(id)),
    queryFn: () => getAuditLogDetail(unref(id)),
    enabled: () => !!unref(id),
  })
}

/**
 * 导出审计日志
 */
export function useExportAuditLogs() {
  return useMutation({
    mutationFn: async (params: Omit<AuditQuery, 'page' | 'pageSize'>) => {
      const blob = await exportAuditLogsCsv(params)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `审计日志_${new Date().getTime()}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    },
  })
}