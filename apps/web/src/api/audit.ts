/**
 * @file audit.ts
 * @description 审计日志 API 封装 (BFF)
 */

import type { AuditAction, AuditEvent, AuditResult, AuditSummaryLink } from '@/api/types'
import { get } from './http'

export interface AuditQuery {
  page: number
  pageSize: number
  operatorName?: string
  action?: string
  module?: string
  result?: string
  dateRange?: [Date, Date] | null
}

export interface AuditPageResult {
  list: AuditEvent[]
  total: number
  page: number
  pageSize: number
}

/**
 * 获取审计日志列表
 */
export function getAuditLogs(params: AuditQuery): Promise<AuditPageResult> {
  const queryParams: Record<string, string> = {
    page: String(params.page),
    pageSize: String(params.pageSize),
  }
  if (params.operatorName) queryParams.operatorName = params.operatorName
  if (params.action) queryParams.action = params.action
  if (params.module) queryParams.module = params.module
  if (params.result) queryParams.result = params.result
  if (params.dateRange && params.dateRange.length === 2) {
    queryParams.dateRange = params.dateRange.map(d => d.toISOString()).join(',')
  }
  return get('/v1/audit/logs', { params: queryParams })
}

/**
 * 获取审计日志详情
 */
export function getAuditLogDetail(id: string): Promise<AuditEvent> {
  return get(`/v1/audit/logs/${id}`)
}

/**
 * 导出审计日志 CSV
 */
export function exportAuditLogsCsv(params: Omit<AuditQuery, 'page' | 'pageSize'>): Promise<Blob> {
  const queryParams: Record<string, string> = {}
  if (params.operatorName) queryParams.operatorName = params.operatorName
  if (params.action) queryParams.action = params.action
  if (params.module) queryParams.module = params.module
  if (params.result) queryParams.result = params.result
  if (params.dateRange && params.dateRange.length === 2) {
    queryParams.dateRange = params.dateRange.map(d => d.toISOString()).join(',')
  }
  return get('/v1/audit/logs/export/csv', { params: queryParams, responseType: 'blob' })
}