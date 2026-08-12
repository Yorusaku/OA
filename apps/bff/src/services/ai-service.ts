import type { AiApprovalSuggestionResponse, AiPolicyValidationResult, AiReasoningSegment, AiSuggestionDecision, AiSuggestionRiskLevel, AiUncertainty } from '@oa/contracts'
import { createLLM } from '@oa/ai-utils'
import { z } from 'zod'
import { getActivePolicy, validateAiAction } from './ai-policy-service'
import { getActiveTemplateForScope, renderPrompt, getPromptTemplateStore, ensureDefaultTemplate } from './prompt-template-service'

const FALLBACK_DISCLAIMER = 'AI 建议仅供参考，最终以人工审批为准'

const SuggestionSchema = z.object({
  suggestion: z.enum(['approve', 'reject', 'manual_review']),
  confidence: z.number().min(0).max(1),
  riskLevel: z.enum(['low', 'medium', 'high']),
  reasoning: z.string().min(1),
})

export interface ApprovalAiContext {
  approvalId: string
  title: string
  type: string
  applicant: string
  amount?: number
  description?: string
  currentNodeName?: string
  deadlineAt?: string
  escalatedAt?: string
  remindCount?: number
  latestComment?: string
  latestAttachments?: string[]
  workflowSummary: string
  trailSummary: string
  formSummary: string
}

function contextToVariables(ctx: ApprovalAiContext, policyWarnings?: string[]): Record<string, string> {
  return {
    approvalId: ctx.approvalId,
    title: ctx.title,
    type: ctx.type,
    applicant: ctx.applicant,
    amount: ctx.amount !== undefined ? String(ctx.amount) : '-',
    description: ctx.description || '-',
    currentNodeName: ctx.currentNodeName || '-',
    deadlineAt: ctx.deadlineAt || '-',
    escalatedAt: ctx.escalatedAt || '-',
    remindCount: String(ctx.remindCount ?? 0),
    latestComment: ctx.latestComment || '-',
    latestAttachments: ctx.latestAttachments?.join('、') || '-',
    workflowSummary: ctx.workflowSummary,
    trailSummary: ctx.trailSummary,
    formSummary: ctx.formSummary,
    policyWarnings: policyWarnings?.length
      ? policyWarnings.map(w => `- ${w}`).join('\n')
      : '',
  }
}

function buildSystemPrompt(ctx: ApprovalAiContext, policyWarnings?: string[]): string {
  // 确保默认模板存在
  ensureDefaultTemplate()
  const store = getPromptTemplateStore()
  const template = getActiveTemplateForScope(store, 'approval_suggestion')
  const variables = contextToVariables(ctx, policyWarnings)

  if (template) {
    return renderPrompt(template.systemPrompt, variables)
  }

  // Fallback: 硬编码 prompt
  const warningLines = policyWarnings?.length
    ? [
        '',
        '【AI 策略警告 - 请降低建议置信度】',
        ...policyWarnings.map(w => `- ${w}`),
        '',
      ].join('\n')
    : ''

  return [
    '你是企业 OA 审批辅助助手，只能给出建议，不能替代人工审批。',
    '请基于审批单关键信息、表单摘要、流程节点、历史轨迹、SLA 与代理信息进行判断。',
    warningLines,
    `审批单号: ${ctx.approvalId}`,
    `标题: ${ctx.title}`,
    `类型: ${ctx.type}`,
    `申请人: ${ctx.applicant}`,
    `金额: ${ctx.amount ?? '-'}`,
    `描述: ${ctx.description ?? '-'}`,
    `当前节点: ${ctx.currentNodeName ?? '-'}`,
    `SLA 截止: ${ctx.deadlineAt ?? '-'}`,
    `超时升级: ${ctx.escalatedAt ?? '-'}`,
    `催办次数: ${ctx.remindCount ?? 0}`,
    `最近意见: ${ctx.latestComment ?? '-'}`,
    `最近附件: ${ctx.latestAttachments?.join('、') || '-'}`,
    `流程摘要: ${ctx.workflowSummary}`,
    `轨迹摘要: ${ctx.trailSummary}`,
    `表单摘要: ${ctx.formSummary}`,
    '',
    '请根据以上上下文返回审批建议 JSON，不要输出 Markdown 或额外说明。',
    '',
    '【推理依据标注规则】在 reasoning 字段中，按以下格式标注每条推理的来源：',
    '[source:knowledge_base]基于知识库策略的推理...[/source]',
    '[source:form_data]基于表单数据的推理...[/source]',
    '[source:historical_data]基于历史审批的推理...[/source]',
    '[source:model_judgment]基于模型判断的推理...[/source]',
    '如果存在不确定性，请标注：',
    '[uncertainty:topic=不确定主题|level=low/medium/high|action=建议采取的行动]不确定内容描述...[/uncertainty]',
  ].filter(Boolean).join('\n')
}

