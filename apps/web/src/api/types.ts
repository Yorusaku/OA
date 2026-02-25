/**
 * @file types.ts
 * @description API 相关类型定义
 * 包含通用响应结构、分页参数、业务数据类型
 */

/**
 * API 统一响应结构
 * @template T - 响应数据类型
 */
export interface ApiResponse<T = any> {
  /** 状态码（200 表示成功） */
  code: number
  /** 响应消息 */
  message: string
  /** 响应数据 */
  data: T
}

/**
 * 分页请求参数
 */
export interface PageParams {
  /** 页码（从 1 开始） */
  page: number
  /** 每页数量 */
  pageSize: number
}

/**
 * 分页响应结果
 * @template T - 列表项数据类型
 */
export interface PageResult<T> {
  /** 数据列表 */
  list: T[]
  /** 总记录数 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页数量 */
  pageSize: number
}

/**
 * 字典项
 * 用于系统数据字典（如性别、状态等）
 */
export interface DictionaryItem {
  /** 字典项 ID */
  id: string
  /** 字典类型 */
  dictType: string
  /** 字典键 */
  dictCode: string
  /** 字典标签（显示文本） */
  dictLabel: string
  /** 字典值（实际值） */
  dictValue: string
  /** 排序 */
  sort?: number
  /** 状态（0 禁用，1 启用） */
  status?: number
}

/**
 * 部门
 */
export interface Department {
  /** 部门 ID */
  id: string
  /** 部门名称 */
  name: string
  /** 父部门 ID */
  parentId?: string
  /** 子部门列表 */
  children?: Department[]
  /** 部门负责人 */
  leader?: string
  /** 联系电话 */
  phone?: string
  /** 状态 */
  status?: number
}

/**
 * 审批记录
 */
export interface ApprovalRecord {
  /** 审批 ID */
  id: string
  /** 审批标题 */
  title: string
  /** 审批类型 */
  type: string
  /** 审批状态 */
  status: 'pending' | 'approved' | 'rejected'
  /** 申请人 */
  applicant: string
  /** 申请时间 */
  applyTime: string
  /** 金额（如涉及） */
  amount?: number
}

/**
 * 工作台统计数据
 */
export interface WorkbenchStats {
  /** 待办数量 */
  pendingCount: number
  /** 我的申请数量 */
  myApplicationCount: number
  /** 已通过数量 */
  approvedCount: number
  /** 已驳回数量 */
  rejectedCount: number
}
