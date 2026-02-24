<script setup lang="ts">
import {
  ElButton,
  ElCard,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElSelect,
  ElSpace,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus'
/**
 * WorkflowList - 流程定义列表页
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDeleteWorkflow, useWorkflowList } from '@/composables/useWorkflow'

const router = useRouter()

// ==================== 搜索条件 ====================
const searchForm = ref({
  keyword: '',
  status: '',
})

// ==================== 分页 ====================
const pagination = ref({
  page: 1,
  pageSize: 10,
})

// ==================== Vue Query ====================
const { data, isLoading, isError } = useWorkflowList({
  page: pagination.value.page,
  pageSize: pagination.value.pageSize,
  ...searchForm.value,
})

const deleteMutation = useDeleteWorkflow()

// ==================== 状态映射 ====================
const statusMap: Record<string, { text: string, type: 'primary' | 'success' | 'warning' | 'info' | 'danger' }> = {
  draft: { text: '草稿', type: 'info' },
  active: { text: '启用', type: 'success' },
  inactive: { text: '停用', type: 'warning' },
  deleted: { text: '已删除', type: 'danger' },
}

// ==================== 事件处理 ====================
/**
 * 编辑流程
 */
function handleEdit(id: string) {
  router.push(`/workflow/editor/${id}`)
}

/**
 * 新建流程
 */
function handleCreate() {
  router.push('/workflow/editor/new')
}

/**
 * 删除流程
 */
async function handleDelete(id: string, name: string) {
  try {
    await ElMessageBox.confirm(`确定要删除流程"${name}"吗？`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await deleteMutation.mutateAsync(id)
    ElMessage.success('删除成功')
  }
  catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 搜索
 */
function handleSearch() {
  pagination.value.page = 1
}

/**
 * 重置
 */
function handleReset() {
  searchForm.value.keyword = ''
  searchForm.value.status = ''
  pagination.value.page = 1
}
</script>

<template>
  <div class="workflow-list">
    <ElCard>
      <template #header>
        <div class="card-header">
          <h2>流程管理</h2>
          <ElButton type="primary" @click="handleCreate">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            新建流程
          </ElButton>
        </div>
      </template>

      <!-- 搜索栏 -->
      <div class="search-bar">
        <ElInput
          v-model="searchForm.keyword"
          placeholder="搜索流程名称"
          clearable
          style="width: 240px"
          @keyup.enter="handleSearch"
        />
        <ElSelect v-model="searchForm.status" placeholder="流程状态" clearable style="width: 150px">
          <ElOption label="草稿" value="draft" />
          <ElOption label="启用" value="active" />
          <ElOption label="停用" value="inactive" />
        </ElSelect>
        <ElSpace>
          <ElButton type="primary" @click="handleSearch">
            搜索
          </ElButton>
          <ElButton @click="handleReset">
            重置
          </ElButton>
        </ElSpace>
      </div>

      <!-- 表格 -->
      <ElTable
        v-loading="isLoading"
        :data="data?.list || []"
        style="width: 100%"
        @row-dblclick="(row) => handleEdit(row.id)"
      >
        <ElTableColumn prop="name" label="流程名称" min-width="200" />
        <ElTableColumn prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <ElTableColumn prop="status" label="状态" width="100">
          <template #default="{ row }">
            <ElTag :type="statusMap[row.status]?.type">
              {{ statusMap[row.status]?.text }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="formSchemaId" label="绑定表单" width="120">
          <template #default="{ row }">
            <span v-if="row.formSchemaId">已绑定</span>
            <span v-else class="text-muted">未绑定</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="updatedAt" label="更新时间" width="180" />
        <ElTableColumn label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="handleEdit(row.id)">
              编辑
            </ElButton>
            <ElButton
              link
              type="danger"
              :loading="Boolean(deleteMutation.isPending.value)"
              @click="handleDelete(row.id, row.name)"
            >
              删除
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <!-- 分页 -->
      <div class="pagination">
        <ElPagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="data?.total || 0"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.workflow-list {
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
  gap: 12px;
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.text-muted {
  color: #909399;
}
</style>
