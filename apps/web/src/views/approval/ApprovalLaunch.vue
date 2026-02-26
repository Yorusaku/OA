<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus' // 🚀 仅保留函数式 API 导入，绝不手动导入组件！
import { DynamicForm } from '@/components/dynamic-form'
import { useWorkflowList } from '@/composables/useWorkflow'
import type { FormSchema } from '@/types/form-schema'

const router = useRouter()
const currentStep = ref(1)

const { data: workflows } = useWorkflowList({ page: 1, pageSize: 100 })
const selectedWorkflowId = ref('')

const selectedWorkflow = computed(() => {
  return workflows.value?.list?.find(w => w.id === selectedWorkflowId.value)
})

// 🚀 修复点：Key 必须与 mockWorkflows 中的 formSchemaId 完全一致
const mockFormSchemas: Record<string, FormSchema> = {
  'leave': {
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
  'expense': {
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
  if (!selectedWorkflow.value?.formSchemaId) return null
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
  } else {
    submitDialogVisible.value = true
  }
}

function handleBack() {
  if (currentStep.value === 2) {
    currentStep.value--
  } else {
    router.back()
  }
}

function handleSubmit() {
  ElMessage.success('提交成功！')
  submitDialogVisible.value = false
  router.push('/approval/mine')
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto h-full flex flex-col">
    <el-card class="flex-1 shadow-sm border-gray-200" shadow="never">
      <template #header>
        <h2 class="m-0 text-lg font-bold text-gray-800">发起审批</h2>
      </template>

      <el-steps :active="currentStep" class="mb-8 px-4" finish-status="success">
        <el-step title="选择流程" description="选择要发起的审批流程" />
        <el-step title="填写表单" description="填写审批表单内容" />
        <el-step title="提交确认" description="确认信息并提交" />
      </el-steps>

      <div class="min-h-[400px] py-4">
        <div v-show="currentStep === 1">
          <div class="mb-6">
            <label class="block mb-2 text-sm text-gray-600 font-medium">选择审批流程</label>
            <el-select
              v-model="selectedWorkflowId"
              placeholder="请选择流程"
              class="w-[400px]"
            >
              <el-option
                v-for="wf in workflows?.list"
                :key="wf.id"
                :label="wf.name"
                :value="wf.id"
              >
                <div class="flex flex-col gap-1 py-1">
                  <span class="font-medium leading-none">{{ wf.name }}</span>
                  <span class="text-xs text-gray-400 leading-none">{{ wf.description }}</span>
                </div>
              </el-option>
            </el-select>
          </div>

          <div v-if="selectedWorkflow" class="mt-6 p-4 bg-gray-50 rounded border border-gray-100">
            <h4 class="m-0 mb-3 text-gray-800 font-bold">流程信息</h4>
            <div class="flex flex-col gap-2 text-sm text-gray-600">
              <p class="m-0"><strong>名称：</strong> {{ selectedWorkflow.name }}</p>
              <p class="m-0"><strong>描述：</strong> {{ selectedWorkflow.description }}</p>
              <p class="m-0"><strong>绑定表单：</strong> <el-tag size="small" type="info">{{ selectedWorkflow.formSchemaId || '未绑定' }}</el-tag></p>
            </div>
          </div>
        </div>

        <div v-show="currentStep === 2">
          <div v-if="currentFormSchema" class="bg-gray-50 p-6 rounded border border-gray-100">
            <DynamicForm
              v-model="formData"
              :schema="currentFormSchema"
            />
          </div>
          <div v-else class="flex items-center justify-center h-[300px] text-gray-400">
            <p>该流程未配置表单 Schema 或未找到匹配项</p>
          </div>
        </div>

        <div v-show="currentStep === 3">
          <h4 class="m-0 mb-4 text-gray-800 font-bold">请确认以下信息</h4>
          <div class="bg-gray-50 p-4 rounded border border-gray-100 max-h-[400px] overflow-auto">
            <pre class="m-0 text-xs text-gray-600 whitespace-pre-wrap">{{ JSON.stringify(formData, null, 2) }}</pre>
          </div>
        </div>
      </div>

      <div class="mt-6 pt-6 border-t border-gray-100 flex justify-center gap-4">
        <el-button class="w-24" @click="handleBack">
          {{ currentStep === 1 ? '取 消' : '上一步' }}
        </el-button>
        <el-button type="primary" class="w-24" @click="handleNext">
          {{ currentStep === 3 ? '提 交' : '下一步' }}
        </el-button>
      </div>
    </el-card>

    <el-dialog
      v-model="submitDialogVisible"
      title="提交成功"
      width="400px"
      center
    >
      <div class="text-center py-6">
        <p class="text-lg text-gray-800 font-medium mb-2">🎉 您的审批申请已提交</p>
        <p class="text-sm text-gray-500">您可以在"我的申请"中查看审批进度</p>
      </div>
      <template #footer>
        <el-button type="primary" class="w-full" @click="handleSubmit">
          查看我的申请
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* Tailwind 完全接管，零自定义 CSS！ */
</style>
