/**
 * @file template.ts
 * @description 模板市场 API
 */

import type {
  ApplicationTemplate,
  TemplateConfig,
  TemplateInstallRecord,
  TemplateReview,
  TemplateSearchParams,
} from '@/types/application'
import type { PageResult } from '@/types/common'
import {
  mockTemplateInstallRecords,
  mockTemplateReviews,
  mockTemplates,
} from './mock'

// 模拟延迟
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const LIST_DELAY_MS = 500
const DETAIL_DELAY_MS = 300
const CREATE_DELAY_MS = 800
const UPDATE_DELAY_MS = 600
const DELETE_DELAY_MS = 400
const INSTALL_DELAY_MS = 1000

// 生成时间戳 ID
function toTimestampId(prefix: string): string {
  return `${prefix}-${Date.now()}`
}

// 格式化日期时间
function formatDateTime(date: Date = new Date()): string {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

/**
 * 获取模板列表
 */
export async function getTemplateList(
  params: TemplateSearchParams = {},
): Promise<PageResult<ApplicationTemplate>> {
  await sleep(LIST_DELAY_MS)

  const {
    keyword = '',
    category,
    tags = [],
    sortBy = 'downloads',
    page = 1,
    pageSize = 12,
  } = params

  let filtered = mockTemplates.filter(t => t.status === 'published')

  // 关键词搜索
  if (keyword) {
    const kw = keyword.toLowerCase()
    filtered = filtered.filter(
      t =>
        t.name.toLowerCase().includes(kw)
        || t.description?.toLowerCase().includes(kw)
        || t.tags?.some(tag => tag.toLowerCase().includes(kw)),
    )
  }

  // 分类筛选
  if (category) {
    filtered = filtered.filter(t => t.category === category)
  }

  // 标签筛选
  if (tags.length > 0) {
    filtered = filtered.filter(t =>
      tags.some(tag => t.tags?.includes(tag)),
    )
  }

  // 排序
  if (sortBy === 'downloads') {
    filtered.sort((a, b) => b.downloads - a.downloads)
  }
  else if (sortBy === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating)
  }
  else if (sortBy === 'latest') {
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  // 分页
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const list = filtered.slice(start, end)

  return {
    list,
    total: filtered.length,
    page,
    pageSize,
  }
}

/**
 * 获取模板详情
 */
export async function getTemplateDetail(id: string): Promise<ApplicationTemplate | null> {
  await sleep(DETAIL_DELAY_MS)
  return mockTemplates.find(t => t.id === id) || null
}

/**
 * 创建模板（从应用发布为模板）
 */
export async function createTemplate(config: TemplateConfig): Promise<ApplicationTemplate> {
  await sleep(CREATE_DELAY_MS)

  // 模拟从应用创建模板
  const newTemplate: ApplicationTemplate = {
    id: toTimestampId('TPL'),
    name: config.name,
    description: config.description,
    icon: config.icon || '📋',
    category: config.category,
    status: 'draft',
    formSchemaSnapshot: {} as any, // 实际应从应用中获取
    workflowSnapshot: {} as any, // 实际应从应用中获取
    author: '当前用户',
    authorId: '1',
    version: '1.0.0',
    tags: config.tags || [],
    downloads: 0,
    rating: 0,
    reviewCount: 0,
    usageCount: 0,
    previewImages: config.previewImages,
    features: config.features,
    createdAt: formatDateTime(),
    updatedAt: formatDateTime(),
  }

  mockTemplates.push(newTemplate)
  return newTemplate
}

/**
 * 更新模板
 */
export async function updateTemplate(
  id: string,
  config: Partial<TemplateConfig>,
): Promise<ApplicationTemplate> {
  await sleep(UPDATE_DELAY_MS)

  const template = mockTemplates.find(t => t.id === id)
  if (!template) {
    throw new Error('模板不存在')
  }

  Object.assign(template, {
    ...config,
    updatedAt: formatDateTime(),
  })

  return template
}

/**
 * 删除模板
 */
export async function deleteTemplate(id: string): Promise<void> {
  await sleep(DELETE_DELAY_MS)

  const index = mockTemplates.findIndex(t => t.id === id)
  if (index > -1) {
    mockTemplates.splice(index, 1)
  }
}

/**
 * 发布模板
 */
export async function publishTemplate(id: string): Promise<ApplicationTemplate> {
  await sleep(UPDATE_DELAY_MS)

  const template = mockTemplates.find(t => t.id === id)
  if (!template) {
    throw new Error('模板不存在')
  }

  template.status = 'published'
  template.publishedAt = formatDateTime()
  template.updatedAt = formatDateTime()

  return template
}

/**
 * 停用/启用模板
 */
export async function toggleTemplateStatus(
  id: string,
  status: 'published' | 'disabled',
): Promise<ApplicationTemplate> {
  await sleep(UPDATE_DELAY_MS)

  const template = mockTemplates.find(t => t.id === id)
  if (!template) {
    throw new Error('模板不存在')
  }

  template.status = status
  template.updatedAt = formatDateTime()

  return template
}

/**
 * 安装模板（从模板创建应用）
 */
export async function installTemplate(
  templateId: string,
  applicationName?: string,
): Promise<TemplateInstallRecord> {
  await sleep(INSTALL_DELAY_MS)

  const template = mockTemplates.find(t => t.id === templateId)
  if (!template) {
    throw new Error('模板不存在')
  }

  // 增加下载次数
  template.downloads += 1

  // 创建安装记录
  const record: TemplateInstallRecord = {
    id: toTimestampId('INST'),
    templateId,
    templateName: template.name,
    userId: '1',
    userName: '当前用户',
    applicationId: toTimestampId('APP'),
    success: true,
    installedAt: formatDateTime(),
  }

  mockTemplateInstallRecords.push(record)
  return record
}

/**
 * 获取模板评论列表
 */
export async function getTemplateReviews(
  templateId: string,
  page = 1,
  pageSize = 10,
): Promise<PageResult<TemplateReview>> {
  await sleep(LIST_DELAY_MS)

  const filtered = mockTemplateReviews.filter(r => r.templateId === templateId)
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const list = filtered.slice(start, end)

  return {
    list,
    total: filtered.length,
    page,
    pageSize,
  }
}

/**
 * 创建模板评论
 */
export async function createTemplateReview(
  templateId: string,
  rating: number,
  content: string,
): Promise<TemplateReview> {
  await sleep(CREATE_DELAY_MS)

  const review: TemplateReview = {
    id: toTimestampId('REV'),
    templateId,
    userId: '1',
    userName: '当前用户',
    rating,
    content,
    likeCount: 0,
    createdAt: formatDateTime(),
  }

  mockTemplateReviews.push(review)

  // 更新模板评分和评论数
  const template = mockTemplates.find(t => t.id === templateId)
  if (template) {
    const reviews = mockTemplateReviews.filter(r => r.templateId === templateId)
    template.reviewCount = reviews.length
    template.rating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  }

  return review
}

/**
 * 点赞评论
 */
export async function likeTemplateReview(reviewId: string): Promise<TemplateReview> {
  await sleep(UPDATE_DELAY_MS)

  const review = mockTemplateReviews.find(r => r.id === reviewId)
  if (!review) {
    throw new Error('评论不存在')
  }

  if (review.isLiked) {
    review.likeCount -= 1
    review.isLiked = false
  }
  else {
    review.likeCount += 1
    review.isLiked = true
  }

  return review
}

/**
 * 获取我的模板列表
 */
export async function getMyTemplates(
  page = 1,
  pageSize = 10,
): Promise<PageResult<ApplicationTemplate>> {
  await sleep(LIST_DELAY_MS)

  // 模拟获取当前用户创建的模板
  const filtered = mockTemplates.filter(t => t.authorId === '1')
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const list = filtered.slice(start, end)

  return {
    list,
    total: filtered.length,
    page,
    pageSize,
  }
}

/**
 * 获取我的安装记录
 */
export async function getMyInstallRecords(
  page = 1,
  pageSize = 10,
): Promise<PageResult<TemplateInstallRecord>> {
  await sleep(LIST_DELAY_MS)

  // 模拟获取当前用户的安装记录
  const filtered = mockTemplateInstallRecords.filter(r => r.userId === '1')
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const list = filtered.slice(start, end)

  return {
    list,
    total: filtered.length,
    page,
    pageSize,
  }
}

/**
 * 获取热门标签
 */
export async function getPopularTags(): Promise<Array<{ tag: string, count: number }>> {
  await sleep(DETAIL_DELAY_MS)

  const tagMap = new Map<string, number>()

  mockTemplates
    .filter(t => t.status === 'published')
    .forEach((t) => {
      t.tags?.forEach((tag) => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
      })
    })

  return Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
}
