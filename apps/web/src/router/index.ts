import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import Login from '@/views/auth/Login.vue'

const MainLayout = () => import(/* webpackChunkName: "layout", webpackPrefetch: true */ '@/layouts/MainLayout.vue')
const Dashboard = () => import(/* webpackChunkName: "dashboard", webpackPrefetch: true */ '@/views/dashboard/Workbench.vue')
const DynamicFormLinkageDemo = () => import(/* webpackChunkName: "demo" */ '@/views/demo/DynamicFormLinkageDemo.vue')

const ApprovalLaunch = () => import(/* webpackChunkName: "approval-launch", webpackPrefetch: true */ '@/views/approval/ApprovalLaunch.vue')
const ApprovalMine = () => import(/* webpackChunkName: "approval-mine" */ '@/views/approval/ApprovalMine.vue')
const ApprovalTodo = () => import(/* webpackChunkName: "approval-todo", webpackPrefetch: true */ '@/views/approval/ApprovalTodo.vue')
const ApprovalCC = () => import(/* webpackChunkName: "approval-cc" */ '@/views/approval/ApprovalCC.vue')

const OrgTree = () => import(/* webpackChunkName: "org" */ '@/views/org/OrgTree.vue')
const ContactsList = () => import(/* webpackChunkName: "contacts" */ '@/views/contacts/ContactsList.vue')
const MessageList = () => import(/* webpackChunkName: "message" */ '@/views/message/MessageList.vue')

const UserList = () => import(/* webpackChunkName: "system-user" */ '@/views/system/UserList.vue')
const RoleList = () => import(/* webpackChunkName: "system-role" */ '@/views/system/RoleList.vue')
const LoginLogs = () => import(/* webpackChunkName: "system-logs" */ '@/views/system/LoginLogs.vue')
const OperationLogs = () => import(/* webpackChunkName: "system-logs" */ '@/views/system/OperationLogs.vue')
const ApprovalDelegationSettings = () => import(/* webpackChunkName: "system-approval-delegation" */ '@/views/system/ApprovalDelegationSettings.vue')

const WorkflowList = () => import(/* webpackChunkName: "workflow-list" */ '@/views/workflow/WorkflowList.vue')
const WorkflowEditor = () => import(/* webpackChunkName: "workflow-editor" */ '@/views/workflow/WorkflowEditor.vue')

const ApplicationList = () => import(/* webpackChunkName: "application-list" */ '@/views/application/ApplicationList.vue')
const ApplicationCreate = () => import(/* webpackChunkName: "application-edit" */ '@/views/application/ApplicationCreate.vue')
const ApplicationEdit = () => import(/* webpackChunkName: "application-edit" */ '@/views/application/ApplicationEdit.vue')
const ApplicationDetail = () => import(/* webpackChunkName: "application-detail" */ '@/views/application/ApplicationDetail.vue')

const TemplateMarket = () => import(/* webpackChunkName: "template-market" */ '@/views/template/TemplateMarket.vue')
const TemplateDetail = () => import(/* webpackChunkName: "template-detail" */ '@/views/template/TemplateDetail.vue')
const MyTemplates = () => import(/* webpackChunkName: "template-my" */ '@/views/template/MyTemplates.vue')
const KnowledgeCenter = () => import(/* webpackChunkName: "knowledge" */ '@/views/knowledge/index.vue')

