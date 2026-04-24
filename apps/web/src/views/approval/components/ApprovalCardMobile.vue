<script setup lang="ts">
import type { ApprovalRecord } from '@/api/types'
import { computed, ref } from 'vue'
import { useSwipe } from '@/composables/useSwipe'

interface Props {
  record: ApprovalRecord
  statusText: string
  statusType: 'warning' | 'success' | 'danger' | 'info' | 'primary'
  isSwiped?: boolean
}

interface Emits {
  (e: 'click'): void
  (e: 'swipe-open'): void
  (e: 'swipe-close'): void
  (e: 'approve'): void
  (e: 'reject'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const cardRef = ref<HTMLElement | null>(null)
const actionsRef = ref<HTMLElement | null>(null)

// 左滑操作
const {
  translateX,
  isOpen,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
} = useSwipe(cardRef, {
  threshold: 50,
  onOpen: () => emit('swipe-open'),
  onClose: () => emit('swipe-close'),
})

// 监听操作按钮宽度
const actionsWidth = computed(() => {
  return actionsRef.value?.offsetWidth || 140
})

function handleCardClick() {
  if (isOpen.value) {
    emit('swipe-close')
  }
  else {
    emit('click')
  }
}

function handleApprove(e: Event) {
  e.stopPropagation()
  emit('approve')
}

function handleReject(e: Event) {
  e.stopPropagation()
  emit('reject')
}

// 格式化时间
function formatTime(time: string) {
  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      return minutes === 0 ? '刚刚' : `${minutes}分钟前`
    }
    return `${hours}小时前`
  }
  if (days === 1)
    return '昨天'
  if (days < 7)
    return `${days}天前`

  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}
</script>

<template>
  <div class="approval-card-mobile relative overflow-hidden">
    <!-- 操作按钮（背景层） -->
    <div
      ref="actionsRef"
      class="absolute right-0 top-0 bottom-0 flex items-stretch"
    >
      <button
        class="w-20 bg-green-500 text-white flex items-center justify-center active:bg-green-600 transition-colors"
        @click="handleApprove"
      >
        <span class="text-sm font-medium">通过</span>
      </button>
      <button
        class="w-20 bg-red-500 text-white flex items-center justify-center active:bg-red-600 transition-colors"
        @click="handleReject"
      >
        <span class="text-sm font-medium">驳回</span>
      </button>
    </div>

    <!-- 卡片内容（前景层） -->
    <div
      ref="cardRef"
      class="bg-white rounded-lg shadow-sm border border-gray-200 transition-transform"
      :style="{ transform: `translateX(${translateX}px)` }"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      @click="handleCardClick"
    >
      <div class="p-4">
        <!-- 头部：标题和状态 -->
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1 min-w-0 mr-3">
            <h3 class="text-base font-semibold text-gray-800 truncate mb-1">
              {{ record.title }}
            </h3>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <span>{{ record.type }}</span>
              <span>·</span>
              <span>{{ record.id }}</span>
            </div>
          </div>
          <el-tag :type="statusType" size="small">
            {{ statusText }}
          </el-tag>
        </div>

        <!-- 申请人信息 -->
        <div class="flex items-center gap-2 mb-3">
          <el-avatar :size="32" class="bg-primary shrink-0">
            {{ record.applicant.charAt(0) }}
          </el-avatar>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-700">
              {{ record.applicant }}
            </div>
            <div class="text-xs text-gray-500">
              {{ formatTime(record.applyTime) }}
            </div>
          </div>
        </div>

        <!-- 当前节点 -->
        <div v-if="record.currentNodeName" class="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <el-icon :size="14">
            <Location />
          </el-icon>
          <span>{{ record.currentNodeName }}</span>
        </div>

        <!-- 金额（如果有） -->
        <div v-if="record.amount" class="text-sm text-gray-600">
          <span class="text-gray-500">金额：</span>
          <span class="font-semibold text-primary">¥{{ record.amount.toLocaleString() }}</span>
        </div>

        <!-- 紧急标记 -->
        <div v-if="record.isUrgent" class="mt-2">
          <el-tag type="danger" size="small" effect="plain">
            <el-icon class="mr-1">
              <Warning />
            </el-icon>
            紧急
          </el-tag>
        </div>
      </div>

      <!-- 底部操作提示 -->
      <div v-if="record.status === 'pending'" class="border-t border-gray-100 px-4 py-2 bg-gray-50 text-xs text-gray-500 text-center">
        左滑快速操作
      </div>
    </div>
  </div>
</template>

<style scoped>
.approval-card-mobile {
  touch-action: pan-y;
}
</style>
