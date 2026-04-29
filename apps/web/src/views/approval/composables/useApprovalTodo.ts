/**
 * Todo approvals list composable.
 */

import type { Ref } from 'vue'
import type { ApprovalRecord, PageParams, PageResult } from '@/api/types'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { debounce } from 'lodash-es'
import { getApprovalList, processApproval } from '@/api/approval'
import { queryKeys } from '@/api/queryKeys'
import { useUserStore } from '@/stores/user'

export interface ApprovalTodoFilters {
  keyword: string
  status: string
  type: string
  dateRange: [Date, Date] | null
}

export interface UseApprovalTodoReturn {
  filters: ApprovalTodoFilters
  selectedIds: Ref<Set<string>>
  pagination: Ref<PageParams>
  data: Ref<PageResult<ApprovalRecord> | undefined>
  isLoading: Ref<boolean>
  error: Ref<unknown>
  refetch: () => Promise<unknown>
  handleSearch: (keyword?: string) => void
  handleSelectionChange: (rows: ApprovalRecord[]) => void
  batchApprove: () => Promise<void>
  batchReject: () => Promise<void>
  processRecord: (id: string, action: 'approve' | 'reject') => Promise<void>
  handleProcess: (row: ApprovalRecord) => void
}

export const useApprovalTodo = (): UseApprovalTodoReturn => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const userStore = useUserStore()

  const filters = reactive<ApprovalTodoFilters>({
    keyword: '',
    status: '',
    type: '',
    dateRange: null,
  })

  const selectedIds = ref<Set<string>>(new Set())
  const pagination = ref<PageParams>({ page: 1, pageSize: 10 })
  const assigneeId = computed(() => userStore.userInfo?.id || undefined)
  const operatorId = computed(() => userStore.userInfo?.id || undefined)
  const operatorName = computed(() => userStore.userInfo?.name || undefined)

  const queryResult = useQuery({
    queryKey: computed(() => queryKeys.approval.list({
      keyword: filters.keyword || undefined,
      status: filters.status || undefined,
      type: filters.type || undefined,
      dateRange: filters.dateRange
        ? [
            filters.dateRange[0].toISOString().slice(0, 10),
            filters.dateRange[1].toISOString().slice(0, 10),
          ]
        : undefined,
      assigneeId: assigneeId.value,
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    })),
    queryFn: () => getApprovalList({
      keyword: filters.keyword || undefined,
      status: filters.status || undefined,
      type: filters.type || undefined,
      dateRange: filters.dateRange,
      assigneeId: assigneeId.value,
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    }),
    staleTime: 0,
    retry: 1,
  })

  const data = computed(() => queryResult.data.value)

  const handleSearch = debounce((keyword?: string) => {
    filters.keyword = keyword || ''
  }, 300)

  const handleSelectionChange = (rows: ApprovalRecord[]): void => {
    selectedIds.value = new Set(rows.map(row => row.id))
  }

  const runBatchAction = async (status: 'approved' | 'rejected'): Promise<void> => {
    if (selectedIds.value.size === 0) {
      ElMessage.warning(status === 'approved' ? '请先选择要通过的审批' : '请先选择要驳回的审批')
      return
    }

    const ids = Array.from(selectedIds.value)
    const results = await Promise.allSettled(
      ids.map(id => processApproval({
        id,
        action: status === 'approved' ? 'approve' : 'reject',
        operatorId: operatorId.value,
        operatorName: operatorName.value,
      })),
    )

    const failedCount = results.filter(item => item.status === 'rejected').length

    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: queryKeys.approval.list() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.approval.stats }),
      queryClient.invalidateQueries({ queryKey: queryKeys.approval.notifications() }),
      ...ids.map(id => queryClient.invalidateQueries({ queryKey: queryKeys.approval.detail(id) })),
    ])

    if (failedCount === 0) {
      ElMessage.success(status === 'approved'
        ? `成功通过 ${ids.length} 条审批`
        : `成功驳回 ${ids.length} 条审批`)
    }
    else {
      ElMessage.warning(`已处理 ${ids.length - failedCount}/${ids.length} 条审批`)
    }

    selectedIds.value.clear()
  }

  const batchApprove = async (): Promise<void> => runBatchAction('approved')
  const batchReject = async (): Promise<void> => runBatchAction('rejected')

  const processRecord = async (id: string, action: 'approve' | 'reject'): Promise<void> => {
    await processApproval({
      id,
      action,
      operatorId: operatorId.value,
      operatorName: operatorName.value,
    })

    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: queryKeys.approval.list() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.approval.stats }),
      queryClient.invalidateQueries({ queryKey: queryKeys.approval.detail(id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.approval.notifications() }),
    ])
  }

  const handleProcess = (row: ApprovalRecord): void => {
    router.push(`/approval/detail/${row.id}`)
  }

  watch(
    () => [filters.keyword, filters.status, filters.type, filters.dateRange],
    () => {
      pagination.value.page = 1
      selectedIds.value.clear()
    },
  )

  watch(
    () => [pagination.value.page, pagination.value.pageSize],
    () => {
      selectedIds.value.clear()
    },
  )

  return {
    filters,
    selectedIds,
    pagination,
    data,
    isLoading: queryResult.isLoading,
    error: queryResult.error,
    refetch: queryResult.refetch,
    handleSearch,
    handleSelectionChange,
    batchApprove,
    batchReject,
    processRecord,
    handleProcess,
  }
}
