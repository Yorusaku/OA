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
  /** 移动端抽屉菜单打开状态 */
  mobileMenuOpen: boolean
  /** 移动端筛选抽屉打开状态 */
  mobileFilterOpen: boolean
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
    mobileMenuOpen: false, // 移动端菜单默认关闭
    mobileFilterOpen: false, // 移动端筛选默认关闭
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
    /**
     * 切换移动端菜单抽屉状态
     */
    toggleMobileMenu() {
      this.mobileMenuOpen = !this.mobileMenuOpen
    },
    /**
     * 关闭移动端菜单抽屉
     */
    closeMobileMenu() {
      this.mobileMenuOpen = false
    },
    /**
     * 切换移动端筛选抽屉状态
     */
    toggleMobileFilter() {
      this.mobileFilterOpen = !this.mobileFilterOpen
    },
    /**
     * 关闭移动端筛选抽屉
     */
    closeMobileFilter() {
      this.mobileFilterOpen = false
    },
  },
})
