/**
 * @file useAiAudit.ts
 * @description AI 决策审计前端 Composable
 * 提供 AI 建议采纳/覆盖反馈、准确率统计、审计日志查询
 */

import type { AiAuditStats, PageResult } from '@oa/contracts'
import { computed, type Ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  acceptAiSuggestion,
  getAiAuditLogs,
  getAiAuditStats,
  overrideAiSuggestion,
  type AcceptAiSuggestionInput,
  type OverrideAiSuggestionInput,
} from '@/api/ai'
import { queryKeys } from '@/api/queryKeys'

// AI 审计相关的基础 queryKey，用于 invalidation
const AI_AUDIT_STATS_KEY = ['ai', 'audit', 'stats'] as const
const AI_AUDIT_LOGS_BASE_KEY = ['ai', 'audit', 'logs'] as const

export interface UseAiAuditStatsReturn {
  stats: Ref<AiAuditStats | undefined>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
}

/**
 * AI 审计统计数据
 */
export function useAiAuditStats(): UseAiAuditStatsReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: AI_AUDIT_STATS_KEY,
    queryFn: getAiAuditStats,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })

  return {
    stats: data as Ref<AiAuditStats | undefined>,
    isLoading,
    error: error as Ref<Error | null>,
  }
}

export interface UseAiAuditLogsReturn {
  data: Ref<PageResult<unknown> | undefined>
  isLoading: Ref<boolean>
}

/**
 * AI 审计日志分页查询
 */
export function useAiAuditLogs(query: Ref<Record<string, unknown>>): UseAiAuditLogsReturn {
  const { data, isLoading } = useQuery({
    queryKey: computed(() => queryKeys.ai.auditLogs(query.value)),
    queryFn: () => getAiAuditLogs(query.value),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  })

  return {
    data: data as Ref<PageResult<unknown> | undefined>,
    isLoading,
  }
}

/**
 * 采纳 AI 建议 mutation
 */
export function useAcceptAiSuggestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: AcceptAiSuggestionInput) => acceptAiSuggestion(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_AUDIT_STATS_KEY })
      queryClient.invalidateQueries({ queryKey: AI_AUDIT_LOGS_BASE_KEY })
    },
  })
}

/**
 * 覆盖 AI 建议 mutation
 */
export function useOverrideAiSuggestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: OverrideAiSuggestionInput) => overrideAiSuggestion(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_AUDIT_STATS_KEY })
      queryClient.invalidateQueries({ queryKey: AI_AUDIT_LOGS_BASE_KEY })
    },
  })
}
