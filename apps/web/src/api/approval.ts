/**
 * @file approval.ts
 * @description 审批相关 API 接口
 * 提供审批列表、详情、提交等操作
 */

import type { ApprovalRecord, PageParams, PageResult, WorkbenchStats } from './types'
import { mockApprovalRecords, mockWorkbenchStats } from './mock'

/**
 * 获取审批列表
 * @param params - 查询参数（页码、页数、状态）
 * @returns 分页审批列表
 */
export async function getApprovalList(
  params: PageParams & { status?: string },
): Promise<PageResult<ApprovalRecord>> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500))

  let filteredList = [...mockApprovalRecords]

  // 按状态筛选
  if (params.status) {
    filteredList = filteredList.filter(item => item.status === params.status)
  }

  // 分页处理
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
 * 获取审批详情
 * @param id - 审批记录 ID
 * @returns 审批详情
 */
export async function getApprovalDetail(id: string): Promise<ApprovalRecord | null> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 300))
  return mockApprovalRecords.find(item => item.id === id) || null
}

/**
 * 提交审批申请
 * @param data - 提交数据（不含 id、status、applyTime）
 * @returns 创建的审批记录
 */
export async function submitApproval(
  data: Omit<ApprovalRecord, 'id' | 'status' | 'applyTime'>,
): Promise<ApprovalRecord> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 800))

  // 创建新审批记录
  const newRecord: ApprovalRecord = {
    ...data,
    id: String(Date.now()),
    status: 'pending',
    applyTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
  }

  // 添加到模拟数据
  mockApprovalRecords.unshift(newRecord)
  return newRecord
}

/**
 * 获取工作台统计数据
 * @returns 统计数据（待办、已办等）
 */
export async function getWorkbenchStats(): Promise<WorkbenchStats> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 400))
  return mockWorkbenchStats
}
