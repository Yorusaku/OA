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
import {
  runApprovalSuggestion,
  runApprovalSuggestionStream,
} from './services/approval-ai-service'
import { getActivePolicy } from './services/ai-policy-service'
import {
  getAiAccuracyStats,
  getAiAuditEvents,
  recordAiSuggestionAccepted,
  recordAiSuggestionGenerated,
  recordAiSuggestionOverridden,
} from './services/ai-audit-service'
import {
  activatePromptTemplate,
  createPromptTemplate,
  deletePromptTemplate,
  ensureDefaultTemplate,
  getPromptTemplate,
  getPromptTemplateStore,
  listPromptTemplates,
  testPromptTemplate,
  updatePromptTemplate,
} from './services/prompt-template-service'
import {
  createKnowledgeBase,
  deleteKnowledgeBase,
  deleteKnowledgeDocument,
  listKnowledgeBases,
  listKnowledgeDocuments,
  reindexKnowledgeDocument,
  searchKnowledge,
  uploadDocument,
} from './services/knowledge-service'
import {
  createChatSession,
  deleteChatSession,
  listChatMessages,
  listChatSessions,
  renameChatSession,
  streamChat,
} from './services/knowledge-chat-service'
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
    if ((error as { code?: string }).code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      reply.status(413).send({
        code: API_ERROR.BAD_REQUEST,
        message: '上传内容过大，请拆分文档或减少单次上传内容',
        data: null,
        traceId: request.id,
      })
      return
    }

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

  app.get('/api/v1/ai/policy', async (request, reply) => {
    const policy = getActivePolicy()
    sendOk(request, reply, policy, '获取成功')
  })

  app.post('/api/v1/ai/approval-suggestion', async (request, reply) => {
    const aiStartAt = Date.now()
    const parsed = z.object({
      approvalId: z.string().min(1),
    }).safeParse(request.body)

    if (!parsed.success) {
      throw new AppError('请求参数错误', {
        statusCode: 400,
        businessCode: API_ERROR.BAD_REQUEST,
        details: parsed.error.flatten(),
      })
    }

    const result = await runApprovalSuggestion(store, parsed.data.approvalId)
    if (!result)
      throw new AppError('审批单不存在', { statusCode: 404, businessCode: API_ERROR.NOT_FOUND })

    // 记录 AI 审计
    const aiMeta = readClientMeta(request)
    const aiOp = resolveOperatorFromRequest(request)
    const auditEvent = await store.runInTransaction((state) => {
      return recordAiSuggestionGenerated(state, {
        approvalId: parsed.data.approvalId,
        operatorId: aiOp.id,
        operatorName: aiOp.name,
        response: result,
        traceId: request.id,
        ip: aiMeta.ip,
        userAgent: aiMeta.userAgent,
        durationMs: Date.now() - aiStartAt,
      })
    })
    result.auditEventId = auditEvent.id

    sendOk(request, reply, result, '获取成功')
  })

  app.post('/api/v1/ai/approval-suggestion/stream', async (request, reply) => {
    const aiStreamStartAt = Date.now()
    const parsed = z.object({
      approvalId: z.string().min(1),
    }).safeParse(request.body)

    if (!parsed.success) {
      throw new AppError('请求参数错误', {
        statusCode: 400,
        businessCode: API_ERROR.BAD_REQUEST,
        details: parsed.error.flatten(),
      })
    }

    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.setHeader('X-Accel-Buffering', 'no')
    reply.hijack()

    let clientDisconnected = false
    let responseFinished = false
    const markClientDisconnected = () => {
      if (!responseFinished)
        clientDisconnected = true
    }
    request.raw.once('aborted', markClientDisconnected)
    reply.raw.once('close', markClientDisconnected)

    const writeStreamEvent = (event: unknown): void => {
      if (clientDisconnected || reply.raw.destroyed || reply.raw.writableEnded)
        return
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`)
    }

    writeStreamEvent({
      type: 'meta',
      approvalId: parsed.data.approvalId,
      generatedAt: new Date().toISOString(),
    })

    const result = await runApprovalSuggestionStream(
      store,
      parsed.data.approvalId,
      (chunk) => {
        writeStreamEvent({ type: 'chunk', content: chunk })
      },
      (segments) => {
        writeStreamEvent({ type: 'segment', segments })
      },
      (uncertainties) => {
        writeStreamEvent({ type: 'uncertainty', uncertainties })
      },
    )

    if (clientDisconnected || reply.raw.destroyed || reply.raw.writableEnded) {
      responseFinished = true
      return
    }

    if (!result) {
      reply.raw.write(`data: ${JSON.stringify({
        type: 'error',
        message: '审批单不存在',
      })}\n\n`)
      reply.raw.end()
      return
    }

    // 记录 AI 审计
    const aiStreamMeta = readClientMeta(request)
    const aiStreamOp = resolveOperatorFromRequest(request)
    const auditEvent = await store.runInTransaction((state) => {
      return recordAiSuggestionGenerated(state, {
        approvalId: parsed.data.approvalId,
        operatorId: aiStreamOp.id,
        operatorName: aiStreamOp.name,
        response: result,
        traceId: request.id,
        ip: aiStreamMeta.ip,
        userAgent: aiStreamMeta.userAgent,
        durationMs: Date.now() - aiStreamStartAt,
      })
    })
    result.auditEventId = auditEvent.id

    writeStreamEvent({
      type: 'done',
      response: result,
    })
    responseFinished = true
    reply.raw.end()
  })

  // ==================== AI 审计 API ====================

  app.post('/api/v1/ai/audit/accept', async (request, reply) => {
    const parsed = z.object({
      approvalId: z.string().min(1),
      auditEventId: z.string().min(1),
      comment: z.string().optional(),
    }).safeParse(request.body)

    if (!parsed.success) {
      throw new AppError('请求参数错误', {
        statusCode: 400,
        businessCode: API_ERROR.BAD_REQUEST,
        details: parsed.error.flatten(),
      })
    }

    const acceptMeta = readClientMeta(request)
    const acceptOp = resolveOperatorFromRequest(request)
    const event = await store.runInTransaction((state) => {
      return recordAiSuggestionAccepted(state, {
        approvalId: parsed.data.approvalId,
        auditEventId: parsed.data.auditEventId,
        operatorId: acceptOp.id,
        operatorName: acceptOp.name,
        comment: parsed.data.comment,
        traceId: request.id,
        ip: acceptMeta.ip,
        userAgent: acceptMeta.userAgent,
      })
    })
    sendOk(request, reply, { auditEventId: event.id }, '已记录采纳')
  })

  app.post('/api/v1/ai/audit/override', async (request, reply) => {
    const parsed = z.object({
      approvalId: z.string().min(1),
      auditEventId: z.string().min(1),
      reason: z.string().min(1),
    }).safeParse(request.body)

    if (!parsed.success) {
      throw new AppError('请求参数错误', {
        statusCode: 400,
        businessCode: API_ERROR.BAD_REQUEST,
        details: parsed.error.flatten(),
      })
    }

    const overrideMeta = readClientMeta(request)
    const overrideOp = resolveOperatorFromRequest(request)
    const event = await store.runInTransaction((state) => {
      return recordAiSuggestionOverridden(state, {
        approvalId: parsed.data.approvalId,
        auditEventId: parsed.data.auditEventId,
        operatorId: overrideOp.id,
        operatorName: overrideOp.name,
        reason: parsed.data.reason,
        traceId: request.id,
        ip: overrideMeta.ip,
        userAgent: overrideMeta.userAgent,
      })
    })
    sendOk(request, reply, { auditEventId: event.id }, '已记录覆盖')
  })

  app.get('/api/v1/ai/audit/stats', async (request, reply) => {
    const stats = await store.runInTransaction(state => getAiAccuracyStats(state))
    sendOk(request, reply, stats, '获取成功')
  })

  app.get('/api/v1/ai/audit/logs', async (request, reply) => {
    const query = request.query as Record<string, unknown>
    const result = await store.runInTransaction(state => listAuditLogs(state, {
      page: parseNumber(query.page, 1),
      pageSize: parseNumber(query.pageSize, 20),
      module: 'ai',
      action: typeof query.action === 'string' ? query.action as any : undefined,
      dateRange: toQueryDateRange(query.dateRange),
    }))
    sendOk(request, reply, result, '获取成功')
  })

  app.get('/api/v1/ai/audit/:approvalId', async (request, reply) => {
    const { approvalId } = request.params as { approvalId: string }
    const events = await store.runInTransaction(state => getAiAuditEvents(state, approvalId))
    sendOk(request, reply, events, '获取成功')
  })

  // ==================== Prompt 模板管理 API ====================

  app.get('/api/v1/ai/prompt-templates', async (request, reply) => {
    const query = request.query as Record<string, unknown>
    const store = getPromptTemplateStore()
    ensureDefaultTemplate(store)
    const list = listPromptTemplates(store, {
      scope: typeof query.scope === 'string' ? query.scope as any : undefined,
      status: typeof query.status === 'string' ? query.status as any : undefined,
      keyword: typeof query.keyword === 'string' ? query.keyword : undefined,
    })
    sendOk(request, reply, list, '获取成功')
  })

  app.post('/api/v1/ai/prompt-templates', async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      scope: z.enum(['approval_suggestion']),
      systemPrompt: z.string().min(1),
      userPrompt: z.string().min(1),
      variables: z.array(z.object({
        name: z.string().min(1),
        label: z.string().min(1),
        required: z.boolean(),
        defaultValue: z.string().optional(),
        description: z.string().optional(),
      })).optional(),
      modelConfig: z.object({
        temperature: z.number().min(0).max(2),
        maxTokens: z.number().int().min(1).max(4096),
      }).optional(),
    })
    const parsed = schema.safeParse(request.body)
    if (!parsed.success) {
      throw new AppError('请求参数错误', {
        statusCode: 400,
        businessCode: API_ERROR.BAD_REQUEST,
        details: parsed.error.flatten(),
      })
    }

    const op = resolveOperatorFromRequest(request)
    const store = getPromptTemplateStore()
    ensureDefaultTemplate(store)
    const template = createPromptTemplate(store, parsed.data, op.name)
    sendOk(request, reply, template, '创建成功')
  })

  app.get('/api/v1/ai/prompt-templates/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getPromptTemplateStore()
    const template = getPromptTemplate(store, id)
    if (!template)
      throw new AppError('模板不存在', { statusCode: 404, businessCode: API_ERROR.NOT_FOUND })
    sendOk(request, reply, template, '获取成功')
  })

  app.put('/api/v1/ai/prompt-templates/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const schema = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      systemPrompt: z.string().min(1).optional(),
      userPrompt: z.string().min(1).optional(),
      variables: z.array(z.object({
        name: z.string().min(1),
        label: z.string().min(1),
        required: z.boolean(),
        defaultValue: z.string().optional(),
        description: z.string().optional(),
      })).optional(),
      modelConfig: z.object({
        temperature: z.number().min(0).max(2),
        maxTokens: z.number().int().min(1).max(4096),
      }).optional(),
    })
    const parsed = schema.safeParse(request.body)
    if (!parsed.success) {
      throw new AppError('请求参数错误', {
        statusCode: 400,
        businessCode: API_ERROR.BAD_REQUEST,
        details: parsed.error.flatten(),
      })
    }

    try {
      const store = getPromptTemplateStore()
      const template = updatePromptTemplate(store, id, parsed.data)
      sendOk(request, reply, template, '更新成功')
    }
    catch (error) {
      if (error instanceof Error && error.message === 'prompt-template-not-found') {
        throw new AppError('模板不存在', { statusCode: 404, businessCode: API_ERROR.NOT_FOUND })
      }
      throw error
    }
  })

  app.delete('/api/v1/ai/prompt-templates/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const store = getPromptTemplateStore()
      deletePromptTemplate(store, id)
      sendOk(request, reply, { success: true }, '删除成功')
    }
    catch (error) {
      if (error instanceof Error && error.message === 'prompt-template-not-found') {
        throw new AppError('模板不存在', { statusCode: 404, businessCode: API_ERROR.NOT_FOUND })
      }
      throw error
    }
  })

  app.post('/api/v1/ai/prompt-templates/:id/activate', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const store = getPromptTemplateStore()
      const template = activatePromptTemplate(store, id)
      sendOk(request, reply, template, '激活成功')
    }
    catch (error) {
      if (error instanceof Error && error.message === 'prompt-template-not-found') {
        throw new AppError('模板不存在', { statusCode: 404, businessCode: API_ERROR.NOT_FOUND })
      }
      throw error
    }
  })

  app.post('/api/v1/ai/prompt-templates/test', async (request, reply) => {
    const schema = z.object({
      systemPrompt: z.string().min(1),
      userPrompt: z.string().min(1),
      variables: z.record(z.string(), z.string()),
      modelConfig: z.object({
        temperature: z.number().min(0).max(2),
        maxTokens: z.number().int().min(1).max(4096),
      }).optional(),
    })
    const parsed = schema.safeParse(request.body)
    if (!parsed.success) {
      throw new AppError('请求参数错误', {
        statusCode: 400,
        businessCode: API_ERROR.BAD_REQUEST,
        details: parsed.error.flatten(),
      })
    }

    try {
      const result = await testPromptTemplate(parsed.data)
      sendOk(request, reply, result, '测试成功')
    }
    catch (error) {
      const message = error instanceof Error ? error.message : '测试失败'
      throw new AppError(`模板测试失败: ${message}`, {
        statusCode: 500,
        businessCode: API_ERROR.INTERNAL_ERROR,
      })
    }
  })

  app.get('/api/v1/knowledge', async (request, reply) => {
    const result = await listKnowledgeBases(store)
    sendOk(request, reply, result, '获取成功')
  })

  app.post('/api/v1/knowledge', async (request, reply) => {
    const parsed = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      chunkSize: z.number().int().min(100).max(5000).optional(),
      chunkOverlap: z.number().int().min(0).max(1000).optional(),
    }).safeParse(request.body)

    if (!parsed.success) {
      throw new AppError('请求参数错误', {
        statusCode: 400,
        businessCode: API_ERROR.BAD_REQUEST,
        details: parsed.error.flatten(),
      })
    }

    const result = await createKnowledgeBase(store, config, parsed.data)
    sendOk(request, reply, result, '创建成功')
  })

  app.delete('/api/v1/knowledge/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    await deleteKnowledgeBase(store, config, id)
    sendOk(request, reply, { success: true }, '删除成功')
  })

  app.get('/api/v1/knowledge/:kbId/documents', async (request, reply) => {
    const { kbId } = request.params as { kbId: string }
    const result = await listKnowledgeDocuments(store, kbId)
    sendOk(request, reply, result, '获取成功')
  })

  app.post('/api/v1/knowledge/:kbId/documents', {
    bodyLimit: 10 * 1024 * 1024,
  }, async (request, reply) => {
    const { kbId } = request.params as { kbId: string }
    const parsed = z.object({
      filename: z.string().min(1),
      fileType: z.string().min(1),
      fileSize: z.number().int().nonnegative().optional(),
      content: z.string().min(1),
    }).safeParse(request.body)

    if (!parsed.success) {
      throw new AppError('请求参数错误', {
        statusCode: 400,
        businessCode: API_ERROR.BAD_REQUEST,
        details: parsed.error.flatten(),
      })
    }

    try {
      const result = await uploadDocument(store, config, {
        kbId,
        ...parsed.data,
      })
      sendOk(request, reply, result, '上传成功')
    }
    catch (error) {
      if (error instanceof Error && error.message === 'knowledge-base-not-found') {
        throw new AppError('知识库不存在', {
          statusCode: 404,
          businessCode: API_ERROR.NOT_FOUND,
        })
      }
      throw error
    }
  })

  app.delete('/api/v1/knowledge/:kbId/documents/:id', async (request, reply) => {
    const { id } = request.params as { kbId: string, id: string }
    await deleteKnowledgeDocument(store, config, id)
    sendOk(request, reply, { success: true }, '删除成功')
  })

  app.post('/api/v1/knowledge/:kbId/documents/:id/reindex', async (request, reply) => {
    const { kbId, id } = request.params as { kbId: string, id: string }
    try {
      const result = await reindexKnowledgeDocument(store, config, kbId, id)
      sendOk(request, reply, result, 'knowledge-reindex-success')
    }
    catch (error) {
      if (error instanceof Error && error.message === 'knowledge-document-not-found') {
        throw new AppError('knowledge-document-not-found', {
          statusCode: 404,
          businessCode: API_ERROR.NOT_FOUND,
        })
      }
      throw error
    }
  })

  app.post('/api/v1/knowledge/:kbId/search', async (request, reply) => {
    const { kbId } = request.params as { kbId: string }
    const parsed = z.object({
      query: z.string().min(1),
      topK: z.number().int().min(1).max(10).optional(),
    }).safeParse(request.body)

    if (!parsed.success) {
      throw new AppError('请求参数错误', {
        statusCode: 400,
        businessCode: API_ERROR.BAD_REQUEST,
        details: parsed.error.flatten(),
      })
    }

    try {
      const result = await searchKnowledge(store, config, {
        kbId,
        query: parsed.data.query,
        topK: parsed.data.topK,
      })
      sendOk(request, reply, result, '检索成功')
    }
    catch (error) {
      if (error instanceof Error && error.message === 'knowledge-base-not-found') {
        throw new AppError('知识库不存在', {
          statusCode: 404,
          businessCode: API_ERROR.NOT_FOUND,
        })
      }
      throw error
    }
  })

  app.post('/api/v1/knowledge/:kbId/chat/sessions', async (request, reply) => {
    const { kbId } = request.params as { kbId: string }
    const parsed = z.object({
      title: z.string().trim().max(80).optional(),
      firstMessage: z.string().trim().min(1).max(2000),
    }).safeParse(request.body)

    if (!parsed.success) {
      throw new AppError('请求参数错误', {
        statusCode: 400,
        businessCode: API_ERROR.BAD_REQUEST,
        details: parsed.error.flatten(),
      })
    }

    try {
      const result = await createChatSession(store, kbId, parsed.data.firstMessage, parsed.data.title)
      sendOk(request, reply, result, '创建成功')
    }
    catch (error) {
      if (error instanceof Error && error.message === 'knowledge-base-not-found') {
        throw new AppError('知识库不存在', {
          statusCode: 404,
          businessCode: API_ERROR.NOT_FOUND,
        })
      }
      throw error
    }
  })

  app.get('/api/v1/knowledge/:kbId/chat/sessions', async (request, reply) => {
    const { kbId } = request.params as { kbId: string }
    try {
      const result = await listChatSessions(store, kbId)
      sendOk(request, reply, result, '获取成功')
    }
    catch (error) {
      if (error instanceof Error && error.message === 'knowledge-base-not-found') {
        throw new AppError('知识库不存在', {
          statusCode: 404,
          businessCode: API_ERROR.NOT_FOUND,
        })
      }
      throw error
    }
  })

  app.put('/api/v1/knowledge/:kbId/chat/sessions/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { kbId: string, sessionId: string }
    const parsed = z.object({
      title: z.string().trim().min(1).max(80),
    }).safeParse(request.body)

    if (!parsed.success) {
      throw new AppError('请求参数错误', {
        statusCode: 400,
        businessCode: API_ERROR.BAD_REQUEST,
        details: parsed.error.flatten(),
      })
    }

    try {
      const result = await renameChatSession(store, sessionId, parsed.data.title)
      sendOk(request, reply, result, '更新成功')
    }
    catch (error) {
      if (error instanceof Error && error.message === 'chat-session-not-found') {
        throw new AppError('会话不存在', {
          statusCode: 404,
          businessCode: API_ERROR.NOT_FOUND,
        })
      }
      throw error
    }
  })

  app.delete('/api/v1/knowledge/:kbId/chat/sessions/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { kbId: string, sessionId: string }
    await deleteChatSession(store, sessionId)
    sendOk(request, reply, { success: true }, '删除成功')
  })

  app.get('/api/v1/knowledge/:kbId/chat/sessions/:sessionId/messages', async (request, reply) => {
    const { sessionId } = request.params as { kbId: string, sessionId: string }
    sendOk(request, reply, await listChatMessages(store, sessionId), '获取成功')
  })

  app.post('/api/v1/knowledge/:kbId/chat/sessions/:sessionId/stream', async (request, reply) => {
    const { sessionId } = request.params as { kbId: string, sessionId: string }
    const parsed = z.object({
      message: z.string().trim().min(1).max(8000),
    }).safeParse(request.body)

    if (!parsed.success) {
      throw new AppError('请求参数错误', {
        statusCode: 400,
        businessCode: API_ERROR.BAD_REQUEST,
        details: parsed.error.flatten(),
      })
    }

    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.setHeader('X-Accel-Buffering', 'no')
    reply.hijack()

    let clientDisconnected = false
    let responseFinished = false
    const markClientDisconnected = () => {
      if (!responseFinished)
        clientDisconnected = true
    }
    request.raw.once('aborted', markClientDisconnected)
    reply.raw.once('close', markClientDisconnected)
    const writeEvent = (event: unknown): void => {
      if (clientDisconnected || reply.raw.destroyed || reply.raw.writableEnded)
        return
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`)
    }

    try {
      await streamChat(
        store,
        config,
        { sessionId, message: parsed.data.message },
        writeEvent,
        () => clientDisconnected || reply.raw.destroyed || reply.raw.writableEnded,
      )
    }
    catch (error) {
      if (!clientDisconnected && !reply.raw.destroyed && !reply.raw.writableEnded) {
        const message = error instanceof Error && error.message === 'chat-session-not-found'
          ? '会话不存在'
          : error instanceof Error && error.message === 'knowledge-base-not-found'
            ? '知识库不存在'
            : error instanceof Error ? error.message : '知识库对话失败'
        writeEvent({ type: 'error', message })
      }
    }
    finally {
      responseFinished = true
      if (!reply.raw.destroyed && !reply.raw.writableEnded)
        reply.raw.end()
    }
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
