/**
 * 工作流 API 封装
 * 当前使用 mock 数据，后续替换为真实接口
 */
import type { WorkflowDefinition } from '@/types/workflow'
import {
  mockFormSchemas,
  mockWorkflowDefinitions,
} from './mock'

/**
 * 分页请求参数
 */
export interface PageParams {
  page: number
  pageSize: number
  keyword?: string
  status?: string
}

/**
 * 分页响应
 */
export interface PageResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/**
 * 获取流程定义列表（Mock）
 */
export function getWorkflowDefinitions(params?: PageParams): Promise<PageResponse<WorkflowDefinition>> {
  // Mock 实现
  let list = [...mockWorkflowDefinitions]

  // 关键词过滤
  if (params?.keyword) {
    list = list.filter(w => w.name.includes(params.keyword!))
  }

  // 状态过滤
  if (params?.status) {
    list = list.filter(w => w.status === params.status)
  }

  const total = list.length
  const page = params?.page || 1
  const pageSize = params?.pageSize || 10
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize

  return Promise.resolve({
    list: list.slice(startIndex, endIndex),
    total,
    page,
    pageSize,
  })
}

/**
 * 获取单个流程定义（Mock）
 */
export function getWorkflowDefinition(id: string): Promise<WorkflowDefinition> {
  const workflow = mockWorkflowDefinitions.find(w => w.id === id)
  if (!workflow) {
    return Promise.reject(new Error('流程不存在'))
  }
  return Promise.resolve(workflow)
}

/**
 * 创建流程定义（Mock）
 */
export function createWorkflowDefinition(data: WorkflowDefinition): Promise<WorkflowDefinition> {
  const newWorkflow: WorkflowDefinition = {
    ...data,
    id: `wf-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  }
  mockWorkflowDefinitions.push(newWorkflow)
  return Promise.resolve(newWorkflow)
}

/**
 * 更新流程定义（Mock）
 */
export function updateWorkflowDefinition(id: string, data: WorkflowDefinition): Promise<WorkflowDefinition> {
  const index = mockWorkflowDefinitions.findIndex(w => w.id === id)
  if (index === -1) {
    return Promise.reject(new Error('流程不存在'))
  }

  const updated: WorkflowDefinition = {
    ...data,
    id,
    updatedAt: new Date().toISOString(),
    version: (mockWorkflowDefinitions[index].version || 0) + 1,
  }
  mockWorkflowDefinitions[index] = updated
  return Promise.resolve(updated)
}

/**
 * 删除流程定义（Mock）
 */
export function deleteWorkflowDefinition(id: string): Promise<void> {
  const index = mockWorkflowDefinitions.findIndex(w => w.id === id)
  if (index === -1) {
    return Promise.reject(new Error('流程不存在'))
  }
  mockWorkflowDefinitions.splice(index, 1)
  return Promise.resolve()
}

/**
 * 获取表单 Schema 列表（Mock）
 */
export function getFormSchemas(): Promise<Array<{ id: string, name: string }>> {
  return Promise.resolve(mockFormSchemas)
}
