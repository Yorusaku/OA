import type { ApprovalRecord } from '../domain'
import type { RuntimeStore } from '../store'
import { getApprovalDetail } from './approval-service'
import { generateApprovalSuggestion, type ApprovalAiContext, streamApprovalSuggestion } from './ai-service'

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

  return generateApprovalSuggestion(context)
}

export async function runApprovalSuggestionStream(
  store: RuntimeStore,
  approvalId: string,
  onChunk: (chunk: string) => void,
) {
  const context = await buildApprovalAiContext(store, approvalId)
  if (!context)
    return null

  return streamApprovalSuggestion(context, onChunk)
}
