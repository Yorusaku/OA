/**
 * @file usePromptTemplate.ts
 * @description Prompt 模板管理前端 Composable
 */

import type { CreatePromptTemplateRequest, PromptTemplate, UpdatePromptTemplateRequest } from '@oa/contracts'
import { computed, type Ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  activatePromptTemplate,
  createPromptTemplate,
  deletePromptTemplate,
  getPromptTemplate,
  listPromptTemplates,
  testPromptTemplate,
  updatePromptTemplate,
} from '@/api/ai'
import { queryKeys } from '@/api/queryKeys'

const BASE_KEY = ['ai', 'prompt-templates'] as const

/**
 * Prompt 模板列表
 */
export function usePromptTemplateList(query: Ref<Record<string, unknown>>) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: computed(() => queryKeys.ai.promptTemplates(query.value)),
    queryFn: () => listPromptTemplates(query.value),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  })

  return {
    templates: data as Ref<PromptTemplate[] | undefined>,
    isLoading,
    refetch,
  }
}

/**
 * 单个模板详情
 */
export function usePromptTemplateDetail(id: Ref<string>) {
  const { data, isLoading } = useQuery({
    queryKey: computed(() => queryKeys.ai.promptTemplateDetail(id.value)),
    queryFn: () => getPromptTemplate(id.value),
    staleTime: 30 * 1000,
    enabled: computed(() => !!id.value),
  })

  return {
    template: data as Ref<PromptTemplate | undefined>,
    isLoading,
  }
}

/**
 * 创建模板
 */
export function useCreatePromptTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePromptTemplateRequest) => createPromptTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BASE_KEY })
    },
  })
}

/**
 * 更新模板
 */
export function useUpdatePromptTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: UpdatePromptTemplateRequest }) =>
      updatePromptTemplate(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BASE_KEY })
    },
  })
}

/**
 * 删除模板
 */
export function useDeletePromptTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePromptTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BASE_KEY })
    },
  })
}

/**
 * 激活模板
 */
export function useActivatePromptTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => activatePromptTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BASE_KEY })
    },
  })
}

/**
 * 测试模板
 */
export function useTestPromptTemplate() {
  return useMutation({
    mutationFn: testPromptTemplate,
  })
}
