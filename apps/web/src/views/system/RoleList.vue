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
  ElTable,
  ElTableColumn,
  ElTag,
  ElTree,
} from 'element-plus'
/**
 * 角色管理 - 系统管理模块
 */
import { ref } from 'vue'

// ==================== 模拟角色数据 ====================
const mockRoles = ref([
  { id: '1', name: 'admin', label: '超级管理员', description: '拥有所有权限', permissions: ['*'] },
  { id: '2', name: 'manager', label: '部门经理', description: '管理部门成员', permissions: ['approval:view', 'approval:approve', 'org:view'] },
  { id: '3', name: 'user', label: '普通员工', description: '普通员工权限', permissions: ['approval:view', 'approval:launch'] },
])

// ==================== 模拟权限树 ====================
const permissionTree = [
  {
    id: 'approval',
    label: '审批中心',
    children: [
      { id: 'approval:view', label: '查看审批' },
      { id: 'approval:launch', label: '发起审批' },
      { id: 'approval:approve', label: '审批操作' },
      { id: 'approval:manage', label: '审批管理' },
    ],
  },
  {
    id: 'workflow',
    label: '流程管理',
    children: [
      { id: 'workflow:view', label: '查看流程' },
      { id: 'workflow:edit', label: '编辑流程' },
      { id: 'workflow:delete', label: '删除流程' },
    ],
  },
  {
    id: 'org',
    label: '组织架构',
    children: [
      { id: 'org:view', label: '查看组织' },
      { id: 'org:edit', label: '编辑组织' },
    ],
  },
  {
    id: 'system',
    label: '系统管理',
    children: [
      { id: 'system:user:view', label: '用户管理' },
      { id: 'system:user:edit', label: '编辑用户' },
      { id: 'system:role:view', label: '角色管理' },
      { id: 'system:role:edit', label: '编辑角色' },
    ],
  },
]

// ==================== 对话框 ====================
const dialogVisible = ref(false)
const dialogTitle = ref('新增角色')
const editingRole = ref<any>(null)

const formModel = ref({
  name: '',
  label: '',
  description: '',
  permissions: [] as string[],
})

// ==================== 操作 ====================
function handleAdd() {
  dialogTitle.value = '新增角色'
  editingRole.value = null
  formModel.value = {
    name: '',
    label: '',
    description: '',
    permissions: [],
  }
  dialogVisible.value = true
}

function handleEdit(row: any) {
  dialogTitle.value = '编辑角色'
  editingRole.value = row
  formModel.value = { ...row }
  dialogVisible.value = true
}

function handleDelete(row: any) {
  ElMessageBox.confirm(`确定要删除角色"${row.label}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    mockRoles.value = mockRoles.value.filter(r => r.id !== row.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

function handleSubmit() {
  if (editingRole.value) {
    // 更新
    const index = mockRoles.value.findIndex(r => r.id === editingRole.value.id)
    if (index !== -1) {
      mockRoles.value[index] = { ...mockRoles.value[index], ...formModel.value }
      ElMessage.success('更新成功')
    }
  }
  else {
    // 新增
    const newRole = {
      id: String(Date.now()),
      ...formModel.value,
    }
    mockRoles.value.unshift(newRole)
    ElMessage.success('创建成功')
  }
  dialogVisible.value = false
}
</script>

<template>
  <div class="system-roles">
    <ElCard>
      <template #header>
        <div class="card-header">
          <h2>角色管理</h2>
          <ElButton type="primary" @click="handleAdd">
            新增角色
          </ElButton>
        </div>
      </template>

      <!-- 表格 -->
      <ElTable :data="mockRoles" style="width: 100%">
        <ElTableColumn prop="name" label="角色标识" width="150" />
        <ElTableColumn prop="label" label="角色名称" width="150" />
        <ElTableColumn prop="description" label="描述" min-width="200" />
        <ElTableColumn label="权限" min-width="200">
          <template #default="{ row }">
            <div class="permission-tags">
              <ElTag
                v-for="perm in row.permissions.slice(0, 3)"
                :key="perm"
                size="small"
                style="margin-right: 4px; margin-bottom: 4px"
              >
                {{ perm }}
              </ElTag>
              <ElTag v-if="row.permissions.length > 3" size="small">
                +{{ row.permissions.length - 3 }}
              </ElTag>
            </div>
          </template>
        </ElTableColumn>
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
    </ElCard>

    <!-- 编辑对话框 -->
    <ElDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
    >
      <ElForm :model="formModel" label-width="100px">
        <ElFormItem label="角色标识" required>
          <ElInput v-model="formModel.name" :disabled="!!editingRole" />
        </ElFormItem>
        <ElFormItem label="角色名称" required>
          <ElInput v-model="formModel.label" />
        </ElFormItem>
        <ElFormItem label="描述">
          <ElInput v-model="formModel.description" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="权限配置">
          <ElTree
            :data="permissionTree"
            :props="{ children: 'children', label: 'label' }"
            show-checkbox
            :default-checked-keys="formModel.permissions"
            @check="
              (data) => {
                const checkedKeys = data.checkedKeys as string[]
                const halfCheckedKeys = data.halfCheckedKeys as string[]
                formModel.permissions = [...checkedKeys, ...halfCheckedKeys]
              }
            "
          />
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
.system-roles {
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

.permission-tags {
  display: flex;
  flex-wrap: wrap;
}
</style>
