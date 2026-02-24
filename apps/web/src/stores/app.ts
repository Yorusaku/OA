/**
 * 应用全局状态管理
 */
import { defineStore } from 'pinia'

/**
 * 应用状态接口
 */
interface AppState {
  /**
   * 侧边栏折叠状态
   */
  sidebarCollapsed: boolean
  /**
   * 主题
   */
  theme: 'light' | 'dark'
}

/**
 * 应用状态存储
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
     */
    setSidebarCollapsed(value: boolean) {
      this.sidebarCollapsed = value
    },
    /**
     * 设置主题
     */
    setTheme(theme: AppState['theme']) {
      this.theme = theme
    },
  },
})
