<script setup lang="ts">
/**
 * OfflineIndicator - 离线状态提示组件
 * 监听网络状态变化，在离线时显示提示条
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

const isOnline = ref(navigator.onLine)

function handleOnline() {
  isOnline.value = true
  ElMessage.success('网络已恢复')
}

function handleOffline() {
  isOnline.value = false
  ElMessage.warning('网络已断开，当前处于离线模式')
}

onMounted(() => {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
})
</script>

<template>
  <Transition name="slide-down">
    <div
      v-if="!isOnline"
      class="fixed top-0 left-0 right-0 z-[9999] bg-yellow-500 text-white text-center py-2 px-4 shadow-md"
    >
      <span class="inline-flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
        </svg>
        <span class="font-medium">当前处于离线模式，部分功能可能受限</span>
      </span>
    </div>
  </Transition>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.3s ease-out;
}

.slide-down-enter-from {
  transform: translateY(-100%);
}

.slide-down-leave-to {
  transform: translateY(-100%);
}
</style>
