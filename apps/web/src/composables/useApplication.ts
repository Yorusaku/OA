/**
 * @file useApplication.ts
 * @description 应用中心相关 Vue Query Hooks
 * 封装应用中心业务的数据获取和突变操作
 */

import type { MaybeRef } from 'vue'
import type { PageParams } from '@/api/types'
import type { ApplicationCategory, ApplicationConfig, ApplicationStatus } from '@/types/application'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, unref } from 'vue'
import {
  compareVersions,
  createApplication,
  deleteApplication,
  duplicateApplication,
  getApplicationDetail,
  getApplicationList,
  getApplicationStats,
  getApplicationVersions,
  publishApplication,
  rollbackToVersion,
  toggleApplicationStatus,
  updateApplication,
} from '@/api/application'
import { queryKeys } from '@/api/queryKeys'

/**
 * 获取应用列表
 * @param params - 查询参数（页码、页数、状态、分类、关键词）
 * @returns useQuery 返回值（data、isLoading、error 等）
 */
export function useApplicationList(
  params: MaybeRef<PageParams & {
    status?: ApplicationStatus
    category?: ApplicationCategory
    keyword?: string
  }>,
) {
  return useQuery({
    queryKey: computed(() => queryKeys.application.list(unref(params))),
    queryFn: () => getApplicationList(unref(params)),
    staleTime: 60 * 1000, // 60 秒缓存
    retry: 1,
  })
}

/**
 * 获取应用详情
 * @param id - 应用 ID
 * @returns useQuery 返回值
 */
export function useApplicationDetail(id: MaybeRef<string>) {
  return useQuery({
    queryKey: computed(() => queryKeys.application.detail(unref(id))),
    queryFn: () => getApplicationDetail(unref(id)),
    enabled: computed(() => !!unref(id)),
    staleTime: 5 * 60 * 1000, // 5 分钟缓存
  })
}

/**
 * 获取应用统计数据
 * @param id - 应用 ID
 * @returns useQuery 返回值
 */
export function useApplicationStats(id: MaybeRef<string>) {
  return useQuery({
    queryKey: computed(() => queryKeys.application.stats(unref(id))),
    queryFn: () => getApplicationStats(unref(id)),
    enabled: computed(() => !!unref(id)),
    staleTime: 2 * 60 * 1000, // 2 分钟缓存
  })
}

/**
 * 获取应用版本历史
 * @param applicationId - 应用 ID
 * @returns useQuery 返回值
 */
export function useApplicationVersions(applicationId: MaybeRef<string>) {
  return useQuery({
    queryKey: computed(() => queryKeys.application.versions(unref(applicationId))),
    queryFn: () => getApplicationVersions(unref(applicationId)),
    enabled: computed(() => !!unref(applicationId)),
    staleTime: 5 * 60 * 1000, // 5 分钟缓存
  })
}

/**
 * 创建应用
 * @returns useMutation 返回值（mutate、isPending 等）
 */
export function useCreateApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.application.list() })
    },
  })
}

/**
 * 更新应用
 * @returns useMutation 返回值
 */
export function useUpdateApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, config }: { id: string, config: Partial<ApplicationConfig> }) =>
      updateApplication(id, config),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.application.list() })
      queryClient.invalidateQueries({ queryKey: queryKeys.application.detail(data.id) })
    },
  })
}

/**
 * 删除应用
 * @returns useMutation 返回值
 */
export function useDeleteApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.application.list() })
    },
  })
}

/**
 * 发布应用
 * @returns useMutation 返回值
 */
export function usePublishApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: publishApplication,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.application.list() })
      queryClient.invalidateQueries({ queryKey: queryKeys.application.detail(data.id) })
    },
  })
}

/**
 * 切换应用状态（发布/停用）
 * @returns useMutation 返回值
 */
export function useToggleApplicationStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string, status: 'published' | 'disabled' }) =>
      toggleApplicationStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.application.list() })
      queryClient.invalidateQueries({ queryKey: queryKeys.application.detail(data.id) })
    },
  })
}

/**
 * 回滚到指定版本
 * @returns useMutation 返回值
 */
export function useRollbackVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ applicationId, versionId }: { applicationId: string, versionId: string }) =>
      rollbackToVersion(applicationId, versionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.application.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.application.versions(data.id) })
    },
  })
}

/**
 * 对比两个版本
 * @returns useQuery 返回值
 */
export function useCompareVersions(
  versionId1: MaybeRef<string>,
  versionId2: MaybeRef<string>,
) {
  return useQuery({
    queryKey: computed(() => ['application', 'compareVersions', unref(versionId1), unref(versionId2)]),
    queryFn: () => compareVersions(unref(versionId1), unref(versionId2)),
    enabled: computed(() => !!unref(versionId1) && !!unref(versionId2)),
    staleTime: 10 * 60 * 1000, // 10 分钟缓存
  })
}

/**
 * 复制应用
 * @returns useMutation 返回值
 */
export function useDuplicateApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: duplicateApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.application.list() })
    },
  })
}
