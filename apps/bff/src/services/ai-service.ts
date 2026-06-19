import type { AiApprovalSuggestionResponse, AiSuggestionDecision, AiSuggestionRiskLevel } from '@oa/contracts'
import { createLLM } from '@oa/ai-utils'
import { z } from 'zod'

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

function buildSystemPrompt(ctx: ApprovalAiContext): string {
  return [
    '你是企业 OA 审批辅助助手，只能给出建议，不能替代人工审批。',
    '请基于审批单关键信息、表单摘要、流程节点、历史轨迹、SLA 与代理信息进行判断。',
    '请遵循 Human-in-the-Loop 原则：信息不足、规则冲突、金额异常、升级/代理场景不清晰时，优先返回 manual_review。',
    '你必须输出严格 JSON，字段仅包含 suggestion、confidence、riskLevel、reasoning。',
    'suggestion 只能是 approve、reject、manual_review。',
    'confidence 范围 0 到 1，riskLevel 只能是 low、medium、high。',
    'reasoning 用中文，给出 2 到 4 条简明依据，并明确说明为什么建议人工判断或建议通过/驳回。',
    '',
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
    '最小判断规则：',
    '1. 金额高、信息缺失、历史意见冲突时，提升 riskLevel，必要时 manual_review。',
    '2. 若当前已超时升级或代理处理，除非依据非常充分，否则 confidence 不宜过高。',
    '3. 若描述、金额、类型与表单摘要明显一致且历史处理轨迹清晰，可给 approve 或 reject。',
    '4. 不得虚构制度条款，不得假设不存在的附件内容。',
  ].join('\n')
}

function buildUserPrompt(): string {
  return '请根据以上上下文返回审批建议 JSON，不要输出 Markdown 或额外说明。'
}

function normalizeResponse(
  parsed: z.infer<typeof SuggestionSchema>,
  usage?: AiApprovalSuggestionResponse['usage'],
): AiApprovalSuggestionResponse {
  return {
    suggestion: parsed.suggestion,
    confidence: parsed.confidence,
    riskLevel: parsed.riskLevel,
    reasoning: parsed.reasoning.trim(),
    disclaimer: FALLBACK_DISCLAIMER,
    generatedAt: new Date().toISOString(),
    usage,
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

export async function generateApprovalSuggestion(
  context: ApprovalAiContext,
): Promise<AiApprovalSuggestionResponse> {
  try {
    const llm = createLLM({ temperature: 0.2, maxTokens: 512 })
    const response = await llm.invoke([
      { role: 'system', content: buildSystemPrompt(context) },
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
): Promise<AiApprovalSuggestionResponse> {
  const result = await generateApprovalSuggestion(context)
  for (const chunk of splitReasoning(result.reasoning))
    onChunk(chunk)
  return result
}
