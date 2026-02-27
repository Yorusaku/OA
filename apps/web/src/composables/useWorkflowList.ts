/**
 * useWorkflowList - 流程列表数据管理
 * 用于发起审批页面的工作流选择
 */

import { useQuery } from '@tanstack/vue-query'
import { mockWorkflowList } from '@/api/mock'
import type { Workflow } from '@/types/workflow'

/**
 * 工作流类型定义
 */
export interface Workflow {
  /** 流程 ID */
  id: string
  /** 流程名称 */
  name: string
  /** 流程描述 */
  description?: string
  /** 是否为默认流程 */
  isDefault?: boolean
  /** 关联的表单 Schema ID */
  schemaId: string
  /** 流程图标 */
  icon?: string
}

/**
 * 获取流程列表
 */
export const useWorkflowList = () => {
  return useQuery({
    queryKey: ['workflow', 'list'],
    queryFn: async (): Promise<Workflow[]> => {
      // Mock 数据 - 实际场景中应调用真实 API
      return mockWorkflowList
    },
    // 数据缓存 5 分钟
    staleTime: 1000 * 60 * 5,
    // 后台自动刷新
    refetchOnWindowFocus: false,
  })
}
