/**
 * useApprovalDetail Composable 测试
 * 测试审批详情数据获取及权限映射逻辑
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import type { WorkflowDefinition } from '@/types/workflow'

// Mock useQuery
vi.mock('@tanstack/vue-query', () => ({
  useQuery: vi.fn(),
}))

// Mock API
vi.mock('@/api/approval', () => ({
  getApprovalDetail: vi.fn(),
}))

describe('useApprovalDetail - Red Light Test', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setActivePinia(createPinia())
  })

  it('应该能够调用 useApprovalDetail 并返回数据结构', async () => {
    // Mock API 返回基本数据
    const mockApprovalDetail = {
      id: '1',
      title: '年假申请 - 张三',
      type: 'leave' as const,
      applicant: '张三',
      applyTime: '2026-02-23 10:30:00',
      status: 'pending' as const,
      formData: {
        leaveType: 'sick',
        days: 2.5,
        reason: '重感冒发烧，去医院打点滴。',
      },
      workflowDefinition: {
        id: 'wf-001',
        name: '请假审批流程',
        status: 'active' as const,
        nodes: [],
        edges: [],
      } as WorkflowDefinition,
      history: [],
    }

    // Mock useQuery 返回
    const useQueryMock = vi.fn().mockReturnValue({
      data: ref(mockApprovalDetail),
      isLoading: ref(false),
      error: ref(null),
    })

    const { useQuery } = await import('@tanstack/vue-query')
    vi.mocked(useQuery).mockImplementation(useQueryMock)

    const { useApprovalDetail } = await import('@/composables/useApprovalDetail')
    const result = useApprovalDetail('1')

    expect(result).toBeDefined()
    expect(useQueryMock).toHaveBeenCalledOnce()
    const queryOptions = useQueryMock.mock.calls[0]?.[0]
    expect(queryOptions).toBeDefined()
    const queryKeyValue = queryOptions.queryKey?.value as unknown[]
    expect(Array.isArray(queryKeyValue)).toBe(true)
    expect(queryKeyValue.slice(0, 2)).toEqual(['approval-detail', '1'])
  })

  it('应该返回 ApprovalDetail 接口中定义的必填字段', async () => {
    const mockApprovalDetail = {
      id: '1',
      title: '年假申请 - 张三',
      type: 'leave' as const,
      applicant: '张三',
      applyTime: '2026-02-23 10:30:00',
      status: 'pending' as const,
      formData: {},
      workflowDefinition: {
        id: 'wf-001',
        name: '请假审批流程',
        status: 'active' as const,
        nodes: [],
        edges: [],
      } as WorkflowDefinition,
      history: [],
    }

    const useQueryMock = vi.fn().mockReturnValue({
      data: ref(mockApprovalDetail),
      isLoading: ref(false),
    })

    const { useQuery } = await import('@tanstack/vue-query')
    vi.mocked(useQuery).mockImplementation(useQueryMock)

    const { useApprovalDetail } = await import('@/composables/useApprovalDetail')
    const result = useApprovalDetail('1')

    expect(result.data.value?.id).toBe('1')
    expect(result.data.value?.title).toBe('年假申请 - 张三')
    expect(result.data.value?.status).toBe('pending')
  })
})
