/**
 * @file log.ts
 * @description 日志相关 API（登录日志、操作日志）
 */

import type {
  LoginLog,
  LoginStatus,
  OperationLog,
  OperationModule,
  OperationStatus,
  OperationType,
  PageParams,
  PageResult,
} from './types'
import { mockLoginLogs, mockOperationLogs } from './mock'

const LIST_DELAY_MS = 500
const RECORD_DELAY_MS = 200

type DateRange = [Date, Date]

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

function toTimestampId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatDateTime(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  const second = `${date.getSeconds()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function parseDateTime(value?: string): Date {
  if (!value)
    return new Date()

  const parsed = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime()))
    return new Date()
  return parsed
}

/**
 * 获取浏览器信息
 */
function getBrowserInfo(): { browser: string, os: string, device: string } {
  const ua = navigator.userAgent
  let browser = 'Unknown'
  let os = 'Unknown'
  let device = 'PC'

  // 检测浏览器
  if (ua.includes('Chrome') && !ua.includes('Edg'))
    browser = 'Chrome'
  else if (ua.includes('Safari') && !ua.includes('Chrome'))
    browser = 'Safari'
  else if (ua.includes('Firefox'))
    browser = 'Firefox'
  else if (ua.includes('Edg'))
    browser = 'Edge'

  // 检测操作系统
  if (ua.includes('Windows'))
    os = 'Windows'
  else if (ua.includes('Mac'))
    os = 'macOS'
  else if (ua.includes('Linux'))
    os = 'Linux'
  else if (ua.includes('Android'))
    os = 'Android'
  else if (ua.includes('iOS'))
    os = 'iOS'

  // 检测设备类型
  if (ua.includes('Mobile'))
    device = 'Mobile'
  else if (ua.includes('Tablet'))
    device = 'Tablet'

  return { browser, os, device }
}

/**
 * 获取登录日志列表
 */
export async function getLoginLogs(params: PageParams & {
  username?: string
  status?: LoginStatus
  dateRange?: DateRange | null
}): Promise<PageResult<LoginLog>> {
  await sleep(LIST_DELAY_MS)

  let filtered = [...mockLoginLogs]

  // 按用户名筛选
  if (params.username) {
    const keyword = params.username.toLowerCase()
    filtered = filtered.filter(item => item.username.toLowerCase().includes(keyword))
  }

  // 按状态筛选
  if (params.status) {
    filtered = filtered.filter(item => item.status === params.status)
  }

  // 按日期范围筛选
  if (params.dateRange && params.dateRange.length === 2) {
    const [start, end] = params.dateRange
    filtered = filtered.filter((item) => {
      const loginTime = parseDateTime(item.loginTime)
      return loginTime >= start && loginTime <= end
    })
  }

  // 按登录时间倒序排序
  filtered.sort((a, b) => parseDateTime(b.loginTime).getTime() - parseDateTime(a.loginTime).getTime())

  const total = filtered.length
  const start = (params.page - 1) * params.pageSize
  const end = start + params.pageSize
  const list = filtered.slice(start, end)

  return {
    list,
    total,
    page: params.page,
    pageSize: params.pageSize,
  }
}

/**
 * 记录登录日志
 */
export async function recordLoginLog(data: Omit<LoginLog, 'id' | 'loginTime'>): Promise<void> {
  await sleep(RECORD_DELAY_MS)

  const { browser, os, device } = getBrowserInfo()

  const newLog: LoginLog = {
    ...data,
    id: toTimestampId('LOGIN'),
    loginTime: formatDateTime(new Date()),
    browser: data.browser || browser,
    os: data.os || os,
    device: data.device || device,
    userAgent: data.userAgent || navigator.userAgent,
  }

  mockLoginLogs.unshift(newLog)
}

/**
 * 导出登录日志（模拟）
 */
export async function exportLoginLogs(params: {
  username?: string
  status?: LoginStatus
  dateRange?: DateRange | null
}): Promise<Blob> {
  await sleep(1000)

  // 获取筛选后的数据
  const result = await getLoginLogs({
    page: 1,
    pageSize: 10000,
    ...params,
  })

  // 生成 CSV 内容
  const headers = ['用户名', 'IP地址', '登录地点', '设备', '操作系统', '浏览器', '状态', '失败原因', '登录时间', '登出时间', '在线时长(秒)']
  const rows = result.list.map(log => [
    log.username,
    log.ipAddress,
    log.location || '-',
    log.device,
    log.os,
    log.browser,
    log.status === 'success' ? '成功' : '失败',
    log.failReason || '-',
    log.loginTime,
    log.logoutTime || '-',
    log.duration?.toString() || '-',
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n')

  return new Blob([`﻿${csvContent}`], { type: 'text/csv;charset=utf-8;' })
}

// ==================== 操作日志 API ====================

/**
 * 获取操作日志列表
 */
export async function getOperationLogs(params: PageParams & {
  operatorId?: string
  operatorName?: string
  operationType?: OperationType
  module?: OperationModule
  dateRange?: DateRange | null
}): Promise<PageResult<OperationLog>> {
  await sleep(LIST_DELAY_MS)

  let filtered = [...mockOperationLogs]

  // 按操作人ID筛选
  if (params.operatorId) {
    filtered = filtered.filter(item => item.operatorId === params.operatorId)
  }

  // 按操作人名称筛选
  if (params.operatorName) {
    const keyword = params.operatorName.toLowerCase()
    filtered = filtered.filter(item => item.operatorName.toLowerCase().includes(keyword))
  }

  // 按操作类型筛选
  if (params.operationType) {
    filtered = filtered.filter(item => item.operationType === params.operationType)
  }

  // 按模块筛选
  if (params.module) {
    filtered = filtered.filter(item => item.module === params.module)
  }

  // 按日期范围筛选
  if (params.dateRange && params.dateRange.length === 2) {
    const [start, end] = params.dateRange
    filtered = filtered.filter((item) => {
      const operatedAt = parseDateTime(item.operatedAt)
      return operatedAt >= start && operatedAt <= end
    })
  }

  // 按操作时间倒序排序
  filtered.sort((a, b) => parseDateTime(b.operatedAt).getTime() - parseDateTime(a.operatedAt).getTime())

  const total = filtered.length
  const start = (params.page - 1) * params.pageSize
  const end = start + params.pageSize
  const list = filtered.slice(start, end)

  return {
    list,
    total,
    page: params.page,
    pageSize: params.pageSize,
  }
}

/**
 * 获取操作日志详情
 */
export async function getOperationLogDetail(id: string): Promise<OperationLog | null> {
  await sleep(RECORD_DELAY_MS)
  return mockOperationLogs.find(log => log.id === id) || null
}

/**
 * 导出操作日志（模拟）
 */
export async function exportOperationLogs(params: {
  operatorName?: string
  operationType?: OperationType
  module?: OperationModule
  dateRange?: DateRange | null
}): Promise<Blob> {
  await sleep(1000)

  // 获取筛选后的数据
  const result = await getOperationLogs({
    page: 1,
    pageSize: 10000,
    ...params,
  })

  // 生成 CSV 内容
  const headers = ['操作人', '操作类型', '操作模块', '操作内容', 'IP地址', '操作时间', '耗时(ms)', '状态', '错误信息']
  const rows = result.list.map(log => [
    log.operatorName,
    log.operationType,
    log.module,
    log.operationContent,
    log.ipAddress || '-',
    log.operatedAt,
    log.duration?.toString() || '-',
    log.status === 'success' ? '成功' : '失败',
    log.errorMessage || '-',
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n')

  return new Blob([`﻿${csvContent}`], { type: 'text/csv;charset=utf-8;' })
}