function buildUserPrompt(): string {
  const template = getActiveTemplateForScope(getPromptTemplateStore(), 'approval_suggestion')
  if (template)
    return template.userPrompt
  return '请根据以上上下文返回审批建议 JSON，不要输出 Markdown 或额外说明。'
}

function normalizeResponse(
  parsed: z.infer<typeof SuggestionSchema>,
  usage?: AiApprovalSuggestionResponse['usage'],
): AiApprovalSuggestionResponse {
  const rawReasoning = parsed.reasoning.trim()
  return {
    suggestion: parsed.suggestion,
    confidence: parsed.confidence,
    riskLevel: parsed.riskLevel,
    reasoning: stripExplainabilityTags(rawReasoning),
    disclaimer: FALLBACK_DISCLAIMER,
    generatedAt: new Date().toISOString(),
    usage,
    reasoningSegments: parseReasoningSegments(rawReasoning),
    uncertainties: parseUncertainties(rawReasoning),
  }
}

function buildFallbackResponse(message: string, options?: {
  confidence?: number
  riskLevel?: AiSuggestionRiskLevel
  suggestion?: AiSuggestionDecision
}): AiApprovalSuggestionResponse {
  return {
    suggestion: options?.suggestion ?? 'manual_review',
    confidence: options?.confidence ?? 0.3,
    riskLevel: options?.riskLevel ?? 'medium',
    reasoning: message,
    disclaimer: FALLBACK_DISCLAIMER,
    generatedAt: new Date().toISOString(),
  }
}

function extractResponseText(content: unknown): string {
  if (typeof content === 'string')
    return content

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string')
          return item

        if (item && typeof item === 'object') {
          const maybeText = (item as { text?: unknown }).text
          return typeof maybeText === 'string' ? maybeText : ''
        }

        return ''
      })
      .join('')
  }

  return ''
}

function parseStructuredSuggestion(content: string): z.infer<typeof SuggestionSchema> {
  const jsonText = content
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  const parsedJson = JSON.parse(jsonText) as unknown
  return SuggestionSchema.parse(parsedJson)
}

function splitReasoning(reasoning: string): string[] {
  const normalized = reasoning.trim()
  if (!normalized)
    return []

  const chunks = normalized.match(/.{1,24}/gs)
  return chunks?.length ? chunks : [normalized]
}

// ========== 可解释性：引用溯源解析 ==========

const SOURCE_PATTERN = /\[source:(\w+)\]([\s\S]*?)\[\/source\]/g
const UNCERTAINTY_PATTERN = /\[uncertainty:\s*topic=([^|\]]+)\|level=(\w+)\|action=([^\]]*)\]([\s\S]*?)\[\/uncertainty\]/g

function getSourceConfidence(source: string): number {
  switch (source) {
    case 'knowledge_base': return 0.85
    case 'historical_data': return 0.8
    case 'form_data': return 0.95
    case 'model_judgment': return 0.65
    default: return 0.5
  }
}

