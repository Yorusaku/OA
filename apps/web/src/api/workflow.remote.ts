import type { RuleTrace, WorkflowVersion } from '@oa/contracts'
import type { WorkflowDefinition } from '@/types/workflow'
import { nanoid } from 'nanoid'
import { del, get, post, put } from './http'

export interface RemoteWorkflowPageParams {
  page: number
  pageSize: number
  keyword?: string
  status?: string
}

export interface RemoteWorkflowPageResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

function idempotencyHeaders() {
  return {
    'Idempotency-Key': `oa-web-wf-${Date.now()}-${nanoid(8)}`,
  }
}

export function remoteGetWorkflowDefinitions(params?: RemoteWorkflowPageParams): Promise<RemoteWorkflowPageResponse<WorkflowDefinition>> {
  return get('/v1/workflow/list', { params })
}

export function remoteGetWorkflowDefinition(id: string): Promise<WorkflowDefinition> {
  return get(`/v1/workflow/${id}`)
}

export function remoteCreateWorkflowDefinition(data: WorkflowDefinition): Promise<WorkflowDefinition> {
  return post('/v1/workflow', data, {
    headers: idempotencyHeaders(),
  })
}

export function remoteUpdateWorkflowDefinition(id: string, data: WorkflowDefinition): Promise<WorkflowDefinition> {
  return put(`/v1/workflow/${id}`, data, {
    headers: idempotencyHeaders(),
  })
}

export function remoteDeleteWorkflowDefinition(id: string): Promise<void> {
  return del(`/v1/workflow/${id}`, {
    headers: idempotencyHeaders(),
  })
}

export function remoteGetFormSchemas(): Promise<Array<{ id: string, name: string }>> {
  return get('/v1/workflow/forms')
}

export function remotePublishWorkflow(id: string, actor?: string): Promise<WorkflowVersion> {
  return post(`/v1/workflow/${id}/publish`, { actor }, {
    headers: idempotencyHeaders(),
  })
}

export function remoteRollbackWorkflow(id: string, versionId: string, actor?: string): Promise<WorkflowVersion> {
  return post(`/v1/workflow/${id}/rollback`, { versionId, actor }, {
    headers: idempotencyHeaders(),
  })
}

export function remoteGetWorkflowImpact(id: string): Promise<{
  workflowId: string
  pendingCount: number
  involvedNodeCount: number
  riskLevel: 'low' | 'medium' | 'high'
  suggestions: string[]
}> {
  return get(`/v1/workflow/${id}/impact`)
}

export function remoteDebugWorkflowRuleTrace(
  workflowId: string,
  payload: { nodeId?: string, formData?: Record<string, unknown> },
): Promise<RuleTrace> {
  return post(`/v1/workflow/${workflowId}/rule-trace`, payload)
}
