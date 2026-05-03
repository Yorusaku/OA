<script setup lang="ts">
import { Bell } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useApprovalRealtime } from '@/composables/useApprovalRealtime'
import { useUnreadCount } from '@/composables/useMessage'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const router = useRouter()

const { data: unreadCount } = useUnreadCount()
const { connected: realtimeConnected, disabled: realtimeDisabled } = useApprovalRealtime()

function onLogout() {
  userStore.logout()
  router.push('/login')
}

function goToMessageCenter() {
  router.push('/message/list')
}
</script>

<template>
  <el-header class="h-14 flex items-center justify-between bg-white border-b border-slate-200 px-4">
    <div class="flex items-center gap-2" />

    <div class="flex items-center gap-3">
      <el-badge :value="unreadCount || 0" :hidden="!unreadCount" :max="99" class="message-badge">
        <el-button :icon="Bell" circle @click="goToMessageCenter" />
      </el-badge>

      <span
        v-if="!realtimeDisabled"
        class="text-xs"
        :class="realtimeConnected ? 'text-emerald-600' : 'text-amber-500'"
      >
        {{ realtimeConnected ? '实时已连接' : '实时重连中' }}
      </span>

      <span class="text-sm text-slate-600">
        {{ userStore.userInfo?.name || '未登录用户' }}
      </span>
      <el-button type="danger" plain size="small" @click="onLogout">
        退出登录
      </el-button>
    </div>
  </el-header>
</template>

<style scoped>
.message-badge {
  cursor: pointer;
}
</style>
