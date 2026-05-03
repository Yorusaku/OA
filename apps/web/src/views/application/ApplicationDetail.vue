<script setup lang="ts">
import { Edit } from '@element-plus/icons-vue'
import { useApplicationDetailPage } from './composables/useApplicationDetailPage'

const {
  app,
  isLoading,
  stats,
  versions,
  activeTab,
  showShareDialog,
  shareForm,
  tagInput,
  featureInput,
  isCreatingTemplate,
  handleEdit,
  handlePublish,
  handleDisable,
  handleEnable,
  handleRollback,
  formatStatus,
  getStatusType,
  formatCategory,
  formatChangeType,
  handleShare,
  handleAddTag,
  handleRemoveTag,
  handleAddFeature,
  handleRemoveFeature,
  handleSubmitShare,
} = useApplicationDetailPage()
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
