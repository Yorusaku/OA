/**
 * @file useWorkflow.ts
 * @description 工作流 Vue Query Hooks
 * 封装流程定义的增删改查操作
 */

import type { WorkflowDefinition } from '@/types/workflow'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { queryKeys } from '@/api/queryKeys'
import {
  createWorkflowDefinition,
  deleteWorkflowDefinition,
  getFormSchemas,
  getWorkflowDefinition,
  getWorkflowDefinitions,
  updateWorkflowDefinition,
} from '@/api/workflow'

/**
 * 获取流程定义列表
 * @param params - 查询参数（页码、页数）
 * @returns useQuery 返回值
 * @usage const { data: workflows } = useWorkflowList({ page: 1, pageSize: 10 })
 */
export function useWorkflowList(params = { page: 1, pageSize: 10 }) {
  return useQuery({
    queryKey: queryKeys.workflow.list(params),
    queryFn: () => getWorkflowDefinitions(params),
    staleTime: 1000 * 60 * 5, // 5 分钟缓存
    retry: 1, // 失败重试 1 次
  })
}

/**
 * 获取单个流程定义详情
 * @param id - 流程定义 ID
 * @returns useQuery 返回值
 * @usage const { data: workflow } = useWorkflowDetail(workflowId)
 */
export function useWorkflowDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.workflow.detail(id),
    queryFn: () => getWorkflowDefinition(id),
    enabled: !!id, // 有 ID 时才启用查询
    staleTime: 1000 * 60 * 5, // 5 分钟缓存
  })
}

/**
 * 获取表单 Schema 列表
 * @returns useQuery 返回值
 * @description 用于流程设计器中选择绑定表单
 * @usage const { data: formSchemas } = useFormSchemas()
 */
export function useFormSchemas() {
  return useQuery({
    queryKey: queryKeys.workflow.formSchemas,
    queryFn: getFormSchemas,
    staleTime: 1000 * 60 * 10, // 10 分钟缓存
  })
}

/**
 * 创建流程定义
 * @returns useMutation 返回值（mutate、isPending 等）
 * @usage const { mutate } = useCreateWorkflow(); mutate(workflowData)
 */
export function useCreateWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: WorkflowDefinition) => createWorkflowDefinition(data),
    onSuccess: () => {
      // 使列表缓存失效，触发重新加载
      queryClient.invalidateQueries({ queryKey: queryKeys.workflow.list() })
    },
  })
}

/**
 * 更新流程定义
 * @returns useMutation 返回值
 * @usage const { mutate } = useUpdateWorkflow(); mutate({ id, data })
 */
export function useUpdateWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string, data: WorkflowDefinition }) =>
      updateWorkflowDefinition(id, data),
    onSuccess: (_, { id }) => {
      // 更新详情缓存
      queryClient.invalidateQueries({ queryKey: queryKeys.workflow.detail(id) })
      // 使列表缓存失效
      queryClient.invalidateQueries({ queryKey: queryKeys.workflow.list() })
    },
  })
}

/**
 * 删除流程定义
 * @returns useMutation 返回值
 * @usage const { mutate } = useDeleteWorkflow(); mutate(workflowId)
 */
export function useDeleteWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteWorkflowDefinition(id),
    onSuccess: () => {
      // 使列表缓存失效
      queryClient.invalidateQueries({ queryKey: queryKeys.workflow.list() })
    },
  })
}

/**
 * 保存流程定义（智能判断创建或更新）
 * @returns 保存方法和状态
 * @usage const { save, isPending } = useSaveWorkflow(); await save(workflowData)
 */
export function useSaveWorkflow() {
  const queryClient = useQueryClient()
  const createMutation = useCreateWorkflow()
  const updateMutation = useUpdateWorkflow()

  /**
   * 保存流程（根据是否有 ID 判断创建或更新）
   * @param data - 流程定义数据
   */
  const save = async (data: WorkflowDefinition) => {
    if (data.id) {
      return updateMutation.mutateAsync({ id: data.id, data })
    }
    else {
      return createMutation.mutateAsync(data)
    }
  }

  return {
    save,
    isPending: createMutation.isPending || updateMutation.isPending,
    error: createMutation.error || updateMutation.error,
  }
}
