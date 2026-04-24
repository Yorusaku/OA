<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { ApplicationCategory, ApplicationConfig } from '@/types/application'
import { useCreateApplication } from '@/composables/useApplication'
import { useWorkflowList } from '@/composables/useWorkflowList'
import { getFormSchemas } from '@/api/workflow'

const router = useRouter()

// 当前步骤
const currentStep = ref(0)

// 表单数据
const formData = reactive<ApplicationConfig>({
  name: '',
  description: '',
  icon: '📋',
  category: 'approval',
  formSchemaId: '',
  workflowId: '',
  isDefault: false,
  allowCustomize: false,
  tags: [],
})

// 图标选项
const iconOptions = [
  '📋', '🏖️', '💰', '🛒', '⏰', '📄', '📝', '💼',
  '🎯', '📊', '📈', '🔔', '✅', '⚙️', '🔧', '📦',
]

// 分类选项
const categoryOptions = [
  { label: '审批类', value: 'approval' },
  { label: '人事类', value: 'hr' },
  { label: '财务类', value: 'finance' },
  { label: '行政类', value: 'admin' },
  { label: '项目类', value: 'project' },
  { label: '其他', value: 'other' },
]

// 标签输入
const tagInput = ref('')

// 获取表单模板列表
const formSchemas = ref<Array<{ id: string, name: string }>>([])
getFormSchemas().then((data) => {
  formSchemas.value = data
})

// 获取工作流列表
const { data: workflowsData } = useWorkflowList(ref({ page: 1, pageSize: 100 }))
const workflows = computed(() => workflowsData.value?.list || [])

// 创建应用
const { mutateAsync: createApp, isPending } = useCreateApplication()

// 添加标签
function handleAddTag() {
  const tag = tagInput.value.trim()
  if (tag && !formData.tags?.includes(tag)) {
    if (!formData.tags) {
      formData.tags = []
    }
    formData.tags.push(tag)
    tagInput.value = ''
  }
}

// 删除标签
function handleRemoveTag(tag: string) {
  if (formData.tags) {
    formData.tags = formData.tags.filter(t => t !== tag)
  }
}

// 下一步
function handleNext() {
  if (currentStep.value === 0) {
    // 验证基本信息
    if (!formData.name.trim()) {
      ElMessage.warning('请输入应用名称')
      return
    }
    if (!formData.category) {
      ElMessage.warning('请选择应用分类')
      return
    }
  }
  else if (currentStep.value === 1) {
    // 验证表单选择
    if (!formData.formSchemaId) {
      ElMessage.warning('请选择表单模板')
      return
    }
  }

  if (currentStep.value < 2) {
    currentStep.value++
  }
}

// 上一步
function handlePrev() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// 保存草稿
async function handleSaveDraft() {
  if (!formData.name.trim()) {
    ElMessage.warning('请输入应用名称')
    return
  }
  if (!formData.formSchemaId) {
    ElMessage.warning('请选择表单模板')
    return
  }
  if (!formData.workflowId) {
    ElMessage.warning('请选择工作流')
    return
  }

  try {
    const app = await createApp(formData)
    ElMessage.success('保存成功')
    router.push(`/application/detail/${app.id}`)
  }
  catch (error) {
    ElMessage.error('保存失败')
  }
}

// 完成创建
async function handleFinish() {
  if (!formData.name.trim()) {
    ElMessage.warning('请输入应用名称')
    return
  }
  if (!formData.formSchemaId) {
    ElMessage.warning('请选择表单模板')
    return
  }
  if (!formData.workflowId) {
    ElMessage.warning('请选择工作流')
    return
  }

  try {
    const app = await createApp(formData)
    ElMessage.success('创建成功')
    router.push(`/application/detail/${app.id}`)
  }
  catch (error) {
    ElMessage.error('创建失败')
  }
}

// 取消
function handleCancel() {
  router.back()
}
</script>

