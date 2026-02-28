<template>
  <div class="form-list-page">
    <!-- 页面头部：新建按钮 -->
    <div class="header">
      <el-button type="primary" @click="handleCreateNew">
        <Plus />
        新建表单
      </el-button>
    </div>

    <!-- 表格主体：展示表单列表 -->
    <el-table
      v-if="formList.length > 0"
      :data="formList"
      stripe
      style="width: 100%"
    >
      <el-table-column prop="name" label="表单名称" width="300" />
      <el-table-column label="字段数量" width="120">
        <template #default="{ row }">
          {{ getFieldCount(row) }}
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="200">
        <template #default="{ row }">
          {{ formatDate(row.createTime) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button-group>
            <el-button size="small" @click="handlePreview(row)">预览</el-button>
            <el-button size="small" type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button
              size="small"
              type="danger"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>

    <!-- 空状态：无表单时显示 -->
    <el-empty
      v-else
      description="暂无表单，点击右上角新建～"
      :image-size="120"
    >
      <el-button type="primary" @click="handleCreateNew">
        点击新建
      </el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLocalStorageFormStorage, type FormDTO, formatDate } from '@/composables/useLocalStorageFormStorage'

// ==================== 实例化存储层 ====================
const { formList, deleteForm, checkBindingCount } = useLocalStorageFormStorage()

// ==================== 路由实例 ====================
const router = useRouter()

// ==================== 业务逻辑 ====================

/**
 * 获取字段数量（带防御性计算）
 */
const getFieldCount = (row: FormDTO): number => {
  try {
    const fields = row?.schema?.fields
    return Array.isArray(fields) ? fields.length : 0
  } catch {
    return 0
  }
}

/**
 * 格式化时间戳（复用 composable 中的纯函数）
 */
const formatDateWrapper = (timestamp: number): string => {
  return formatDate(timestamp)
}

/**
 * 新建表单
 */
const handleCreateNew = (): void => {
  router.push('/form/designer')
}

/**
 * 编辑表单
 */
const handleEdit = (row: FormDTO): void => {
  if (!row?.id) {
    ElMessage.warning('无效的表单ID')
    return
  }
  router.push(`/form/designer?id=${row.id}`)
}

/**
 * 预览表单
 */
const handlePreview = async (row: FormDTO): Promise<void> => {
  if (!row?.schema) {
    ElMessage.warning('该表单无可用 schema')
    return
  }

  try {
    await ElMessageBox.alert(
      `<div style="max-height: 400px; overflow: auto; font-family: monospace; white-space: pre-wrap;">${JSON.stringify(
        row.schema,
        null,
        2
      )}</div>`,
      '表单预览',
      {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '关闭',
        type: 'info',
      }
    )
  } catch {
    // 用户关闭弹窗，不处理
  }
}

/**
 * 删除表单（高危操作：含绑定检测和二次确认）
 */
const handleDelete = async (row: FormDTO): Promise<void> => {
  if (!row?.id) {
    ElMessage.warning('无效的表单ID')
    return
  }

  const bindingCount = checkBindingCount(row.id)

  // 高危检测：如果被工作流引用，显示红色警告
  const confirmMessage = bindingCount > 0
    ? `⚠️ 该表单已被 <strong>${bindingCount}</strong> 个审批流程引用，删除后将导致流程引用失效！<br/>确认删除？`
    : `确定删除表单 "${row.name}" 吗？此操作不可恢复！`

  try {
    await ElMessageBox.confirm(confirmMessage, '确认删除', {
      type: bindingCount > 0 ? 'error' : 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      dangerouslyUseHTMLString: true,
    })

    // 执行删除
    await deleteForm(row.id)
  } catch {
    // Element Plus 的 ElMessageBox.confirm 取消时抛出 'cancel' 字符串
    // 统一捕获并忽略，不显示错误提示
  }
}

/**
 * 组件挂载时初始化（预留扩展点）
 */
onMounted(() => {
  // 可以在这里添加初始化逻辑，如从其他 storage 加载默认数据
  console.log('[FormList] 页面挂载，当前表单数量:', formList.value.length)
})
</script>

<style scoped>
.form-list-page {
  padding: 24px;
  min-height: calc(100vh - 120px);
}

.header {
  margin-bottom: 24px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-empty__description) {
  color: #909399;
  font-size: 14px;
}
</style>
