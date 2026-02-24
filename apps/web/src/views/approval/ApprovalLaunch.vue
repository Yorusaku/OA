<script setup lang="ts">
import type { FormSchema } from '@/types/form-schema'
import {
  ElButton,
  ElCard,
  ElDialog,
  ElMessage,
  ElOption,
  ElSelect,
  ElStep,
  ElSteps,
} from 'element-plus'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { DynamicForm } from '@/components/dynamic-form'
import { useWorkflowList } from '@/composables/useWorkflow'

const router = useRouter()

const currentStep = ref(1)

const { data: workflows } = useWorkflowList({ page: 1, pageSize: 100 })
const selectedWorkflowId = ref('')

const selectedWorkflow = computed(() => {
  return workflows.value?.list?.find(w => w.id === selectedWorkflowId.value)
})

const mockFormSchemas: Record<string, FormSchema> = {
  'leave-form': {
    fields: [
      { key: 'applicant', label: '申请人', type: 'input', required: true, span: 12 },
      { key: 'department', label: '部门', type: 'select', required: true, span: 12, options: [
        { label: '技术部', value: 'tech' },
        { label: '产品部', value: 'product' },
        { label: '运营部', value: 'operation' },
      ] },
      { key: 'leaveType', label: '请假类型', type: 'select', required: true, span: 12, options: [
        { label: '事假', value: 'personal' },
        { label: '病假', value: 'sick' },
        { label: '年假', value: 'annual' },
      ] },
      { key: 'startDate', label: '开始日期', type: 'date', required: true, span: 12 },
      { key: 'endDate', label: '结束日期', type: 'date', required: true, span: 12 },
      { key: 'days', label: '请假天数', type: 'number', required: true, span: 12 },
      { key: 'reason', label: '请假事由', type: 'textarea', required: true, span: 24 },
    ],
    labelWidth: '100px',
  },
  'expense-form': {
    fields: [
      { key: 'applicant', label: '申请人', type: 'input', required: true, span: 12 },
      { key: 'department', label: '部门', type: 'select', required: true, span: 12, options: [
        { label: '技术部', value: 'tech' },
        { label: '产品部', value: 'product' },
        { label: '运营部', value: 'operation' },
      ] },
      { key: 'expenseType', label: '费用类型', type: 'select', required: true, span: 12, options: [
        { label: '差旅费', value: 'travel' },
        { label: '招待费', value: 'entertainment' },
        { label: '办公用品', value: 'supplies' },
      ] },
      { key: 'amount', label: '金额', type: 'number', required: true, span: 12 },
      { key: 'description', label: '费用说明', type: 'textarea', required: true, span: 24 },
    ],
    labelWidth: '100px',
  },
}

const currentFormSchema = computed(() => {
  if (!selectedWorkflow.value?.formSchemaId)
    return null
  return mockFormSchemas[selectedWorkflow.value.formSchemaId] || null
})

const formData = ref({})

const submitDialogVisible = ref(false)

function handleNext() {
  if (currentStep.value === 1) {
    if (!selectedWorkflowId.value) {
      ElMessage.warning('请选择流程')
      return
    }
    currentStep.value++
  }
  else {
    submitDialogVisible.value = true
  }
}

function handleBack() {
  if (currentStep.value === 2) {
    currentStep.value--
  }
  else {
    router.back()
  }
}

function handleSubmit() {
  console.log('提交审批:', {
    workflowId: selectedWorkflowId.value,
    formData: formData.value,
  })
  ElMessage.success('提交成功！')
  submitDialogVisible.value = false
  router.push('/approval/mine')
}
</script>

<template>
  <div class="approval-launch">
    <ElCard>
      <template #header>
        <div class="card-header">
          <h2>发起审批</h2>
        </div>
      </template>

      <ElSteps :active="currentStep" class="mb-6">
        <ElStep title="选择流程" description="选择要发起的审批流程" />
        <ElStep title="填写表单" description="填写审批表单内容" />
        <ElStep title="提交确认" description="确认信息并提交" />
      </ElSteps>

      <div v-show="currentStep === 1" class="step-content">
        <div class="form-section">
          <label class="section-label">选择审批流程</label>
          <ElSelect
            v-model="selectedWorkflowId"
            placeholder="请选择流程"
            style="width: 400px"
          >
            <ElOption
              v-for="wf in workflows?.list"
              :key="wf.id"
              :label="wf.name"
              :value="wf.id"
            >
              <div class="option-content">
                <span>{{ wf.name }}</span>
                <span class="option-desc">{{ wf.description }}</span>
              </div>
            </ElOption>
          </ElSelect>
        </div>

        <div v-if="selectedWorkflow" class="workflow-info">
          <h4>流程信息</h4>
          <p><strong>名称：</strong>{{ selectedWorkflow.name }}</p>
          <p><strong>描述：</strong>{{ selectedWorkflow.description }}</p>
          <p><strong>绑定表单：</strong>{{ selectedWorkflow.formSchemaId || '未绑定' }}</p>
        </div>
      </div>

      <div v-show="currentStep === 2" class="step-content">
        <DynamicForm
          v-if="currentFormSchema"
          v-model="formData"
          :schema="currentFormSchema"
        />
        <div v-else class="empty-state">
          <p>该流程未配置表单 Schema</p>
        </div>
      </div>

      <div v-show="currentStep === 3" class="step-content">
        <div class="confirm-section">
          <h4>请确认以下信息</h4>
          <ElCard shadow="never" class="confirm-data">
            <pre>{{ JSON.stringify(formData, null, 2) }}</pre>
          </ElCard>
        </div>
      </div>

      <div class="actions">
        <ElButton @click="handleBack">
          {{ currentStep === 1 ? '取消' : '上一步' }}
        </ElButton>
        <ElButton type="primary" @click="handleNext">
          {{ currentStep === 3 ? '提交' : '下一步' }}
        </ElButton>
      </div>
    </ElCard>

    <ElDialog
      v-model="submitDialogVisible"
      title="提交成功"
      width="400px"
    >
      <div class="success-content">
        <p>您的审批申请已提交</p>
        <p class="text-sm text-gray-500">
          您可以在"我的申请"中查看审批进度
        </p>
      </div>
      <template #footer>
        <ElButton @click="submitDialogVisible = false; router.push('/approval/mine')">
          查看我的申请
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.approval-launch {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.card-header h2 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.step-content {
  min-height: 400px;
  padding: 20px 0;
}

.form-section {
  margin-bottom: 24px;
}

.section-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
}

.option-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.option-desc {
  font-size: 12px;
  color: #909399;
}

.workflow-info {
  margin-top: 24px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
}

.workflow-info h4 {
  margin: 0 0 12px 0;
  color: #303133;
}

.workflow-info p {
  margin: 8px 0;
  font-size: 14px;
  color: #606266;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #909399;
}

.confirm-section h4 {
  margin: 0 0 16px 0;
  color: #303133;
}

.confirm-data {
  background: #f5f7fa;
}

.confirm-data pre {
  margin: 0;
  padding: 16px;
  font-size: 13px;
  color: #606266;
  max-height: 400px;
  overflow: auto;
}

.actions {
  margin-top: 24px;
  display: flex;
  justify-content: center;
  gap: 16px;
  padding-top: 24px;
  border-top: 1px solid #ebeef5;
}

.success-content {
  text-align: center;
  padding: 20px;
}

.success-content p {
  margin: 8px 0;
}
</style>
