<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const form = reactive({
  username: 'admin',
  password: 'admin123',
})

const submitting = ref(false)

async function onSubmit() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  submitting.value = true
  try {
    // 这里暂时使用本地 mock 登录，后续会接入真实接口
    userStore.setToken('mock-token')
    userStore.setUser({
      id: '1',
      name: form.username || '演示用户',
    })
    // 设置权限和菜单（实际应该从后端获取）
    userStore.setPermissions([
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
    ElMessage.success('登录成功')
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
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
