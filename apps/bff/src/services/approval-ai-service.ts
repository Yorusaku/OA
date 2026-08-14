import type {
  AiApprovalEvidenceItem,
  AiApprovalReviewSummary,
  AiApprovalRiskPoint,
  AiApprovalSuggestionResponse,
  AiReasoningSegment,
  AiUncertainty,
} from '@oa/contracts'
import type { ApprovalRecord } from '../domain'
import type { RuntimeStore } from '../store'
import { getApprovalDetail } from './approval-service'
import { generateApprovalSuggestion, type ApprovalAiContext, streamApprovalSuggestion, checkAiSuggestionPolicy } from './ai-service'

export async function buildApprovalAiContext(
  store: RuntimeStore,
  approvalId: string,
): Promise<ApprovalAiContext | null> {
  const state = await store.readState()
  const record = getApprovalDetail(state, approvalId)
  if (!record)
    return null

  return toApprovalAiContext(record)
}

function buildPolicyBlockedFallback(blockingReason: string): AiApprovalSuggestionResponse {
  return {
    suggestion: 'manual_review',
    confidence: 0,
    riskLevel: 'high',
    reasoning: `AI 策略已阻止自动建议：${blockingReason}`,
    disclaimer: 'AI 建议不可用，请人工处理当前审批。',
    generatedAt: new Date().toISOString(),
  }
}

function buildReviewSummary(context: ApprovalAiContext): AiApprovalReviewSummary {
  const timeline = [
    `申请人 ${context.applicant} 发起「${context.title}」`,
    context.currentNodeName
      ? `当前流转至 ${context.currentNodeName}`
      : '当前节点信息待补充',
  ]

  if (context.deadlineAt)
    timeline.push(`SLA 截止时间：${context.deadlineAt}`)
  if (context.escalatedAt)
    timeline.push(`已于 ${context.escalatedAt} 触发 SLA 升级`)
  if ((context.remindCount ?? 0) > 0)
    timeline.push(`已催办 ${context.remindCount} 次`)
  if (context.latestComment)
    timeline.push(`最近处理意见：${context.latestComment}`)

  return {
    title: context.title,
    applicant: context.applicant,
    approvalType: context.type,
    amount: context.amount,
    currentNodeName: context.currentNodeName,
    timeline,
  }
}

function buildRiskPoints(
  context: ApprovalAiContext,
  policyMessages: string[] = [],
): AiApprovalRiskPoint[] {
  const points: AiApprovalRiskPoint[] = []
  const pushPoint = (point: AiApprovalRiskPoint) => {
    if (!points.some(item => item.title === point.title && item.detail === point.detail))
      points.push(point)
  }

  if (context.amount !== undefined && context.amount >= 50000) {
    pushPoint({
      level: 'high',
      title: '高金额审批',
      detail: `当前金额为 ${context.amount}，已达到高金额复核阈值，需要重点核对预算、合同或附件依据。`,
      source: 'policy',
    })
  }

  if (context.escalatedAt) {
    pushPoint({
      level: 'high',
      title: 'SLA 升级风险',
      detail: `审批已在 ${context.escalatedAt} 触发超时升级，建议优先人工处理并确认责任归属。`,
      source: 'workflow',
    })
  }

  if ((context.remindCount ?? 0) >= 3) {
    pushPoint({
      level: 'medium',
      title: '多次催办',
      detail: `当前审批已被催办 ${context.remindCount} 次，可能存在处理争议或业务紧急度较高。`,
      source: 'workflow',
    })
  }

  if (!context.description?.trim()) {
    pushPoint({
      level: 'medium',
      title: '描述信息不足',
      detail: '审批描述为空或过短，AI 无法完整判断业务必要性，建议审批人补充核对。',
      source: 'form',
    })
  }

  if (!context.latestAttachments?.length) {
    pushPoint({
      level: 'medium',
      title: '附件材料待核对',
      detail: '当前审批未提供最近附件信息，涉及费用、合同或证明类单据时需要人工确认材料完整性。',
      source: 'form',
    })
  }

  for (const message of policyMessages) {
    pushPoint({
      level: 'medium',
      title: '策略提示',
      detail: message,
      source: 'policy',
    })
  }

  if (!points.length) {
    pushPoint({
      level: 'low',
      title: '未发现明显规则风险',
      detail: '审批上下文未命中高金额、超时升级、多次催办、描述缺失或附件缺失等规则风险。',
      source: 'model',
    })
  }

  return points
}

function buildEvidenceTitle(segment: AiReasoningSegment, index: number): string {
  const prefix = `${index + 1}.`
  switch (segment.source) {
    case 'knowledge_base':
      return `${prefix} 制度知识库`
    case 'form_data':
      return `${prefix} 表单数据`
    case 'historical_data':
      return `${prefix} 历史轨迹`
    case 'model_judgment':
      return `${prefix} 模型判断`
    default:
      return `${prefix} 审查依据`
  }
}

