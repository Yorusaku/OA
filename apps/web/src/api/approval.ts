/**
 * @file approval.ts
 * @description 审批相关 API（mock 内存实现）
 */

import type {
  ApprovalAction,
  ApprovalRecord,
  ApprovalStatus,
  ApprovalTrailItem,
  CCRecord,
  MessageRecord,
  MessageType,
  PageParams,
  PageResult,
  WorkbenchStats,
} from './types'
import { mockApprovalRecords, mockCCRecords, mockMessageRecords } from './mock'

const DEFAULT_SLA_HOURS = 48
const LIST_DELAY_MS = 500
const DETAIL_DELAY_MS = 300
const SUBMIT_DELAY_MS = 800
const PROCESS_DELAY_MS = 500
const STATS_DELAY_MS = 400

type DateRange = [Date, Date]

type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface ApprovalNotification {
  id: string
  approvalId: string
  title: string
  content: string
  type: NotificationType
  createdAt: string
}

const approvalNotifications: ApprovalNotification[] = []

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

function plusHours(date: Date, hours: number): Date {
  const copy = new Date(date)
  copy.setHours(copy.getHours() + hours)
  return copy
}

function isOverdue(deadlineAt?: string): boolean {
  if (!deadlineAt)
    return false
  return parseDateTime(deadlineAt).getTime() < Date.now()
}

function normalizeAttachments(input?: string[]): string[] | undefined {
  if (!input?.length)
    return undefined
  const list = input.map(item => item.trim()).filter(Boolean)
  return list.length ? list : undefined
}

function resolveCommentText(payload: ProcessApprovalPayload): string | undefined {
  if (payload.commentText?.trim())
    return payload.commentText.trim()

  if (!payload.comment)
    return undefined

  if (typeof payload.comment === 'string')
    return payload.comment

  if (typeof payload.comment === 'object') {
    const objectComment = payload.comment as Record<string, unknown>
    const directComment = objectComment.comment
    if (typeof directComment === 'string' && directComment.trim())
      return directComment.trim()

    const reason = objectComment.reason
    if (typeof reason === 'string' && reason.trim())
      return reason.trim()

    return JSON.stringify(objectComment)
  }

  return String(payload.comment)
}

function ensureRecordDefaults(record: ApprovalRecord): ApprovalRecord {
  const applyDate = parseDateTime(record.applyTime)
  const normalized: ApprovalRecord = {
    ...record,
    currentNodeName: record.currentNodeName || '发起申请',
    deadlineAt: record.deadlineAt || formatDateTime(plusHours(applyDate, DEFAULT_SLA_HOURS)),
    remindCount: record.remindCount ?? 0,
    workflowInstance: {
      currentNodeId: record.workflowInstance?.currentNodeId,
      tasks: record.workflowInstance?.tasks?.map(task => ({
        id: task.id,
        handlerId: task.handlerId,
        handlerName: task.handlerName,
        status: task.status,
        handledAt: task.handledAt,
        comment: task.comment,
      })) || [],
    },
    operatorTrail: record.operatorTrail?.map(item => ({
      ...item,
      attachments: normalizeAttachments(item.attachments),
    })),
  }

  if (!normalized.workflowInstance?.tasks?.length) {
    normalized.workflowInstance = {
      ...(normalized.workflowInstance || {}),
      tasks: [
        {
          id: toTimestampId('task'),
          handlerId: 'system-default-handler',
          handlerName: '默认审批人',
          status: normalized.status === 'pending' ? 'pending' : normalized.status,
        },
      ],
    }
  }

  if (!normalized.operatorTrail?.length) {
    normalized.operatorTrail = [
      {
        id: toTimestampId('trail'),
        action: 'create',
        status: 'pending',
        operatorName: normalized.applicant,
        operatedAt: normalized.applyTime,
        comment: normalized.description,
      },
    ]
  }

  Object.assign(record, normalized)
  return record
}

function ensureAllRecordsDefaults(): void {
  mockApprovalRecords.forEach(ensureRecordDefaults)
}

function pushNotification(notification: Omit<ApprovalNotification, 'id' | 'createdAt'>): void {
  approvalNotifications.unshift({
    ...notification,
    id: toTimestampId('notice'),
    createdAt: formatDateTime(new Date()),
  })
}

function mapActionToStatus(action: ApprovalAction): ApprovalStatus {
  switch (action) {
    case 'approve':
      return 'approved'
    case 'reject':
      return 'rejected'
    case 'withdraw':
      return 'withdrawn'
    case 'cancel':
      return 'cancelled'
    case 'transfer':
      return 'transferred'
    case 'addSign':
    case 'remind':
    default:
      return 'pending'
  }
}

function toDateRange(range?: DateRange | null): [Date, Date] | null {
  if (!range?.[0] || !range?.[1])
    return null

  const start = new Date(range[0])
  const end = new Date(range[1])
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  return [start, end]
}

