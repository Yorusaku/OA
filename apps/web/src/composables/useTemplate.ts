/**
 * @file useTemplate.ts
 * @description 模板市场相关 Composables
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRef } from 'vue'
import { unref } from 'vue'
import {
  createTemplate,
  createTemplateReview,
  deleteTemplate,
  getMyInstallRecords,
  getMyTemplates,
  getPopularTags,
  getTemplateDetail,
  getTemplateList,
  getTemplateReviews,
  installTemplate,
  likeTemplateReview,
  publishTemplate,
  toggleTemplateStatus,
  updateTemplate,
} from '@/api/template'
import { queryKeys } from '@/api/queryKeys'
import type {
  ApplicationTemplate,
  TemplateConfig,
  TemplateInstallRecord,
  TemplateReview,
  TemplateSearchParams,
} from '@/types/application'
import type { PageResult } from '@/types/common'

/**
 * 获取模板列表
 */
export function useTemplateList(params: MaybeRef<TemplateSearchParams>) {
  return useQuery<PageResult<ApplicationTemplate>>({
    queryKey: queryKeys.template.list(params),
    queryFn: () => getTemplateList(unref(params)),
    staleTime: 60 * 1000, // 60 秒缓存
  })
}

/**
 * 获取模板详情
 */
export function useTemplateDetail(id: MaybeRef<string>) {
  return useQuery<ApplicationTemplate | null>({
    queryKey: queryKeys.template.detail(unref(id)),
    queryFn: () => getTemplateDetail(unref(id)),
    staleTime: 5 * 60 * 1000, // 5 分钟缓存
    enabled: () => !!unref(id),
  })
}

/**
 * 获取模板评论列表
 */
export function useTemplateReviews(
  templateId: MaybeRef<string>,
  page: MaybeRef<number> = 1,
  pageSize: MaybeRef<number> = 10,
) {
  return useQuery<PageResult<TemplateReview>>({
    queryKey: queryKeys.template.reviews(unref(templateId), unref(page), unref(pageSize)),
    queryFn: () => getTemplateReviews(unref(templateId), unref(page), unref(pageSize)),
    staleTime: 2 * 60 * 1000, // 2 分钟缓存
    enabled: () => !!unref(templateId),
  })
}

/**
 * 获取我的模板列表
 */
export function useMyTemplates(
  page: MaybeRef<number> = 1,
  pageSize: MaybeRef<number> = 10,
) {
  return useQuery<PageResult<ApplicationTemplate>>({
    queryKey: queryKeys.template.myTemplates(unref(page), unref(pageSize)),
    queryFn: () => getMyTemplates(unref(page), unref(pageSize)),
    staleTime: 60 * 1000, // 60 秒缓存
  })
}

/**
 * 获取我的安装记录
 */
export function useMyInstallRecords(
  page: MaybeRef<number> = 1,
  pageSize: MaybeRef<number> = 10,
) {
  return useQuery<PageResult<TemplateInstallRecord>>({
    queryKey: queryKeys.template.installRecords(unref(page), unref(pageSize)),
    queryFn: () => getMyInstallRecords(unref(page), unref(pageSize)),
    staleTime: 60 * 1000, // 60 秒缓存
  })
}

/**
 * 获取热门标签
 */
export function usePopularTags() {
  return useQuery<Array<{ tag: string, count: number }>>({
    queryKey: queryKeys.template.popularTags(),
    queryFn: () => getPopularTags(),
    staleTime: 10 * 60 * 1000, // 10 分钟缓存
  })
}

/**
 * 创建模板
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (config: TemplateConfig) => createTemplate(config),
    onSuccess: () => {
      // 使模板列表缓存失效
      queryClient.invalidateQueries({ queryKey: queryKeys.template.list() })
      queryClient.invalidateQueries({ queryKey: queryKeys.template.myTemplates() })
    },
  })
}

/**
 * 更新模板
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, config }: { id: string, config: Partial<TemplateConfig> }) =>
      updateTemplate(id, config),
    onSuccess: (data) => {
      // 使相关缓存失效
      queryClient.invalidateQueries({ queryKey: queryKeys.template.list() })
      queryClient.invalidateQueries({ queryKey: queryKeys.template.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.template.myTemplates() })
    },
  })
}

/**
 * 删除模板
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      // 使模板列表缓存失效
      queryClient.invalidateQueries({ queryKey: queryKeys.template.list() })
      queryClient.invalidateQueries({ queryKey: queryKeys.template.myTemplates() })
    },
  })
}

/**
 * 发布模板
 */
export function usePublishTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => publishTemplate(id),
    onSuccess: (data) => {
      // 使相关缓存失效
      queryClient.invalidateQueries({ queryKey: queryKeys.template.list() })
      queryClient.invalidateQueries({ queryKey: queryKeys.template.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.template.myTemplates() })
    },
  })
}

/**
 * 切换模板状态
 */
export function useToggleTemplateStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string, status: 'published' | 'disabled' }) =>
      toggleTemplateStatus(id, status),
    onSuccess: (data) => {
      // 使相关缓存失效
      queryClient.invalidateQueries({ queryKey: queryKeys.template.list() })
      queryClient.invalidateQueries({ queryKey: queryKeys.template.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.template.myTemplates() })
    },
  })
}

/**
 * 安装模板
 */
export function useInstallTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, applicationName }: { templateId: string, applicationName?: string }) =>
      installTemplate(templateId, applicationName),
    onSuccess: (data) => {
      // 使相关缓存失效
      queryClient.invalidateQueries({ queryKey: queryKeys.template.detail(data.templateId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.template.installRecords() })
      queryClient.invalidateQueries({ queryKey: queryKeys.application.list() })
    },
  })
}

/**
 * 创建模板评论
 */
export function useCreateTemplateReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, rating, content }: { templateId: string, rating: number, content: string }) =>
      createTemplateReview(templateId, rating, content),
    onSuccess: (data) => {
      // 使相关缓存失效
      queryClient.invalidateQueries({ queryKey: queryKeys.template.reviews(data.templateId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.template.detail(data.templateId) })
    },
  })
}

/**
 * 点赞评论
 */
export function useLikeTemplateReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (reviewId: string) => likeTemplateReview(reviewId),
    onSuccess: (data) => {
      // 使评论列表缓存失效
      queryClient.invalidateQueries({ queryKey: queryKeys.template.reviews(data.templateId) })
    },
  })
}
