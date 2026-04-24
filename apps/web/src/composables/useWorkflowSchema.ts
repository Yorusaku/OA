/**
 * Resolve workflow form schema by workflow id (supports ref/getter).
 */

import type { MaybeRefOrGetter } from 'vue'
import type { FormSchema } from '@/types/form-schema'
import { useQuery } from '@tanstack/vue-query'
import { computed, toValue } from 'vue'
import { mockExpenseSchema, mockLeaveSchema, mockPurchaseSchema } from '@/api/mock'

function asFormSchema(schema: any): FormSchema {
  return schema as FormSchema
}

const schemaMap: Record<string, FormSchema> = {
  'leave-form': asFormSchema(mockLeaveSchema),
  'expense-form': asFormSchema(mockExpenseSchema),
  'purchase-form': asFormSchema(mockPurchaseSchema),
}

export const useWorkflowSchema = (workflowId: MaybeRefOrGetter<string>) => {
  return useQuery({
    queryKey: computed(() => ['workflow', toValue(workflowId), 'schema']),
    queryFn: async (): Promise<FormSchema> => {
      const id = toValue(workflowId)
      const schema = schemaMap[id]
      if (!schema)
        throw new Error(`未找到流程 ${id} 对应的表单 Schema`)
      return schema
    },
    enabled: computed(() => Boolean(toValue(workflowId))),
    staleTime: 1000 * 60 * 60,
  })
}

export const useDefaultSchema = () => {
  return useQuery({
    queryKey: ['workflow', 'default', 'schema'],
    queryFn: async (): Promise<FormSchema> => asFormSchema(mockLeaveSchema),
  })
}
