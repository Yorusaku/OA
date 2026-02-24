<script setup lang="ts">
import {
  ElButton,
  ElCard,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus'
/**
 * 用户管理 - 系统管理模块
 */
import { ref } from 'vue'

// ==================== 模拟用户数据 ====================
const mockUsers = ref([
  { id: '1', username: 'admin', name: '管理员', email: 'admin@company.com', role: 'admin', status: 'active', createTime: '2025-01-01' },
  { id: '2', username: 'zhangsan', name: '张三', email: 'zhangsan@company.com', role: 'user', status: 'active', createTime: '2025-02-15' },
  { id: '3', username: 'lisi', name: '李四', email: 'lisi@company.com', role: 'user', status: 'inactive', createTime: '2025-03-20' },
  { id: '4', username: 'wangwu', name: '王五', email: 'wangwu@company.com', role: 'manager', status: 'active', createTime: '2025-04-10' },
])

// ==================== 搜索条件 ====================
const searchForm = ref({
  keyword: '',
  role: '',
  status: '',
})

// ==================== 分页 ====================
const pagination = ref({
  page: 1,
  pageSize: 10,
})

// ==================== 对话框 ====================
const dialogVisible = ref(false)
const dialogTitle = ref('新增用户')
const editingUser = ref<any>(null)

const formModel = ref({
  username: '',
  name: '',
  email: '',
  role: 'user',
  status: 'active',
})

// ==================== 筛选后的数据 ====================
const filteredUsers = ref(mockUsers.value)

function handleSearch() {
  filteredUsers.value = mockUsers.value.filter((user) => {
    if (searchForm.value.keyword && !user.name.includes(searchForm.value.keyword)) {
      return false
    }
    if (searchForm.value.role && user.role !== searchForm.value.role) {
      return false
    }
    if (searchForm.value.status && user.status !== searchForm.value.status) {
      return false
    }
    return true
  })
}

// ==================== 操作 ====================
function handleAdd() {
  dialogTitle.value = '新增用户'
  editingUser.value = null
  formModel.value = {
    username: '',
    name: '',
    email: '',
    role: 'user',
    status: 'active',
  }
  dialogVisible.value = true
}

function handleEdit(row: any) {
  dialogTitle.value = '编辑用户'
  editingUser.value = row
  formModel.value = { ...row }
  dialogVisible.value = true
}

function handleDelete(row: any) {
  ElMessageBox.confirm(`确定要删除用户"${row.name}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    mockUsers.value = mockUsers.value.filter(u => u.id !== row.id)
    handleSearch()
    ElMessage.success('删除成功')
  }).catch(() => {})
}

function handleSubmit() {
  if (editingUser.value) {
    // 更新
    const index = mockUsers.value.findIndex(u => u.id === editingUser.value.id)
    if (index !== -1) {
      mockUsers.value[index] = { ...mockUsers.value[index], ...formModel.value }
      ElMessage.success('更新成功')
    }
  }
  else {
    // 新增
    const newUser = {
      id: String(Date.now()),
      ...formModel.value,
      createTime: new Date().toISOString().split('T')[0],
    }
    mockUsers.value.unshift(newUser)
    ElMessage.success('创建成功')
  }
  dialogVisible.value = false
  handleSearch()
}
</script>

<template>
  <div class="system-users">
    <ElCard>
      <template #header>
        <div class="card-header">
          <h2>用户管理</h2>
          <ElButton type="primary" @click="handleAdd">
            新增用户
          </ElButton>
        </div>
      </template>

      <!-- 搜索栏 -->
      <div class="search-bar mb-4">
        <ElInput
          v-model="searchForm.keyword"
          placeholder="搜索用户名/姓名"
          clearable
          style="width: 240px"
          @keyup.enter="handleSearch"
        />
        <ElSelect
          v-model="searchForm.role"
          placeholder="角色"
          clearable
          style="width: 150px; margin-left: 12px"
        >
          <ElOption label="管理员" value="admin" />
          <ElOption label="普通用户" value="user" />
          <ElOption label="经理" value="manager" />
        </ElSelect>
        <ElSelect
          v-model="searchForm.status"
          placeholder="状态"
          clearable
          style="width: 120px; margin-left: 12px"
        >
          <ElOption label="启用" value="active" />
          <ElOption label="禁用" value="inactive" />
        </ElSelect>
        <ElButton type="primary" style="margin-left: 12px" @click="handleSearch">
          搜索
        </ElButton>
      </div>

      <!-- 表格 -->
      <ElTable :data="filteredUsers" style="width: 100%">
        <ElTableColumn prop="username" label="用户名" width="120" />
        <ElTableColumn prop="name" label="姓名" width="120" />
        <ElTableColumn prop="email" label="邮箱" min-width="180" />
        <ElTableColumn label="角色" width="100">
          <template #default="{ row }">
            <ElTag :type="row.role === 'admin' ? 'danger' : row.role === 'manager' ? 'warning' : 'info'">
              {{ row.role === 'admin' ? '管理员' : row.role === 'manager' ? '经理' : '普通用户' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="100">
          <template #default="{ row }">
            <ElTag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="createTime" label="创建时间" width="120" />
        <ElTableColumn label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="handleEdit(row)">
              编辑
            </ElButton>
            <ElButton link type="danger" @click="handleDelete(row)">
              删除
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <!-- 分页 -->
      <ElPagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="filteredUsers.length"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        class="mt-4 flex justify-end"
      />
    </ElCard>

    <!-- 编辑对话框 -->
    <ElDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
    >
      <ElForm :model="formModel" label-width="80px">
        <ElFormItem label="用户名" required>
          <ElInput v-model="formModel.username" :disabled="!!editingUser" />
        </ElFormItem>
        <ElFormItem label="姓名" required>
          <ElInput v-model="formModel.name" />
        </ElFormItem>
        <ElFormItem label="邮箱" required>
          <ElInput v-model="formModel.email" />
        </ElFormItem>
        <ElFormItem label="角色" required>
          <ElSelect v-model="formModel.role" style="width: 100%">
            <ElOption label="普通用户" value="user" />
            <ElOption label="经理" value="manager" />
            <ElOption label="管理员" value="admin" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSwitch v-model="formModel.status" active-value="active" inactive-value="inactive" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">
          取消
        </ElButton>
        <ElButton type="primary" @click="handleSubmit">
          确定
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.system-users {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.search-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
</style>
