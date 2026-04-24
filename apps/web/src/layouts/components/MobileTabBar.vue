<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useApprovalTodo } from '@/views/approval/composables/useApprovalTodo'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()

// 获取待审批数量
const { data: todoData } = useApprovalTodo()
const todoCount = computed(() => todoData.value?.total || 0)

// 当前激活的标签
const activeTab = computed(() => {
  const path = route.path
  if (path === '/' || path.startsWith('/dashboard'))
    return 'dashboard'
  if (path.startsWith('/approval'))
    return 'approval'
  if (path.startsWith('/application') || path.startsWith('/template'))
    return 'application'
  return 'more'
})

// 标签配置
const tabs = [
  {
    key: 'dashboard',
    label: '工作台',
    icon: 'Monitor',
    path: '/',
  },
  {
    key: 'approval',
    label: '审批',
    icon: 'Tickets',
    path: '/approval/todo',
    badge: todoCount,
  },
  {
    key: 'application',
    label: '应用',
    icon: 'Grid',
    path: '/application/list',
  },
  {
    key: 'more',
    label: '更多',
    icon: 'Menu',
    action: 'openDrawer',
  },
]

function handleTabClick(tab: typeof tabs[0]) {
  if (tab.action === 'openDrawer') {
    appStore.toggleMobileMenu()
  }
  else if (tab.path) {
    router.push(tab.path)
  }
}
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom z-50">
    <div class="flex justify-around items-center h-16">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        class="flex-1 flex flex-col items-center justify-center cursor-pointer transition-colors relative"
        :class="activeTab === tab.key ? 'text-primary' : 'text-gray-600'"
        @click="handleTabClick(tab)"
      >
        <!-- 图标 -->
        <el-icon :size="24" class="mb-1">
          <component :is="tab.icon" />
        </el-icon>

        <!-- 角标 -->
        <div
          v-if="tab.badge && tab.badge.value > 0"
          class="absolute top-1 right-1/4 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
        >
          {{ tab.badge.value > 99 ? '99+' : tab.badge.value }}
        </div>

        <!-- 标签文字 -->
        <span class="text-xs">{{ tab.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.safe-area-inset-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
