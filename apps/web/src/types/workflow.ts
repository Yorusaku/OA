import type { PermissionsMap } from './form-schema'

export type WorkflowNodeType = 'start' | 'approval' | 'cc' | 'condition' | 'end'

export type HandlerType = 'role' | 'dept' | 'user' | 'deptManager' | 'initiator' | 'continuous'

export type ApprovalMode = 'or' | 'and' | 'sequential'

export interface HandlerConfig {
  type: HandlerType
  roleIds?: string[]
  deptIds?: string[]
  userIds?: string[]
  mode?: ApprovalMode
}

export interface ConditionExpression {
  id: string
  name: string
  fieldKey: string
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'includes'
  value: any
}

export interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  name: string
  description?: string
  handler?: HandlerConfig
  formSchemaId?: string
  conditions?: ConditionExpression[]
  position?: { x: number, y: number }
  className?: string
  enabled?: boolean
  timeout?: number
  autoPassOnTimeout?: boolean
  formPermissions?: PermissionsMap
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  label?: string
  conditionId?: string
  style?: Record<string, any>
}

export type WorkflowStatus = 'draft' | 'active' | 'inactive' | 'deleted'

export interface WorkflowDefinition {
  id: string
  name: string
  description?: string
  icon?: string
  status: WorkflowStatus
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  formSchemaId?: string
  createdBy?: string
  createdAt?: string
  updatedBy?: string
  updatedAt?: string
  version?: number
}

export type WorkflowInstanceStatus = 'running' | 'approved' | 'rejected' | 'cancelled' | 'expired'

export type TaskStatus = 'pending' | 'processing' | 'approved' | 'rejected' | 'transferred' | 'skipped'

export interface WorkflowTask {
  id: string
  instanceId?: string
  nodeId?: string
  nodeName?: string
  handlerId: string
  handlerName?: string
  status: TaskStatus | WorkflowInstanceStatus
  comment?: string
  handledAt?: string
  createdAt?: string
}

export interface WorkflowInstance {
  id: string
  workflowId?: string
  workflowName?: string
  initiatorId?: string
  initiatorName?: string
  formData?: Record<string, any>
  status?: WorkflowInstanceStatus
  currentNodeId?: string
  tasks: WorkflowTask[]
  createdAt?: string
  finishedAt?: string
}

export interface WorkflowDesignerConfig {
  readonly?: boolean
  showGrid?: boolean
  showMinimap?: boolean
  showToolbar?: boolean
  allowAddNode?: boolean
  allowDeleteNode?: boolean
}

export interface Workflow {
  id: string
  name: string
  description?: string
  isDefault?: boolean
  schemaId: string
  icon?: string
}
