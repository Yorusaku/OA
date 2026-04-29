import type { ApprovalRecord, PageResult } from '@/api/types'
import type { UseApprovalTodoReturn } from '../composables/useApprovalTodo'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ApprovalListMobile from '../components/ApprovalListMobile.vue'

const toggleMobileFilter = vi.fn()
const usePullRefreshMock = vi.fn()

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({
    toggleMobileFilter,
  }),
}))

vi.mock('@/composables/usePullRefresh', () => ({
  usePullRefresh: (...args: unknown[]) => usePullRefreshMock(...args),
}))

vi.mock('element-plus', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
  }
})

function buildTodoReturn(record: ApprovalRecord): UseApprovalTodoReturn {
  const processRecord = vi.fn().mockResolvedValue(undefined)
  const result: UseApprovalTodoReturn = {
    filters: reactive({
      keyword: '',
      status: '',
      type: '',
      dateRange: null,
    }),
    selectedIds: ref(new Set()),
    pagination: ref({ page: 1, pageSize: 10 }),
    data: ref<PageResult<ApprovalRecord>>({
      list: [record],
      total: 1,
      page: 1,
      pageSize: 10,
    }),
    isLoading: ref(false),
    error: ref(null),
    refetch: vi.fn().mockResolvedValue({}),
    handleSearch: vi.fn(),
    handleSelectionChange: vi.fn(),
    batchApprove: vi.fn(),
    batchReject: vi.fn(),
    processRecord,
    handleProcess: vi.fn(),
  }

  return result
}

describe('ApprovalListMobile.vue', () => {
  const mockRecord: ApprovalRecord = {
    id: 'APPROVE-TEST-MOBILE-001',
    title: '移动端审批测试',
    type: 'leave',
    status: 'pending',
    applicant: '张三',
    applyTime: '2026-04-29 09:00:00',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    usePullRefreshMock.mockReturnValue({
      pullDistance: ref(0),
      statusText: ref(''),
      handleTouchStart: vi.fn(),
      handleTouchMove: vi.fn(),
      handleTouchEnd: vi.fn(),
    })
  })

  it('点击筛选按钮应打开移动端筛选抽屉', async () => {
    const wrapper = mount(ApprovalListMobile, {
      props: {
        todoReturn: buildTodoReturn(mockRecord),
      },
      global: {
        stubs: {
          ElButton: {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElSkeleton: true,
          ElEmpty: true,
          ApprovalCardMobile: {
            template: '<div class="approval-card-mobile-stub"></div>',
          },
        },
      },
    })

    const filterButton = wrapper.findAll('button').find(node => node.text().includes('筛选'))
    expect(filterButton).toBeTruthy()
    await filterButton!.trigger('click')

    expect(toggleMobileFilter).toHaveBeenCalled()
  })

  it('左滑卡片触发 approve 事件后应调用单条审批处理', async () => {
    const todoReturn = buildTodoReturn(mockRecord)
    const wrapper = mount(ApprovalListMobile, {
      props: { todoReturn },
      global: {
        stubs: {
          ElButton: {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElSkeleton: true,
          ElEmpty: true,
          ApprovalCardMobile: {
            props: ['record'],
            template: '<button class="card-approve" @click="$emit(\'approve\')">approve</button>',
          },
        },
      },
    })

    await wrapper.find('.card-approve').trigger('click')
    await flushPromises()

    expect(todoReturn.processRecord).toHaveBeenCalledWith('APPROVE-TEST-MOBILE-001', 'approve')
    expect(ElMessage.success).toHaveBeenCalledWith('审批通过')
  })
})
