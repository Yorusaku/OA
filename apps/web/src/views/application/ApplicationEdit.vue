<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { ApplicationConfig } from '@/types/application'
import { useApplicationDetail, useUpdateApplication } from '@/composables/useApplication'
import { useWorkflowList } from '@/composables/useWorkflowList'
import { getFormSchemas } from '@/api/workflow'

const route = useRoute()
const router = useRouter()

const appId = computed(() => route.params.id as string)

// 获取应用详情
const { data: app, isLoading } = useApplicationDetail(appId)

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

// 更新应用
const { mutateAsync: updateApp, isPending } = useUpdateApplication()

// 初始化表单数据
onMounted(() => {
  if (app.value) {
    Object.assign(formData, {
      name: app.value.name,
      description: app.value.description,
      icon: app.value.icon,
      category: app.value.category,
      formSchemaId: app.value.formSchemaId,
      workflowId: app.value.workflowId,
      isDefault: app.value.isDefault,
      allowCustomize: app.value.allowCustomize,
      tags: app.value.tags || [],
    })
  }
})

// 监听应用数据变化
const stopWatch = computed(() => {
  if (app.value && !formData.name) {
    Object.assign(formData, {
      name: app.value.name,
      description: app.value.description,
      icon: app.value.icon,
      category: app.value.category,
      formSchemaId: app.value.formSchemaId,
      workflowId: app.value.workflowId,
      isDefault: app.value.isDefault,
      allowCustomize: app.value.allowCustomize,
      tags: app.value.tags || [],
    })
  }
  return null
})

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

// 保存
async function handleSave() {
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
    await updateApp({ id: appId.value, config: formData })
    ElMessage.success('保存成功')
    router.push(`/application/detail/${appId.value}`)
  }
  catch (error) {
    ElMessage.error('保存失败')
  }
}

// 取消
function handleCancel() {
  router.back()
}
</script>

<template>
  <div class="application-edit-page">
    <el-card v-loading="isLoading">
      <template #header>
        <div class="card-header">
          <span class="title">编辑应用</span>
        </div>
      </template>

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
        </el-form-item>

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

        <el-form-item>
          <el-button type="primary" @click="handleSave" :loading="isPending">
            保存
          </el-button>
          <el-button @click="handleCancel">
            取消
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.application-edit-page {
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

.workflow-option {
  display: flex;
  flex-direction: column;
}

.workflow-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
