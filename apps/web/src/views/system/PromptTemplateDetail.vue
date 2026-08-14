<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ElAlert,
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElTag,
} from 'element-plus'
import { ArrowLeft, Check } from '@element-plus/icons-vue'
import {
  useActivatePromptTemplate,
  usePromptTemplateDetail,
  useTestPromptTemplate,
  useUpdatePromptTemplate,
} from '@/composables/usePromptTemplate'

const route = useRoute()
const router = useRouter()
const templateId = computed(() => route.params.id as string)

const { template, isLoading } = usePromptTemplateDetail(templateId)
const { mutate: updateMutate, isPending: isUpdating } = useUpdatePromptTemplate()
const { mutate: activateMutate, isPending: isActivating } = useActivatePromptTemplate()
const { mutate: testMutate, isPending: isTesting } = useTestPromptTemplate()

// 编辑模式
const isEditing = ref(false)
const editForm = ref({
  name: '',
  description: '',
  systemPrompt: '',
  userPrompt: '',
})

watch(
  () => template.value,
  (t) => {
    if (t) {
      editForm.value = {
        name: t.name,
        description: t.description || '',
        systemPrompt: t.systemPrompt,
        userPrompt: t.userPrompt,
      }
    }
  },
  { immediate: true },
)

function startEdit() {
  if (template.value) {
    editForm.value = {
      name: template.value.name,
      description: template.value.description || '',
      systemPrompt: template.value.systemPrompt,
      userPrompt: template.value.userPrompt,
    }
    isEditing.value = true
  }
}

function cancelEdit() {
  isEditing.value = false
}

function saveEdit() {
  if (!editForm.value.name.trim())
    return
  updateMutate(
    {
      id: templateId.value,
      payload: {
        name: editForm.value.name.trim(),
        description: editForm.value.description.trim(),
        systemPrompt: editForm.value.systemPrompt,
        userPrompt: editForm.value.userPrompt,
      },
    },
    {
      onSuccess: () => {
        isEditing.value = false
        ElMessage.success('保存成功')
      },
    },
  )
}

function handleActivate() {
  activateMutate(templateId.value)
}

// 测试对话框
const showTestDialog = ref(false)
const testVariables = ref<Record<string, string>>({})
const testResult = ref<{ output: string, latencyMs: number } | null>(null)

function openTest() {
  testVariables.value = {}
  testResult.value = null
  showTestDialog.value = true
}

function runTest() {
  if (!template.value)
    return
  testMutate(
    {
      systemPrompt: template.value.systemPrompt,
      userPrompt: template.value.userPrompt,
      variables: testVariables.value,
      modelConfig: template.value.modelConfig,
    },
    {
      onSuccess: (result) => {
        testResult.value = result
      },
    },
  )
}

function goBack() {
  router.push('/system/prompt-templates')
}

function getStatusTag(status: string): 'success' | 'warning' | 'info' | 'danger' {
  const map: Record<string, 'success' | 'warning' | 'info' | 'danger'> = { draft: 'warning', active: 'success', archived: 'info' }
  return map[status] || 'info'
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = { draft: '草稿', active: '使用中', archived: '已归档' }
  return map[status] || status
}

function formatTemplateVariable(name: string): string {
  return `{{${name}}}`
}
</script>

