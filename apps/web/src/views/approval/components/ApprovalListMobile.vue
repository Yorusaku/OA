<script setup lang="ts">
import type { ApprovalRecord } from '@/api/types'
import type { UseApprovalTodoReturn } from '../composables/useApprovalTodo'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePullRefresh } from '@/composables/usePullRefresh'
import { useSwipe } from '@/composables/useSwipe'
import { useAppStore } from '@/stores/app'
import { ElMessage } from 'element-plus'

interface Props {
  todoReturn: UseApprovalTodoReturn
}

const props = defineProps<Props>()
const router = useRouter()
const appStore = useAppStore()

const {
  filters,
  pagination,
  data,
  isLoading,
  error,
  batchApprove,
  batchReject,
  handleProcess,
} = props.todoReturn

const containerRef = ref<HTMLElement | null>(null)

// 下拉刷新
const {
  pullDistance,
  isRefreshing,
  statusText,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
} = usePullRefresh(containerRef, {
  threshold: 60,
  onRefresh: async () => {
    // 重新加载数据
    pagination.value.page = 1
    await new Promise(resolve => setTimeout(resolve, 500))
  },
})

// 状态映射
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

// 左滑操作
const activeSwipeId = ref<string | null>(null)

function handleSwipeOpen(id: string) {
  activeSwipeId.value = id
}

function handleSwipeClose() {
  activeSwipeId.value = null
}

async function handleApprove(record: ApprovalRecord) {
  try {
    await batchApprove()
    handleSwipeClose()
    ElMessage.success('审批通过')
  }
  catch (error) {
    ElMessage.error('操作失败')
  }
}

async function handleReject(record: ApprovalRecord) {
  try {
    await batchReject()
    handleSwipeClose()
    ElMessage.success('审批驳回')
  }
  catch (error) {
    ElMessage.error('操作失败')
  }
}

function handleCardClick(record: ApprovalRecord) {
  if (activeSwipeId.value === record.id) {
    handleSwipeClose()
  }
  else {
    handleProcess(record)
  }
}

function openFilter() {
  appStore.toggleMobileFilter()
}

function handleLoadMore() {
  if (data.value && pagination.value.page * pagination.value.pageSize < data.value.total) {
    pagination.value.page++
  }
}

const hasMore = computed(() => {
  return data.value && pagination.value.page * pagination.value.pageSize < data.value.total
})
</script>

<template>
  <div class="approval-list-mobile h-full flex flex-col bg-gray-50">
    <!-- 顶部工具栏 -->
    <div class="bg-white border-b border-gray-200 px-4 py-3 shrink-0">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-lg font-semibold text-gray-800">
          待我审批
        </h2>
        <el-button
          size="small"
          :icon="Filter"
          @click="openFilter"
        >
          筛选
        </el-button>
      </div>
      <div class="text-sm text-gray-500">
        共 {{ data?.total || 0 }} 条待办
      </div>
    </div>

    <!-- 下拉刷新提示 -->
    <div
      v-if="pullDistance > 0"
      class="text-center py-2 text-sm text-gray-500 bg-white"
      :style="{ height: `${pullDistance}px` }"
    >
      {{ statusText }}
    </div>

    <!-- 列表容器 -->
    <div
      ref="containerRef"
      class="flex-1 overflow-y-auto"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- 加载中 -->
      <div v-if="isLoading" class="p-4 space-y-3">
        <el-skeleton
          v-for="i in 5"
          :key="i"
          :rows="3"
          animated
        />
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="text-center py-12 px-4">
        <p class="text-gray-500 mb-4">加载失败，请重试</p>
        <el-button size="small" @click="pagination.page = 1">
          重新加载
        </el-button>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!data?.list?.length" class="text-center py-12 px-4">
        <el-empty description="暂无待办审批" />
      </div>

      <!-- 列表 -->
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

        <!-- 加载更多 -->
        <div v-if="hasMore" class="text-center py-4">
          <el-button size="small" @click="handleLoadMore">
            加载更多
          </el-button>
        </div>

        <!-- 没有更多 -->
        <div v-else-if="data.list.length > 0" class="text-center py-4 text-sm text-gray-400">
          没有更多了
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.approval-list-mobile {
  /* 隐藏滚动条 */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.approval-list-mobile::-webkit-scrollbar {
  display: none;
}
</style>
