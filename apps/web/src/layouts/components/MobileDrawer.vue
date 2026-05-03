<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()

// 抽屉打开状态
const drawerOpen = computed({
  get: () => appStore.mobileMenuOpen,
  set: (value) => {
    if (!value)
      appStore.closeMobileMenu()
  },
})

// 获取完整菜单（排除底部标签栏已有的）
const drawerMenus = computed(() => {
  return userStore.menus.filter((menu) => {
    // 排除工作台、审批中心、应用中心
    return !['Dashboard', 'ApprovalCenter', 'ApplicationCenter'].includes(menu.name || '')
  })
})

function handleMenuClick(path: string) {
  router.push(path)
  appStore.closeMobileMenu()
}

function handleLogout() {
  userStore.logout()
  router.push('/login')
  appStore.closeMobileMenu()
}
</script>

<template>
  <el-drawer
    v-model="drawerOpen"
    direction="rtl"
    :size="280"
    :show-close="false"
  >
    <!-- 用户信息头部 -->
    <div class="flex items-center gap-3 p-4 border-b border-gray-200">
      <el-avatar :size="56" class="bg-primary">
        {{ userStore.userInfo?.name?.charAt(0) || 'U' }}
      </el-avatar>
      <div class="flex-1">
        <div class="font-semibold text-base mb-1">
          {{ userStore.userInfo?.name || '用户' }}
        </div>
        <div class="text-sm text-gray-500">
          {{ userStore.userInfo?.id || '' }}
        </div>
      </div>
    </div>

    <!-- 菜单列表 -->
    <div class="py-2">
      <template v-for="menu in drawerMenus" :key="menu.path">
        <!-- 有子菜单 -->
        <div v-if="menu.children && menu.children.length > 0" class="mb-2">
          <div class="px-4 py-2 text-xs text-gray-500 font-semibold">
            {{ menu.title }}
          </div>
          <div
            v-for="child in menu.children"
            :key="child.path"
            class="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3"
            @click="handleMenuClick(child.path)"
          >
            <span class="text-base">{{ child.title }}</span>
          </div>
        </div>

        <!-- 无子菜单 -->
        <div
          v-else
          class="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3"
          @click="handleMenuClick(menu.path)"
        >
          <span class="text-base">{{ menu.title }}</span>
        </div>
      </template>
    </div>

    <!-- 底部退出按钮 -->
    <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
      <el-button
        type="danger"
        plain
        class="w-full"
        @click="handleLogout"
      >
        退出登录
      </el-button>
    </div>
  </el-drawer>
</template>
