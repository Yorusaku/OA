<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ElButton,
  ElCard,
  ElDialog,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus'
import { Plus, Search, Refresh, Delete, Check } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import type { CreatePromptTemplateRequest } from '@oa/contracts'
import {
  useActivatePromptTemplate,
  useCreatePromptTemplate,
  useDeletePromptTemplate,
  usePromptTemplateList,
} from '@/composables/usePromptTemplate'

const router = useRouter()

const filterForm = ref({
  keyword: '',
  scope: '' as string,
  status: '' as string,
})

const filterParams = computed(() => ({
  keyword: filterForm.value.keyword || undefined,
  scope: filterForm.value.scope || undefined,
  status: filterForm.value.status || undefined,
}))

const { templates, isLoading, refetch } = usePromptTemplateList(filterParams)

const { mutate: createMutate, isPending: isCreating } = useCreatePromptTemplate()
const { mutate: activateMutate, isPending: isActivating } = useActivatePromptTemplate()
const { mutate: deleteMutate, isPending: isDeleting } = useDeletePromptTemplate()

// 新建对话框
const showCreateDialog = ref(false)
const createForm = ref({
  name: '',
  description: '',
  systemPrompt: '',
  userPrompt: '',
})

function handleCreate() {
  if (!createForm.value.name.trim() || !createForm.value.systemPrompt.trim() || !createForm.value.userPrompt.trim())
    return
  createMutate(
    {
      name: createForm.value.name.trim(),
      description: createForm.value.description.trim(),
      scope: 'approval_suggestion',
      systemPrompt: createForm.value.systemPrompt,
      userPrompt: createForm.value.userPrompt,
    },
    {
      onSuccess: () => {
        showCreateDialog.value = false
        createForm.value = { name: '', description: '', systemPrompt: '', userPrompt: '' }
      },
    },
  )
}

function handleActivate(id: string) {
  activateMutate(id)
}

function handleDelete(id: string) {
  deleteMutate(id)
}

function goToDetail(id: string) {
  router.push(`/system/prompt-templates/${id}`)
}

function getStatusTag(status: string): 'success' | 'warning' | 'info' | 'danger' {
  const map: Record<string, 'success' | 'warning' | 'info' | 'danger'> = { draft: 'warning', active: 'success', archived: 'info' }
  return map[status] || 'info'
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = { draft: '草稿', active: '使用中', archived: '已归档' }
  return map[status] || status
}
</script>

<template>
  <div class="prompt-templates-page">
    <div class="page-header">
      <h2 class="page-title">Prompt 模板管理</h2>
      <ElButton type="primary" :icon="Plus" @click="showCreateDialog = true">
        新建模板
      </ElButton>
    </div>

    <!-- 筛选 -->
    <ElCard class="filter-card">
      <ElForm :model="filterForm" inline>
        <ElFormItem label="关键词">
          <ElInput v-model="filterForm.keyword" placeholder="搜索模板名称" clearable style="width: 200px" />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="filterForm.status" placeholder="全部" clearable style="width: 120px">
            <ElOption label="草稿" value="draft" />
            <ElOption label="使用中" value="active" />
            <ElOption label="已归档" value="archived" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" :icon="Search" @click="refetch()">搜索</ElButton>
          <ElButton :icon="Refresh" @click="filterForm = { keyword: '', scope: '', status: '' }; refetch()">重置</ElButton>
        </ElFormItem>
      </ElForm>
    </ElCard>

    <!-- 表格 -->
    <ElCard>
      <ElTable v-loading="isLoading" :data="templates || []" style="width: 100%">
        <ElTableColumn prop="name" label="模板名称" min-width="180">
          <template #default="{ row }">
            <ElButton type="primary" link @click="goToDetail(row.id)">
              {{ row.name }}
            </ElButton>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="scope" label="作用域" width="160">
          <template #default="{ row }">
            <ElTag>{{ row.scope === 'approval_suggestion' ? '审批建议' : row.scope }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="status" label="状态" width="100">
          <template #default="{ row }">
            <ElTag :type="getStatusTag(row.status)">{{ getStatusLabel(row.status) }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="version" label="版本" width="80">
          <template #default="{ row }">v{{ row.version }}</template>
        </ElTableColumn>
        <ElTableColumn prop="updatedAt" label="更新时间" width="180" />
        <ElTableColumn label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <ElButton
              v-if="row.status !== 'active'"
              type="success"
              size="small"
              :icon="Check"
              :loading="isActivating"
              @click="handleActivate(row.id)"
            >
              激活
            </ElButton>
            <ElButton
              type="danger"
              size="small"
              :icon="Delete"
              :loading="isDeleting"
              @click="handleDelete(row.id)"
            >
              删除
            </ElButton>
          </template>
        </ElTableColumn>
        <template #empty>
          <ElEmpty description="暂无 Prompt 模板" />
        </template>
      </ElTable>
    </ElCard>

    <!-- 新建对话框 -->
    <ElDialog v-model="showCreateDialog" title="新建 Prompt 模板" width="640px" :close-on-click-modal="false">
      <ElForm :model="createForm" label-width="100px">
        <ElFormItem label="模板名称" required>
          <ElInput v-model="createForm.name" placeholder="例如：审批建议默认模板" />
        </ElFormItem>
        <ElFormItem label="描述">
          <ElInput v-model="createForm.description" placeholder="模板用途说明" />
        </ElFormItem>
        <ElFormItem label="System Prompt" required>
          <ElInput v-model="createForm.systemPrompt" type="textarea" :rows="8" placeholder="输入 system prompt..." />
        </ElFormItem>
        <ElFormItem label="User Prompt" required>
          <ElInput v-model="createForm.userPrompt" type="textarea" :rows="3" placeholder="输入 user prompt..." />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="showCreateDialog = false">取消</ElButton>
        <ElButton
          type="primary"
          :loading="isCreating"
          :disabled="!createForm.name.trim()"
          @click="handleCreate"
        >
          创建
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.prompt-templates-page {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.filter-card {
  margin-bottom: 16px;
}
</style>
