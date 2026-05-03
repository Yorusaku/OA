import type { RuleTrace, WorkflowVersion } from '@oa/contracts'
import type { RuntimeState, WorkflowDefinition, WorkflowNode } from '../domain'
import { nowText, parseTime, uid } from '../utils'

export interface WorkflowListQuery {
  page: number
  pageSize: number
  keyword?: string
  status?: string
}

export function listWorkflows(state: RuntimeState, params: WorkflowListQuery) {
  let list = [...state.workflows]
  if (params.keyword?.trim()) {
    const keyword = params.keyword.trim().toLowerCase()
    list = list.filter(item => `${item.name} ${item.description || ''}`.toLowerCase().includes(keyword))
  }
  if (params.status)
    list = list.filter(item => item.status === params.status)
  list.sort((a, b) => parseTime(b.updatedAt || '').getTime() - parseTime(a.updatedAt || '').getTime())
  const page = Math.max(1, Number(params.page || 1))
  const pageSize = Math.max(1, Number(params.pageSize || 10))
  const start = (page - 1) * pageSize
  const end = start + pageSize
  return {
    list: list.slice(start, end),
    total: list.length,
    page,
    pageSize,
  }
}

export function getWorkflowDefinition(state: RuntimeState, id: string): WorkflowDefinition {
  const workflow = state.workflows.find(item => item.id === id)
  if (!workflow)
    throw new Error('workflow-not-found')
  return workflow
}

export function createWorkflowDefinition(state: RuntimeState, payload: WorkflowDefinition): WorkflowDefinition {
  const now = nowText(new Date())
  const next: WorkflowDefinition = {
    ...payload,
    id: uid('wf'),
    status: payload.status || 'draft',
    createdAt: now,
    updatedAt: now,
    version: 1,
  }
  state.workflows.unshift(next)
  state.workflowVersions.unshift({
    id: uid('wfv'),
    workflowId: next.id,
    workflowName: next.name,
    status: 'draft',
    snapshot: next,
    createdAt: now,
    createdBy: payload.createdBy || 'system',
    note: '初始草稿',
  })
  return next
}

export function updateWorkflowDefinition(state: RuntimeState, id: string, payload: WorkflowDefinition): WorkflowDefinition {
  const index = state.workflows.findIndex(item => item.id === id)
  if (index < 0)
    throw new Error('workflow-not-found')
  const current = state.workflows[index]
  const now = nowText(new Date())
  const next: WorkflowDefinition = {
    ...current,
    ...payload,
    id,
    updatedAt: now,
    version: (current.version || 1) + 1,
  }
  state.workflows[index] = next
  state.workflowVersions.unshift({
    id: uid('wfv'),
    workflowId: id,
    workflowName: next.name,
    status: 'draft',
    snapshot: next,
    createdAt: now,
    createdBy: payload.updatedBy || 'system',
    note: '保存草稿',
  })
  return next
}

export function deleteWorkflowDefinition(state: RuntimeState, id: string): void {
  const index = state.workflows.findIndex(item => item.id === id)
  if (index < 0)
    throw new Error('workflow-not-found')
  state.workflows.splice(index, 1)
}

export function getFormSchemas(state: RuntimeState): Array<{ id: string, name: string }> {
  const map = new Map<string, string>()
  for (const workflow of state.workflows) {
    if (workflow.formSchemaId)
      map.set(workflow.formSchemaId, workflow.name)
  }
  if (map.size === 0) {
    map.set('leave-form', '请假表单')
    map.set('expense-form', '报销表单')
  }
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
}

export function publishWorkflow(state: RuntimeState, workflowId: string, actor = 'system'): WorkflowVersion {
  const workflow = getWorkflowDefinition(state, workflowId)
  const now = nowText(new Date())
  workflow.status = 'active'
  workflow.updatedAt = now
  workflow.version = (workflow.version || 1) + 1

  const version: WorkflowVersion = {
    id: uid('wfv'),
    workflowId,
    workflowName: workflow.name,
    status: 'published',
    snapshot: workflow,
    createdAt: now,
    createdBy: actor,
    note: '流程发布',
  }
  state.workflowVersions.unshift({
    ...version,
    snapshot: workflow,
  })
  return version
}