export function parseReasoningSegments(reasoning: string): AiReasoningSegment[] {
  const segments: AiReasoningSegment[] = []
  const matches = reasoning.matchAll(SOURCE_PATTERN)

  for (const match of matches) {
    const source = match[1] as AiReasoningSegment['source']
    const content = match[2].trim()
    if (!content)
      continue

    const segment: AiReasoningSegment = {
      content,
      source,
      confidence: getSourceConfidence(source),
    }

    // 知识库来源尝试提取引用信息
    if (source === 'knowledge_base') {
      const docMatch = content.match(/文档[：:]\s*(.+?)(?:[，,.]|$)/)
      if (docMatch) {
        segment.citation = {
          documentId: `doc-${docMatch[1].replace(/\s/g, '-')}`,
          detail: docMatch[1],
        }
      }
    }

    if (source === 'form_data') {
      const fieldMatch = content.match(/「(.+?)」|"(.+?)"/)
      segment.citation = {
        fieldName: fieldMatch?.[1] || fieldMatch?.[2],
        detail: fieldMatch?.[1] || fieldMatch?.[2] || content.slice(0, 40),
      }
    }

    if (source === 'historical_data') {
      const approvalMatch = content.match(/审批[：:]\s*(.+?)(?:[，,.]|$)/i)
      segment.citation = {
        approvalId: approvalMatch ? `approval-${approvalMatch[1].replace(/\s/g, '-')}` : undefined,
        detail: approvalMatch?.[1] || content.slice(0, 40),
      }
    }

    segments.push(segment)
  }

  return segments
}

export function parseUncertainties(reasoning: string): AiUncertainty[] {
  const uncertainties: AiUncertainty[] = []
  const matches = reasoning.matchAll(UNCERTAINTY_PATTERN)

  for (const match of matches) {
    uncertainties.push({
      topic: match[1].trim(),
      level: match[2].trim() as AiUncertainty['level'],
      suggestedAction: match[3].trim(),
      description: match[4].trim(),
    })
  }

  return uncertainties
}

export function stripExplainabilityTags(reasoning: string): string {
  return reasoning
    .replace(SOURCE_PATTERN, (_full, _source, content: string) => content)
    .replace(UNCERTAINTY_PATTERN, (_full, _topic, _level, _action, content: string) => content)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function generateApprovalSuggestion(
  context: ApprovalAiContext,
  policyWarnings?: string[],
): Promise<AiApprovalSuggestionResponse> {
  try {
    const llm = createLLM({ temperature: 0.2, maxTokens: 512 })
    const response = await llm.invoke([
      { role: 'system', content: buildSystemPrompt(context, policyWarnings) },
      { role: 'user', content: buildUserPrompt() },
    ])

    const content = extractResponseText(response.content)
    const parsed = parseStructuredSuggestion(content)

    return normalizeResponse(parsed, response.usage)
  }
  catch (error) {
    const message = error instanceof Error
      ? error.message.includes('ARK_API_KEY')
        ? 'AI 服务未完成配置，请人工判断当前审批。'
        : `AI 建议生成失败，请人工判断。原因：${error.message}`
      : 'AI 建议生成失败，请人工判断。'

    return buildFallbackResponse(message)
  }
}

export async function streamApprovalSuggestion(
  context: ApprovalAiContext,
  onChunk: (chunk: string) => void,
  onSegment?: (segments: AiReasoningSegment[]) => void,
  onUncertainty?: (uncertainties: AiUncertainty[]) => void,
  policyWarnings?: string[],
): Promise<AiApprovalSuggestionResponse> {
  const result = await generateApprovalSuggestion(context, policyWarnings)
  for (const chunk of splitReasoning(result.reasoning))
    onChunk(chunk)

  // 发送溯源 segments
  if (result.reasoningSegments?.length) {
    onSegment?.(result.reasoningSegments)
  }

  // 发送不确定性标注
  if (result.uncertainties?.length) {
    onUncertainty?.(result.uncertainties)
  }

  return result
}

/**
 * 对审批建议场景执行 AI Policy 校验
 * 返回 blocked 时调用方应直接返回 fallback 响应，不调用 LLM
 */
export function checkAiSuggestionPolicy(context: ApprovalAiContext): AiPolicyValidationResult {
  const policy = getActivePolicy()

  const policyContext: Record<string, unknown> = {
    escalatedAt: context.escalatedAt,
    amount: context.amount,
    isDelegated: context.workflowSummary?.includes('delegate'),
    remindCount: context.remindCount,
    description: context.description,
  }

  return validateAiAction(policy, 'approval_suggestion', policyContext)
}
