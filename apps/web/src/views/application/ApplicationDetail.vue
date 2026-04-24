<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete } from '@element-plus/icons-vue'
import type { ApplicationCategory, ApplicationStatus } from '@/types/application'
import {
  useApplicationDetail,
  useApplicationStats,
  useApplicationVersions,
  usePublishApplication,
  useToggleApplicationStatus,
  useRollbackVersion,
} from '@/composables/useApplication'
import { useCreateTemplate } from '@/composables/useTemplate'

const route = useRoute()
const router = useRouter()

const appId = computed(() => route.params.id as string)

// 获取应用详情
const { data: app, isLoading } = useApplicationDetail(appId)

// 获取统计数据
const { data: stats } = useApplicationStats(appId)

// 获取版本历史
const { data: versions } = useApplicationVersions(appId)

// 发布应用
const { mutateAsync: publishApp } = usePublishApplication()

// 切换状态
const { mutateAsync: toggleStatus } = useToggleApplicationStatus()

// 回滚版本
const { mutateAsync: rollback } = useRollbackVersion()

// 创建模板
const { mutateAsync: createTemplate, isPending: isCreatingTemplate } = useCreateTemplate()

// 当前 Tab
const activeTab = ref('overview')

// 分享为模板对话框
const showShareDialog = ref(false)
const shareForm = reactive({
  name: '',
  description: '',
  icon: '📋',
  category: 'approval' as ApplicationCategory,
  tags: [] as string[],
  features: [] as string[],
})
const tagInput = ref('')
const featureInput = ref('')

// 编辑应用
function handleEdit() {
  router.push(`/application/edit/${appId.value}`)
}

// 发布应用
async function handlePublish() {
  try {
    await ElMessageBox.confirm(
      '确定要发布此应用吗？发布后用户即可使用。',
      '发布确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
      },
    )

    await publishApp(appId.value)
    ElMessage.success('发布成功')
  }
  catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('发布失败')
    }
  }
}

