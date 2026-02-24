/**
 * 用户状态管理
 */
import type { RouteRecordRaw } from 'vue-router'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * 用户信息接口
 */
export interface UserInfo {
  id: string
  name: string
  avatar?: string
}

/**
 * 菜单项接口
 */
export interface MenuItem {
  path: string
  name: string
  title: string
  icon?: string
  permission?: string
  children?: MenuItem[]
}

/**
 * 用户状态存储
 */
export const useUserStore = defineStore('user', () => {
  /**
   * 认证令牌
   */
  const token = ref<string | null>(null)

  /**
   * 用户信息
   */
  const userInfo = ref<UserInfo | null>(null)

  /**
   * 权限列表
   * 默认给当前用户一些基础权限，后续会由后端返回覆盖
   */
  const permissions = ref<string[]>([
    'dashboard:view',
    'approval:center:view',
    'approval:launch',
    'approval:mine',
    'approval:todo',
    'org:view',
    'contacts:view',
    'system:view',
    'system:user:view',
    'system:role:view',
    'workflow:view',
    'workflow:list',
  ])

  /**
   * 菜单列表
   */
  const menus = ref<MenuItem[]>([
    {
      path: '/',
      name: 'Dashboard',
      title: '工作台',
      icon: 'dashboard',
      permission: 'dashboard:view',
    },
    {
      path: '/approval',
      name: 'ApprovalCenter',
      title: '审批中心',
      icon: 'tickets',
      permission: 'approval:center:view',
      children: [
        { path: '/approval/launch', name: 'ApprovalLaunch', title: '发起审批', permission: 'approval:launch' },
        { path: '/approval/mine', name: 'ApprovalMine', title: '我的申请', permission: 'approval:mine' },
        { path: '/approval/todo', name: 'ApprovalTodo', title: '待我审批', permission: 'approval:todo' },
      ],
    },
    {
      path: '/org',
      name: 'Organization',
      title: '组织架构',
      icon: 'tree',
      permission: 'org:view',
    },
    {
      path: '/contacts',
      name: 'Contacts',
      title: '通讯录',
      icon: 'user',
      permission: 'contacts:view',
    },
    {
      path: '/system',
      name: 'System',
      title: '系统管理',
      icon: 'setting',
      permission: 'system:view',
      children: [
        { path: '/system/users', name: 'UserList', title: '用户管理', permission: 'system:user:view' },
        { path: '/system/roles', name: 'RoleList', title: '角色管理', permission: 'system:role:view' },
      ],
    },
    {
      path: '/workflow',
      name: 'Workflow',
      title: '流程管理',
      icon: 'connection',
      permission: 'workflow:view',
      children: [
        { path: '/workflow/list', name: 'WorkflowList', title: '流程列表', permission: 'workflow:list' },
      ],
    },
  ])

  /**
   * 是否已登录
   */
  const isLoggedIn = computed(() => !!token.value)

  /**
   * 设置令牌
   */
  function setToken(value: string | null) {
    token.value = value
  }

  /**
   * 设置用户信息
   */
  function setUser(info: UserInfo | null) {
    userInfo.value = info
  }

  /**
   * 设置权限列表
   */
  function setPermissions(codes: string[]) {
    permissions.value = codes
  }

  /**
   * 设置菜单列表
   */
  function setMenus(list: MenuItem[]) {
    menus.value = list
  }

  /**
   * 检查是否有权限
   */
  function hasPermission(code: string): boolean {
    if (!code)
      return true
    return permissions.value.includes(code)
  }

  /**
   * 登出
   */
  function logout() {
    token.value = null
    userInfo.value = null
    permissions.value = []
    // menus 可以保留基础菜单结构，也可以在真正接入后端时清空
  }

  /**
   * 清除用户状态（用于 401 登录过期）
   */
  function clearUser() {
    token.value = null
    userInfo.value = null
    permissions.value = []
  }

  /**
   * 从菜单构建路由
   * 这里先返回空数组，后续接入动态路由时再实现
   */
  function buildRoutesFromMenus(): RouteRecordRaw[] {
    return []
  }

  return {
    token,
    userInfo,
    permissions,
    menus,
    isLoggedIn,
    setToken,
    setUser,
    setPermissions,
    setMenus,
    hasPermission,
    logout,
    clearUser,
    buildRoutesFromMenus,
  }
})
