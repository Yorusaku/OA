import type { WorkflowDefinition } from '@/types/workflow'
/**
 * 工作流 Vue Query Hooks
 */
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
 */
export function useWorkflowList(params = { page: 1, pageSize: 10 }) {
  return useQuery({
    queryKey: queryKeys.workflow.list(params),
    queryFn: () => getWorkflowDefinitions(params),
    staleTime: 1000 * 60 * 5, // 5 分钟
    retry: 1,
  })
}

/**
 * 获取单个流程定义
 */
export function useWorkflowDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.workflow.detail(id),
    queryFn: () => getWorkflowDefinition(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * 获取表单 Schema 列表
 */
export function useFormSchemas() {
  return useQuery({
    queryKey: queryKeys.workflow.formSchemas,
    queryFn: getFormSchemas,
    staleTime: 1000 * 60 * 10, // 10 分钟
  })
}

/**
 * 创建流程定义
 */
export function useCreateWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: WorkflowDefinition) => createWorkflowDefinition(data),
    onSuccess: () => {
      // 失效列表缓存
      queryClient.invalidateQueries({ queryKey: queryKeys.workflow.list() })
    },
  })
}

/**
 * 更新流程定义
 */
export function useUpdateWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string, data: WorkflowDefinition }) =>
      updateWorkflowDefinition(id, data),
    onSuccess: (_, { id }) => {
      // 更新详情缓存
      queryClient.invalidateQueries({ queryKey: queryKeys.workflow.detail(id) })
      // 失效列表缓存
      queryClient.invalidateQueries({ queryKey: queryKeys.workflow.list() })
    },
  })
}

/**
 * 删除流程定义
 */
export function useDeleteWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteWorkflowDefinition(id),
    onSuccess: () => {
      // 失效列表缓存
      queryClient.invalidateQueries({ queryKey: queryKeys.workflow.list() })
    },
  })
}

/**
 * 保存流程定义（创建或更新）
 */
export function useSaveWorkflow() {
  const queryClient = useQueryClient()
  const createMutation = useCreateWorkflow()
  const updateMutation = useUpdateWorkflow()

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