<template>
  <div class="application-create-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">创建应用</span>
        </div>
      </template>

      <!-- 步骤条 -->
      <el-steps :active="currentStep" finish-status="success" class="mb-8">
        <el-step title="基本信息" />
        <el-step title="选择表单" />
        <el-step title="配置流程" />
      </el-steps>

      <!-- 步骤 1: 基本信息 -->
      <div v-show="currentStep === 0" class="step-content">
        <el-form :model="formData" label-width="120px">
          <el-form-item label="应用名称" required>
            <el-input
              v-model="formData.name"
              placeholder="请输入应用名称"
              maxlength="50"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="应用描述">
            <el-input
              v-model="formData.description"
              type="textarea"
              :rows="3"
              placeholder="请输入应用描述"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="应用图标">
            <div class="icon-selector">
              <div
                v-for="icon in iconOptions"
                :key="icon"
                class="icon-item"
                :class="{ active: formData.icon === icon }"
                @click="formData.icon = icon"
              >
                {{ icon }}
              </div>
            </div>
          </el-form-item>

          <el-form-item label="应用分类" required>
            <el-select v-model="formData.category" placeholder="请选择分类">
              <el-option
                v-for="item in categoryOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="应用标签">
            <div class="tag-input-wrapper">
              <el-tag
                v-for="tag in formData.tags"
                :key="tag"
                closable
                @close="handleRemoveTag(tag)"
              >
                {{ tag }}
              </el-tag>
              <el-input
                v-model="tagInput"
                size="small"
                placeholder="输入标签后回车"
                style="width: 120px"
                @keyup.enter="handleAddTag"
              />
            </div>
          </el-form-item>

          <el-form-item label="设为默认">
            <el-switch v-model="formData.isDefault" />
            <span class="form-tip">默认应用会在发起审批时优先展示</span>
          </el-form-item>

          <el-form-item label="允许自定义">
            <el-switch v-model="formData.allowCustomize" />
            <span class="form-tip">允许用户在使用时自定义表单字段</span>
          </el-form-item>
        </el-form>
      </div>

      <!-- 步骤 2: 选择表单 -->
      <div v-show="currentStep === 1" class="step-content">
        <el-form :model="formData" label-width="120px">
          <el-form-item label="表单模板" required>
            <el-select
              v-model="formData.formSchemaId"
              placeholder="请选择表单模板"
              style="width: 100%"
            >
              <el-option
                v-for="schema in formSchemas"
                :key="schema.id"
                :label="schema.name"
                :value="schema.id"
              />
            </el-select>
            <div class="form-tip">
              选择一个表单模板作为应用的数据收集表单
            </div>
          </el-form-item>
        </el-form>

        <div v-if="formData.formSchemaId" class="preview-section">
          <div class="preview-title">
            表单预览
          </div>
          <div class="preview-content">
            <el-alert
              type="info"
              :closable="false"
              show-icon
            >
              已选择表单：{{ formSchemas.find(s => s.id === formData.formSchemaId)?.name }}
            </el-alert>
          </div>
        </div>
      </div>

      <!-- 步骤 3: 配置流程 -->
      <div v-show="currentStep === 2" class="step-content">
        <el-form :model="formData" label-width="120px">
          <el-form-item label="工作流" required>
            <el-select
              v-model="formData.workflowId"
              placeholder="请选择工作流"
              style="width: 100%"
            >
              <el-option
                v-for="workflow in workflows"
                :key="workflow.id"
                :label="workflow.name"
                :value="workflow.id"
              >
                <div class="workflow-option">
                  <span>{{ workflow.name }}</span>
                  <span class="workflow-desc">{{ workflow.description }}</span>
                </div>
              </el-option>
            </el-select>
            <div class="form-tip">
              选择一个工作流作为应用的审批流程
            </div>
          </el-form-item>
        </el-form>

        <div v-if="formData.workflowId" class="preview-section">
          <div class="preview-title">
            流程预览
          </div>
          <div class="preview-content">
            <el-alert
              type="info"
              :closable="false"
              show-icon
            >
              已选择工作流：{{ workflows.find(w => w.id === formData.workflowId)?.name }}
            </el-alert>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="step-actions">
        <el-button v-if="currentStep > 0" @click="handlePrev">
          上一步
        </el-button>
        <el-button v-if="currentStep < 2" type="primary" @click="handleNext">
          下一步
        </el-button>
        <el-button v-if="currentStep === 2" @click="handleSaveDraft" :loading="isPending">
          保存草稿
        </el-button>
        <el-button v-if="currentStep === 2" type="primary" @click="handleFinish" :loading="isPending">
          完成创建
        </el-button>
        <el-button @click="handleCancel">
          取消
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.application-create-page {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 18px;
  font-weight: 600;
}

.step-content {
  min-height: 400px;
  padding: 20px 0;
}

.icon-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.icon-item {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.icon-item:hover {
  border-color: #409eff;
  transform: scale(1.1);
}

.icon-item.active {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.tag-input-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.form-tip {
  margin-left: 12px;
  font-size: 13px;
  color: #909399;
}

.preview-section {
  margin-top: 24px;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.preview-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #303133;
}

.preview-content {
  padding: 12px;
  background-color: #fff;
  border-radius: 4px;
}

.workflow-option {
  display: flex;
  flex-direction: column;
}

.workflow-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.step-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e4e7ed;
}
</style>