export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
      public: true,
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
          requiresAuth: true,
          permission: 'dashboard:view',
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
          {
            path: 'cc',
            name: 'ApprovalCC',
            component: ApprovalCC,
            meta: {
              title: '抄送我的',
              requiresAuth: true,
              permission: 'approval:cc',
            },
          },
          {
            path: 'detail/:id',
            name: 'ApprovalDetail',
            component: () => import(/* webpackChunkName: "approval-detail" */ '@/views/approval/ApprovalDetail.vue'),
            meta: {
              title: '审批详情',
              requiresAuth: true,
              permission: 'approval:detail',
              hidden: true,
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
        path: 'message',
        name: 'MessageCenter',
        meta: {
          title: '消息中心',
          icon: 'bell',
          requiresAuth: true,
          permission: 'message:view',
        },
        children: [
          {
            path: 'list',
            name: 'MessageList',
            component: MessageList,
            meta: {
              title: '消息列表',
              requiresAuth: true,
            },
          },
        ],
      },
      {
        path: 'demo',
        name: 'Demo',
        meta: {
          title: '演示页面',
          icon: 'bug',
          requiresAuth: true,
          permission: 'demo:view',
        },
        children: [
          {
            path: 'dynamic-form-linkage',
            name: 'DynamicFormLinkageDemo',
            component: DynamicFormLinkageDemo,
            meta: {
              title: '动态表单联动',
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
          {
            path: 'login-logs',
            name: 'LoginLogs',
            component: LoginLogs,
            meta: {
              title: '登录日志',
              requiresAuth: true,
              permission: 'system:login-log:view',
            },
          },
          {
            path: 'operation-logs',
            name: 'OperationLogs',
            component: OperationLogs,
            meta: {
              title: '操作日志',
              requiresAuth: true,
              permission: 'system:operation-log:view',
            },
          },
          {
            path: 'approval-delegation',
            name: 'ApprovalDelegationSettings',
            component: ApprovalDelegationSettings,
            meta: {
              title: '代理审批设置',
              requiresAuth: true,
              permission: 'system:approval-delegation:view',
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
              hidden: true,
            },
          },
        ],
      },
      {
        path: 'application',
        name: 'ApplicationCenter',
        meta: {
          title: '应用中心',
          icon: 'grid',
          requiresAuth: true,
          permission: 'application:view',
        },
        children: [
          {
            path: 'list',
            name: 'ApplicationList',
            component: ApplicationList,
            meta: {
              title: '应用列表',
              requiresAuth: true,
              permission: 'application:list',
            },
          },
          {
            path: 'create',
            name: 'ApplicationCreate',
            component: ApplicationCreate,
            meta: {
              title: '创建应用',
              requiresAuth: true,
              permission: 'application:create',
              hidden: true,
            },
          },
          {
            path: 'edit/:id',
            name: 'ApplicationEdit',
            component: ApplicationEdit,
            meta: {
              title: '编辑应用',
              requiresAuth: true,
              permission: 'application:edit',
              hidden: true,
            },
          },
          {
            path: 'detail/:id',
            name: 'ApplicationDetail',
            component: ApplicationDetail,
            meta: {
              title: '应用详情',
              requiresAuth: true,
              permission: 'application:detail',
              hidden: true,
            },
          },
        ],
      },
      {
        path: 'template',
        name: 'TemplateMarket',
        meta: {
          title: '模板市场',
          icon: 'shop',
          requiresAuth: true,
          permission: 'template:view',
        },
        children: [
          {
            path: 'market',
            name: 'TemplateMarketList',
            component: TemplateMarket,
            meta: {
              title: '模板广场',
              requiresAuth: true,
              permission: 'template:market',
            },
          },
          {
            path: 'my',
            name: 'MyTemplates',
            component: MyTemplates,
            meta: {
              title: '我的模板',
              requiresAuth: true,
              permission: 'template:my',
            },
          },
          {
            path: 'detail/:id',
            name: 'TemplateDetail',
            component: TemplateDetail,
            meta: {
              title: '模板详情',
              requiresAuth: true,
              permission: 'template:detail',
              hidden: true,
            },
          },
        ],
      },
      {
        path: 'knowledge',
        name: 'KnowledgeCenter',
        component: KnowledgeCenter,
        meta: {
          title: '知识库管理',
          icon: 'collection',
          requiresAuth: true,
          permission: 'knowledge:view',
        },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import(/* webpackChunkName: "error" */ '@/views/error/NotFound.vue'),
    meta: {
      public: true,
      title: '404',
    },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes: constantRoutes,
})

interface MenuNode {
  path: string
  permission?: string
  children?: MenuNode[]
}

function getFirstAccessiblePath(
  menus: MenuNode[],
  hasPermission: (code: string) => boolean,
): string {
  for (const menu of menus) {
    const selfAllowed = !menu.permission || hasPermission(menu.permission)
    if (!selfAllowed)
      continue

    if (menu.children?.length) {
      const childPath = getFirstAccessiblePath(menu.children, hasPermission)
      if (childPath)
        return childPath
    }

    if (menu.path)
      return menu.path
  }
  return '/'
}

router.beforeEach((to) => {
  const userStore = useUserStore()
  const isLoggedIn = !!userStore.token

  if (to.meta.public) {
    if (to.path === '/login' && isLoggedIn)
      return { path: '/' }
    return true
  }

  if (!isLoggedIn) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }

  const requiredPermissions = to.matched
    .map(record => record.meta?.permission)
    .filter((code): code is string => typeof code === 'string' && code.length > 0)

  const hasRoutePermission = requiredPermissions.every(code => userStore.hasPermission(code))
  if (!hasRoutePermission) {
    const fallbackPath = getFirstAccessiblePath(userStore.menus, userStore.hasPermission)
    if (to.path !== fallbackPath)
      return { path: fallbackPath }
    return false
  }

  return true
})
