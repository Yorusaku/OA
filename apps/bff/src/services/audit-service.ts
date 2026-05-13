import type { AuditAction, AuditEvent, AuditResult, AuditSummaryLink, RuntimeState } from '../domain'
import { nowText, parseTime, uid } from '../utils'

export interface AuditWriteInput {
  operatorId?: string
  operatorName?: string
  module: AuditEvent['module']
  action: AuditAction
  result: AuditResult
  targetType: string
  targetId: string
  summary: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  traceId: string
  ip?: string
  userAgent?: string
  durationMs?: number
  links?: AuditSummaryLink[]
  metadata?: Record<string, unknown>
}

export interface AuditQuery {
  page: number
  pageSize: number
  operatorName?: string
  action?: AuditAction
  module?: AuditEvent['module']
  result?: AuditResult
  dateRange?: [Date, Date] | null
}

export function writeAuditLog(state: RuntimeState, input: AuditWriteInput): AuditEvent {
  const event: AuditEvent = {
    id: uid('audit'),
    operatorId: input.operatorId?.trim() || 'system',
    operatorName: input.operatorName?.trim() || 'system',
    operatedAt: nowText(new Date()),
    module: input.module,
    action: input.action,
    result: input.result,
    targetType: input.targetType,
    targetId: input.targetId,
    summary: input.summary,
    before: input.before ?? null,
    after: input.after ?? null,
    traceId: input.traceId,
    ip: input.ip?.trim() || '-',
    userAgent: input.userAgent?.trim() || '-',
    durationMs: Math.max(0, Math.floor(input.durationMs ?? 0)),
    links: input.links?.length ? input.links : undefined,
    metadata: input.metadata,
  }
  state.auditLogs.unshift(event)
  return event
}

export function listAuditLogs(state: RuntimeState, query: AuditQuery) {
  let filtered = [...state.auditLogs]
  if (query.operatorName?.trim()) {
    const keyword = query.operatorName.trim().toLowerCase()
    filtered = filtered.filter(item => item.operatorName.toLowerCase().includes(keyword))
  }
  if (query.action)
    filtered = filtered.filter(item => item.action === query.action)
  if (query.module)
    filtered = filtered.filter(item => item.module === query.module)
  if (query.result)
    filtered = filtered.filter(item => item.result === query.result)
  if (query.dateRange) {
    const [start, end] = query.dateRange
    filtered = filtered.filter((item) => {
      const operatedAt = parseTime(item.operatedAt)
      return operatedAt >= start && operatedAt <= end
    })
  }

  filtered.sort((a, b) => parseTime(b.operatedAt).getTime() - parseTime(a.operatedAt).getTime())
  const page = Math.max(1, Number(query.page || 1))
  const pageSize = Math.max(1, Number(query.pageSize || 10))
  const start = (page - 1) * pageSize
  const end = start + pageSize

  return {
    list: filtered.slice(start, end),
    total: filtered.length,
    page,
    pageSize,
  }
}

export function getAuditLogDetail(state: RuntimeState, id: string): AuditEvent | null {
  return state.auditLogs.find(item => item.id === id) || null
}

export function exportAuditLogsCsv(state: RuntimeState, query: Omit<AuditQuery, 'page' | 'pageSize'>): string {
  const result = listAuditLogs(state, {
    page: 1,
    pageSize: 10000,
    ...query,
  })
  const headers = [
    '审计ID',
    '操作人',
    '模块',
    '动作',
    '结果',
    '对象类型',
    '对象ID',
    '摘要',
    'traceId',
    'IP',
    'UA',
    '耗时(ms)',
    '时间',
  ]
  const rows = result.list.map(item => [
    item.id,
    item.operatorName,
    item.module,
    item.action,
    item.result,
    item.targetType,
    item.targetId,
    item.summary,
    item.traceId,
    item.ip,
    item.userAgent,
    String(item.durationMs),
    item.operatedAt,
  ])

  return [headers.join(','), ...rows.map(row => row.map(escapeCsvCell).join(','))].join('\n')
}

function escapeCsvCell(value: string): string {
  const text = String(value ?? '')
  if (text.includes(',') || text.includes('\n') || text.includes('"'))
    return `"${text.replace(/"/g, '""')}"`
  return text
}
