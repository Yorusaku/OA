/**
 * useWorkflowSchema - 表单 Schema 数据管理
 * 根据选中的流程 ID 动态获取对应的表单 Schema
 */

import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { 
  mockLeaveSchema, 
  mockExpenseSchema, 
  mockPurchaseSchema 
} from '@/api/mock'
import type { FormSchema } from '@/types/form-schema'

// Schema 映射表
const schemaMap: Record<string, FormSchema> = {
  'leave-form': mockLeaveSchema,
  'expense-form': mockExpenseSchema,
  'purchase-form': mockPurchaseSchema,
}

/**
 * 获取流程对应的表单 Schema
 * @param workflowId - 流程 ID
 */
export const useWorkflowSchema = (workflowId: string) => {
  return useQuery({
    queryKey: ['workflow', workflowId, 'schema'],
    queryFn: async (): Promise<FormSchema> => {
      const schema = schemaMap[workflowId]
      if (!schema) {
        throw new Error(`未找到流程 ${workflowId} 对应的表单 Schema`)
      }
      return schema
    },
    // 只有 workflowId 存在时才加载
    enabled: computed(() => !!workflowId),
    // 数据缓存 1 小时
    staleTime: 1000 * 60 * 60,
  })
}

/**
 * 获取默认 Schema (当 workflowId 不存在时)
 */
export const useDefaultSchema = () => {
  return useQuery({
    queryKey: ['workflow', 'default', 'schema'],
    queryFn: async (): Promise<FormSchema> => {
      // 默认返回请假表单 Schema
      return mockLeaveSchema
    },
  })
}
