<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useRecordLoginLog } from '@/composables/useLoginLog'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const form = reactive({
  username: 'admin',
  password: 'admin123',
})

const submitting = ref(false)

// 登录日志记录
const { mutateAsync: recordLog } = useRecordLoginLog()

async function onSubmit() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  submitting.value = true
  try {
    // 模拟登录验证
    const loginSuccess = form.username === 'admin' && form.password === 'admin123'

    if (!loginSuccess) {
      // 记录登录失败日志
      await recordLog({
        userId: '',
        username: form.username,
        ipAddress: '192.168.1.100',
        location: '北京市',
        device: 'PC',
        os: 'Windows',
        browser: 'Chrome',
        userAgent: navigator.userAgent,
        status: 'failed',
        failReason: '用户名或密码错误',
      })

      ElMessage.error('用户名或密码错误')
      return
    }

    userStore.setToken('mock-token')
    userStore.setUser({
      id: '1',
      name: form.username || '演示用户',
    })

    userStore.setPermissions([
      'dashboard:view',
      'approval:center:view',
      'approval:launch',
      'approval:mine',
      'approval:todo',
      'approval:cc',
      'approval:detail',
      'org:view',
      'contacts:view',
      'message:view',
      'demo:view',
      'system:view',
      'system:user:view',
      'system:role:view',
      'system:login-log:view',
      'system:operation-log:view',
      'workflow:view',
      'workflow:list',
      'application:view',
      'application:list',
      'application:create',
      'application:edit',
      'application:delete',
      'application:publish',
      'application:detail',
      'template:view',
      'template:market',
      'template:my',
      'template:detail',
      'template:create',
      'template:install',
    ])

    userStore.setMenus([
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
          { path: '/approval/cc', name: 'ApprovalCC', title: '抄送我的', permission: 'approval:cc' },
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
        path: '/message',
        name: 'MessageCenter',
        title: '消息中心',
        icon: 'bell',
        permission: 'message:view',
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
          { path: '/system/login-logs', name: 'LoginLogs', title: '登录日志', permission: 'system:login-log:view' },
          { path: '/system/operation-logs', name: 'OperationLogs', title: '操作日志', permission: 'system:operation-log:view' },
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
      {
        path: '/application',
        name: 'ApplicationCenter',
        title: '应用中心',
        icon: 'grid',
        permission: 'application:view',
        children: [
          { path: '/application/list', name: 'ApplicationList', title: '应用列表', permission: 'application:list' },
        ],
      },
      {
        path: '/template',
        name: 'TemplateMarket',
        title: '模板市场',
        icon: 'shop',
        permission: 'template:view',
        children: [
          { path: '/template/market', name: 'TemplateMarketList', title: '模板广场', permission: 'template:market' },
          { path: '/template/my', name: 'MyTemplates', title: '我的模板', permission: 'template:my' },
        ],
      },
    ])

    // 记录登录成功日志
    await recordLog({
      userId: '1',
      username: form.username,
      ipAddress: '192.168.1.100',
      location: '北京市',
      device: 'PC',
      os: 'Windows',
      browser: 'Chrome',
      userAgent: navigator.userAgent,
      status: 'success',
    })

    ElMessage.success('登录成功')
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  }
  catch (error) {
    ElMessage.error('登录失败，请稍后重试')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="h-screen flex items-center justify-center bg-slate-100">
    <div class="w-full max-w-md bg-white rounded-lg shadow-md p-8">
      <h1 class="text-xl font-semibold mb-6 text-center">
        全景智能 OA 登录
      </h1>
      <el-form :model="form" label-position="top" @submit.prevent="onSubmit">
        <el-form-item label="用户名">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="w-full" :loading="submitting" @click="onSubmit">
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>
