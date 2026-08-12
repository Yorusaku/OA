import type { AiActionScope, AiPolicy, AiPolicyRule, AiPolicyValidationResult } from '@oa/contracts'

/**
 * 默认 AI 策略 — 5 条典型规则覆盖常见风险场景
 */
export const DEFAULT_AI_POLICY: AiPolicy = {
  version: '1.0.0',
  updatedAt: '2026-08-12T00:00:00.000Z',
  rules: [
    {
      id: 'rule-escalated-block',
      description: '已超时升级的审批单禁止 AI 生成建议',
      scope: 'approval_suggestion',
      effect: 'block',
      priority: 100,
      conditions: [
        { field: 'escalatedAt', operator: 'exists' },
      ],
      message: '当前审批已超时升级，AI 建议不可用，请人工紧急处理',
    },
    {
      id: 'rule-high-amount-warn',
      description: '金额超过 50000 的审批单触发 AI 警告',
      scope: 'approval_suggestion',
      effect: 'warn',
      priority: 90,
      conditions: [
        { field: 'amount', operator: 'gte', value: 50000 },
      ],
      message: '当前审批金额较高（≥50,000），AI 建议仅供有限参考，务必人工核对金额依据',
    },
    {
      id: 'rule-delegation-warn',
      description: '代理审批场景下 AI 建议附加警告',
      scope: 'approval_suggestion',
      effect: 'warn',
      priority: 80,
      conditions: [
        { field: 'isDelegated', operator: 'eq', value: true },
      ],
      message: '当前为代理审批，AI 建议可能未考虑代理人与原审批人的权限差异，请审慎参考',
    },
    {
      id: 'rule-high-remind-warn',
      description: '催办超过 3 次的审批单降低 AI 置信度',
      scope: 'approval_suggestion',
      effect: 'warn',
      priority: 70,
      conditions: [
        { field: 'remindCount', operator: 'gte', value: 3 },
      ],
      message: '当前审批已被多次催办（≥3 次），可能存在处理争议，AI 建议仅供参考',
    },
    {
      id: 'rule-no-description-warn',
      description: '缺少审批描述的审批单触发警告',
      scope: 'approval_suggestion',
      effect: 'warn',
      priority: 60,
      conditions: [
        { field: 'description', operator: 'not_exists' },
      ],
      message: '当前审批缺少详细描述，AI 可能因信息不足而无法给出准确建议',
    },
  ],
}

/**
 * 读取当前生效的 AI 策略
 */
export function getActivePolicy(): AiPolicy {
  return DEFAULT_AI_POLICY
}

/**
 * 纯函数：评估规则条件是否满足
 */
function evaluateCondition(
  condition: AiPolicyRule['conditions'][number],
  context: Record<string, unknown>,
): boolean {
  const rawValue = context[condition.field]

  switch (condition.operator) {
    case 'exists':
      return rawValue !== undefined && rawValue !== null
    case 'not_exists':
      return rawValue === undefined || rawValue === null
    case 'eq':
      return rawValue === condition.value
    case 'neq':
      return rawValue !== condition.value
    case 'gt':
      return typeof rawValue === 'number' && typeof condition.value === 'number'
        ? rawValue > condition.value
        : false
    case 'gte':
      return typeof rawValue === 'number' && typeof condition.value === 'number'
        ? rawValue >= condition.value
        : false
    case 'lt':
      return typeof rawValue === 'number' && typeof condition.value === 'number'
        ? rawValue < condition.value
        : false
    case 'lte':
      return typeof rawValue === 'number' && typeof condition.value === 'number'
        ? rawValue <= condition.value
        : false
    case 'includes':
      return typeof rawValue === 'string' && typeof condition.value === 'string'
        ? rawValue.includes(condition.value)
        : false
    default:
      return false
  }
}

/**
 * 纯函数：遍历策略规则，评估 AI 动作是否被允许
 */
export function validateAiAction(
  policy: AiPolicy,
  scope: AiActionScope,
  context: Record<string, unknown>,
): AiPolicyValidationResult {
  const applicableRules = policy.rules
    .filter(rule => rule.scope === scope)
    .sort((a, b) => b.priority - a.priority)

  const blockingRules: AiPolicyRule[] = []
  const warningRules: AiPolicyRule[] = []

  for (const rule of applicableRules) {
    const allConditionsMet = rule.conditions.every(cond =>
      evaluateCondition(cond, context),
    )

    if (!allConditionsMet)
      continue

    if (rule.effect === 'block') {
      blockingRules.push(rule)
    }
    else if (rule.effect === 'warn') {
      warningRules.push(rule)
    }
  }

  const allowed = blockingRules.length === 0
  const effect: AiPolicy['rules'][number]['effect'] = allowed
    ? (warningRules.length > 0 ? 'warn' : 'allow')
    : 'block'

  const disclaimer = [
    'AI 建议仅供参考，最终以人工审批为准',
    ...blockingRules.map(r => `[已阻止] ${r.message}`),
    ...warningRules.map(r => `[请注意] ${r.message}`),
  ].join('\n')

  return {
    allowed,
    effect,
    blockingRules,
    warningRules,
    disclaimer,
  }
}
