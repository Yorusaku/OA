/**
 * @file workflow.ts
 * @description 工作流 API 封装
 * 提供流程定义的增删改查操作（当前使用 mock 数据）
 */

import type { WorkflowDefinition } from '@/types/workflow'
import {
  mockFormSchemas,
  mockWorkflowDefinitions,
} from './mock'
import {
  remoteCreateWorkflowDefinition,
  remoteDebugWorkflowRuleTrace,
  remoteDeleteWorkflowDefinition,
  remoteGetFormSchemas,
  remoteGetWorkflowDefinition,
  remoteGetWorkflowDefinitions,
  remoteGetWorkflowImpact,
  remotePublishWorkflow,
  remoteRollbackWorkflow,
  remoteUpdateWorkflowDefinition,
} from './workflow.remote'
import { useRemoteWorkflowApi } from './runtime'

/**
 * 分页请求参数
 */
export interface PageParams {
  /** 页码 */
  page: number
  /** 每页数量 */
  pageSize: number
  /** 关键词 */
  keyword?: string
  /** 状态过滤 */
  status?: string
}

/**
 * 分页响应数据
 * @template T - 数据类型
 */
export interface PageResponse<T> {
  /** 数据列表 */
  list: T[]
  /** 总数 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页数量 */
  pageSize: number
}

/**
 * 获取流程定义列表
 * @param params - 分页和过滤参数
 * @returns 分页流程列表
 */
export function getWorkflowDefinitions(params?: PageParams): Promise<PageResponse<WorkflowDefinition>> {
  if (useRemoteWorkflowApi())
    return remoteGetWorkflowDefinitions(params)

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
 * 获取单个流程定义详情
 * @param id - 流程定义 ID
 * @returns 流程定义详情
 */
export function getWorkflowDefinition(id: string): Promise<WorkflowDefinition> {
  if (useRemoteWorkflowApi())
    return remoteGetWorkflowDefinition(id)

  const workflow = mockWorkflowDefinitions.find(w => w.id === id)
  if (!workflow) {
    return Promise.reject(new Error('流程不存在'))
  }
  return Promise.resolve(workflow)
}

/**
 * 创建流程定义
 * @param data - 流程定义数据
 * @returns 创建后的流程定义
 */
export function createWorkflowDefinition(data: WorkflowDefinition): Promise<WorkflowDefinition> {
  if (useRemoteWorkflowApi())
    return remoteCreateWorkflowDefinition(data)

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
 * 更新流程定义
 * @param id - 流程定义 ID
 * @param data - 流程定义数据
 * @returns 更新后的流程定义
 */
export function updateWorkflowDefinition(id: string, data: WorkflowDefinition): Promise<WorkflowDefinition> {
  if (useRemoteWorkflowApi())
    return remoteUpdateWorkflowDefinition(id, data)

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
 * 删除流程定义
 * @param id - 流程定义 ID
 */
export function deleteWorkflowDefinition(id: string): Promise<void> {
  if (useRemoteWorkflowApi())
    return remoteDeleteWorkflowDefinition(id)

  const index = mockWorkflowDefinitions.findIndex(w => w.id === id)
  if (index === -1) {
    return Promise.reject(new Error('流程不存在'))
  }
  mockWorkflowDefinitions.splice(index, 1)
  return Promise.resolve()
}

/**
 * 获取表单 Schema 列表（用于流程设计器选择绑定表单）
 * @returns 表单 Schema 列表
 */
export function getFormSchemas(): Promise<Array<{ id: string, name: string }>> {
  if (useRemoteWorkflowApi())
    return remoteGetFormSchemas()

  return Promise.resolve(mockFormSchemas)
}

export function publishWorkflowDefinition(id: string, actor?: string) {
  if (useRemoteWorkflowApi())
    return remotePublishWorkflow(id, actor)

  const target = mockWorkflowDefinitions.find(item => item.id === id)
  if (!target)
    return Promise.reject(new Error('流程不存在'))
  target.status = 'active'
  target.updatedAt = new Date().toISOString()
  target.version = (target.version || 0) + 1
  return Promise.resolve({
    id: `${id}-mock-v${target.version}`,
    workflowId: target.id,
    workflowName: target.name,
    status: 'published',
    snapshot: target,
    createdAt: target.updatedAt,
    createdBy: actor || 'mock',
  })
}

export function rollbackWorkflowDefinition(id: string, versionId: string, actor?: string) {
  if (useRemoteWorkflowApi())
    return remoteRollbackWorkflow(id, versionId, actor)

  const target = mockWorkflowDefinitions.find(item => item.id === id)
  if (!target)
    return Promise.reject(new Error('流程不存在'))
  target.updatedAt = new Date().toISOString()
  target.version = (target.version || 0) + 1
  return Promise.resolve({
    id: `${id}-mock-rb-${Date.now()}`,
    workflowId: target.id,
    workflowName: target.name,
    status: 'rolled_back',
    snapshot: target,
    createdAt: target.updatedAt,
    createdBy: actor || 'mock',
    note: `mock rollback to ${versionId}`,
  })
}

export function getWorkflowImpact(id: string) {
  if (useRemoteWorkflowApi())
    return remoteGetWorkflowImpact(id)

  return Promise.resolve({
    workflowId: id,
    pendingCount: 0,
    involvedNodeCount: 0,
    riskLevel: 'low' as const,
    suggestions: ['当前为 mock 模式，影响分析为占位数据'],
  })
}

export function debugWorkflowRuleTrace(
  workflowId: string,
  payload: { nodeId?: string, formData?: Record<string, unknown> },
) {
  if (useRemoteWorkflowApi())
    return remoteDebugWorkflowRuleTrace(workflowId, payload)

  return Promise.resolve({
    workflowId,
    nodeId: payload.nodeId,
    matched: true,
    summary: 'mock 模式调试结果',
    fields: [],
  })
}
