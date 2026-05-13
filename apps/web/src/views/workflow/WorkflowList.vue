<script setup lang="ts">
import {
  ElButton,
  ElCard,
  ElDialog,
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
  ElDescriptions,
  ElDescriptionsItem,
  ElAlert,
} from 'element-plus'
/**
 * WorkflowList - 流程定义列表页（含治理操作）
 */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDeleteWorkflow, useWorkflowList } from '@/composables/useWorkflow'
import {
  publishWorkflowDefinition,
  rollbackWorkflowDefinition,
  getWorkflowImpact,
  getWorkflowVersions,
} from '@/api/workflow'
import type { WorkflowVersion } from '@oa/contracts'
import { useQuery } from '@tanstack/vue-query'
import { queryKeys } from '@/api/queryKeys'

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
const queryParams = computed(() => ({
  page: pagination.value.page,
  pageSize: pagination.value.pageSize,
  keyword: searchForm.value.keyword || undefined,
  status: searchForm.value.status || undefined,
}))
const { data, isLoading, refetch } = useWorkflowList(queryParams)

const deleteMutation = useDeleteWorkflow()

// ==================== 状态映射 ====================
const statusMap: Record<string, { text: string, type: 'primary' | 'success' | 'warning' | 'info' | 'danger' }> = {
  draft: { text: '草稿', type: 'info' },
  active: { text: '启用', type: 'success' },
  inactive: { text: '停用', type: 'warning' },
  deleted: { text: '已删除', type: 'danger' },
}

// ==================== 发布 ====================
const publishingIds = ref(new Set<string>())
async function handlePublish(id: string, name: string) {
  try {
    await ElMessageBox.confirm(`确定要发布流程 "${name}" 吗？发布后审批将立即生效。`, '确认发布', {
      confirmButtonText: '确认发布',
      cancelButtonText: '取消',
      type: 'warning',
    })
    publishingIds.value.add(id)
    await publishWorkflowDefinition(id)
    ElMessage.success('发布成功')
    refetch()
  }
  catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('发布失败')
    }
  }
  finally {
    publishingIds.value.delete(id)
  }
}

// ==================== 影响分析 ====================
const impactDialogVisible = ref(false)
const impactData = ref<Awaited<ReturnType<typeof getWorkflowImpact>> | null>(null)
const impactLoading = ref(false)
async function handleImpact(id: string) {
  impactLoading.value = true
  impactDialogVisible.value = true
  try {
    impactData.value = await getWorkflowImpact(id)
  }
  catch {
    ElMessage.error('影响分析失败')
    impactDialogVisible.value = false
  }
  finally {
    impactLoading.value = false
  }
}

// ==================== 版本列表 ====================
const versionDialogVisible = ref(false)
const versionWorkflowId = ref('')
const versionWorkflowName = ref('')
const { data: versionList, isLoading: versionLoading } = useQuery({
  queryKey: computed(() => queryKeys.workflow.versions(versionWorkflowId.value)),
  queryFn: () => getWorkflowVersions(versionWorkflowId.value),
  enabled: () => versionDialogVisible.value && !!versionWorkflowId.value,
})

function handleVersions(id: string, name: string) {
  versionWorkflowId.value = id
  versionWorkflowName.value = name
  versionDialogVisible.value = true
}

// ==================== 回滚 ====================
const rollbackDialogVisible = ref(false)
const rollbackWorkflowId = ref('')
const rollbackWorkflowName = ref('')
const selectedVersionId = ref('')
const rollbackLoading = ref(false)

function handleRollback(id: string, name: string) {
  rollbackWorkflowId.value = id
  rollbackWorkflowName.value = name
  selectedVersionId.value = ''
  rollbackDialogVisible.value = true
}

