<script setup lang="ts">
/**
 * @file MainLayout.vue
 * @description 主布局组件
 * 响应式布局：移动端使用 MobileLayout，桌面端使用传统布局
 * @component
 * @example
 * <router-view /> 会自动渲染到内容区域
 */

import { useDevice } from '@/composables/useDevice'
import Sidebar from './components/Sidebar.vue'
import LayoutHeader from './components/LayoutHeader.vue'
import MobileLayout from './MobileLayout.vue'

const { isMobile } = useDevice()
</script>

<template>
  <!-- 移动端布局 -->
  <MobileLayout v-if="isMobile" />

  <!-- 桌面端布局 -->
  <template v-else>
    <!-- 顶部 -->
    <LayoutHeader />
    <el-container class="h-screen overflow-hidden">
      <el-container class="flex-1 overflow-hidden">
        <!-- 侧边栏 -->
        <Sidebar />

        <!-- 主内容区域 -->
        <el-main class="bg-slate-50">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </template>
</template>

<style scoped>
.el-main {
  padding: 0;
  overflow-y: auto;
}
</style>

<style>
/* 全局滚动条隐藏 */
* {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

*::-webkit-scrollbar {
  display: none;
}
</style>
