/**
 * @file app.ts
 * @description 应用全局状态管理
 * 管理侧边栏、主题等全局配置
 */

import { defineStore } from 'pinia'

/**
 * 应用全局状态接口
 */
interface AppState {
  /** 侧边栏折叠状态 */
  sidebarCollapsed: boolean
  /** 主题模式：light 亮色 / dark 暗色 */
  theme: 'light' | 'dark'
}

/**
 * 应用状态 Store
 * @returns 应用状态和方法
 * @usage const appStore = useAppStore()
 */
export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    sidebarCollapsed: false, // 侧边栏默认展开
    theme: 'light', // 默认亮色主题
  }),
  actions: {
    /**
     * 切换侧边栏折叠状态
     */
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },
    /**
     * 设置侧边栏折叠状态
     * @param value - 折叠状态
     */
    setSidebarCollapsed(value: boolean) {
      this.sidebarCollapsed = value
    },
    /**
     * 设置主题
     * @param theme - 主题类型
     */
    setTheme(theme: AppState['theme']) {
      this.theme = theme
    },
  },
})
