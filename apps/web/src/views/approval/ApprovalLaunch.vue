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
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { DynamicForm } from '@/components/dynamic-form'
import { useWorkflowList } from '@/composables/useWorkflow'

const router = useRouter()

const currentStep = ref(1)

console.log('_approval Launch mounted_')

const { data: workflows, isLoading, error } = useWorkflowList({ page: 1, pageSize: 100 })

console.log('_workflows data_:')
console.log(workflows.value)

const selectedWorkflowId = ref('')

const selectedWorkflow = computed(() => {
  const wf = workflows.value?.list?.find(w => w.id === selectedWorkflowId.value)
  console.log('_selectedWorkflow computed_:')
  console.log(wf)
  return wf
})

// 监听 selectedWorkflowId 变化
watch(selectedWorkflowId, (newId, oldId) => {
  console.log('_selectedWorkflowId changed_:', { oldId, newId })
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
  console.log('_currentFormSchema computed_:')
  console.log({
    selectedWorkflowId: selectedWorkflowId.value,
    formSchemaId: selectedWorkflow.value?.formSchemaId,
    exist: !!selectedWorkflow.value?.formSchemaId,
  })
  if (!selectedWorkflow.value?.formSchemaId)
    return null
  const schema = mockFormSchemas[selectedWorkflow.value.formSchemaId]
  console.log('found schema:', schema)
  return schema || null
})

// 监听 currentFormSchema 变化
watch(currentFormSchema, (newVal, oldVal) => {
  console.log('_currentFormSchema changed_:', { oldVal, newVal })
})

const formData = ref({})
console.log('_formData initialized_')

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
  <div class="p-6 max-w-3xl mx-auto">
    <ElCard>
      <template #header>
        <h2 class="text-lg font-semibold text-gray-800">发起审批</h2>
      </template>

      <!-- 调试信息 -->
      <div class="mb-4 p-3 bg-blue-50 rounded text-xs text-blue-800 font-mono">
        <p>DEBUG: currentStep={{ currentStep }}</p>
        <p>DEBUG: selectedWorkflowId={{ selectedWorkflowId }}</p>
        <p>DEBUG: selectedWorkflow={{ selectedWorkflow ? JSON.stringify({id: selectedWorkflow.id, name: selectedWorkflow.name, formSchemaId: selectedWorkflow.formSchemaId}) : 'null' }}</p>
        <p>DEBUG: currentFormSchema={{ currentFormSchema ? 'exists' : 'null' }}</p>
      </div>

      <ElSteps :active="currentStep" class="mb-6">
        <ElStep title="选择流程" description="选择要发起的审批流程" />
        <ElStep title="填写表单" description="填写审批表单内容" />
        <ElStep title="提交确认" description="确认信息并提交" />
      </ElSteps>

      <div v-show="currentStep === 1" class="step-content min-h-[400px] py-6">
        <div class="mb-6">
          <label class="block mb-2 text-sm text-gray-600">选择审批流程</label>
          <ElSelect
            v-model="selectedWorkflowId"
            placeholder="请选择流程"
            class="w-96"
          >
            <ElOption
              v-for="wf in workflows?.list"
              :key="wf.id"
              :label="wf.name"
              :value="wf.id"
            >
              <div class="flex flex-col gap-1">
                <span>{{ wf.name }}</span>
                <span class="text-xs text-gray-500">{{ wf.description }}</span>
              </div>
            </ElOption>
          </ElSelect>
        </div>

        <div v-if="selectedWorkflow" class="mt-6 p-4 bg-gray-50 rounded border border-gray-100">
          <h4 class="font-semibold text-gray-800 mb-3">流程信息</h4>
          <p class="text-sm text-gray-600"><strong>名称：</strong>{{ selectedWorkflow.name }}</p>
          <p class="text-sm text-gray-600"><strong>描述：</strong>{{ selectedWorkflow.description }}</p>
          <p class="text-sm text-gray-600"><strong>绑定表单：</strong>{{ selectedWorkflow.formSchemaId || '未绑定' }}</p>
        </div>
      </div>

      <div v-show="currentStep === 2" class="step-content min-h-[400px] py-6">
        <div v-if="!selectedWorkflow" class="flex items-center justify-center h-75 text-gray-500">
          <p>请先选择流程</p>
        </div>
        <div v-else-if="!selectedWorkflow.formSchemaId" class="flex items-center justify-center h-75 text-orange-500">
          <p>该流程未绑定表单 Schema</p>
        </div>
        <div v-else-if="!currentFormSchema" class="flex items-center justify-center h-75 text-red-500">
          <p>未找到对应的表单 Schema: {{ selectedWorkflow.formSchemaId }}</p>
        </div>
        <DynamicForm
          v-else
          v-model="formData"
          :schema="currentFormSchema"
        />
      </div>

      <div v-show="currentStep === 3" class="step-content min-h-[400px] py-6">
        <div class="mb-4">
          <h4 class="font-semibold text-gray-800 mb-4">请确认以下信息</h4>
          <ElCard shadow="never" class="bg-gray-50">
            <pre class="m-0 p-4 text-sm text-gray-600 max-h-100 overflow-auto">{{ JSON.stringify(formData, null, 2) }}</pre>
          </ElCard>
        </div>
      </div>

      <div class="mt-6 pt-6 border-t border-gray-200 flex justify-center gap-4">
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
      <div class="text-center py-6">
        <p class="mb-2">您的审批申请已提交</p>
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
</style>
