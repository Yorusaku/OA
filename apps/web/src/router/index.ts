/**
 * 路由配置
 */
import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

// 路由组件懒加载
const Login = () => import('@/views/auth/Login.vue')
const MainLayout = () => import('@/layouts/MainLayout.vue')
const Dashboard = () => import('@/views/dashboard/Workbench.vue')
const ApprovalLaunch = () => import('@/views/approval/ApprovalLaunch.vue')
const ApprovalMine = () => import('@/views/approval/ApprovalMine.vue')
const ApprovalTodo = () => import('@/views/approval/ApprovalTodo.vue')
const OrgTree = () => import('@/views/org/OrgTree.vue')
const ContactsList = () => import('@/views/contacts/ContactsList.vue')
const UserList = () => import('@/views/system/UserList.vue')
const RoleList = () => import('@/views/system/RoleList.vue')
const WorkflowList = () => import('@/views/workflow/WorkflowList.vue')
const WorkflowEditor = () => import('@/views/workflow/WorkflowEditor.vue')

/**
 * 常量路由
 * 不需要动态权限的路由
 */
export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
      public: true, // 公开路由，不需要登录
      title: '登录',
    },
  },
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: Dashboard,
        meta: {
          title: '工作台',
          icon: 'dashboard',
          requiresAuth: true, // 需要登录
          permission: 'dashboard:view', // 权限标识
        },
      },
      {
        path: 'approval',
        name: 'ApprovalCenter',
        meta: {
          title: '审批中心',
          icon: 'tickets',
          requiresAuth: true,
          permission: 'approval:center:view',
        },
        children: [
          {
            path: 'launch',
            name: 'ApprovalLaunch',
            component: ApprovalLaunch,
            meta: {
              title: '发起审批',
              requiresAuth: true,
              permission: 'approval:launch',
            },
          },
          {
            path: 'mine',
            name: 'ApprovalMine',
            component: ApprovalMine,
            meta: {
              title: '我的申请',
              requiresAuth: true,
              permission: 'approval:mine',
            },
          },
          {
            path: 'todo',
            name: 'ApprovalTodo',
            component: ApprovalTodo,
            meta: {
              title: '待我审批',
              requiresAuth: true,
              permission: 'approval:todo',
            },
          },
        ],
      },
      {
        path: 'org',
        name: 'Organization',
        meta: {
          title: '组织架构',
          icon: 'tree',
          requiresAuth: true,
          permission: 'org:view',
        },
        children: [
          {
            path: 'tree',
            name: 'OrgTree',
            component: OrgTree,
            meta: {
              title: '组织树',
              requiresAuth: true,
            },
          },
        ],
      },
      {
        path: 'contacts',
        name: 'Contacts',
        meta: {
          title: '通讯录',
          icon: 'user',
          requiresAuth: true,
          permission: 'contacts:view',
        },
        children: [
          {
            path: 'list',
            name: 'ContactsList',
            component: ContactsList,
            meta: {
              title: '通讯录列表',
              requiresAuth: true,
            },
          },
        ],
      },
      {
        path: 'system',
        name: 'System',
        meta: {
          title: '系统管理',
          icon: 'setting',
          requiresAuth: true,
          permission: 'system:view',
        },
        children: [
          {
            path: 'users',
            name: 'UserList',
            component: UserList,
            meta: {
              title: '用户管理',
              requiresAuth: true,
              permission: 'system:user:view',
            },
          },
          {
            path: 'roles',
            name: 'RoleList',
            component: RoleList,
            meta: {
              title: '角色管理',
              requiresAuth: true,
              permission: 'system:role:view',
            },
          },
        ],
      },
      {
        path: 'workflow',
        name: 'Workflow',
        meta: {
          title: '流程管理',
          icon: 'connection',
          requiresAuth: true,
          permission: 'workflow:view',
        },
        children: [
          {
            path: 'list',
            name: 'WorkflowList',
            component: WorkflowList,
            meta: {
              title: '流程列表',
              requiresAuth: true,
            },
          },
          {
            path: 'editor/:id',
            name: 'WorkflowEditor',
            component: WorkflowEditor,
            meta: {
              title: '流程编辑',
              requiresAuth: true,
              hidden: true, // 不在菜单中显示
            },
          },
        ],
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/NotFound.vue'),
    meta: {
      public: true, // 公开路由
      title: '404',
    },
  },
]

/**
 * 路由实例
 */
export const router = createRouter({
  history: createWebHistory(),
  routes: constantRoutes,
})

/**
 * 路由守卫
 */
router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()
  const isLoggedIn = !!userStore.token

  // 处理公开路由
  if (to.meta.public) {
    // 已登录用户访问登录页，重定向到首页
    if (to.path === '/login' && isLoggedIn) {
      next({ path: '/' })
      return
    }
    next()
    return
  }

  // 未登录用户访问需要认证的路由，重定向到登录页
  if (!isLoggedIn) {
    next({
      path: '/login',
      query: { redirect: to.fullPath }, // 登录后重定向回原页面
    })
    return
  }

  next()
})
