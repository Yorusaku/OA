<script setup lang="ts">
import { ArrowLeft, ArrowRight, Connection, HomeFilled, Monitor, Setting, Tickets, User, UserFilled } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'

const appStore = useAppStore()
const userStore = useUserStore()
const route = useRoute()
const router = useRouter()

const visibleMenus = computed(() =>
  userStore.menus.filter(menu => !menu.permission || userStore.hasPermission(menu.permission)),
)

const activeMenu = computed(() => route.path)

function toggleSidebar() {
  appStore.toggleSidebar()
}

function onLogout() {
  userStore.logout()
  router.push('/login')
}

function getMenuIcon(title: string) {
  const iconMap: Record<string, any> = {
    工作台: Monitor,
    审批中心: Tickets,
    组织架构: UserFilled,
    通讯录: User,
    系统管理: Setting,
    流程管理: Connection,
  }
  return iconMap[title] || HomeFilled
}
</script>

<template>
  <el-container class="h-screen overflow-hidden">
    <div class="relative">
      <el-aside :width="appStore.sidebarCollapsed ? '60px' : '200px'" class="border-r border-slate-200 h-full overflow-hidden">
        <div class="h-14 flex items-center border-b border-slate-200 px-3 shrink-0">
          <div class="flex items-center gap-2" :class="{ 'justify-center': appStore.sidebarCollapsed }">
            <div class="w-6 h-6 bg-primary text-white rounded flex items-center justify-center shrink-0">
              <i class="el-icon-house"></i>
            </div>
            <span v-show="!appStore.sidebarCollapsed" class="font-semibold text-primary whitespace-nowrap">全景智能 OA</span>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto scrollbar-hidden">
          <el-menu
            :default-active="activeMenu"
            class="border-0 w-full h-full el-menu-vertical-demo"
            :collapse="appStore.sidebarCollapsed"
            router
            mode="vertical"
          >
            <template v-for="item in visibleMenus" :key="item.path">
              <!-- 有子菜单 -->
              <el-sub-menu
                v-if="item.children && item.children.length > 0"
                :index="item.path"
              >
                <template #title>
                  <el-icon>
                    <component :is="getMenuIcon(item.title)" />
                  </el-icon>
                  <span>{{ item.title }}</span>
                </template>
                <el-menu-item
                  v-for="child in item.children"
                  :key="child.path"
                  :index="child.path"
                  :title="child.title"
                >
                  {{ child.title }}
                </el-menu-item>
              </el-sub-menu>
              <!-- 无子菜单 -->
              <el-menu-item
                v-else
                :index="item.path"
                :title="item.title"
              >
                <el-icon>
                  <component :is="getMenuIcon(item.title)" />
                </el-icon>
                <template #title>
                  <span>{{ item.title }}</span>
                </template>
              </el-menu-item>
            </template>
          </el-menu>
        </div>
      </el-aside>

      <button
        class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors shadow-sm z-10"
        :title="appStore.sidebarCollapsed ? '展开菜单' : '收起菜单'"
        @click="toggleSidebar"
      >
        <el-icon>
          <ArrowRight v-if="!appStore.sidebarCollapsed" />
          <ArrowLeft v-else />
        </el-icon>
      </button>
    </div>

    <el-container>
      <el-header class="h-14 flex items-center justify-between border-b border-slate-200 px-4">
        <div class="flex items-center gap-2" />
        <div class="flex items-center gap-3">
          <span class="text-sm text-slate-600">
            {{ userStore.userInfo?.name || '未登录用户' }}
          </span>
          <el-button type="primary" link @click="onLogout">
            退出登录
          </el-button>
        </div>
      </el-header>

      <el-main class="bg-slate-50">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.el-aside {
  background-color: #ffffff;
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
}

.scrollbar-hidden {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.scrollbar-hidden::-webkit-scrollbar {
  display: none;
}

:deep(.el-menu-item.is-active) {
  color: #165dff !important;
  background-color: #f0f5ff !important;
}

:deep(.el-menu-item:hover) {
  background-color: #f5f7fa !important;
}

:deep(.el-menu) {
  border-right: none !important;
  height: 100%;
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

/* 参考 Element Plus 官方示例的样式 */
.el-menu-vertical-demo:not(.el-menu--collapse) {
  width: 200px;
}
</style>
