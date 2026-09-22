<script setup lang="ts">
/**
 * ApprovalLaunch - 发起审批页面
 * 支持流程选择、动态表单渲染、表单缓存、提交审批等功能
 */

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import DynamicForm from '@/components/dynamic-form/DynamicForm.vue'
import { useApprovalLaunch } from './composables/useApprovalLaunch'
import type { PermissionsMap, FormSchemaField } from '@/types/form-schema'

// ==================== 常量定义 ====================
const CONSTANTS = {
  PAGE_TITLE: '发起审批',
  SELECT_WORKFLOW: '请选择审批流程',
  SUBMIT_TITLE: '提交确认',
  SUCCESS_MESSAGE: '审批提交成功',
  ERROR_MESSAGE: '提交失败,请重试',
  REQUIRED_FIELDS: '请完善必填表单内容',
}

// ==================== Composables ====================
const { 
  workflowList, 
  selectedWorkflow, 
  formSchema, 
  isWorkflowLoading,
  isSchemaLoading,
  isSubmitLoading,
  dynamicFormRef,
  drafts,
  isDraftLoading,
  showDraftPanel,
  selectWorkflow,
  handleSubmit,
  handleSuccess,
  resetForm,
  loadDrafts,
  saveDraft,
  loadDraft,
  removeDraftItem,
} = useApprovalLaunch()

const router = useRouter()

// ==================== 计算属性 ====================
// 可编辑权限 (所有字段都可编辑)
const editablePermissions = computed((): PermissionsMap => {
  if (!formSchema.value)
    return {}
  const permissions: PermissionsMap = {}
  formSchema.value.fields.forEach((field: FormSchemaField) => {
    const fieldKey = field.key || field.id
    if (fieldKey)
      permissions[fieldKey] = 'editable'
  })
  return permissions
})

// ==================== 方法 ====================
/**
 * 返回上一页
 */
const goBack = (): void => {
  router.back()
}

/**
 * 打开草稿箱抽屉并加载草稿列表
 */
const openDraftPanel = (): void => {
  showDraftPanel.value = true
  loadDrafts()
}

/**
 * 保存当前表单为草稿
 */
const handleSaveDraft = async (): Promise<void> => {
  try {
    await saveDraft()
  }
  catch {
    ElMessage.error('草稿保存失败，请重试')
  }
}

/**
 * 删除指定草稿
 */
const handleRemoveDraft = async (draft: { id: string }): Promise<void> => {
  try {
    await removeDraftItem(draft.id)
  }
  catch {
    ElMessage.error('草稿删除失败，请重试')
  }
}
</script>

<template>
  <div class="approval-launch p-6 max-w-5xl mx-auto">
    <!-- 页面标题 -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold">{{ CONSTANTS.PAGE_TITLE }}</h1>
      <p class="text-gray-500 mt-1">填写申请信息,提交审批流程</p>
    </div>

    <!-- 状态 1: 加载中 -->
    <ElSkeleton v-if="isWorkflowLoading" :rows="6" />
    
    <!-- 状态 2: 未选择流程 (空状态) -->
    <div v-else-if="!selectedWorkflow" class="workflow-selector">
      <h2 class="text-xl font-semibold mb-4">
        {{ CONSTANTS.SELECT_WORKFLOW }}
      </h2>
      
      <div class="card-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <template v-for="workflow in workflowList" :key="workflow.id">
          <div 
            class="workflow-card card border rounded-lg p-5 hover:shadow-md transition-all cursor-pointer group"
            @click="selectWorkflow(workflow)"
          >
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg">
                  {{ workflow.icon || '📋' }}
                </div>
                <h3 class="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                  {{ workflow.name }}
                </h3>
              </div>
              <ElTag 
                v-if="workflow.isDefault" 
                type="success" 
                size="small"
              >
                默认
              </ElTag>
            </div>
            
            <p class="text-gray-600 text-sm mb-4 line-clamp-2">
              {{ workflow.description }}
            </p>
            
            <div class="text-xs text-gray-400 flex items-center">
              <span>点击选择</span>
              <svg class="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 状态 3: 已选择流程,展示表单 -->
    <div v-else class="launch-form">
      <!-- 选中流程信息 -->
      <div class="selected-workflow-info mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div class="flex items-center space-x-3">
          <div class="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl">
            {{ selectedWorkflow.icon || '📋' }}
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-800">{{ selectedWorkflow.name }}</h3>
            <p class="text-sm text-gray-600">{{ selectedWorkflow.description }}</p>
          </div>
        </div>
      </div>

      <!-- 表单加载中 -->
      <ElSkeleton v-if="isSchemaLoading" :rows="8" />
      
      <!-- 表单内容 -->
      <div v-else-if="formSchema" class="form-content">
        <DynamicForm
          ref="dynamicFormRef"
          :schema="formSchema"
          :model-value="{}"
          :permissions="editablePermissions"
          :show-submit="false"
        />
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons mt-8 flex justify-between items-center">
        <ElButton @click="goBack">
          ← 返回
        </ElButton>
        
        <div class="flex gap-4">
          <ElButton @click="resetForm">
            重置
          </ElButton>
          <ElButton @click="handleSaveDraft">
            保存草稿
          </ElButton>
          <ElButton @click="openDraftPanel">
            草稿箱
          </ElButton>
          <ElButton 
            type="primary"
            class="submit-btn"
            :loading="isSubmitLoading"
            @click="handleSubmit"
          >
            {{ isSubmitLoading ? '提交中...' : '提交申请' }}
          </ElButton>
        </div>
      </div>
    </div>

    <!-- 草稿箱抽屉 -->
    <ElDrawer
      v-model="showDraftPanel"
      title="审批草稿箱"
      size="420px"
    >
      <div v-if="isDraftLoading" class="py-10 text-center text-gray-400">
        加载中...
      </div>
      <div v-else-if="!drafts.length" class="py-10 text-center text-gray-400">
        暂无草稿，可先在表单页保存草稿
      </div>
      <div v-else class="draft-list">
        <div v-for="draft in drafts" :key="draft.id" class="draft-item">
          <div class="draft-info">
            <div class="draft-title">{{ draft.title }}</div>
            <div class="draft-meta">{{ draft.workflowType || '审批单' }} · {{ draft.updatedAt }}</div>
          </div>
          <div class="draft-actions">
            <ElButton size="small" type="primary" link @click="loadDraft(draft)">
              载入
            </ElButton>
            <ElButton size="small" type="danger" link @click="handleRemoveDraft(draft)">
              删除
            </ElButton>
          </div>
        </div>
      </div>
    </ElDrawer>

    <!-- 状态 4: 错误状态 -->
    <div v-if="!isWorkflowLoading && !workflowList?.length" class="empty-state">
      <p class="text-gray-500">暂无可用的审批流程</p>
    </div>
  </div>
</template>

<style scoped>
.approval-launch {
  min-height: calc(100vh - 120px);
}

/* 卡片网格布局 */
.card-grid {
  display: grid;
  gap: 1.5rem;
}

/* 工作流卡片 */
.workflow-card {
  transition: all 0.3s ease;
  background: white;
  border: 1px solid #e5e7eb;
}

.workflow-card:hover {
  transform: translateY(-2px);
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 提交按钮 */
.submit-btn {
  min-width: 120px;
}

/* 草稿箱 */
.draft-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.draft-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.draft-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.draft-meta {
  font-size: 12px;
  color: #909399;
}
</style>
