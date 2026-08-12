/**
 * @file useAiPolicy.ts
 * @description AI Policy 前端 Composable
 * 获取 AI 策略配置，计算前端 UI 状态（灰态卡片、警告横幅、策略声明）
 */

import type { AiPolicy, AiPolicyValidationResult } from '@oa/contracts'
import { computed, type ComputedRef, type Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { fetchAiPolicy } from '@/api/ai'
import { queryKeys } from '@/api/queryKeys'

export interface AiPolicyUiState {
  /** 是否强制灰色卡片（AI 功能完全不可用） */
  forceGreyCard: ComputedRef<boolean>
  /** 是否显示黄色警告横幅 */
  showWarningBanner: ComputedRef<boolean>
  /** 策略声明文本 */
  policyDisclaimer: ComputedRef<string>
  /** 原始策略数据 */
  policy: ComputedRef<AiPolicy | undefined>
  /** 加载中 */
  isLoading: Ref<boolean>
  /** 根据审批上下文计算本地策略状态（用于 mock 模式下无需 BFF 的状态推导） */
  clientCheck: (context: Record<string, unknown>) => AiPolicyValidationResult
}

/**
 * AI Policy 前端 Hook
 * 获取全局 AI 策略配置，计算 UI 状态
 */
export function useAiPolicy(): AiPolicyUiState {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.ai.policy,
    queryFn: fetchAiPolicy,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const policy = computed(() => data.value)

  /**
   * 纯客户端侧策略校验（用于 mock 模式或本地状态推导）
   */
  function clientCheck(context: Record<string, unknown>): AiPolicyValidationResult {
    const rules = data.value?.rules ?? []
    const applicableRules = rules
      .filter(rule => rule.scope === 'approval_suggestion')
      .sort((a, b) => b.priority - a.priority)

    const blockingRules: AiPolicy['rules'] = []
    const warningRules: AiPolicy['rules'] = []

    for (const rule of applicableRules) {
      const allConditionsMet = rule.conditions.every((cond) => {
        const rawValue = context[cond.field]
        switch (cond.operator) {
          case 'exists': return rawValue !== undefined && rawValue !== null
          case 'not_exists': return rawValue === undefined || rawValue === null
          case 'eq': return rawValue === cond.value
          case 'neq': return rawValue !== cond.value
          case 'gt': return typeof rawValue === 'number' && typeof cond.value === 'number' ? rawValue > cond.value : false
          case 'gte': return typeof rawValue === 'number' && typeof cond.value === 'number' ? rawValue >= cond.value : false
          case 'lt': return typeof rawValue === 'number' && typeof cond.value === 'number' ? rawValue < cond.value : false
          case 'lte': return typeof rawValue === 'number' && typeof cond.value === 'number' ? rawValue <= cond.value : false
          default: return false
        }
      })

      if (!allConditionsMet) continue
      if (rule.effect === 'block') blockingRules.push(rule)
      else if (rule.effect === 'warn') warningRules.push(rule)
    }

    const allowed = blockingRules.length === 0
    const effect = allowed ? (warningRules.length > 0 ? 'warn' : 'allow') : 'block'

    return { allowed, effect, blockingRules, warningRules, disclaimer: '' }
  }

  /**
   * 全局策略声明（所有审批通用）
   */
  const policyDisclaimer = computed(() => {
    const rules = data.value?.rules ?? []
    if (!rules.length) return ''
    const warnRules = rules.filter(r => r.effect === 'warn')
    const blockRules = rules.filter(r => r.effect === 'block')
    const parts: string[] = []
    if (blockRules.length > 0)
      parts.push(`${blockRules.length} 条阻断规则生效中`)
    if (warnRules.length > 0)
      parts.push(`${warnRules.length} 条警告规则生效中`)
    return parts.join('；')
  })

  // 全局层面（policy 加载后），不根据具体审批上下文判断是否灰态
  // 灰态判断由具体审批上下文决定（通过 clientCheck）
  const forceGreyCard = computed<boolean>(() => false)
  const showWarningBanner = computed<boolean>(() => (data.value?.rules ?? []).some(r => r.effect === 'warn'))

  return {
    forceGreyCard,
    showWarningBanner,
    policyDisclaimer,
    policy,
    isLoading,
    clientCheck,
  }
}