function appendTrail(record: ApprovalRecord, item: ApprovalTrailItem): void {
  if (!record.operatorTrail)
    record.operatorTrail = []
  record.operatorTrail.unshift(item)
}

function markPendingTask(
  record: ApprovalRecord,
  status: string,
  operatedAt: string,
  comment?: string,
): void {
  const pendingTask = record.workflowInstance?.tasks?.find(task => task.status === 'pending' || task.status === 'processing')
  if (!pendingTask)
    return

  pendingTask.status = status
  pendingTask.handledAt = operatedAt
  pendingTask.comment = comment
}

function createPendingTask(record: ApprovalRecord, targetUserId: string, targetUserName?: string): void {
  if (!record.workflowInstance)
    record.workflowInstance = {}
  if (!record.workflowInstance.tasks)
    record.workflowInstance.tasks = []

  record.workflowInstance.tasks.unshift({
    id: toTimestampId('task'),
    handlerId: targetUserId,
    handlerName: targetUserName || targetUserId,
    status: 'pending',
  })
}

/**
 * 获取审批列表
 */
export async function getApprovalList(
  params: PageParams & {
    status?: string
    keyword?: string
    type?: string
    dateRange?: DateRange | null
  },
): Promise<PageResult<ApprovalRecord>> {
  await sleep(LIST_DELAY_MS)
  ensureAllRecordsDefaults()

  let filteredList = [...mockApprovalRecords]

  if (params.status) {
    filteredList = filteredList.filter(item => item.status === params.status)
  }

  if (params.keyword?.trim()) {
    const keyword = params.keyword.trim().toLowerCase()
    filteredList = filteredList.filter((item) => {
      const haystack = [item.title, item.applicant, item.description, item.currentNodeName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(keyword)
    })
  }

  if (params.type) {
    filteredList = filteredList.filter(item => item.type === params.type)
  }

  const normalizedRange = toDateRange(params.dateRange)
  if (normalizedRange) {
    const [start, end] = normalizedRange
    filteredList = filteredList.filter((item) => {
      const applyDate = parseDateTime(item.applyTime)
      return applyDate >= start && applyDate <= end
    })
  }

  const start = (params.page - 1) * params.pageSize
  const end = start + params.pageSize

  return {
    list: filteredList.slice(start, end),
    total: filteredList.length,
    page: params.page,
    pageSize: params.pageSize,
  }
}

/**
 * 获取审批详情
 */
export async function getApprovalDetail(id: string): Promise<ApprovalRecord | null> {
  await sleep(DETAIL_DELAY_MS)
  ensureAllRecordsDefaults()

  const record = mockApprovalRecords.find(item => item.id === id)
  if (!record)
    return null

  return ensureRecordDefaults(record)
}

/**
 * 提交审批申请（创建）
 */
export async function submitApproval(
  data: Omit<ApprovalRecord, 'id' | 'status' | 'applyTime'>,
): Promise<ApprovalRecord> {
  await sleep(SUBMIT_DELAY_MS)

  const now = new Date()
  const applyTime = formatDateTime(now)

  const newRecord: ApprovalRecord = ensureRecordDefaults({
    ...data,
    id: toTimestampId('APPROVE'),
    status: 'pending',
    applyTime,
    title: data.title || '通用审批申请',
    type: data.type || 'other',
    applicant: data.applicant || '当前用户',
    currentNodeName: data.currentNodeName || '发起申请',
    deadlineAt: data.deadlineAt || formatDateTime(plusHours(now, DEFAULT_SLA_HOURS)),
    latestComment: data.latestComment,
    latestAttachments: normalizeAttachments(data.latestAttachments),
    operatorTrail: [
      {
        id: toTimestampId('trail'),
        action: 'create',
        status: 'pending',
        operatorName: data.applicant || '当前用户',
        operatedAt: applyTime,
        comment: data.description,
        attachments: normalizeAttachments(data.latestAttachments),
      },
    ],
  })

  mockApprovalRecords.unshift(newRecord)

  pushNotification({
    approvalId: newRecord.id,
    title: '新审批待处理',
    content: `《${newRecord.title}》已发起，请相关审批人及时处理。`,
    type: 'info',
  })

  return newRecord
}

export interface ProcessApprovalPayload {
  id: string
  action: ApprovalAction
  comment?: unknown
  commentText?: string
  attachments?: string[]
  targetUserId?: string
  targetUserName?: string
  operatorId?: string
  operatorName?: string
}

/**
 * 处理审批动作（审批闭环增强）
 */
export async function processApproval(
  payload: ProcessApprovalPayload,
): Promise<ApprovalRecord> {
  await sleep(PROCESS_DELAY_MS)
  ensureAllRecordsDefaults()

  const record = mockApprovalRecords.find(item => item.id === payload.id)
  if (!record)
    throw new Error('approval-not-found')

  ensureRecordDefaults(record)

  const comment = resolveCommentText(payload)
  const attachments = normalizeAttachments(payload.attachments)
  const operatedAt = formatDateTime(new Date())
  const operatorName = payload.operatorName || '当前用户'

  const nextStatus = mapActionToStatus(payload.action)
  record.status = nextStatus
  record.latestComment = comment
  record.latestAttachments = attachments

  if (payload.action === 'approve') {
    record.currentNodeName = '审批完成'
    markPendingTask(record, 'approved', operatedAt, comment)
    pushNotification({
      approvalId: record.id,
      title: '审批已通过',
      content: `《${record.title}》已审批通过。`,
      type: 'success',
    })
  }

  if (payload.action === 'reject') {
    record.currentNodeName = '已驳回'
    markPendingTask(record, 'rejected', operatedAt, comment)
    pushNotification({
      approvalId: record.id,
      title: '审批被驳回',
      content: `《${record.title}》已被驳回。`,
      type: 'error',
    })
  }

  if (payload.action === 'transfer') {
    const targetUserId = payload.targetUserId || 'unassigned-user'
    const targetUserName = payload.targetUserName || targetUserId
    record.currentNodeName = `已转交（${targetUserName}）`
    markPendingTask(record, 'transferred', operatedAt, comment)
    createPendingTask(record, targetUserId, targetUserName)
    pushNotification({
      approvalId: record.id,
      title: '审批已转交',
      content: `《${record.title}》已转交给 ${targetUserName}。`,
      type: 'warning',
    })
  }

  if (payload.action === 'addSign') {
    const targetUserId = payload.targetUserId || 'cosign-user'
    const targetUserName = payload.targetUserName || targetUserId
    record.status = 'pending'
    record.currentNodeName = `加签中（${targetUserName}）`
    createPendingTask(record, targetUserId, targetUserName)
    pushNotification({
      approvalId: record.id,
      title: '审批已加签',
      content: `《${record.title}》已发起加签，处理人：${targetUserName}。`,
      type: 'info',
    })
  }

  if (payload.action === 'remind') {
    record.status = 'pending'
    record.currentNodeName = '已催办'
    record.remindCount = (record.remindCount || 0) + 1
    record.lastRemindAt = operatedAt

    if (isOverdue(record.deadlineAt) && !record.escalatedAt) {
      record.escalatedAt = operatedAt
      pushNotification({
        approvalId: record.id,
        title: '审批已超时升级',
        content: `《${record.title}》触发 SLA 超时升级，请尽快处理。`,
        type: 'error',
      })
    }

    pushNotification({
      approvalId: record.id,
      title: '审批催办提醒',
      content: `《${record.title}》已催办 ${record.remindCount} 次。`,
      type: 'warning',
    })
  }

  if (payload.action === 'withdraw') {
    record.currentNodeName = '已撤回'
    markPendingTask(record, 'cancelled', operatedAt, comment)
    pushNotification({
      approvalId: record.id,
      title: '审批已撤回',
      content: `《${record.title}》已由发起人撤回。`,
      type: 'info',
    })
  }

  if (payload.action === 'cancel') {
    record.currentNodeName = '已取消'
    markPendingTask(record, 'cancelled', operatedAt, comment)
    pushNotification({
      approvalId: record.id,
      title: '审批已取消',
      content: `《${record.title}》已取消。`,
      type: 'info',
    })
  }

  appendTrail(record, {
    id: toTimestampId('trail'),
    action: payload.action,
    status: record.status,
    operatorId: payload.operatorId,
    operatorName,
    operatedAt,
    comment,
    attachments,
    targetUserId: payload.targetUserId,
    targetUserName: payload.targetUserName,
  })

  return record
}

/**
 * 获取工作台统计（含审批超时与催办联动）
 */
export async function getWorkbenchStats(): Promise<WorkbenchStats> {
  await sleep(STATS_DELAY_MS)
  ensureAllRecordsDefaults()

  const overdueCount = mockApprovalRecords.filter(item => item.status === 'pending' && isOverdue(item.deadlineAt)).length
  const escalatedCount = mockApprovalRecords.filter(item => !!item.escalatedAt).length
  const remindedCount = mockApprovalRecords.reduce((sum, item) => sum + (item.remindCount || 0), 0)

  return {
    pendingCount: mockApprovalRecords.filter(item => item.status === 'pending').length,
    myApplicationCount: mockApprovalRecords.length,
    approvedCount: mockApprovalRecords.filter(item => item.status === 'approved').length,
    rejectedCount: mockApprovalRecords.filter(item => item.status === 'rejected').length,
    overdueCount,
    escalatedCount,
    remindedCount,
  }
}

/**
 * 获取审批通知列表（用于工作台联动展示）
 */
export async function getApprovalNotifications(limit = 20): Promise<ApprovalNotification[]> {
  await sleep(120)
  return approvalNotifications.slice(0, limit)
}

/**
 * 获取消息列表（分页）
 */
export async function getMessageList(params: PageParams & {
  type?: MessageType | 'all'
  read?: boolean
}): Promise<PageResult<MessageRecord>> {
  await sleep(LIST_DELAY_MS)

  let filtered = [...mockMessageRecords]

  // 按类型筛选
  if (params.type && params.type !== 'all') {
    filtered = filtered.filter(item => item.type === params.type)
  }

  // 按已读/未读筛选
  if (params.read !== undefined) {
    filtered = filtered.filter(item => item.read === params.read)
  }

  // 按创建时间倒序排序
  filtered.sort((a, b) => parseDateTime(b.createdAt).getTime() - parseDateTime(a.createdAt).getTime())

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
 * 标记消息已读
 */
export async function markMessageAsRead(id: string): Promise<void> {
  await sleep(200)
  const message = mockMessageRecords.find(item => item.id === id)
  if (message && !message.read) {
    message.read = true
    message.readTime = formatDateTime(new Date())
  }
}

/**
 * 批量标记消息已读
 */
export async function batchMarkAsRead(ids: string[]): Promise<void> {
  await sleep(300)
  const now = formatDateTime(new Date())
  ids.forEach((id) => {
    const message = mockMessageRecords.find(item => item.id === id)
    if (message && !message.read) {
      message.read = true
      message.readTime = now
    }
  })
}

/**
 * 全部标记已读
 */
export async function markAllAsRead(): Promise<void> {
  await sleep(400)
  const now = formatDateTime(new Date())
  mockMessageRecords.forEach((message) => {
    if (!message.read) {
      message.read = true
      message.readTime = now
    }
  })
}

/**
 * 删除消息
 */
export async function deleteMessage(id: string): Promise<void> {
  await sleep(200)
  const index = mockMessageRecords.findIndex(item => item.id === id)
  if (index !== -1) {
    mockMessageRecords.splice(index, 1)
  }
}

/**
 * 批量删除消息
 */
export async function batchDeleteMessages(ids: string[]): Promise<void> {
  await sleep(300)
  ids.forEach((id) => {
    const index = mockMessageRecords.findIndex(item => item.id === id)
    if (index !== -1) {
      mockMessageRecords.splice(index, 1)
    }
  })
}

/**
 * 获取未读消息数
 */
export async function getUnreadCount(): Promise<number> {
  await sleep(100)
  return mockMessageRecords.filter(item => !item.read).length
}

// ==================== 抄送相关 API ====================

/**
 * 获取抄送列表
 */
export async function getCCList(params: PageParams & {
  keyword?: string
  status?: ApprovalStatus
  read?: boolean
  dateRange?: DateRange | null
}): Promise<PageResult<CCRecord>> {
  await sleep(LIST_DELAY_MS)

  let filtered = [...mockCCRecords]

  // 按关键词筛选（标题、申请人）
  if (params.keyword) {
    const keyword = params.keyword.toLowerCase()
    filtered = filtered.filter(
      item =>
        item.title.toLowerCase().includes(keyword)
        || item.applicant.toLowerCase().includes(keyword),
    )
  }

  // 按状态筛选
  if (params.status) {
    filtered = filtered.filter(item => item.status === params.status)
  }

  // 按已读/未读筛选
  if (params.read !== undefined) {
    filtered = filtered.filter(item => item.read === params.read)
  }

  // 按日期范围筛选
  if (params.dateRange && params.dateRange.length === 2) {
    const [start, end] = params.dateRange
    filtered = filtered.filter((item) => {
      const ccTime = parseDateTime(item.ccTime)
      return ccTime >= start && ccTime <= end
    })
  }

  // 按抄送时间倒序排序
  filtered.sort((a, b) => parseDateTime(b.ccTime).getTime() - parseDateTime(a.ccTime).getTime())

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
 * 标记抄送为已读
 */
export async function markCCAsRead(id: string): Promise<void> {
  await sleep(200)
  const record = mockCCRecords.find(item => item.id === id)
  if (record && !record.read) {
    record.read = true
    record.readTime = formatDateTime(new Date())
  }
}

/**
 * 批量标记抄送为已读
 */
export async function batchMarkCCAsRead(ids: string[]): Promise<void> {
  await sleep(300)
  const now = formatDateTime(new Date())
  ids.forEach((id) => {
    const record = mockCCRecords.find(item => item.id === id)
    if (record && !record.read) {
      record.read = true
      record.readTime = now
    }
  })
}

/**
 * 获取抄送未读数量
 */
export async function getCCUnreadCount(): Promise<number> {
  await sleep(100)
  return mockCCRecords.filter(item => !item.read).length
}

