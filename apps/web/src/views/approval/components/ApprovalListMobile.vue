<script setup lang="ts">
import type { ApprovalRecord } from '@/api/types'
import type { UseApprovalTodoReturn } from '../composables/useApprovalTodo'
import { Filter } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { usePullRefresh } from '@/composables/usePullRefresh'
import { useAppStore } from '@/stores/app'
import ApprovalCardMobile from './ApprovalCardMobile.vue'

interface Props {
  todoReturn: UseApprovalTodoReturn
}

const props = defineProps<Props>()
const appStore = useAppStore()

const {
  pagination,
  data,
  isLoading,
  error,
  refetch,
  processRecord,
  handleProcess,
} = props.todoReturn

const containerRef = ref<HTMLElement | null>(null)

const {
  pullDistance,
  statusText,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
} = usePullRefresh(containerRef, {
  threshold: 60,
  onRefresh: async () => {
    if (pagination.value.page !== 1)
      pagination.value.page = 1
    await refetch()
  },
})

const statusTagTypeMap: Record<string, 'warning' | 'success' | 'danger' | 'info' | 'primary'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  transferred: 'primary',
  cancelled: 'info',
  withdrawn: 'info',
}

const statusTextMap: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
  transferred: '已转交',
  cancelled: '已取消',
  withdrawn: '已撤回',
}

const activeSwipeId = ref<string | null>(null)

function handleSwipeOpen(id: string) {
  activeSwipeId.value = id
}

function handleSwipeClose() {
  activeSwipeId.value = null
}

async function handleApprove(record: ApprovalRecord) {
  try {
    await processRecord(record.id, 'approve')
    handleSwipeClose()
    ElMessage.success('审批通过')
  }
  catch {
    ElMessage.error('操作失败')
  }
}

async function handleReject(record: ApprovalRecord) {
  try {
    await processRecord(record.id, 'reject')
    handleSwipeClose()
    ElMessage.success('审批驳回')
  }
  catch {
    ElMessage.error('操作失败')
  }
}

function handleCardClick(record: ApprovalRecord) {
  if (activeSwipeId.value === record.id) {
    handleSwipeClose()
    return
  }

  handleProcess(record)
}

function openFilter() {
  appStore.toggleMobileFilter()
}

function handleLoadMore() {
  if (data.value && pagination.value.page * pagination.value.pageSize < data.value.total)
    pagination.value.page += 1
}

const hasMore = computed(() =>
  Boolean(data.value && pagination.value.page * pagination.value.pageSize < data.value.total),
)
</script>

<template>
  <div class="approval-list-mobile h-full flex flex-col bg-gray-50">
    <div class="bg-white border-b border-gray-200 px-4 py-3 shrink-0">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-lg font-semibold text-gray-800">
          待我审批
        </h2>
        <el-button size="small" :icon="Filter" @click="openFilter">
          筛选
        </el-button>
      </div>
      <div class="text-sm text-gray-500">
        共 {{ data?.total || 0 }} 条待办
      </div>
    </div>

    <div
      v-if="pullDistance > 0"
      class="text-center py-2 text-sm text-gray-500 bg-white"
      :style="{ height: `${pullDistance}px` }"
    >
      {{ statusText }}
    </div>

    <div
      ref="containerRef"
      class="flex-1 overflow-y-auto"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <div v-if="isLoading" class="p-4 space-y-3">
        <el-skeleton v-for="i in 5" :key="i" :rows="3" animated />
      </div>

      <div v-else-if="error" class="text-center py-12 px-4">
        <p class="text-gray-500 mb-4">
          加载失败，请重试
        </p>
        <el-button
          size="small"
          @click="refetch"
        >
          重新加载
        </el-button>
      </div>

      <div v-else-if="!data?.list?.length" class="text-center py-12 px-4">
        <el-empty description="暂无待办审批" />
      </div>

      <div v-else class="p-3 space-y-3">
        <ApprovalCardMobile
          v-for="record in data.list"
          :key="record.id"
          :record="record"
          :status-text="statusTextMap[record.status]"
          :status-type="statusTagTypeMap[record.status]"
          :is-swiped="activeSwipeId === record.id"
          @click="handleCardClick(record)"
          @swipe-open="handleSwipeOpen(record.id)"
          @swipe-close="handleSwipeClose"
          @approve="handleApprove(record)"
          @reject="handleReject(record)"
        />

        <div v-if="hasMore" class="text-center py-4">
          <el-button size="small" @click="handleLoadMore">
            加载更多
          </el-button>
        </div>

        <div v-else-if="data.list.length > 0" class="text-center py-4 text-sm text-gray-400">
          没有更多了
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.approval-list-mobile {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.approval-list-mobile::-webkit-scrollbar {
  display: none;
}
</style>
