import type { AiApprovalSuggestionResponse, AiAuditStats } from '@oa/contracts'
import type { AuditEvent, RuntimeState } from '../domain'
import { uid } from '../utils'
import { writeAuditLog, type AuditWriteInput } from './audit-service'
import { ensureDefaultTemplate, getActiveTemplateForScope, getPromptTemplateStore } from './prompt-template-service'

// ========== AI 审计事件写入 ==========

export interface AiAuditGenerateInput {
  approvalId: string
  operatorId?: string
  operatorName?: string
  response: AiApprovalSuggestionResponse
  traceId: string
  ip?: string
  userAgent?: string
  durationMs: number
}

/**
 * 记录 AI 建议生成事件
 */
export function recordAiSuggestionGenerated(
  state: RuntimeState,
  input: AiAuditGenerateInput,
): AuditEvent {
  const promptTemplate = getActiveTemplateForScope(
    getPromptTemplateStore(),
    'approval_suggestion',
  ) || ensureDefaultTemplate()
  const event = writeAuditLog(state, {
    operatorId: input.operatorId || 'system',
    operatorName: input.operatorName || 'AI Assistant',
    module: 'ai',
    action: 'ai.suggestion.generated',
    result: 'success',
    targetType: 'ai',
    targetId: input.approvalId,
    summary: `AI 建议生成: ${input.response.suggestion} (置信度 ${Math.round(input.response.confidence * 100)}%)`,
    traceId: input.traceId,
    ip: input.ip || '-',
    userAgent: input.userAgent || '-',
    durationMs: input.durationMs,
    links: [
      {
        targetType: 'approval',
        targetId: input.approvalId,
        title: `审批单 ${input.approvalId}`,
        path: `/approval/detail/${input.approvalId}`,
      },
    ],
    metadata: {
      aiSuggestion: input.response.suggestion,
      aiConfidence: input.response.confidence,
      aiRiskLevel: input.response.riskLevel,
      aiReasoning: input.response.reasoning,
      inputTokens: input.response.usage?.inputTokens,
      outputTokens: input.response.usage?.outputTokens,
      promptTemplateId: promptTemplate.id,
      promptTemplateVersion: promptTemplate.version,
      latencyMs: input.durationMs,
      knowledgeBaseHits: input.response.evidenceItems?.filter(item => item.source === 'knowledge_base').length || 0,
      fallbackReason: input.response.suggestion === 'manual_review' ? input.response.reasoning : undefined,
    },
  })
  return event
}

export interface AiAuditFeedbackInput {
  approvalId: string
  auditEventId: string
  operatorId?: string
  operatorName?: string
  comment?: string
  reason?: string
  traceId: string
  ip?: string
  userAgent?: string
}

/**
 * 记录 AI 建议被采纳事件
 */
export function recordAiSuggestionAccepted(
  state: RuntimeState,
  input: AiAuditFeedbackInput,
): AuditEvent {
  return writeAuditLog(state, {
    operatorId: input.operatorId || 'system',
    operatorName: input.operatorName || '审批人',
    module: 'ai',
    action: 'ai.suggestion.accepted',
    result: 'success',
    targetType: 'ai',
    targetId: input.approvalId,
    summary: input.comment
      ? `采纳 AI 建议: ${input.comment}`
      : '采纳 AI 建议',
    traceId: input.traceId,
    ip: input.ip || '-',
    userAgent: input.userAgent || '-',
    durationMs: 0,
    links: [
      {
        targetType: 'approval',
        targetId: input.approvalId,
        title: `审批单 ${input.approvalId}`,
        path: `/approval/detail/${input.approvalId}`,
      },
    ],
    metadata: {
      auditEventId: input.auditEventId,
      action: 'accepted',
      comment: input.comment,
    },
  })
}

/**
 * 记录 AI 建议被覆盖事件
 */
export function recordAiSuggestionOverridden(
  state: RuntimeState,
  input: AiAuditFeedbackInput,
): AuditEvent {
  return writeAuditLog(state, {
    operatorId: input.operatorId || 'system',
    operatorName: input.operatorName || '审批人',
    module: 'ai',
    action: 'ai.suggestion.overridden',
    result: 'success',
    targetType: 'ai',
    targetId: input.approvalId,
    summary: `覆盖 AI 建议: ${input.reason || input.comment || '未提供原因'}`,
    traceId: input.traceId,
    ip: input.ip || '-',
    userAgent: input.userAgent || '-',
    durationMs: 0,
    links: [
      {
        targetType: 'approval',
        targetId: input.approvalId,
        title: `审批单 ${input.approvalId}`,
        path: `/approval/detail/${input.approvalId}`,
      },
    ],
    metadata: {
      auditEventId: input.auditEventId,
      action: 'overridden',
      reason: input.reason,
      comment: input.comment,
    },
  })
}

// ========== AI 审计统计 ==========

/**
 * 计算 AI 建议准确率等统计指标
 */
export function getAiAccuracyStats(state: RuntimeState): AiAuditStats {
  const aiEvents = state.auditLogs.filter(e => e.module === 'ai')
  const generatedEvents = aiEvents.filter(e => e.action === 'ai.suggestion.generated')
  const acceptedEvents = aiEvents.filter(e => e.action === 'ai.suggestion.accepted')
  const overriddenEvents = aiEvents.filter(e => e.action === 'ai.suggestion.overridden')

  const totalSuggestions = generatedEvents.length
  const acceptedCount = acceptedEvents.length
  const overriddenCount = overriddenEvents.length

  // 采纳率 = 采纳数 / (采纳数 + 覆盖数)
  const feedbackTotal = acceptedCount + overriddenCount
  const acceptedRate = feedbackTotal > 0
    ? Math.round((acceptedCount / feedbackTotal) * 100) / 100
    : 0

  // 置信度分布
  const confidenceDistribution = { low: 0, medium: 0, high: 0 }
  const riskDistribution = { low: 0, medium: 0, high: 0 }
  let totalLatencyMs = 0

  for (const event of generatedEvents) {
    const meta = event.metadata || {}
    const confidence = (meta.aiConfidence as number) ?? 0
    const riskLevel = (meta.aiRiskLevel as string) ?? 'medium'

    if (confidence < 0.5) confidenceDistribution.low++
    else if (confidence < 0.8) confidenceDistribution.medium++
    else confidenceDistribution.high++

    if (riskLevel === 'low') riskDistribution.low++
    else if (riskLevel === 'high') riskDistribution.high++
    else riskDistribution.medium++

    totalLatencyMs += event.durationMs
  }

  const avgLatencyMs = totalSuggestions > 0
    ? Math.round(totalLatencyMs / totalSuggestions)
    : 0

  return {
    totalSuggestions,
    acceptedCount,
    overriddenCount,
    acceptedRate,
    confidenceDistribution,
    riskDistribution,
    avgLatencyMs,
  }
}

/**
 * 按审批单 ID 获取 AI 审计明细
 * 返回与该审批单相关的所有 AI 审计事件
 */
export function getAiAuditEvents(state: RuntimeState, approvalId: string): AuditEvent[] {
  return state.auditLogs
    .filter(e => e.module === 'ai' && e.targetId === approvalId)
    .sort((a, b) => new Date(b.operatedAt).getTime() - new Date(a.operatedAt).getTime())
}
