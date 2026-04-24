/**
 * 用户状态管理
 */
import type { RouteRecordRaw } from 'vue-router'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useStorage } from '@vueuse/core'

export interface UserInfo {
  id: string
  name: string
  avatar?: string
}

export interface MenuItem {
  path: string
  name: string
  title: string
  icon?: string
  permission?: string
  children?: MenuItem[]
}

export const useUserStore = defineStore('user', () => {
  const token = useStorage('token', null as string | null)
  const userInfo = useStorage('userInfo', null as UserInfo | null)

  const permissions = ref<string[]>([
    'dashboard:view',
    'approval:center:view',
    'approval:launch',
    'approval:mine',
    'approval:todo',
    'approval:detail',
    'org:view',
    'contacts:view',
    'demo:view',
    'system:view',
    'system:user:view',
    'system:role:view',
    'workflow:view',
    'workflow:list',
  ])

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
      path: '/demo',
      name: 'Demo',
      title: '演示页面',
      icon: 'bug',
      permission: 'demo:view',
      children: [
        { path: '/demo/dynamic-form-linkage', name: 'DynamicFormLinkageDemo', title: '动态表单联动', permission: 'demo:view' },
      ],
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

  const isLoggedIn = computed(() => !!token.value)

  function setToken(value: string | null) {
    token.value = value
  }

  function setUser(info: UserInfo | null) {
    userInfo.value = info
  }

  function setPermissions(codes: string[]) {
    permissions.value = codes
  }

  function setMenus(list: MenuItem[]) {
    menus.value = list
  }

  function hasPermission(code: string): boolean {
    if (!code)
      return true
    return permissions.value.includes(code)
  }

  function logout() {
    token.value = null
    userInfo.value = null
    permissions.value = []
  }

  function clearUser() {
    token.value = null
    userInfo.value = null
    permissions.value = []
  }

  function buildRoutesFromMenus(): RouteRecordRaw[] {
    const componentMap: Record<string, any> = {
      Dashboard: () => import('@/views/dashboard/Workbench.vue'),
      ApprovalLaunch: () => import('@/views/approval/ApprovalLaunch.vue'),
      ApprovalMine: () => import('@/views/approval/ApprovalMine.vue'),
      ApprovalTodo: () => import('@/views/approval/ApprovalTodo.vue'),
      OrgTree: () => import('@/views/org/OrgTree.vue'),
      ContactsList: () => import('@/views/contacts/ContactsList.vue'),
      DynamicFormLinkageDemo: () => import('@/views/demo/DynamicFormLinkageDemo.vue'),
      UserList: () => import('@/views/system/UserList.vue'),
      RoleList: () => import('@/views/system/RoleList.vue'),
      WorkflowList: () => import('@/views/workflow/WorkflowList.vue'),
    }

    const routes: RouteRecordRaw[] = []

    const walk = (items: MenuItem[]) => {
      items.forEach((item) => {
        if (item.children?.length) {
          walk(item.children)
          return
        }

        const component = componentMap[item.name]
        if (!component)
          return

        routes.push({
          path: item.path,
          name: item.name,
          component,
          meta: {
            title: item.title,
            permission: item.permission,
            requiresAuth: true,
          },
        })
      })
    }

    walk(menus.value)
    return routes
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
