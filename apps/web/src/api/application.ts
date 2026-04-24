/**
 * @file application.ts
 * @description 应用中心相关 API（mock 内存实现）
 */

import type {
  Application,
  ApplicationCategory,
  ApplicationConfig,
  ApplicationStats,
  ApplicationStatus,
  ApplicationVersion,
  VersionComparison,
} from '@/types/application'
import type { PageParams, PageResult } from './types'
import { mockApplications, mockApplicationStats, mockApplicationVersions } from './mock'

const LIST_DELAY_MS = 500
const DETAIL_DELAY_MS = 300
const CREATE_DELAY_MS = 800
const UPDATE_DELAY_MS = 600
const DELETE_DELAY_MS = 400
const PUBLISH_DELAY_MS = 700
const STATS_DELAY_MS = 400

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

function toTimestampId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatDateTime(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  const second = `${date.getSeconds()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

/**
 * 获取应用列表
 */
export async function getApplicationList(
  params: PageParams & {
    status?: ApplicationStatus
    category?: ApplicationCategory
    keyword?: string
  },
): Promise<PageResult<Application>> {
  await sleep(LIST_DELAY_MS)

  let filteredList = [...mockApplications]

  // 按状态筛选
  if (params.status) {
    filteredList = filteredList.filter(item => item.status === params.status)
  }

  // 按分类筛选
  if (params.category) {
    filteredList = filteredList.filter(item => item.category === params.category)
  }

  // 按关键词筛选（名称、描述、标签）
  if (params.keyword?.trim()) {
    const keyword = params.keyword.trim().toLowerCase()
    filteredList = filteredList.filter((item) => {
      const haystack = [
        item.name,
        item.description,
        ...(item.tags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(keyword)
    })
  }

  // 按更新时间倒序排序
  filteredList.sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime()
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime()
    return timeB - timeA
  })

  const start = (params.page - 1) * params.pageSize
  const end = start + params.pageSize

  return {
    list: filteredList.slice(start, end),
    total: filteredList.length,
    page: params.page,
    pageSize: params.pageSize,
  }
}

/**
 * 获取应用详情
 */
export async function getApplicationDetail(id: string): Promise<Application | null> {
  await sleep(DETAIL_DELAY_MS)

  const application = mockApplications.find(item => item.id === id)
  if (!application)
    return null

  return application
}

/**
 * 创建应用
 */
export async function createApplication(
  config: ApplicationConfig,
): Promise<Application> {
  await sleep(CREATE_DELAY_MS)

  const now = new Date()
  const createdAt = formatDateTime(now)

  const newApplication: Application = {
    id: toTimestampId('APP'),
    name: config.name,
    description: config.description,
    icon: config.icon || '📋',
    category: config.category,
    status: 'draft',
    formSchemaId: config.formSchemaId,
    workflowId: config.workflowId,
    version: 1,
    currentVersionId: toTimestampId('VER'),
    usageCount: 0,
    approvalCount: 0,
    isDefault: config.isDefault || false,
    isTemplate: false,
    allowCustomize: config.allowCustomize || false,
    tags: config.tags || [],
    createdBy: '当前用户',
    createdAt,
    updatedBy: '当前用户',
    updatedAt: createdAt,
  }

  mockApplications.unshift(newApplication)

  return newApplication
}

/**
 * 更新应用
 */
export async function updateApplication(
  id: string,
  config: Partial<ApplicationConfig>,
): Promise<Application> {
  await sleep(UPDATE_DELAY_MS)

  const application = mockApplications.find(item => item.id === id)
  if (!application)
    throw new Error('application-not-found')

  const now = formatDateTime(new Date())

  // 更新应用信息
  if (config.name !== undefined)
    application.name = config.name
  if (config.description !== undefined)
    application.description = config.description
  if (config.icon !== undefined)
    application.icon = config.icon
  if (config.category !== undefined)
    application.category = config.category
  if (config.formSchemaId !== undefined)
    application.formSchemaId = config.formSchemaId
  if (config.workflowId !== undefined)
    application.workflowId = config.workflowId
  if (config.isDefault !== undefined)
    application.isDefault = config.isDefault
  if (config.allowCustomize !== undefined)
    application.allowCustomize = config.allowCustomize
  if (config.tags !== undefined)
    application.tags = config.tags

  application.updatedBy = '当前用户'
  application.updatedAt = now

  return application
}

/**
 * 删除应用
 */
export async function deleteApplication(id: string): Promise<void> {
  await sleep(DELETE_DELAY_MS)

  const index = mockApplications.findIndex(item => item.id === id)
  if (index === -1)
    throw new Error('application-not-found')

  mockApplications.splice(index, 1)
}

/**
 * 发布应用
 */
export async function publishApplication(id: string): Promise<Application> {
  await sleep(PUBLISH_DELAY_MS)

  const application = mockApplications.find(item => item.id === id)
  if (!application)
    throw new Error('application-not-found')

  const now = formatDateTime(new Date())

  application.status = 'published'
  application.publishedAt = now
  application.publishedBy = '当前用户'
  application.updatedAt = now

  return application
}

/**
 * 切换应用状态（发布/停用）
 */
export async function toggleApplicationStatus(
  id: string,
  status: 'published' | 'disabled',
): Promise<Application> {
  await sleep(UPDATE_DELAY_MS)

  const application = mockApplications.find(item => item.id === id)
  if (!application)
    throw new Error('application-not-found')

  const now = formatDateTime(new Date())

  application.status = status
  application.updatedAt = now

  if (status === 'published' && !application.publishedAt) {
    application.publishedAt = now
    application.publishedBy = '当前用户'
  }

  return application
}

/**
 * 获取应用统计数据
 */
export async function getApplicationStats(id: string): Promise<ApplicationStats> {
  await sleep(STATS_DELAY_MS)

  const stats = mockApplicationStats.find(item => item.applicationId === id)
  if (!stats) {
    // 返回默认统计数据
    return {
      applicationId: id,
      totalSubmissions: 0,
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      avgProcessTime: 0,
      avgApprovalTime: 0,
      dailySubmissions: [0, 0, 0, 0, 0, 0, 0],
      activeUsers: 0,
      topApplicants: [],
    }
  }

  return stats
}

/**
 * 获取应用版本历史
 */
export async function getApplicationVersions(
  applicationId: string,
): Promise<ApplicationVersion[]> {
  await sleep(DETAIL_DELAY_MS)

  const versions = mockApplicationVersions.filter(
    item => item.applicationId === applicationId,
  )

  // 按版本号倒序排序
  return versions.sort((a, b) => b.version - a.version)
}

/**
 * 回滚到指定版本
 */
export async function rollbackToVersion(
  applicationId: string,
  versionId: string,
): Promise<Application> {
  await sleep(UPDATE_DELAY_MS)

  const application = mockApplications.find(item => item.id === applicationId)
  if (!application)
    throw new Error('application-not-found')

  const version = mockApplicationVersions.find(item => item.id === versionId)
  if (!version)
    throw new Error('version-not-found')

  const now = formatDateTime(new Date())

  // 更新应用配置为指定版本的快照
  application.formSchemaId = version.formSchemaSnapshot.id
  application.workflowId = version.workflowSnapshot.id
  application.version = version.version
  application.currentVersionId = versionId
  application.updatedBy = '当前用户'
  application.updatedAt = now

  return application
}

/**
 * 对比两个版本
 */
export async function compareVersions(
  versionId1: string,
  versionId2: string,
): Promise<VersionComparison> {
  await sleep(DETAIL_DELAY_MS)

  const version1 = mockApplicationVersions.find(item => item.id === versionId1)
  const version2 = mockApplicationVersions.find(item => item.id === versionId2)

  if (!version1 || !version2)
    throw new Error('version-not-found')

  // 简化的差异对比（实际应该深度对比 FormSchema 和 WorkflowDefinition）
  const formChanges = {
    added: [] as string[],
    removed: [] as string[],
    modified: [] as string[],
  }

  const workflowChanges = {
    nodesAdded: 0,
    nodesRemoved: 0,
    nodesModified: 0,
    edgesChanged: false,
  }

  // 对比表单字段
  const fields1 = version1.formSchemaSnapshot.fields || []
  const fields2 = version2.formSchemaSnapshot.fields || []

  const fieldIds1 = new Set(fields1.map(f => f.id))
  const fieldIds2 = new Set(fields2.map(f => f.id))

  fields2.forEach((field) => {
    if (!fieldIds1.has(field.id)) {
      formChanges.added.push(field.label || field.id)
    }
  })

  fields1.forEach((field) => {
    if (!fieldIds2.has(field.id)) {
      formChanges.removed.push(field.label || field.id)
    }
  })

  // 对比工作流节点
  const nodes1 = version1.workflowSnapshot.nodes || []
  const nodes2 = version2.workflowSnapshot.nodes || []

  workflowChanges.nodesAdded = Math.max(0, nodes2.length - nodes1.length)
  workflowChanges.nodesRemoved = Math.max(0, nodes1.length - nodes2.length)

  const edges1 = version1.workflowSnapshot.edges || []
  const edges2 = version2.workflowSnapshot.edges || []
  workflowChanges.edgesChanged = edges1.length !== edges2.length

  return {
    oldVersion: version1,
    newVersion: version2,
    formChanges,
    workflowChanges,
  }
}

/**
 * 复制应用
 */
export async function duplicateApplication(id: string): Promise<Application> {
  await sleep(CREATE_DELAY_MS)

  const original = mockApplications.find(item => item.id === id)
  if (!original)
    throw new Error('application-not-found')

  const now = new Date()
  const createdAt = formatDateTime(now)

  const duplicated: Application = {
    ...original,
    id: toTimestampId('APP'),
    name: `${original.name}（副本）`,
    status: 'draft',
    version: 1,
    currentVersionId: toTimestampId('VER'),
    usageCount: 0,
    approvalCount: 0,
    createdBy: '当前用户',
    createdAt,
    updatedBy: '当前用户',
    updatedAt: createdAt,
    publishedAt: undefined,
    publishedBy: undefined,
  }

  mockApplications.unshift(duplicated)

  return duplicated
}
