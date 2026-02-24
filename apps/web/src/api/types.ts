/**
 * API 响应基础结构
 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

/**
 * 分页参数
 */
export interface PageParams {
  page: number
  pageSize: number
}

/**
 * 分页结果
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
 * 审批记录
 */
export interface ApprovalRecord {
  id: string
  title: string
  type: string
  status: 'pending' | 'approved' | 'rejected'
  applicant: string
  applyTime: string
  amount?: number
}

/**
 * 工作台统计
 */
export interface WorkbenchStats {
  pendingCount: number
  myApplicationCount: number
  approvedCount: number
  rejectedCount: number
}
