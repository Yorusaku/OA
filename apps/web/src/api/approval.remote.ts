import type {
  ApprovalAction,
  ApprovalDelegationRule,
  ApprovalRecord,
  ApprovalStatus,
  CCRecord,
  MessageRecord,
  MessageType,
  PageParams,
  PageResult,
  WorkbenchStats,
} from './types'
import { nanoid } from 'nanoid'
import { del, get, post } from './http'

export interface ApprovalNotification {
  id: string
  approvalId: string
  title: string
  content: string
  type: 'info' | 'success' | 'warning' | 'error'
  createdAt: string
}

export interface RemoteProcessApprovalPayload {
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

function idempotencyHeaders() {
  return {
    'Idempotency-Key': `oa-web-${Date.now()}-${nanoid(8)}`,
  }
}

function stringifyDateRange(dateRange?: [Date, Date] | null): string | undefined {
  if (!dateRange?.[0] || !dateRange?.[1])
    return undefined
  return `${dateRange[0].toISOString()},${dateRange[1].toISOString()}`
}

export function remoteGetApprovalList(params: PageParams & {
  status?: string
  keyword?: string
  type?: string
  dateRange?: [Date, Date] | null
  assigneeId?: string
}): Promise<PageResult<ApprovalRecord>> {
  return get('/v1/approval/list', {
    params: {
      ...params,
      dateRange: stringifyDateRange(params.dateRange),
    },
  })
}

export function remoteGetApprovalDetail(id: string): Promise<ApprovalRecord | null> {
  return get(`/v1/approval/${id}`)
}

export function remoteSubmitApproval(
  data: Omit<ApprovalRecord, 'id' | 'status' | 'applyTime'>,
): Promise<ApprovalRecord> {
  return post('/v1/approval', data, {
    headers: idempotencyHeaders(),
  })
}

export function remoteProcessApproval(payload: RemoteProcessApprovalPayload): Promise<ApprovalRecord> {
  return post(`/v1/approval/${payload.id}/action`, {
    action: payload.action,
    comment: payload.comment,
    commentText: payload.commentText,
    attachments: payload.attachments,
    targetUserId: payload.targetUserId,
    targetUserName: payload.targetUserName,
    operatorId: payload.operatorId,
    operatorName: payload.operatorName,
  }, {
    headers: idempotencyHeaders(),
  })
}

export function remoteGetWorkbenchStats(): Promise<WorkbenchStats> {
  return get('/v1/approval/stats')
}

export function remoteGetApprovalNotifications(limit = 20): Promise<ApprovalNotification[]> {
  return get('/v1/approval/notifications', {
    params: { limit },
  })
}

export function remoteGetApprovalDelegation(ownerId: string): Promise<ApprovalDelegationRule | null> {
  return get(`/v1/approval/delegation/${ownerId}`)
}

export function remoteUpsertApprovalDelegation(rule: ApprovalDelegationRule): Promise<ApprovalDelegationRule> {
  return post('/v1/approval/delegation', rule, {
    headers: idempotencyHeaders(),
  })
}

export function remoteDisableApprovalDelegation(ownerId: string): Promise<void> {
  return del(`/v1/approval/delegation/${ownerId}`, {
    headers: idempotencyHeaders(),
  })
}

export function remoteGetMessageList(params: PageParams & {
  type?: MessageType | 'all'
  read?: boolean
}): Promise<PageResult<MessageRecord>> {
  return get('/v1/messages', {
    params,
  })
}

export function remoteMarkMessageAsRead(id: string): Promise<void> {
  return post(`/v1/messages/${id}/read`, null, {
    headers: idempotencyHeaders(),
  })
}

export function remoteBatchMarkAsRead(ids: string[]): Promise<void> {
  return post('/v1/messages/read/batch', { ids }, {
    headers: idempotencyHeaders(),
  })
}

export function remoteMarkAllAsRead(): Promise<void> {
  return post('/v1/messages/read/all', null, {
    headers: idempotencyHeaders(),
  })
}

export function remoteDeleteMessage(id: string): Promise<void> {
  return del(`/v1/messages/${id}`, {
    headers: idempotencyHeaders(),
  })
}

export function remoteBatchDeleteMessages(ids: string[]): Promise<void> {
  return post('/v1/messages/delete/batch', { ids }, {
    headers: idempotencyHeaders(),
  })
}

export function remoteGetUnreadCount(): Promise<number> {
  return get('/v1/messages/unread-count')
}

export function remoteGetCCList(params: PageParams & {
  keyword?: string
  status?: ApprovalStatus
  read?: boolean
  dateRange?: [Date, Date] | null
}): Promise<PageResult<CCRecord>> {
  return get('/v1/cc', {
    params: {
      ...params,
      dateRange: stringifyDateRange(params.dateRange),
    },
  })
}

export function remoteMarkCCAsRead(id: string): Promise<void> {
  return post(`/v1/cc/${id}/read`, null, {
    headers: idempotencyHeaders(),
  })
}

export function remoteBatchMarkCCAsRead(ids: string[]): Promise<void> {
  return post('/v1/cc/read/batch', { ids }, {
    headers: idempotencyHeaders(),
  })
}

export function remoteGetCCUnreadCount(): Promise<number> {
  return get('/v1/cc/unread-count')
}