export function rollbackWorkflow(state: RuntimeState, workflowId: string, versionId: string, actor = 'system'): WorkflowVersion {
  const targetVersion = state.workflowVersions.find(item => item.workflowId === workflowId && item.id === versionId)
  if (!targetVersion)
    throw new Error('workflow-version-not-found')
  const index = state.workflows.findIndex(item => item.id === workflowId)
  if (index < 0)
    throw new Error('workflow-not-found')

  const now = nowText(new Date())
  const restoredSnapshot: WorkflowDefinition = {
    ...targetVersion.snapshot,
    id: workflowId,
    updatedAt: now,
    version: (state.workflows[index].version || 1) + 1,
  }
  state.workflows[index] = restoredSnapshot
  const rollbackVersion: WorkflowVersion = {
    id: uid('wfv'),
    workflowId,
    workflowName: restoredSnapshot.name,
    status: 'rolled_back',
    snapshot: restoredSnapshot,
    createdAt: now,
    createdBy: actor,
    note: `回滚到版本 ${versionId}`,
  }
  state.workflowVersions.unshift({
    ...rollbackVersion,
    snapshot: restoredSnapshot,
  })
  return rollbackVersion
}

export function analyzeWorkflowImpact(state: RuntimeState, workflowId: string) {
  const pending = state.approvals.filter(item => item.status === 'pending' && item.workflowInstance?.workflowId === workflowId)
  const involvedNodes = new Set<string>()
  for (const record of pending) {
    if (record.workflowInstance?.currentNodeId)
      involvedNodes.add(record.workflowInstance.currentNodeId)
  }
  return {
    workflowId,
    pendingCount: pending.length,
    involvedNodeCount: involvedNodes.size,
    riskLevel: pending.length >= 20 ? 'high' : pending.length >= 5 ? 'medium' : 'low',
    suggestions: pending.length >= 20
      ? ['建议错峰发布', '建议先灰度小范围流程']
      : pending.length >= 5
        ? ['建议在低峰期发布', '发布前通知审批负责人']
        : ['影响较小，可直接发布'],
  }
}

function evaluateCondition(
  operator: string,
  fieldValue: unknown,
  expectValue: unknown,
): boolean {
  switch (operator) {
    case 'eq':
      return fieldValue === expectValue
    case 'ne':
      return fieldValue !== expectValue
    case 'gt':
      return Number(fieldValue) > Number(expectValue)
    case 'gte':
      return Number(fieldValue) >= Number(expectValue)
    case 'lt':
      return Number(fieldValue) < Number(expectValue)
    case 'lte':
      return Number(fieldValue) <= Number(expectValue)
    case 'contains':
      return String(fieldValue ?? '').includes(String(expectValue ?? ''))
    case 'in':
      return Array.isArray(expectValue) ? expectValue.includes(fieldValue) : false
    default:
      return false
  }
}

function buildFieldTrace(node: WorkflowNode, formData: Record<string, unknown>, matchedConditions: string[]): RuleTrace['fields'] {
  const permissions = node.formPermissions || {}
  return Object.entries(permissions).map(([fieldKey, permission]) => {
    const source = [`permission:${permission}`]
    if (formData[fieldKey] !== undefined)
      source.push('input:has-value')
    return {
      fieldKey,
      visible: permission !== 'hidden',
      readonly: permission === 'readonly',
      required: permission === 'required',
      source,
      hitConditions: matchedConditions,
    }
  })
}

export function debugWorkflowRuleTrace(
  state: RuntimeState,
  input: {
    workflowId: string
    nodeId?: string
    formData?: Record<string, unknown>
  },
  enableDebug = false,
): RuleTrace {
  if (!enableDebug)
    throw new Error('rule-trace-disabled')
  const workflow = getWorkflowDefinition(state, input.workflowId)
  const node = input.nodeId
    ? workflow.nodes.find(item => item.id === input.nodeId)
    : workflow.nodes.find(item => item.type === 'approval')
  if (!node) {
    return {
      workflowId: input.workflowId,
      nodeId: input.nodeId,
      matched: false,
      summary: '未找到目标节点',
      fields: [],
    }
  }
  const formData = input.formData || {}
  const matchedConditions: string[] = []
  for (const condition of node.conditions || []) {
    const fieldKey = condition.field || ''
    const fieldValue = fieldKey ? formData[fieldKey] : undefined
    const hit = evaluateCondition(condition.operator, fieldValue, condition.value)
    if (hit)
      matchedConditions.push(condition.id || condition.name || `${fieldKey}:${condition.operator}`)
  }

  return {
    workflowId: workflow.id,
    nodeId: node.id,
    matched: true,
    summary: matchedConditions.length
      ? `命中 ${matchedConditions.length} 条条件`
      : '未命中任何条件，按默认权限规则渲染',
    fields: buildFieldTrace(node, formData, matchedConditions),
  }
}
