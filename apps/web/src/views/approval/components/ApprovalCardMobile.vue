<script setup lang="ts">
import type { ApprovalRecord } from '@/api/types'
import { Location, Warning } from '@element-plus/icons-vue'
import { ref, watch } from 'vue'
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

const {
  translateX,
  isOpen,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  open,
  close,
} = useSwipe(cardRef, {
  threshold: 50,
  maxDistance: 160,
  onOpen: () => emit('swipe-open'),
  onClose: () => emit('swipe-close'),
})

watch(
  () => props.isSwiped,
  (nextValue) => {
    if (nextValue && !isOpen.value) {
      open()
      return
    }

    if (!nextValue && isOpen.value)
      close()
  },
)

function handleCardClick() {
  if (isOpen.value) {
    emit('swipe-close')
    return
  }

  emit('click')
}

function handleApprove(event: Event) {
  event.stopPropagation()
  emit('approve')
}

function handleReject(event: Event) {
  event.stopPropagation()
  emit('reject')
}

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
    <div class="absolute right-0 top-0 bottom-0 flex items-stretch">
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

        <div v-if="record.currentNodeName" class="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <el-icon :size="14">
            <Location />
          </el-icon>
          <span>{{ record.currentNodeName }}</span>
        </div>

        <div v-if="record.amount" class="text-sm text-gray-600">
          <span class="text-gray-500">金额：</span>
          <span class="font-semibold text-primary">¥{{ record.amount.toLocaleString() }}</span>
        </div>

        <div v-if="record.isUrgent" class="mt-2">
          <el-tag type="danger" size="small" effect="plain">
            <el-icon class="mr-1">
              <Warning />
            </el-icon>
            紧急
          </el-tag>
        </div>
      </div>

      <div v-if="record.status === 'pending'" class="border-t border-gray-100 px-4 py-2 bg-gray-50 text-xs text-gray-500 text-center">
        左滑可快速处理
      </div>
    </div>
  </div>
</template>

<style scoped>
.approval-card-mobile {
  touch-action: pan-y;
}
</style>