async function confirmRollback() {
  if (!selectedVersionId.value) {
    ElMessage.warning('请选择要回滚到的版本')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定要将流程 "${rollbackWorkflowName.value}" 回滚到版本 ${selectedVersionId.value} 吗？回滚将立即生效，请谨慎操作。`,
      '确认回滚',
      {
        confirmButtonText: '确认回滚',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
    rollbackLoading.value = true
    await rollbackWorkflowDefinition(rollbackWorkflowId.value, selectedVersionId.value)
    ElMessage.success('回滚成功')
    rollbackDialogVisible.value = false
    refetch()
  }
  catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('回滚失败')
    }
  }
  finally {
    rollbackLoading.value = false
  }
}

// ==================== 事件处理 ====================
function handleEdit(id: string) {
  router.push(`/workflow/editor/${id}`)
}

function handleCreate() {
  router.push('/workflow/editor/new')
}

async function handleDelete(id: string, name: string) {
  try {
    await ElMessageBox.confirm(`确定要删除流程 "${name}" 吗？`, '确认删除', {
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

function handleSearch() {
  pagination.value.page = 1
}

function handleReset() {
  searchForm.value.keyword = ''
  searchForm.value.status = ''
  pagination.value.page = 1
}

watch(
  () => [searchForm.value.keyword, searchForm.value.status],
  () => {
    pagination.value.page = 1
  },
)
</script>

<template>
  <div class="p-6">
    <ElCard>
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold text-gray-800">流程管理</h2>
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
      <div class="mb-4 flex items-center gap-4">
        <ElInput
          v-model="searchForm.keyword"
          placeholder="搜索流程名称"
          clearable
          class="w-60"
          @keyup.enter="handleSearch"
        />
        <ElSelect v-model="searchForm.status" placeholder="流程状态" clearable class="w-40">
          <ElOption label="草稿" value="draft" />
          <ElOption label="启用" value="active" />
          <ElOption label="停用" value="inactive" />
        </ElSelect>
        <ElSpace>
          <ElButton type="primary" @click="handleSearch">搜索</ElButton>
          <ElButton @click="handleReset">重置</ElButton>
        </ElSpace>
      </div>

      <!-- 表格 -->
      <ElTable
        v-loading="isLoading"
        :data="data?.list || []"
        style="width: 100%"
        @row-dblclick="(row) => handleEdit(row.id)"
      >
        <ElTableColumn prop="name" label="流程名称" min-width="180" />
        <ElTableColumn prop="description" label="描述" min-width="160" show-overflow-tooltip />
        <ElTableColumn prop="status" label="状态" width="90">
          <template #default="{ row }">
            <ElTag :type="statusMap[row.status]?.type">
              {{ statusMap[row.status]?.text }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="version" label="版本" width="70" />
        <ElTableColumn prop="updatedAt" label="更新时间" width="180" />
        <ElTableColumn label="操作" width="420" fixed="right">
          <template #default="{ row }">
            <div class="flex gap-1 flex-wrap">
              <ElButton link type="primary" size="small" @click="handleEdit(row.id)">编辑</ElButton>
              <ElButton
                v-if="row.status !== 'active'"
                link
                type="success"
                size="small"
                :loading="publishingIds.has(row.id)"
                @click="handlePublish(row.id, row.name)"
              >
                发布
              </ElButton>
              <ElButton link type="warning" size="small" @click="handleImpact(row.id)">影响分析</ElButton>
              <ElButton link type="info" size="small" @click="handleVersions(row.id, row.name)">版本历史</ElButton>
              <ElButton link type="warning" size="small" @click="handleRollback(row.id, row.name)">回滚</ElButton>
              <ElButton
                link
                type="danger"
                size="small"
                :loading="Boolean(deleteMutation.isPending.value)"
                @click="handleDelete(row.id, row.name)"
              >
                删除
              </ElButton>
            </div>
          </template>
        </ElTableColumn>
      </ElTable>

      <!-- 分页 -->
      <div class="mt-4 flex justify-end">
        <ElPagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="data?.total || 0"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </ElCard>

    <!-- 影响分析对话框 -->
    <ElDialog v-model="impactDialogVisible" title="影响分析" width="600px">
      <div v-loading="impactLoading">
        <template v-if="impactData">
          <ElDescriptions :column="2" border>
            <ElDescriptionsItem label="待处理审批数">{{ impactData.pendingCount }}</ElDescriptionsItem>
            <ElDescriptionsItem label="涉及节点数">{{ impactData.involvedNodeCount }}</ElDescriptionsItem>
            <ElDescriptionsItem label="风险等级" :span="2">
              <ElTag :type="impactData.riskLevel === 'high' ? 'danger' : impactData.riskLevel === 'medium' ? 'warning' : 'success'">
                {{ impactData.riskLevel === 'high' ? '高风险' : impactData.riskLevel === 'medium' ? '中风险' : '低风险' }}
              </ElTag>
            </ElDescriptionsItem>
          </ElDescriptions>
          <div class="mt-4">
            <div class="text-sm font-medium mb-2">操作建议：</div>
            <ElAlert
              v-for="(tip, idx) in impactData.suggestions"
              :key="idx"
              :title="tip"
              :type="impactData.riskLevel === 'high' ? 'error' : impactData.riskLevel === 'medium' ? 'warning' : 'success'"
              :closable="false"
              class="mb-2"
            />
          </div>
        </template>
      </div>
    </ElDialog>

    <!-- 版本历史对话框 -->
    <ElDialog v-model="versionDialogVisible" :title="`版本历史 - ${versionWorkflowName}`" width="800px">
      <ElTable v-loading="versionLoading" :data="versionList || []" style="width: 100%">
        <ElTableColumn prop="id" label="版本ID" width="180" show-overflow-tooltip />
        <ElTableColumn prop="status" label="状态" width="100">
          <template #default="{ row }">
            <ElTag :type="row.status === 'published' ? 'success' : row.status === 'draft' ? 'info' : 'warning'" size="small">
              {{ row.status === 'published' ? '已发布' : row.status === 'draft' ? '草稿' : '已回滚' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="createdBy" label="操作人" width="120" />
        <ElTableColumn prop="note" label="备注" min-width="160" show-overflow-tooltip />
        <ElTableColumn prop="createdAt" label="时间" width="180" />
      </ElTable>
    </ElDialog>

    <!-- 回滚对话框 -->
    <ElDialog v-model="rollbackDialogVisible" :title="`回滚流程 - ${rollbackWorkflowName}`" width="700px">
      <ElAlert
        title="回滚操作将立即覆盖当前流程配置，请从版本历史中选择目标版本，确认后将不可逆转。"
        type="warning"
        :closable="false"
        class="mb-4"
      />
      <ElTable
        v-loading="versionLoading"
        :data="versionList || []"
        style="width: 100%"
        highlight-current-row
        @current-change="(row: WorkflowVersion | null) => { selectedVersionId = row?.id || '' }"
      >
        <ElTableColumn type="index" label="#" width="50" />
        <ElTableColumn prop="id" label="版本ID" width="200" show-overflow-tooltip />
        <ElTableColumn prop="status" label="状态" width="100">
          <template #default="{ row }">
            <ElTag :type="row.status === 'published' ? 'success' : row.status === 'draft' ? 'info' : 'warning'" size="small">
              {{ row.status === 'published' ? '已发布' : row.status === 'draft' ? '草稿' : '已回滚' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="createdBy" label="操作人" width="100" />
        <ElTableColumn prop="note" label="备注" min-width="120" show-overflow-tooltip />
        <ElTableColumn prop="createdAt" label="时间" width="170" />
      </ElTable>
      <template #footer>
        <ElButton @click="rollbackDialogVisible = false">取消</ElButton>
        <ElButton type="warning" :loading="rollbackLoading" :disabled="!selectedVersionId" @click="confirmRollback">
          确认回滚
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
</style>