import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ApiEnvelope } from '@oa/contracts'
import { API_ERROR } from '@oa/contracts'
import cors from '@fastify/cors'
import Fastify from 'fastify'
import { z } from 'zod'
import type { BffConfig } from './config'
import type { ApprovalDelegationRule, AuditAction, AuditEvent } from './domain'
import { createStore, type RuntimeStore } from './store'
import { RealtimeHub } from './sse'
import {
  batchDeleteMessages,
  batchMarkAsRead,
  batchMarkCCAsRead,
  cleanupIdempotency,
  deleteMessage,
  disableApprovalDelegation,
  findIdempotentResponse,
  getApprovalDelegation,
  getApprovalDetail,
  getApprovalNotifications,
  getCCList,
  getCCUnreadCount,
  getMessageList,
  getUnreadCount,
  getWorkbenchStats,
  listApprovals,
  markAllAsRead,
  markCCAsRead,
  markMessageAsRead,
  processApproval,
  saveIdempotentResponse,
  submitApproval,
  upsertApprovalDelegation,
} from './services/approval-service'
import {
  exportAuditLogsCsv,
  getAuditLogDetail,
  listAuditLogs,
  writeAuditLog,
} from './services/audit-service'
import { buildApprovalMetricSnapshot } from './services/metrics-service'
import {
  analyzeWorkflowImpact,
  createWorkflowDefinition,
  debugWorkflowRuleTrace,
  deleteWorkflowDefinition,
  getFormSchemas,
  getWorkflowDefinition,
  listWorkflows,
  publishWorkflow,
  rollbackWorkflow,
  listWorkflowVersions,
  updateWorkflowDefinition,
} from './services/workflow-service'

class AppError extends Error {
  readonly statusCode: number
  readonly businessCode: number
  readonly details?: unknown

  constructor(message: string, options: { statusCode: number, businessCode: number, details?: unknown }) {
    super(message)
    this.statusCode = options.statusCode
    this.businessCode = options.businessCode
    this.details = options.details
  }
}

function parseNumber(value: unknown, fallback: number): number {
  const next = Number(value)
  if (!Number.isFinite(next) || next <= 0)
    return fallback
  return Math.floor(next)
}

function normalizeIdempotencyKey(value: string | string[] | undefined): string | null {
  if (!value)
    return null
  const text = Array.isArray(value) ? value[0] : value
  const trimmed = text.trim()
  return trimmed ? trimmed : null
}

function sendOk<T>(request: FastifyRequest, reply: FastifyReply, data: T, message = 'ok'): void {
  const payload: ApiEnvelope<T> = {
    code: 200,
    message,
    data,
    traceId: request.id,
  }
  reply.send(payload)
}


function readClientMeta(request: FastifyRequest): { ip: string, userAgent: string } {
  const headers = request.headers as Record<string, string | string[] | undefined>
  const userAgent = typeof headers['user-agent'] === 'string'
    ? headers['user-agent']
    : Array.isArray(headers['user-agent']) ? headers['user-agent'][0] : '-'

  const xff = typeof headers['x-forwarded-for'] === 'string'
    ? headers['x-forwarded-for']
    : Array.isArray(headers['x-forwarded-for']) ? headers['x-forwarded-for'][0] : undefined
  const ip = xff?.split(',')[0]?.trim() || request.ip || '-'

  return { ip, userAgent }
}

function resolveOperatorFromRequest(
  request: FastifyRequest,
  fallback: { id: string, name: string } = { id: 'user-001', name: 'admin' },
): { id: string, name: string } {
  const headers = request.headers as Record<string, string | string[] | undefined>
  const headerId = typeof headers['x-user-id'] === 'string' ? headers['x-user-id'] : undefined
  const headerName = typeof headers['x-user-name'] === 'string' ? headers['x-user-name'] : undefined
  return {
    id: headerId?.trim() || fallback.id,
    name: headerName?.trim() || fallback.name,
  }
}

function mapActionToAudit(action: string): AuditAction {
  if (action === 'approve' || action === 'reject' || action === 'transfer' || action === 'addSign' || action === 'remind' || action === 'withdraw' || action === 'cancel')
    return 'approval.process'
  return 'approval.process'
}