// 停用应用
async function handleDisable() {
  try {
    await ElMessageBox.confirm(
      '确定要停用此应用吗？停用后用户将无法使用。',
      '停用确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    await toggleStatus({ id: appId.value, status: 'disabled' })
    ElMessage.success('已停用')
  }
  catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

// 启用应用
async function handleEnable() {
  try {
    await toggleStatus({ id: appId.value, status: 'published' })
    ElMessage.success('已启用')
  }
  catch (error) {
    ElMessage.error('操作失败')
  }
}

// 回滚版本
async function handleRollback(versionId: string, versionName: string) {
  try {
    await ElMessageBox.confirm(
      `确定要回滚到版本 ${versionName} 吗？`,
      '回滚确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    await rollback({ applicationId: appId.value, versionId })
    ElMessage.success('回滚成功')
  }
  catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('回滚失败')
    }
  }
}

// 格式化状态
function formatStatus(status: ApplicationStatus): string {
  const map: Record<ApplicationStatus, string> = {
    draft: '草稿',
    published: '已发布',
    disabled: '已停用',
    archived: '已归档',
  }
  return map[status] || status
}

// 状态标签类型
function getStatusType(status: ApplicationStatus): 'info' | 'success' | 'warning' | 'danger' {
  const map: Record<ApplicationStatus, 'info' | 'success' | 'warning' | 'danger'> = {
    draft: 'info',
    published: 'success',
    disabled: 'warning',
    archived: 'danger',
  }
  return map[status] || 'info'
}

// 格式化分类
function formatCategory(category: ApplicationCategory): string {
  const map: Record<ApplicationCategory, string> = {
    approval: '审批类',
    hr: '人事类',
    finance: '财务类',
    admin: '行政类',
    project: '项目类',
    other: '其他',
  }
  return map[category] || category
}

// 格式化变更类型
function formatChangeType(type: 'major' | 'minor' | 'patch'): string {
  const map = {
    major: '重大更新',
    minor: '功能更新',
    patch: '修复更新',
  }
  return map[type] || type
}

// 打开分享对话框
function handleShare() {
  if (!app.value)
    return

  // 初始化表单
  shareForm.name = `${app.value.name}模板`
  shareForm.description = app.value.description || ''
  shareForm.icon = app.value.icon || '📋'
  shareForm.category = app.value.category
  shareForm.tags = [...(app.value.tags || [])]
  shareForm.features = []

  showShareDialog.value = true
}

// 添加标签
function handleAddTag() {
  const tag = tagInput.value.trim()
  if (tag && !shareForm.tags.includes(tag)) {
    shareForm.tags.push(tag)
    tagInput.value = ''
  }
}

// 删除标签
function handleRemoveTag(tag: string) {
  shareForm.tags = shareForm.tags.filter(t => t !== tag)
}

// 添加特性
function handleAddFeature() {
  const feature = featureInput.value.trim()
  if (feature && !shareForm.features.includes(feature)) {
    shareForm.features.push(feature)
    featureInput.value = ''
  }
}

// 删除特性
function handleRemoveFeature(feature: string) {
  shareForm.features = shareForm.features.filter(f => f !== feature)
}

// 提交分享
async function handleSubmitShare() {
  if (!shareForm.name.trim()) {
    ElMessage.warning('请输入模板名称')
    return
  }

  try {
    const template = await createTemplate({
      name: shareForm.name,
      description: shareForm.description,
      icon: shareForm.icon,
      category: shareForm.category,
      tags: shareForm.tags,
      features: shareForm.features,
      sourceApplicationId: appId.value,
    })

    ElMessage.success('分享成功！模板已创建')
    showShareDialog.value = false
    router.push(`/template/my`)
  }
  catch (error) {
    ElMessage.error('分享失败，请稍后重试')
  }
}
</script>

<template>
  <div class="application-detail-page">
    <el-card v-loading="isLoading">
      <!-- 头部 -->
      <template #header>
        <div class="detail-header">
          <div class="header-left">
            <span class="app-icon">{{ app?.icon }}</span>
            <div class="header-info">
              <h2 class="app-name">
                {{ app?.name }}
              </h2>
              <div class="app-meta">
                <el-tag :type="getStatusType(app?.status || 'draft')" size="small">
                  {{ formatStatus(app?.status || 'draft') }}
                </el-tag>
                <span class="meta-text">{{ formatCategory(app?.category || 'other') }}</span>
                <span class="meta-text">v{{ app?.version }}</span>
              </div>
            </div>
          </div>
          <div class="header-actions">
            <el-button :icon="Edit" @click="handleEdit">
              编辑
            </el-button>
            <el-button
              v-if="app?.status === 'published'"
              type="primary"
              @click="handleShare"
            >
              <el-icon><i-ep-share /></el-icon>
              分享为模板
            </el-button>
            <el-button
              v-if="app?.status === 'draft'"
              type="primary"
              @click="handlePublish"
            >
              发布
            </el-button>
            <el-button
              v-if="app?.status === 'published'"
              type="warning"
              @click="handleDisable"
            >
              停用
            </el-button>
            <el-button
              v-if="app?.status === 'disabled'"
              type="success"
              @click="handleEnable"
            >
              启用
            </el-button>
          </div>
        </div>
      </template>

      <!-- Tab 切换 -->
      <el-tabs v-model="activeTab">
        <!-- 概览 -->
        <el-tab-pane label="概览" name="overview">
          <div class="overview-content">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="应用名称">
                {{ app?.name }}
              </el-descriptions-item>
              <el-descriptions-item label="应用分类">
                {{ formatCategory(app?.category || 'other') }}
              </el-descriptions-item>
              <el-descriptions-item label="应用描述" :span="2">
                {{ app?.description || '暂无描述' }}
              </el-descriptions-item>
              <el-descriptions-item label="表单模板">
                {{ app?.formSchemaId }}
              </el-descriptions-item>
              <el-descriptions-item label="工作流">
                {{ app?.workflowId }}
              </el-descriptions-item>
              <el-descriptions-item label="使用次数">
                {{ app?.usageCount || 0 }} 次
              </el-descriptions-item>
              <el-descriptions-item label="审批次数">
                {{ app?.approvalCount || 0 }} 次
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">
                {{ app?.createdAt }}
              </el-descriptions-item>
              <el-descriptions-item label="更新时间">
                {{ app?.updatedAt }}
              </el-descriptions-item>
              <el-descriptions-item label="发布时间">
                {{ app?.publishedAt || '未发布' }}
              </el-descriptions-item>
              <el-descriptions-item label="发布人">
                {{ app?.publishedBy || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="应用标签" :span="2">
                <el-tag
                  v-for="tag in app?.tags"
                  :key="tag"
                  size="small"
                  type="info"
                  effect="plain"
                  class="mr-2"
                >
                  {{ tag }}
                </el-tag>
                <span v-if="!app?.tags || app.tags.length === 0">-</span>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </el-tab-pane>

        <!-- 统计 -->
        <el-tab-pane label="统计" name="stats">
          <div class="stats-content">
            <el-row :gutter="20">
              <el-col :span="6">
                <el-statistic title="总提交数" :value="stats?.totalSubmissions || 0" />
              </el-col>
              <el-col :span="6">
                <el-statistic title="待审批" :value="stats?.pendingCount || 0" />
              </el-col>
              <el-col :span="6">
                <el-statistic title="已通过" :value="stats?.approvedCount || 0" />
              </el-col>
              <el-col :span="6">
                <el-statistic title="已驳回" :value="stats?.rejectedCount || 0" />
              </el-col>
            </el-row>

            <el-divider />

            <el-row :gutter="20">
              <el-col :span="12">
                <el-statistic
                  title="平均处理时长"
                  :value="stats?.avgProcessTime || 0"
                  suffix="小时"
                  :precision="1"
                />
              </el-col>
              <el-col :span="12">
                <el-statistic
                  title="平均审批时长"
                  :value="stats?.avgApprovalTime || 0"
                  suffix="小时"
                  :precision="1"
                />
              </el-col>
            </el-row>

            <el-divider />

            <div class="stats-section">
              <h4>活跃用户</h4>
              <el-statistic :value="stats?.activeUsers || 0" suffix="人" />
            </div>

            <el-divider />

            <div class="stats-section">
              <h4>高频申请人 TOP 3</h4>
              <el-table
                :data="stats?.topApplicants || []"
                stripe
                style="width: 100%"
              >
                <el-table-column prop="userName" label="姓名" />
                <el-table-column prop="count" label="申请次数" width="120" />
              </el-table>
            </div>
          </div>
        </el-tab-pane>

        <!-- 版本历史 -->
        <el-tab-pane label="版本历史" name="versions">
          <div class="versions-content">
            <el-timeline>
              <el-timeline-item
                v-for="version in versions"
                :key="version.id"
                :timestamp="version.createdAt"
                placement="top"
              >
                <el-card>
                  <div class="version-header">
                    <div class="version-info">
                      <h4>{{ version.versionName }}</h4>
                      <el-tag
                        v-if="version.isCurrent"
                        type="success"
                        size="small"
                      >
                        当前版本
                      </el-tag>
                      <el-tag
                        :type="version.changeType === 'major' ? 'danger' : version.changeType === 'minor' ? 'warning' : 'info'"
                        size="small"
                      >
                        {{ formatChangeType(version.changeType || 'patch') }}
                      </el-tag>
                    </div>
                    <el-button
                      v-if="!version.isCurrent"
                      type="primary"
                      size="small"
                      @click="handleRollback(version.id, version.versionName)"
                    >
                      回滚到此版本
                    </el-button>
                  </div>
                  <p class="version-changelog">
                    {{ version.changeLog || '无变更说明' }}
                  </p>
                  <div class="version-meta">
                    <span>创建人：{{ version.createdBy }}</span>
                    <span>发布时间：{{ version.publishedAt || '未发布' }}</span>
                  </div>
                </el-card>
              </el-timeline-item>
            </el-timeline>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 分享为模板对话框 -->
    <el-dialog
      v-model="showShareDialog"
      title="分享为模板"
      width="600px"
    >
      <el-form :model="shareForm" label-width="100px">
        <el-form-item label="模板名称" required>
          <el-input
            v-model="shareForm.name"
            placeholder="请输入模板名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="模板描述">
          <el-input
            v-model="shareForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入模板描述"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="模板图标">
          <el-input
            v-model="shareForm.icon"
            placeholder="输入 emoji 图标"
            style="width: 200px"
          />
        </el-form-item>

        <el-form-item label="模板分类" required>
          <el-select v-model="shareForm.category" placeholder="请选择分类">
            <el-option label="审批类" value="approval" />
            <el-option label="人事类" value="hr" />
            <el-option label="财务类" value="finance" />
            <el-option label="行政类" value="admin" />
            <el-option label="项目类" value="project" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>

        <el-form-item label="模板标签">
          <div class="tag-input-wrapper">
            <el-tag
              v-for="tag in shareForm.tags"
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

        <el-form-item label="功能特性">
          <div class="feature-input-wrapper">
            <div
              v-for="(feature, index) in shareForm.features"
              :key="index"
              class="feature-item"
            >
              <span>{{ feature }}</span>
              <el-button
                text
                type="danger"
                size="small"
                @click="handleRemoveFeature(feature)"
              >
                删除
              </el-button>
            </div>
            <div class="feature-input">
              <el-input
                v-model="featureInput"
                placeholder="输入功能特性后回车"
                @keyup.enter="handleAddFeature"
              />
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showShareDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="isCreatingTemplate"
          @click="handleSubmitShare"
        >
          确定分享
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.application-detail-page {
  padding: 20px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-icon {
  font-size: 48px;
  line-height: 1;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.app-name {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.app-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.meta-text {
  font-size: 14px;
  color: #606266;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.overview-content {
  padding: 20px 0;
}

.stats-content {
  padding: 20px 0;
}

.stats-section {
  margin-bottom: 24px;
}

.stats-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.versions-content {
  padding: 20px 0;
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.version-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.version-info h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.version-changelog {
  margin: 12px 0;
  color: #606266;
  line-height: 1.6;
}

.version-meta {
  display: flex;
  gap: 24px;
  font-size: 13px;
  color: #909399;
}

.tag-input-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.feature-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feature-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.feature-input {
  margin-top: 8px;
}
</style>
