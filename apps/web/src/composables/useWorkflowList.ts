/**
 * Workflow list composable for approval launch page.
 */

import type { MaybeRef } from 'vue'
import { useWorkflowLaunchList, useWorkflowList as useWorkflowPageList } from './useWorkflow'

export function useWorkflowList(): ReturnType<typeof useWorkflowLaunchList>
export function useWorkflowList(
  params: MaybeRef<{ page: number, pageSize: number, keyword?: string, status?: string }>,
): ReturnType<typeof useWorkflowPageList>
export function useWorkflowList(
  params?: MaybeRef<{ page: number, pageSize: number, keyword?: string, status?: string }>,
){
  if (params)
    return useWorkflowPageList(params)
  return useWorkflowLaunchList()
}