function toQueryDateRange(raw: unknown): [Date, Date] | null {
  if (!raw || typeof raw !== 'string')
    return null
  const parts = raw.split(',').map(item => item.trim()).filter(Boolean)
  if (parts.length !== 2)
    return null
  const start = new Date(parts[0])
  const end = new Date(parts[1])
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return null
  return [start, end]
}

export async function buildApp(config: BffConfig, injectedStore?: RuntimeStore) {
  const app = Fastify({
    logger: true,
  })
  const store = injectedStore ?? createStore({
    storage: config.storage,
    connectionString: config.postgres.connectionString,
  })
  const realtimeHub = new RealtimeHub()

  await store.init()
  await app.register(cors, {
    origin: true,
    credentials: true,
  })

  const heartbeatTimer = setInterval(() => realtimeHub.heartbeat(), 15000)
  heartbeatTimer.unref()

  app.addHook('onClose', async () => {
    clearInterval(heartbeatTimer)
    await store.close()
  })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        code: error.businessCode,
        message: error.message,
        data: null,
        traceId: request.id,
        details: error.details,
      })
      return
    }
    app.log.error(error)
    reply.status(500).send({
      code: API_ERROR.INTERNAL_ERROR,
      message: '服务内部错误',
      data: null,
      traceId: request.id,
    })
  })

  app.get('/health', async (request, reply) => {
    sendOk(request, reply, {
      status: 'ok',
      storage: config.storage,
      timestamp: new Date().toISOString(),
    })
  })

  app.post('/api/v1/auth/login', async (request, reply) => {
    const loginStartAt = Date.now()
    const schema = z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    })
    const parsed = schema.safeParse(request.body)
    if (!parsed.success)
      throw new AppError('请求参数错误', { statusCode: 400, businessCode: API_ERROR.BAD_REQUEST, details: parsed.error.flatten() })

    const data = await store.readState()
    const user = data.users.find(item => item.username === parsed.data.username && item.password === parsed.data.password)
    if (!user)
      throw new AppError('用户名或密码错误', { statusCode: 401, businessCode: API_ERROR.UNAUTHORIZED })

    sendOk(request, reply, {
      token: `bff-token-${user.id}`,
      userInfo: {
        id: user.id,
        name: user.name,
      },
    }, '登录成功')

    const loginMeta = readClientMeta(request)
    await store.runInTransaction((state) => {
      writeAuditLog(state, {
        operatorId: user.id,
        operatorName: user.name,
        module: 'auth',
        action: 'auth.login',
        result: 'success',
        targetType: 'user',
        targetId: user.id,
        summary: `用户 ${user.name} 登录`,
        traceId: request.id,
        ip: loginMeta.ip,
        userAgent: loginMeta.userAgent,
        durationMs: Date.now() - loginStartAt,
        links: [{ targetType: 'auth', targetId: user.id, title: user.name, path: '/system/login-logs' }],
      })
    })
  })

  app.get('/api/v1/approval/list', async (request, reply) => {
    const query = request.query as Record<string, unknown>
    const result = await store.runInTransaction((state) => {
      return listApprovals(state, {
        page: parseNumber(query.page, 1),
        pageSize: parseNumber(query.pageSize, 10),
        status: typeof query.status === 'string' ? query.status : undefined,
        keyword: typeof query.keyword === 'string' ? query.keyword : undefined,
        type: typeof query.type === 'string' ? query.type : undefined,
        assigneeId: typeof query.assigneeId === 'string' ? query.assigneeId : undefined,
        dateRange: toQueryDateRange(query.dateRange),
      })
    })
    sendOk(request, reply, result, '获取成功')
  })

  app.get('/api/v1/approval/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = await store.runInTransaction((state) => getApprovalDetail(state, id))
    if (!result)
      throw new AppError('审批单不存在', { statusCode: 404, businessCode: API_ERROR.NOT_FOUND })
    sendOk(request, reply, result, '获取成功')
  })

  async function runWriteWithIdempotency<T>(
    request: FastifyRequest,
    path: string,
    handler: (state: Awaited<ReturnType<RuntimeStore['readState']>>) => T,
  ): Promise<T> {
    const idempotencyKey = normalizeIdempotencyKey(request.headers['idempotency-key'])
    return store.runInTransaction((state) => {
      cleanupIdempotency(state)
      if (idempotencyKey) {
        const existing = findIdempotentResponse<T>(state, path, idempotencyKey)
        if (existing !== null)
          return existing
      }
      const response = handler(state)
      if (idempotencyKey)
        saveIdempotentResponse(state, path, idempotencyKey, response, config.idempotencyTtlHours)
      return response
    })
  }

  app.post('/api/v1/approval', async (request, reply) => {
    const submitStartAt = Date.now()
    const schema = z.object({
      title: z.string().optional(),
      type: z.string().optional(),
      applicant: z.string().optional(),
      amount: z.number().optional(),
      description: z.string().optional(),
      latestComment: z.string().optional(),
      latestAttachments: z.array(z.string()).optional(),
      formData: z.record(z.string(), z.unknown()).optional(),
    })
    const parsed = schema.safeParse(request.body)
    if (!parsed.success)
      throw new AppError('请求参数错误', { statusCode: 400, businessCode: API_ERROR.BAD_REQUEST, details: parsed.error.flatten() })

    const record = await runWriteWithIdempotency(request, '/api/v1/approval', state =>
      submitApproval(state, parsed.data as any, { id: 'user-001', name: 'admin' }))
    realtimeHub.publish('approval.created', { approvalId: record.id, status: record.status })
    realtimeHub.publish('approval.todo.changed', { approvalId: record.id })
    realtimeHub.publish('message.new', { approvalId: record.id })

    const submitMeta = readClientMeta(request)
    const submitOp = resolveOperatorFromRequest(request)
    await store.runInTransaction((state) => {
      writeAuditLog(state, {
        operatorId: submitOp.id,
        operatorName: submitOp.name,
        module: 'approval',
        action: 'approval.submit',
        result: 'success',
        targetType: 'approval',
        targetId: record.id,
        summary: `发起审批 "${record.title || record.id}"`,
        traceId: request.id,
        ip: submitMeta.ip,
        userAgent: submitMeta.userAgent,
        durationMs: Date.now() - submitStartAt,
        links: [{ targetType: 'approval', targetId: record.id, title: record.title, path: `/approval/detail/${record.id}` }],
      })
    })
    sendOk(request, reply, record, '提交成功')
  })

  app.post('/api/v1/approval/:id/action', async (request, reply) => {
    const { id } = request.params as { id: string }
    const schema = z.object({
      action: z.enum(['approve', 'reject', 'transfer', 'addSign', 'remind', 'withdraw', 'cancel']),
      comment: z.unknown().optional(),
      commentText: z.string().optional(),
      attachments: z.array(z.string()).optional(),
      targetUserId: z.string().optional(),
      targetUserName: z.string().optional(),
      operatorId: z.string().optional(),
      operatorName: z.string().optional(),
    })
    const parsed = schema.safeParse(request.body)
    if (!parsed.success)
      throw new AppError('请求参数错误', { statusCode: 400, businessCode: API_ERROR.BAD_REQUEST, details: parsed.error.flatten() })

    const actionStartAt = Date.now()
    const nextRecord = await runWriteWithIdempotency(request, '/api/v1/approval/:id/action', state =>
      processApproval(state, { id, ...parsed.data }))
    realtimeHub.publish('approval.updated', { approvalId: nextRecord.id, status: nextRecord.status })
    realtimeHub.publish('approval.todo.changed', { approvalId: nextRecord.id, status: nextRecord.status })

    const actionMeta = readClientMeta(request)
    const actionOp = resolveOperatorFromRequest(request)
    await store.runInTransaction((state) => {
      writeAuditLog(state, {
        operatorId: parsed.data.operatorId || actionOp.id,
        operatorName: parsed.data.operatorName || actionOp.name,
        module: 'approval',
        action: mapActionToAudit(parsed.data.action),
        result: 'success',
        targetType: 'approval',
        targetId: nextRecord.id,
        summary: `${parsed.data.action} 审批 "${nextRecord.title || id}"`,
        traceId: request.id,
        ip: actionMeta.ip,
        userAgent: actionMeta.userAgent,
        durationMs: Date.now() - actionStartAt,
        links: [{ targetType: 'approval', targetId: nextRecord.id, title: nextRecord.title, path: `/approval/detail/${nextRecord.id}` }],
      })
    })
    sendOk(request, reply, nextRecord, '处理成功')
  })

  app.get('/api/v1/approval/stats', async (request, reply) => {
    const result = await store.runInTransaction(state => getWorkbenchStats(state))
    sendOk(request, reply, result, '获取成功')
  })

  app.get('/api/v1/approval/notifications', async (request, reply) => {
    const query = request.query as Record<string, unknown>
    const limit = parseNumber(query.limit, 20)
    const list = await store.runInTransaction(state => getApprovalNotifications(state, limit))
    sendOk(request, reply, list, '获取成功')
  })

  app.get('/api/v1/approval/delegation/:ownerId', async (request, reply) => {
    const { ownerId } = request.params as { ownerId: string }
    const rule = await store.runInTransaction(state => getApprovalDelegation(state, ownerId))
    sendOk(request, reply, rule, '获取成功')
  })

  app.post('/api/v1/approval/delegation', async (request, reply) => {
    const delegationStartAt = Date.now()
    const schema = z.object({
      ownerId: z.string().min(1),
      ownerName: z.string().min(1),
      delegateId: z.string().min(1),
      delegateName: z.string().min(1),
      startAt: z.string().min(1),
      endAt: z.string().min(1),
      enabled: z.boolean(),
    })
    const parsed = schema.safeParse(request.body)
    if (!parsed.success)
      throw new AppError('请求参数错误', { statusCode: 400, businessCode: API_ERROR.BAD_REQUEST, details: parsed.error.flatten() })
    const beforeRule = await store.runInTransaction(state => getApprovalDelegation(state, parsed.data.ownerId))
    const result = await runWriteWithIdempotency(request, '/api/v1/approval/delegation', state =>
      upsertApprovalDelegation(state, parsed.data as ApprovalDelegationRule))
    realtimeHub.publish('approval.todo.changed', { ownerId: result.ownerId, delegateId: result.delegateId })

    const delegationMeta = readClientMeta(request)
    await store.runInTransaction((state) => {
      writeAuditLog(state, {
        operatorId: parsed.data.ownerId,
        operatorName: parsed.data.ownerName,
        module: 'approval',
        action: 'approval.delegate.enable',
        result: 'success',
        targetType: 'delegation',
        targetId: result.ownerId,
        summary: `设置代理审批 ${result.ownerName} -> ${result.delegateName}`,
        before: beforeRule ? {
          delegateId: beforeRule.delegateId,
          enabled: beforeRule.enabled,
          startAt: beforeRule.startAt,
          endAt: beforeRule.endAt,
        } : null,
        after: { delegateId: result.delegateId, enabled: result.enabled, startAt: result.startAt, endAt: result.endAt },
        traceId: request.id,
        ip: delegationMeta.ip,
        userAgent: delegationMeta.userAgent,
        durationMs: Date.now() - delegationStartAt,
        links: [{ targetType: 'delegation', targetId: result.ownerId, title: result.ownerName }],
      })
    })
    sendOk(request, reply, result, '保存成功')
  })

  app.delete('/api/v1/approval/delegation/:ownerId', async (request, reply) => {
    const { ownerId } = request.params as { ownerId: string }
    const disableStartAt = Date.now()
    const beforeDisabled = await store.runInTransaction(state => getApprovalDelegation(state, ownerId))
    await runWriteWithIdempotency(request, '/api/v1/approval/delegation/:ownerId', (state) => {
      disableApprovalDelegation(state, ownerId)
      return { success: true }
    })
    realtimeHub.publish('approval.todo.changed', { ownerId })

    if (beforeDisabled) {
      const disableMeta = readClientMeta(request)
      await store.runInTransaction((state) => {
        writeAuditLog(state, {
          operatorId: beforeDisabled.ownerId,
          operatorName: beforeDisabled.ownerName,
          module: 'approval',
          action: 'approval.delegate.disable',
          result: 'success',
          targetType: 'delegation',
          targetId: ownerId,
          summary: `关闭代理审批 ${beforeDisabled.ownerName}`,
          before: { delegateId: beforeDisabled.delegateId, enabled: beforeDisabled.enabled },
          traceId: request.id,
          ip: disableMeta.ip,
          userAgent: disableMeta.userAgent,
          durationMs: Date.now() - disableStartAt,
          links: [{ targetType: 'delegation', targetId: ownerId, title: beforeDisabled.ownerName }],
        })
      })
    }
    sendOk(request, reply, { success: true }, '关闭成功')
  })

  app.get('/api/v1/messages', async (request, reply) => {
    const query = request.query as Record<string, unknown>
    const result = await store.runInTransaction(state => getMessageList(state, {
      page: parseNumber(query.page, 1),
      pageSize: parseNumber(query.pageSize, 10),
      type: typeof query.type === 'string' ? query.type as any : undefined,
      read: typeof query.read === 'string' ? query.read === 'true' : undefined,
    }))
    sendOk(request, reply, result, '获取成功')
  })

  app.get('/api/v1/messages/unread-count', async (request, reply) => {
    const count = await store.runInTransaction(state => getUnreadCount(state))
    sendOk(request, reply, count, '获取成功')
  })

  app.post('/api/v1/messages/:id/read', async (request, reply) => {
    const { id } = request.params as { id: string }
    await runWriteWithIdempotency(request, '/api/v1/messages/:id/read', (state) => {
      markMessageAsRead(state, id)
      return { success: true }
    })
    sendOk(request, reply, { success: true }, '更新成功')
  })

  app.post('/api/v1/messages/read/batch', async (request, reply) => {
    const body = z.object({ ids: z.array(z.string()).default([]) }).parse(request.body)
    await runWriteWithIdempotency(request, '/api/v1/messages/read/batch', (state) => {
      batchMarkAsRead(state, body.ids)
      return { success: true }
    })
    sendOk(request, reply, { success: true }, '更新成功')
  })

  app.post('/api/v1/messages/read/all', async (request, reply) => {
    await runWriteWithIdempotency(request, '/api/v1/messages/read/all', (state) => {
      markAllAsRead(state)
      return { success: true }
    })
    sendOk(request, reply, { success: true }, '更新成功')
  })

  app.delete('/api/v1/messages/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    await runWriteWithIdempotency(request, '/api/v1/messages/:id', (state) => {
      deleteMessage(state, id)
      return { success: true }
    })
    sendOk(request, reply, { success: true }, '删除成功')
  })

  app.post('/api/v1/messages/delete/batch', async (request, reply) => {
    const body = z.object({ ids: z.array(z.string()).default([]) }).parse(request.body)
    await runWriteWithIdempotency(request, '/api/v1/messages/delete/batch', (state) => {
      batchDeleteMessages(state, body.ids)
      return { success: true }
    })
    sendOk(request, reply, { success: true }, '删除成功')
  })

  app.get('/api/v1/cc', async (request, reply) => {
    const query = request.query as Record<string, unknown>
    const result = await store.runInTransaction(state => getCCList(state, {
      page: parseNumber(query.page, 1),
      pageSize: parseNumber(query.pageSize, 10),
      keyword: typeof query.keyword === 'string' ? query.keyword : undefined,
      status: typeof query.status === 'string' ? query.status as any : undefined,
      read: typeof query.read === 'string' ? query.read === 'true' : undefined,
      dateRange: toQueryDateRange(query.dateRange),
    }))
    sendOk(request, reply, result, '获取成功')
  })

  app.get('/api/v1/cc/unread-count', async (request, reply) => {
    const count = await store.runInTransaction(state => getCCUnreadCount(state))
    sendOk(request, reply, count, '获取成功')
  })

  app.post('/api/v1/cc/:id/read', async (request, reply) => {
    const { id } = request.params as { id: string }
    await runWriteWithIdempotency(request, '/api/v1/cc/:id/read', (state) => {
      markCCAsRead(state, id)
      return { success: true }
    })
    sendOk(request, reply, { success: true }, '更新成功')
  })

  app.post('/api/v1/cc/read/batch', async (request, reply) => {
    const body = z.object({ ids: z.array(z.string()).default([]) }).parse(request.body)
    await runWriteWithIdempotency(request, '/api/v1/cc/read/batch', (state) => {
      batchMarkCCAsRead(state, body.ids)
      return { success: true }
    })
    sendOk(request, reply, { success: true }, '更新成功')
  })

  app.get('/api/v1/workflow/list', async (request, reply) => {
    const query = request.query as Record<string, unknown>
    const result = await store.runInTransaction(state => listWorkflows(state, {
      page: parseNumber(query.page, 1),
      pageSize: parseNumber(query.pageSize, 10),
      keyword: typeof query.keyword === 'string' ? query.keyword : undefined,
      status: typeof query.status === 'string' ? query.status : undefined,
    }))
    sendOk(request, reply, result, '获取成功')
  })

  app.get('/api/v1/workflow/forms', async (request, reply) => {
    const result = await store.runInTransaction(state => getFormSchemas(state))
    sendOk(request, reply, result, '获取成功')
  })

  app.get('/api/v1/workflow/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = await store.runInTransaction(state => getWorkflowDefinition(state, id))
    sendOk(request, reply, result, '获取成功')
  })

  app.post('/api/v1/workflow', async (request, reply) => {
    const payload = request.body as any
    const result = await runWriteWithIdempotency(request, '/api/v1/workflow', state => createWorkflowDefinition(state, payload))
    sendOk(request, reply, result, '创建成功')
  })

  app.put('/api/v1/workflow/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const payload = request.body as any
    const result = await runWriteWithIdempotency(request, '/api/v1/workflow/:id', state => updateWorkflowDefinition(state, id, payload))
    sendOk(request, reply, result, '更新成功')
  })

  app.delete('/api/v1/workflow/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    await runWriteWithIdempotency(request, '/api/v1/workflow/:id/delete', (state) => {
      deleteWorkflowDefinition(state, id)
      return { success: true }
    })
    sendOk(request, reply, { success: true }, '删除成功')
  })

  app.post('/api/v1/workflow/:id/publish', async (request, reply) => {
    const { id } = request.params as { id: string }
    const publishStartAt = Date.now()
    const body = request.body as { actor?: string } | undefined
    const result = await runWriteWithIdempotency(request, '/api/v1/workflow/:id/publish', state =>
      publishWorkflow(state, id, body?.actor || 'system'))

    const publishMeta = readClientMeta(request)
    const publishOp = resolveOperatorFromRequest(request)
    await store.runInTransaction((state) => {
      writeAuditLog(state, {
        operatorId: publishOp.id,
        operatorName: publishOp.name,
        module: 'workflow',
        action: 'workflow.publish',
        result: 'success',
        targetType: 'workflow',
        targetId: id,
        summary: `发布流程 "${result.workflowName}"`,
        after: { status: 'active', versionId: result.id },
        traceId: request.id,
        ip: publishMeta.ip,
        userAgent: publishMeta.userAgent,
        durationMs: Date.now() - publishStartAt,
        links: [{ targetType: 'workflow', targetId: id, title: result.workflowName, path: `/workflow/editor/${id}` }],
      })
    })
    sendOk(request, reply, result, '发布成功')
  })

  app.post('/api/v1/workflow/:id/rollback', async (request, reply) => {
    const { id } = request.params as { id: string }
    const rollbackStartAt = Date.now()
    const body = z.object({ versionId: z.string().min(1), actor: z.string().optional() }).parse(request.body)
    const result = await runWriteWithIdempotency(request, '/api/v1/workflow/:id/rollback', state =>
      rollbackWorkflow(state, id, body.versionId, body.actor || 'system'))

    const rollbackMeta = readClientMeta(request)
    const rollbackOp = resolveOperatorFromRequest(request)
    await store.runInTransaction((state) => {
      writeAuditLog(state, {
        operatorId: rollbackOp.id,
        operatorName: rollbackOp.name,
        module: 'workflow',
        action: 'workflow.rollback',
        result: 'success',
        targetType: 'workflow',
        targetId: id,
        summary: `回滚流程 "${result.workflowName}" 到版本 ${body.versionId}`,
        before: { fromVersionId: body.versionId },
        after: { status: result.status, versionId: result.id },
        traceId: request.id,
        ip: rollbackMeta.ip,
        userAgent: rollbackMeta.userAgent,
        durationMs: Date.now() - rollbackStartAt,
        links: [{ targetType: 'workflow', targetId: id, title: result.workflowName, path: `/workflow/editor/${id}` }],
      })
    })
    sendOk(request, reply, result, '回滚成功')
  })

  app.get('/api/v1/workflow/:id/impact', async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = await store.runInTransaction(state => analyzeWorkflowImpact(state, id))
    sendOk(request, reply, result, '获取成功')
  })

  app.post('/api/v1/workflow/:id/rule-trace', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({
      nodeId: z.string().optional(),
      formData: z.record(z.string(), z.unknown()).optional(),
    }).parse(request.body)
    const result = await store.runInTransaction(state => debugWorkflowRuleTrace(state, {
      workflowId: id,
      nodeId: body.nodeId,
      formData: body.formData,
    }, config.enableRuleTraceDebug))
    sendOk(request, reply, result, '获取成功')
  })

  app.get('/api/v1/workflow/:id/versions', async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = await store.runInTransaction(state => listWorkflowVersions(state, id))
    sendOk(request, reply, result, '获取成功')
  })

  // ==================== 审计日志 API ====================
  app.get('/api/v1/audit/logs', async (request, reply) => {
    const query = request.query as Record<string, unknown>
    const result = await store.runInTransaction(state => listAuditLogs(state, {
      page: parseNumber(query.page, 1),
      pageSize: parseNumber(query.pageSize, 20),
      operatorName: typeof query.operatorName === 'string' ? query.operatorName : undefined,
      action: typeof query.action === 'string' ? query.action as any : undefined,
      module: typeof query.module === 'string' ? query.module as any : undefined,
      result: typeof query.result === 'string' ? query.result as any : undefined,
      dateRange: toQueryDateRange(query.dateRange),
    }))
    sendOk(request, reply, result, '获取成功')
  })

  app.get('/api/v1/audit/logs/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const detail = await store.runInTransaction(state => getAuditLogDetail(state, id))
    if (!detail) throw new AppError('审计日志不存在', { statusCode: 404, businessCode: API_ERROR.NOT_FOUND })
    sendOk(request, reply, detail, '获取成功')
  })

  app.get('/api/v1/audit/logs/export/csv', async (request, reply) => {
    const query = request.query as Record<string, unknown>
    const csv = await store.runInTransaction(state => exportAuditLogsCsv(state, {
      operatorName: typeof query.operatorName === 'string' ? query.operatorName : undefined,
      action: typeof query.action === 'string' ? query.action as any : undefined,
      module: typeof query.module === 'string' ? query.module as any : undefined,
      result: typeof query.result === 'string' ? query.result as any : undefined,
      dateRange: toQueryDateRange(query.dateRange),
    }))
    reply.header('Content-Type', 'text/csv;charset=utf-8')
    reply.header('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`)
    reply.send(csv)
  })

  app.get('/api/v1/metrics/approval/overview', async (request, reply) => {
    const result = await store.runInTransaction(state => buildApprovalMetricSnapshot(state))
    sendOk(request, reply, result, '获取成功')
  })

  app.get('/api/v1/stream/notifications', async (request, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.setHeader('X-Accel-Buffering', 'no')
    reply.hijack()
    reply.raw.write(`: connected ${Date.now()}\n\n`)

    const unsubscribe = realtimeHub.subscribe(reply.raw)
    request.raw.on('close', () => {
      unsubscribe()
    })
  })

  return app
}