<template>
  <div class="prompt-template-detail-page">
    <div class="page-header">
      <ElButton :icon="ArrowLeft" @click="goBack">返回列表</ElButton>
      <div v-if="template" class="header-actions">
        <ElButton
          v-if="template.status !== 'active'"
          type="success"
          :icon="Check"
          :loading="isActivating"
          @click="handleActivate"
        >
          激活
        </ElButton>
        <ElButton v-if="!isEditing" type="primary" @click="startEdit">编辑</ElButton>
        <ElButton v-else @click="cancelEdit">取消编辑</ElButton>
        <ElButton type="info" @click="openTest">测试</ElButton>
      </div>
    </div>

    <ElCard v-loading="isLoading" v-if="template">
      <template #header>
        <div class="card-header">
          <h3>{{ template.name }}</h3>
          <ElTag :type="getStatusTag(template.status)">{{ getStatusLabel(template.status) }}</ElTag>
          <span class="version-tag">v{{ template.version }}</span>
        </div>
      </template>

      <!-- 基础信息 -->
      <ElDescriptions :column="2" border class="mb-4">
        <ElDescriptionsItem label="模板ID">{{ template.id }}</ElDescriptionsItem>
        <ElDescriptionsItem label="作用域">
          <ElTag>{{ template.scope === 'approval_suggestion' ? '审批建议' : template.scope }}</ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="创建者">{{ template.createdBy }}</ElDescriptionsItem>
        <ElDescriptionsItem label="创建时间">{{ template.createdAt }}</ElDescriptionsItem>
        <ElDescriptionsItem v-if="template.description" label="描述" :span="2">
          {{ template.description }}
        </ElDescriptionsItem>
      </ElDescriptions>

      <!-- System Prompt 编辑/查看 -->
      <h4 class="section-title">System Prompt</h4>
      <ElInput
        v-if="isEditing"
        v-model="editForm.systemPrompt"
        type="textarea"
        :rows="15"
        class="prompt-editor"
      />
      <pre v-else class="prompt-preview">{{ template.systemPrompt }}</pre>

      <!-- User Prompt 编辑/查看 -->
      <h4 class="section-title">User Prompt</h4>
      <ElInput
        v-if="isEditing"
        v-model="editForm.userPrompt"
        type="textarea"
        :rows="3"
        class="prompt-editor"
      />
      <pre v-else class="prompt-preview">{{ template.userPrompt }}</pre>

      <!-- 变量列表 -->
      <h4 class="section-title">
        变量 ({{ template.variables.length }})
      </h4>
      <div v-if="template.variables.length" class="variables-grid">
        <div
          v-for="v in template.variables"
          :key="v.name"
          class="variable-chip"
        >
          <code>{{ formatTemplateVariable(v.name) }}</code>
          <span class="variable-label">{{ v.label }}</span>
          <ElTag v-if="v.required" type="danger" size="small">必填</ElTag>
        </div>
      </div>
      <div v-else class="text-muted">无自定义变量</div>

      <!-- 保存按钮 -->
      <div v-if="isEditing" class="save-bar">
        <ElButton type="primary" :loading="isUpdating" @click="saveEdit">
          保存修改（版本将升为 v{{ (template.version || 0) + 1 }}）
        </ElButton>
      </div>
    </ElCard>

    <!-- 测试对话框 -->
    <ElDialog
      v-model="showTestDialog"
      title="测试 Prompt 模板"
      width="700px"
      :close-on-click-modal="false"
    >
      <template v-if="template">
        <ElAlert type="info" :closable="false" show-icon class="mb-4">
          此操作会调用真实 LLM 接口，消耗 Token 配额。
        </ElAlert>
        <h4 class="section-title">变量值</h4>
        <ElForm label-width="120px" class="mb-4">
          <ElFormItem
            v-for="v in template.variables"
            :key="v.name"
            :label="v.label"
          >
            <ElInput
              v-model="testVariables[v.name]"
              :placeholder="v.defaultValue || `请输入 ${v.label}`"
            />
          </ElFormItem>
        </ElForm>
        <ElButton type="primary" :loading="isTesting" @click="runTest">执行测试</ElButton>

        <div v-if="testResult" class="test-result mt-4">
          <h4 class="section-title">测试结果（{{ testResult.latencyMs }}ms）</h4>
          <pre class="prompt-preview test-output">{{ testResult.output }}</pre>
        </div>
      </template>
      <template #footer>
        <ElButton @click="showTestDialog = false">关闭</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.prompt-template-detail-page {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.version-tag {
  font-size: 13px;
  color: #909399;
}

.section-title {
  margin: 20px 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.prompt-editor {
  font-family: 'Cascadia Code', 'Fira Code', monospace;
  font-size: 13px;
}

.prompt-preview {
  padding: 14px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  color: #303133;
  max-height: 400px;
  overflow-y: auto;
}

.test-output {
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
}

.variables-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.variable-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #f0f2f5;
  border-radius: 8px;
  font-size: 13px;
}

.variable-chip code {
  font-family: monospace;
  color: #409eff;
  background: #ecf5ff;
  padding: 2px 6px;
  border-radius: 4px;
}

.variable-label {
  color: #606266;
}

.text-muted {
  color: #909399;
  font-size: 13px;
}

.save-bar {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.test-result {
  border-top: 1px solid #ebeef5;
}
</style>
