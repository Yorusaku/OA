<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import MobileTabBar from './components/MobileTabBar.vue'
import MobileDrawer from './components/MobileDrawer.vue'

const userStore = useUserStore()
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- 顶部栏 -->
    <div class="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 bg-primary text-white rounded flex items-center justify-center text-xs">
          OA
        </div>
        <span class="font-semibold text-primary">全景智能 OA</span>
      </div>
      <div class="flex items-center gap-3">
        <el-icon :size="20" class="text-gray-600">
          <Bell />
        </el-icon>
        <el-avatar :size="28" class="bg-primary">
          {{ userStore.user?.name?.charAt(0) || 'U' }}
        </el-avatar>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="flex-1 overflow-y-auto pb-16">
      <router-view />
    </div>

    <!-- 底部标签栏 -->
    <MobileTabBar />

    <!-- 抽屉菜单 -->
    <MobileDrawer />
  </div>
</template>

<style scoped>
/* 隐藏滚动条 */
.overflow-y-auto {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.overflow-y-auto::-webkit-scrollbar {
  display: none;
}
</style>
