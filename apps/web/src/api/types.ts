/**
 * @file types.ts
 * @description API 相关类型定义
 */

/**
 * API 统一响应结构
 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

/**
 * 分页请求参数
 */
export interface PageParams {
  page: number
  pageSize: number
}

/**
 * 分页响应结果
 */
export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/**
 * 字典项
 */
export interface DictionaryItem {
  id: string
  dictType: string
  dictCode: string
  dictLabel: string
  dictValue: string
  sort?: number
  status?: number
}

/**
 * 部门
 */
export interface Department {
  id: string
  name: string
  parentId?: string
  children?: Department[]
  leader?: string
  phone?: string
  status?: number
}

/**
 * 审批状态
 */
export type ApprovalStatus
  = | 'pending'
    | 'approved'
    | 'rejected'
    | 'cancelled'
    | 'withdrawn'
    | 'transferred'

/**
 * 审批动作
 */
export type ApprovalAction
  = | 'approve'
    | 'reject'
    | 'transfer'
    | 'addSign'
    | 'remind'
    | 'withdraw'
    | 'cancel'

/**
 * 审批轨迹动作（包含创建动作）
 */
export type ApprovalTrailAction = ApprovalAction | 'create'
export type ApprovalSystemTrailAction = 'escalate' | 'delegate'

/**
 * 审批操作轨迹
 */
export interface ApprovalTrailItem {
  id: string
  action: ApprovalTrailAction | ApprovalSystemTrailAction
  status: ApprovalStatus
  operatorId?: string
  operatorName?: string
  operatedAt: string
  comment?: string
  attachments?: string[]
  targetUserId?: string
  targetUserName?: string
}

export type ApprovalTaskStatus
  = | 'pending'
    | 'processing'
    | 'approved'
    | 'rejected'
    | 'transferred'
    | 'cancelled'
    | 'auto-closed'

export interface ApprovalTaskHandledBy {
  id: string
  name: string
}

export interface ApprovalTask {
  id: string
  nodeId?: string
  handlerId: string
  handlerName?: string
  ownerId?: string
  ownerName?: string
  delegatedFromId?: string
  delegatedFromName?: string
  delegatedAt?: string
  status: string
  taskStatus?: ApprovalTaskStatus
  handledBy?: ApprovalTaskHandledBy
  handledAt?: string
  comment?: string
}

/**
 * 审批记录
 */
export interface ApprovalRecord {
  id: string
  title: string
  type: string
  status: ApprovalStatus
  applicant: string
  applyTime: string
  amount?: number
  applicantAvatar?: string
  currentNodeName?: string
  isUrgent?: boolean
  description?: string

  /** SLA 截止时间 */
  deadlineAt?: string
  /** 超时升级时间 */
  escalatedAt?: string
  /** 最近催办时间 */
  lastRemindAt?: string
  /** 催办次数 */
  remindCount?: number

  /** 评论与附件流转 */
  latestComment?: string
  latestAttachments?: string[]

  /** 审批操作轨迹 */
  operatorTrail?: ApprovalTrailItem[]

  workflowInstance?: {
    currentNodeId?: string
    currentNodeMode?: 'and' | 'or'
    currentNodeAssignees?: ApprovalTaskHandledBy[]
    progress?: {
      completed: number
      total: number
    }
    tasks?: ApprovalTask[]
  }

  formSchema?: import('@/types/form-schema').FormSchema
  nodePermissions?: import('@/types/form-schema').PermissionsMap
  formData?: Record<string, any>
}

export interface ApprovalDelegationRule {
  ownerId: string
  ownerName: string
  delegateId: string
  delegateName: string
  startAt: string
  endAt: string
  enabled: boolean
  updatedAt?: string
}

/**
 * 工作台统计数据
 */
export interface WorkbenchStats {
  pendingCount: number
  myApplicationCount: number
  approvedCount: number
  rejectedCount: number
  overdueCount?: number
  escalatedCount?: number
  remindedCount?: number
}

/**
 * 消息类型
 */
export type MessageType = 'approval' | 'system' | 'cc' | 'other'

/**
 * 消息优先级
 */
export type MessagePriority = 'low' | 'normal' | 'high'

/**
 * 消息记录
 */
export interface MessageRecord {
  id: string
  title: string
  content: string
  type: MessageType
  relatedId?: string
  read: boolean
  readTime?: string
  createdAt: string
  priority?: MessagePriority
}

/**
 * 登录状态
 */
export type LoginStatus = 'success' | 'failed'

/**
 * 登录日志
 */
export interface LoginLog {
  id: string
  userId: string
  username: string
  ipAddress: string
  location?: string
  device: string
  os: string
  browser: string
  userAgent: string
  status: LoginStatus
  failReason?: string
  loginTime: string
  logoutTime?: string
  duration?: number
}

/**
 * 操作类型
 */
export type OperationType = 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'transfer' | 'other'

/**
 * 操作模块
 */
export type OperationModule = 'approval' | 'user' | 'role' | 'workflow' | 'system'

/**
 * 操作状态
 */
export type OperationStatus = 'success' | 'failed'

/**
 * 操作日志
 */
export interface OperationLog {
  id: string
  operatorId: string
  operatorName: string
  operationType: OperationType
  module: OperationModule
  operationContent: string
  targetId?: string
  targetType?: string
  ipAddress?: string
  userAgent?: string
  requestParams?: Record<string, any>
  beforeData?: Record<string, any>
  afterData?: Record<string, any>
  operatedAt: string
  duration?: number
  status: OperationStatus
  errorMessage?: string
}

/**
 * 抄送记录
 */
export interface CCRecord {
  id: string
  approvalId: string
  title: string
  type: string
  status: ApprovalStatus
  applicant: string
  applicantAvatar?: string
  ccTime: string
  ccNodeName: string
  read: boolean
  readTime?: string
  amount?: number
  description?: string
}

/**
 * 审计动作
 */
export type AuditAction
  = | 'auth.login'
    | 'approval.submit'
    | 'approval.process'
    | 'approval.delegate.enable'
    | 'approval.delegate.disable'
    | 'workflow.publish'
    | 'workflow.rollback'

/**
 * 审计结果
 */
export type AuditResult = 'success' | 'failed'

/**
 * 审计关联链接
 */
export interface AuditSummaryLink {
  targetType: 'approval' | 'workflow' | 'delegation' | 'auth'
  targetId: string
  title?: string
  path?: string
}

/**
 * 审计事件
 */
export interface AuditEvent {
  id: string
  operatorId: string
  operatorName: string
  operatedAt: string
  module: 'approval' | 'workflow' | 'system' | 'auth'
  action: AuditAction
  result: AuditResult
  targetType: string
  targetId: string
  summary: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  traceId: string
  ip: string
  userAgent: string
  durationMs: number
  links?: AuditSummaryLink[]
  metadata?: Record<string, unknown>
}
