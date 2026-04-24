<script setup lang="ts">
/**
 * @file LayoutHeader.vue
 * @description 布局顶部组件
 * 显示用户信息和退出登录按钮
 */

import { useRouter } from 'vue-router'
import { Bell } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useUnreadCount } from '@/composables/useMessage'

const userStore = useUserStore()
const router = useRouter()

// 获取未读消息数
const { data: unreadCount } = useUnreadCount()

/**
 * 退出登录处理
 * 清除用户状态并跳转到登录页
 */
function onLogout() {
  userStore.logout()
  router.push('/login')
}

/**
 * 跳转到消息中心
 */
function goToMessageCenter() {
  router.push('/message/list')
}
</script>

<template>
  <el-header class="h-14 flex items-center justify-between bg-white border-b border-slate-200 px-4">
    <!-- 左侧占位（可放置面包屑、搜索等） -->
    <div class="flex items-center gap-2" />

    <!-- 右侧用户信息区 -->
    <div class="flex items-center gap-3">
      <!-- 消息铃铛图标 -->
      <el-badge :value="unreadCount || 0" :hidden="!unreadCount" :max="99" class="message-badge">
        <el-button :icon="Bell" circle @click="goToMessageCenter" />
      </el-badge>

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
