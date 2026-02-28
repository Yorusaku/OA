/**
 * useApprovalTodo - 待办审批列表 Composable
 * 管理筛选、批量选择、数据获取、批量操作等核心逻辑
 */

import { ref, computed, reactive, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { debounce } from 'lodash-es'
import type { PageParams, PageResult } from '@/api/types'
import { getApprovalList, submitApproval } from '@/api/approval'
import { queryKeys } from '@/api/queryKeys'
import type { ApprovalRecord } from '@/api/types'

// ==================== 类型定义 ====================
export interface ApprovalTodoFilters {
  keyword: string
  status: string | null  // null 表示全部
  type: string | null    // null 表示全部
  dateRange: [Date, Date] | null
}

export interface UseApprovalTodoReturn {
  // 筛选状态
  filters: ApprovalTodoFilters
  selectedIds: Ref<Set<string>>
  isAllSelected: Ref<boolean>
  pagination: Ref<PageParams>

  // 数据状态
  data: Ref<PageResult<ApprovalRecord> | undefined>
  isLoading: Ref<boolean>
  error: Ref<any>

  // 方法
  handleSearch: (keyword: string) => void
  toggleSelect: (id: string) => void
  toggleSelectAll: () => void
  batchApprove: () => Promise<void>
  batchReject: () => Promise<void>
  handleRowClick: (row: ApprovalRecord) => void
  handleProcess: (row: ApprovalRecord) => void
}

// ==================== 核心逻辑 ====================
export const useApprovalTodo = (): UseApprovalTodoReturn => {
  // ==================== 修复 1: 在同步阶段调用 useQueryClient ====================
  // 在 Composable 顶层调用,确保在 setup context 中
  const router = useRouter()
  const queryClient = useQueryClient()

  // ==================== 筛选状态 ====================
  const filters = reactive<ApprovalTodoFilters>({
    keyword: '',
    status: undefined,  // undefined 表示全部
    type: undefined,    // undefined 表示全部
    dateRange: undefined,
  })

  // ==================== 批量选择 ====================
  const selectedIds = ref<Set<string>>(new Set())

  // ==================== 分页 ====================
  const pagination = ref<PageParams>({
    page: 1,
    pageSize: 10,
  })

  // ==================== Vue Query ====================
  // 注意: 待办列表 staleTime: 0,确保每次进入都刷新(实时性要求高)
  const queryResult = useQuery({
    queryKey: queryKeys.approval.list({
      keyword: filters.keyword,
      status: filters.status,
      type: filters.type,
      page: pagination.page,
      pageSize: pagination.pageSize,
    }),
    queryFn: () => getApprovalList({
      keyword: filters.keyword,
      status: filters.status,
      type: filters.type,
      page: pagination.page,
      pageSize: pagination.pageSize,
    }),
    staleTime: 0, // 待办列表实时性要求高,不缓存
    retry: 1,
  })

  // ==================== 修复 2: 直接使用 useQuery 返回值,保持响应性 ====================
  // 不要使用 ref(approvalData?.value) 重新包装,这会切断 Vue Query 的响应性
  // 直接返回 queryResult.data,它会自动响应式更新
  const data = computed(() => queryResult.data.value)

  // ==================== 计算属性 ====================
  const isAllSelected = computed(() => {
    const currentData = data.value
    if (!currentData?.list) return false
    return selectedIds.value.size === currentData.list.length
  })

  // ==================== 方法 ====================

  /**
   * 搜索防抖处理
   */
  const handleSearch = debounce((keyword: string) => {
    filters.keyword = keyword
    // 搜索时重置到第一页
    pagination.value.page = 1
  }, 300)

  /**
   * 切换单个选择
   */
  const toggleSelect = (id: string): void => {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id)
    } else {
      selectedIds.value.add(id)
    }
  }

  /**
   * 全选/全不选
   */
  const toggleSelectAll = (): void => {
    if (isAllSelected.value) {
      selectedIds.value.clear()
    } else {
      const currentData = data.value
      if (currentData?.list) {
        currentData.list.forEach(item => selectedIds.value.add(item.id))
      }
    }
  }

  /**
   * 批量通过
   * 使用在顶层调用的 queryClient,避免异步闭包中的上下文丢失
   */
  const batchApprove = async (): Promise<void> => {
    if (selectedIds.value.size === 0) {
      ElMessage.warning('请先选择要通过的审批')
      return
    }

    try {
      // 批量通过逻辑
      const promises = Array.from(selectedIds.value).map(id =>
        submitApproval({
          id,
          status: 'approved',
        } as any)
      )

      await Promise.all(promises)

      // 刷新列表 - 使用顶层调用的 queryClient
      await queryClient.invalidateQueries({ queryKey: queryKeys.approval.list() })

      ElMessage.success(`成功通过 ${selectedIds.value.size} 条审批`)
      selectedIds.value.clear()
    } catch (err) {
      ElMessage.error('批量通过失败,请重试')
      throw err
    }
  }

  /**
   * 批量驳回
   * 使用在顶层调用的 queryClient,避免异步闭包中的上下文丢失
   */
  const batchReject = async (): Promise<void> => {
    if (selectedIds.value.size === 0) {
      ElMessage.warning('请先选择要驳回的审批')
      return
    }

    try {
      // 批量驳回逻辑
      const promises = Array.from(selectedIds.value).map(id =>
        submitApproval({
          id,
          status: 'rejected',
        } as any)
      )

      await Promise.all(promises)

      // 刷新列表 - 使用顶层调用的 queryClient
      await queryClient.invalidateQueries({ queryKey: queryKeys.approval.list() })

      ElMessage.success(`成功驳回 ${selectedIds.value.size} 条审批`)
      selectedIds.value.clear()
    } catch (err) {
      ElMessage.error('批量驳回失败,请重试')
      throw err
    }
  }

  /**
   * 表格行点击事件(选中)
   */
  const handleRowClick = (row: ApprovalRecord): void => {
    toggleSelect(row.id)
  }

  /**
   * 点击处理按钮(跳转详情)
   */
  const handleProcess = (row: ApprovalRecord): void => {
    router.push(`/approval/detail/${row.id}`)
  }

  // ==================== 返回 ====================
  return {
    // 筛选状态
    filters,
    selectedIds,
    isAllSelected,
    pagination,

    // 数据状态
    data,
    isLoading: queryResult.isLoading,
    error: queryResult.error,

    // 方法
    handleSearch,
    toggleSelect,
    toggleSelectAll,
    batchApprove,
    batchReject,
    handleRowClick,
    handleProcess,
  }
}
