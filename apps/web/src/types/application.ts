/**
 * @file application.ts
 * @description 应用中心相关类型定义
 */

import type { FormSchema } from './form-schema'
import type { WorkflowDefinition } from './workflow'

/**
 * 应用状态
 */
export type ApplicationStatus = 'draft' | 'published' | 'disabled' | 'archived'

/**
 * 应用分类
 */
export type ApplicationCategory =
  | 'approval' // 审批类
  | 'hr' // 人事类
  | 'finance' // 财务类
  | 'admin' // 行政类
  | 'project' // 项目类
  | 'other' // 其他

/**
 * 应用定义
 */
export interface Application {
  id: string
  name: string
  description?: string
  icon?: string
  category: ApplicationCategory
  status: ApplicationStatus

  // 关联配置
  formSchemaId: string
  workflowId: string

  // 版本信息
  version: number
  currentVersionId: string

  // 统计信息
  usageCount?: number
  approvalCount?: number

  // 配置选项
  isDefault?: boolean
  isTemplate?: boolean // 为 Phase 2.2 模板市场预留
  allowCustomize?: boolean

  // 元数据
  createdBy?: string
  createdAt?: string
  updatedBy?: string
  updatedAt?: string
  publishedAt?: string
  publishedBy?: string

  // 扩展字段（为模板市场预留）
  tags?: string[]
  author?: string
  downloads?: number
  rating?: number
}

/**
 * 应用版本
 */
export interface ApplicationVersion {
  id: string
  applicationId: string
  version: number
  versionName: string // 如 "v1.0.0"

  // 快照数据（版本创建时的完整配置）
  formSchemaSnapshot: FormSchema
  workflowSnapshot: WorkflowDefinition

  // 变更信息
  changeLog?: string
  changeType?: 'major' | 'minor' | 'patch'

  // 状态
  isActive: boolean
  isCurrent: boolean

  // 元数据
  createdBy?: string
  createdAt?: string
  publishedAt?: string
}

/**
 * 应用统计
 */
export interface ApplicationStats {
  applicationId: string

  // 使用统计
  totalSubmissions: number // 总提交数
  pendingCount: number // 待审批数
  approvedCount: number // 已通过数
  rejectedCount: number // 已驳回数

  // 时间统计
  avgProcessTime?: number // 平均处理时长（小时）
  avgApprovalTime?: number // 平均审批时长（小时）

  // 趋势数据（最近 7 天）
  dailySubmissions?: number[]

  // 用户统计
  activeUsers?: number // 活跃用户数
  topApplicants?: Array<{
    userId: string
    userName: string
    count: number
  }>
}

/**
 * 应用配置（用于创建/编辑）
 */
export interface ApplicationConfig {
  // 基本信息
  name: string
  description?: string
  icon?: string
  category: ApplicationCategory

  // 表单配置
  formSchemaId: string
  formSchema?: FormSchema

  // 工作流配置
  workflowId: string
  workflow?: WorkflowDefinition

  // 选项
  isDefault?: boolean
  allowCustomize?: boolean
  tags?: string[]
}

/**
 * 应用版本对比结果
 */
export interface VersionComparison {
  oldVersion: ApplicationVersion
  newVersion: ApplicationVersion

  // 差异信息
  formChanges: {
    added: string[] // 新增字段
    removed: string[] // 删除字段
    modified: string[] // 修改字段
  }

  workflowChanges: {
    nodesAdded: number
    nodesRemoved: number
    nodesModified: number
    edgesChanged: boolean
  }
}

// ==================== Phase 2.2 模板市场类型定义 ====================

/**
 * 模板状态
 */
export type TemplateStatus = 'draft' | 'published' | 'disabled'

/**
 * 应用模板
 */
export interface ApplicationTemplate {
  id: string
  name: string
  description?: string
  icon?: string
  category: ApplicationCategory
  status: TemplateStatus

  // 模板快照（完整的表单和工作流配置）
  formSchemaSnapshot: FormSchema
  workflowSnapshot: WorkflowDefinition

  // 模板元数据
  author: string // 作者名称
  authorId: string // 作者 ID
  version: string // 模板版本号，如 "1.0.0"
  tags?: string[]

  // 统计信息
  downloads: number // 下载/安装次数
  rating: number // 平均评分（0-5）
  reviewCount: number // 评论数量
  usageCount: number // 使用次数

  // 预览信息
  previewImages?: string[] // 预览图片 URL
  features?: string[] // 功能特性列表

  // 时间戳
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

/**
 * 模板评论
 */
export interface TemplateReview {
  id: string
  templateId: string
  userId: string
  userName: string
  userAvatar?: string

  // 评论内容
  rating: number // 评分（1-5）
  content: string
  images?: string[] // 评论图片

  // 互动
  likeCount: number // 点赞数
  isLiked?: boolean // 当前用户是否点赞

  // 时间戳
  createdAt: string
  updatedAt?: string
}

/**
 * 模板安装记录
 */
export interface TemplateInstallRecord {
  id: string
  templateId: string
  templateName: string
  userId: string
  userName: string

  // 安装结果
  applicationId: string // 创建的应用 ID
  success: boolean
  errorMessage?: string

  // 时间戳
  installedAt: string
}

/**
 * 模板配置（用于创建/发布模板）
 */
export interface TemplateConfig {
  name: string
  description?: string
  icon?: string
  category: ApplicationCategory
  tags?: string[]
  features?: string[]
  previewImages?: string[]

  // 基于现有应用创建模板
  sourceApplicationId?: string
}

/**
 * 模板搜索参数
 */
export interface TemplateSearchParams {
  keyword?: string
  category?: ApplicationCategory
  tags?: string[]
  sortBy?: 'downloads' | 'rating' | 'latest' // 排序方式
  page?: number
  pageSize?: number
}
