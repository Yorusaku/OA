/**
 * 工作流引擎类型定义
 * 用于审批流程编排与执行
 */

/**
 * 节点类型枚举
 */
export type WorkflowNodeType
  = | 'start' // 发起节点（流程起点）
    | 'approval' // 审批节点
    | 'cc' // 抄送节点
    | 'condition' // 条件分支节点
    | 'end' // 结束节点（流程终点）

/**
 * 处理人类型
 */
export type HandlerType
  = | 'role' // 按角色
    | 'dept' // 按部门
    | 'user' // 指定人员
    | 'deptManager' // 部门负责人
    | 'initiator' // 发起人自己
    | 'continuous' // 连续多级审批

/**
 * 审批方式
 */
export type ApprovalMode
  = | 'or' // 或签（一人审批即可）
    | 'and' // 会签（所有人审批）
    | 'sequential' // 依次审批

/**
 * 处理人配置
 */
export interface HandlerConfig {
  /** 处理人类型 */
  type: HandlerType
  /** 角色 ID 列表（type=role 时使用） */
  roleIds?: string[]
  /** 部门 ID 列表（type=dept 时使用） */
  deptIds?: string[]
  /** 用户 ID 列表（type=user 时使用） */
  userIds?: string[]
  /** 审批方式 */
  mode?: ApprovalMode
}

/**
 * 条件表达式配置
 */
export interface ConditionExpression {
  /** 条件 ID */
  id: string
  /** 条件名称 */
  name: string
  /** 字段 key */
  fieldKey: string
  /** 操作符 */
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains'
  /** 比较值 */
  value: any
}

/**
 * 工作流节点定义
 */
export interface WorkflowNode {
  /** 节点 ID（唯一） */
  id: string
  /** 节点类型 */
  type: WorkflowNodeType
  /** 节点显示名称 */
  name: string
  /** 节点描述 */
  description?: string
  /** 处理人配置（审批/抄送节点使用） */
  handler?: HandlerConfig
  /** 绑定的表单 Schema ID */
  formSchemaId?: string
  /** 条件列表（条件节点使用） */
  conditions?: ConditionExpression[]
  /** 节点位置（画布坐标） */
  position?: { x: number, y: number }
  /** 节点样式类名 */
  className?: string
  /** 是否启用 */
  enabled?: boolean
  /** 超时配置（小时） */
  timeout?: number
  /** 超时自动通过 */
  autoPassOnTimeout?: boolean
  
  /** 该节点的表单权限配置（密级字段保护） */
  formPermissions?: PermissionsMap
}

/**
 * 工作流边定义
 */
export interface WorkflowEdge {
  /** 边 ID（唯一） */
  id: string
  /** 起始节点 ID */
  source: string
  /** 目标节点 ID */
  target: string
  /** 条件分支标签（条件节点出来的边使用） */
  label?: string
  /** 条件表达式 ID（条件节点出来的边使用） */
  conditionId?: string
  /** 边的样式 */
  style?: Record<string, any>
}

/**
 * 工作流定义状态
 */
export type WorkflowStatus
  = | 'draft' // 草稿
    | 'active' // 启用
    | 'inactive' // 停用
    | 'deleted' // 已删除

/**
 * 工作流定义
 */
export interface WorkflowDefinition {
  /** 流程 ID */
  id: string
  /** 流程名称 */
  name: string
  /** 流程描述 */
  description?: string
  /** 流程图标 */
  icon?: string
  /** 流程状态 */
  status: WorkflowStatus
  /** 节点列表 */
  nodes: WorkflowNode[]
  /** 边列表 */
  edges: WorkflowEdge[]
  /** 绑定的表单 Schema ID（流程级别的默认表单） */
  formSchemaId?: string
  /** 创建人 ID */
  createdBy?: string
  /** 创建时间 */
  createdAt?: string
  /** 更新人 ID */
  updatedBy?: string
  /** 更新时间 */
  updatedAt?: string
  /** 版本号 */
  version?: number
}

/**
 * 流程实例状态
 */
export type WorkflowInstanceStatus
  = | 'running' // 进行中
    | 'approved' // 已通过
    | 'rejected' // 已驳回
    | 'cancelled' // 已撤销
    | 'expired' // 已超时

/**
 * 流程任务状态
 */
export type TaskStatus
  = | 'pending' // 待处理
    | 'processing' // 处理中
    | 'approved' // 已同意
    | 'rejected' // 已驳回
    | 'transferred' // 已转办
    | 'skipped' // 已跳过

/**
 * 流程任务
 */
export interface WorkflowTask {
  /** 任务 ID */
  id: string
  /** 流程实例 ID */
  instanceId: string
  /** 节点 ID */
  nodeId: string
  /** 节点名称 */
  nodeName: string
  /** 处理人 ID */
  handlerId: string
  /** 处理人姓名 */
  handlerName: string
  /** 任务状态 */
  status: TaskStatus
  /** 审批意见 */
  comment?: string
  /** 处理时间 */
  handledAt?: string
  /** 创建时间 */
  createdAt: string
}

/**
 * 流程实例
 */
export interface WorkflowInstance {
  /** 实例 ID */
  id: string
  /** 流程定义 ID */
  workflowId: string
  /** 流程名称 */
  workflowName: string
  /** 发起人 ID */
  initiatorId: string
  /** 发起人姓名 */
  initiatorName: string
  /** 表单数据 */
  formData: Record<string, any>
  /** 实例状态 */
  status: WorkflowInstanceStatus
  /** 当前节点 ID */
  currentNodeId?: string
  /** 当前任务列表 */
  tasks: WorkflowTask[]
  /** 创建时间 */
  createdAt: string
  /** 结束时间 */
  finishedAt?: string
}

/**
 * 流程设计器配置
 */
export interface WorkflowDesignerConfig {
  /** 是否只读 */
  readonly?: boolean
  /** 是否显示网格 */
  showGrid?: boolean
  /** 是否显示小地图 */
  showMinimap?: boolean
  /** 是否显示工具栏 */
  showToolbar?: boolean
  /** 是否允许添加节点 */
  allowAddNode?: boolean
  /** 是否允许删除节点 */
  allowDeleteNode?: boolean
}

/**
 * 权限映射表（节点级表单权限类型）
 * 用于在不同审批节点控制表单字段的可见性、可编辑性、必填性
 */
export type NodePermissionType 
  = 'hidden'    // 字段隐藏（不渲染到 DOM）
  | 'readonly'  // 字段只读（用户不可编辑）
  | 'editable'  // 字段可编辑（恢复默认状态）
  | 'required'  // 字段必填（强制校验）

/**
 * 节点权限映射表
 * key 是字段的 key，value 是权限类型
 * 示例：{ hr_comment: 'required', amount: 'readonly', secret_note: 'hidden' }
 */
export type PermissionsMap = Record<string, NodePermissionType>
