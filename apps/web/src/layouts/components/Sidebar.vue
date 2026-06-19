<script setup lang="ts">
import type { MenuItem } from '@/stores/user'
import {
  ArrowLeft,
  ArrowRight,
  Collection,
  Connection,
  HomeFilled,
  Monitor,
  Setting,
  Tickets,
  User,
  UserFilled,
} from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'

const appStore = useAppStore()
const userStore = useUserStore()
const route = useRoute()

const visibleMenus = computed(() => filterMenusByPermission(userStore.menus))

const activeMenu = computed(() => {
  if (route.path.startsWith('/workflow/editor/'))
    return '/workflow/list'
  return route.path
})

function toggleSidebar() {
  appStore.toggleSidebar()
}

function getMenuIcon(title: string) {
  const iconMap: Record<string, any> = {
    工作台: Monitor,
    审批中心: Tickets,
    组织架构: UserFilled,
    通讯录: User,
    系统管理: Setting,
    流程管理: Connection,
    知识库管理: Collection,
  }
  return iconMap[title] || HomeFilled
}

function filterMenusByPermission(menus: MenuItem[]): MenuItem[] {
  return menus.reduce<MenuItem[]>((result, menu) => {
    const selfAllowed = !menu.permission || userStore.hasPermission(menu.permission)
    if (!selfAllowed)
      return result

    if (menu.children?.length) {
      const children = filterMenusByPermission(menu.children)
      if (children.length === 0)
        return result

      result.push({
        ...menu,
        children,
      })
      return result
    }

    result.push(menu)
    return result
  }, [])
}
</script>

<template>
  <div class="relative h-full">
    <el-aside
      :width="appStore.sidebarCollapsed ? '60px' : '200px'"
      class="h-full overflow-hidden bg-white border-r border-slate-200 transition-all duration-300"
      style="display: flex; flex-direction: column;"
    >
      <div class="h-14 flex items-center border-b border-slate-200 px-3 shrink-0">
        <div
          class="flex items-center gap-2"
          :class="{ 'justify-center': appStore.sidebarCollapsed }"
        >
          <div class="w-6 h-6 bg-primary text-white rounded flex items-center justify-center shrink-0">
            <i class="el-icon-house" />
          </div>
          <span
            v-show="!appStore.sidebarCollapsed"
            class="font-semibold text-primary whitespace-nowrap"
          >
            全景智能 OA
          </span>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto scrollbar-hidden">
        <el-menu
          :default-active="activeMenu"
          class="border-0 w-full h-full"
          :collapse="appStore.sidebarCollapsed"
          router
          mode="vertical"
        >
          <template v-for="item in visibleMenus" :key="item.path">
            <el-sub-menu v-if="item.children && item.children.length > 0" :index="item.path">
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

            <el-menu-item v-else :index="item.path" :title="item.title">
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
</template>

<style scoped>
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