function buildEvidenceItems(
  response: AiApprovalSuggestionResponse,
  context: ApprovalAiContext,
): AiApprovalEvidenceItem[] {
  if (response.reasoningSegments?.length) {
    return response.reasoningSegments.map((segment, index) => ({
      title: buildEvidenceTitle(segment, index),
      detail: segment.citation?.detail
        ? `${segment.content}（${segment.citation.detail}）`
        : segment.content,
      source: segment.source,
      confidence: segment.confidence,
    }))
  }

  const fallback: AiApprovalEvidenceItem[] = []
  if (context.formSummary && context.formSummary !== '无表单数据') {
    fallback.push({
      title: '1. 表单数据',
      detail: context.formSummary,
      source: 'form_data',
      confidence: 0.8,
    })
  }

  if (context.workflowSummary && context.workflowSummary !== '无流程实例信息') {
    fallback.push({
      title: `${fallback.length + 1}. 流程上下文`,
      detail: context.workflowSummary,
      source: 'historical_data',
      confidence: 0.72,
    })
  }

  if (context.trailSummary && context.trailSummary !== '无历史处理轨迹') {
    fallback.push({
      title: `${fallback.length + 1}. 审批轨迹`,
      detail: context.trailSummary,
      source: 'historical_data',
      confidence: 0.72,
    })
  }

  fallback.push({
    title: `${fallback.length + 1}. 模型判断`,
    detail: response.reasoning,
    source: 'model_judgment',
    confidence: response.confidence,
  })

  return fallback.slice(0, 4)
}

function enrichWithCopilotReview(
  response: AiApprovalSuggestionResponse,
  context: ApprovalAiContext,
  policyMessages: string[] = [],
): AiApprovalSuggestionResponse {
  return {
    ...response,
    reviewSummary: response.reviewSummary || buildReviewSummary(context),
    riskPoints: response.riskPoints?.length
      ? response.riskPoints
      : buildRiskPoints(context, policyMessages),
    evidenceItems: response.evidenceItems?.length
      ? response.evidenceItems
      : buildEvidenceItems(response, context),
  }
}

function toApprovalAiContext(record: ApprovalRecord): ApprovalAiContext {
  return {
    approvalId: record.id,
    title: record.title,
    type: record.type,
    applicant: record.applicant,
    amount: record.amount,
    description: record.description,
    currentNodeName: record.currentNodeName,
    deadlineAt: record.deadlineAt,
    escalatedAt: record.escalatedAt,
    remindCount: record.remindCount,
    latestComment: record.latestComment,
    latestAttachments: record.latestAttachments,
    workflowSummary: buildWorkflowSummary(record),
    trailSummary: buildTrailSummary(record),
    formSummary: buildFormSummary(record),
  }
}

function buildWorkflowSummary(record: ApprovalRecord): string {
  const instance = record.workflowInstance
  if (!instance)
    return '无流程实例信息'

  const assignees = instance.currentNodeAssignees?.map(item => item.name || item.id).filter(Boolean).join('、') || '-'
  const progress = instance.progress ? `${instance.progress.completed}/${instance.progress.total}` : '-'

  return [
    `node=${instance.currentNodeId || '-'}`,
    `mode=${instance.currentNodeMode || '-'}`,
    `assignees=${assignees}`,
    `progress=${progress}`,
  ].join('; ')
}

function buildTrailSummary(record: ApprovalRecord): string {
  const trail = (record.operatorTrail || [])
    .slice(0, 6)
    .map((item) => {
      const target = item.targetUserName || item.targetUserId
      const targetSuffix = target ? ` -> ${target}` : ''
      const comment = item.comment ? ` (${item.comment})` : ''
      return `${item.action}${targetSuffix}:${item.operatorName || '系统'}${comment}`
    })

  return trail.length ? trail.join(' | ') : '无历史处理轨迹'
}

function buildFormSummary(record: ApprovalRecord): string {
  const formData = record.formData || {}
  const entries = Object.entries(formData)
    .slice(0, 10)
    .map(([key, value]) => `${key}=${formatFieldValue(value)}`)

  return entries.length ? entries.join('; ') : '无表单数据'
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined)
    return '-'

  if (typeof value === 'string')
    return value

  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value)

  try {
    return JSON.stringify(value)
  }
  catch {
    return String(value)
  }
}

export async function runApprovalSuggestion(
  store: RuntimeStore,
  approvalId: string,
) {
  const context = await buildApprovalAiContext(store, approvalId)
  if (!context)
    return null

  const policyResult = checkAiSuggestionPolicy(context)
  if (!policyResult.allowed) {
    const blockingMessages = policyResult.blockingRules.map(r => r.message)
    return enrichWithCopilotReview(
      buildPolicyBlockedFallback(blockingMessages.join('；')),
      context,
      blockingMessages,
    )
  }

  const warnings = policyResult.warningRules.map(r => r.message)
  const result = await generateApprovalSuggestion(context, warnings.length > 0 ? warnings : undefined)
  return enrichWithCopilotReview(result, context, warnings)
}

export async function runApprovalSuggestionStream(
  store: RuntimeStore,
  approvalId: string,
  onChunk: (chunk: string) => void,
  onSegment?: (segments: AiReasoningSegment[]) => void,
  onUncertainty?: (uncertainties: AiUncertainty[]) => void,
) {
  const context = await buildApprovalAiContext(store, approvalId)
  if (!context)
    return null

  const policyResult = checkAiSuggestionPolicy(context)
  if (!policyResult.allowed) {
    const blockingMessages = policyResult.blockingRules.map(r => r.message)
    const blocked = buildPolicyBlockedFallback(
      blockingMessages.join('；'),
    )
    const enriched = enrichWithCopilotReview(blocked, context, blockingMessages)
    for (const chunk of blocked.reasoning.match(/.{1,24}/gs) || [blocked.reasoning])
      onChunk(chunk)
    return enriched
  }

  const warnings = policyResult.warningRules.map(r => r.message)
  const result = await streamApprovalSuggestion(
    context,
    onChunk,
    onSegment,
    onUncertainty,
    warnings.length > 0 ? warnings : undefined,
  )
  return enrichWithCopilotReview(result, context, warnings)
}
