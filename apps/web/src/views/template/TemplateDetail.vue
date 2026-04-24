<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  useTemplateDetail,
  useTemplateReviews,
  useInstallTemplate,
  useCreateTemplateReview,
  useLikeTemplateReview,
} from '@/composables/useTemplate'

const route = useRoute()
const router = useRouter()

const templateId = computed(() => route.params.id as string)

// 获取模板详情
const { data: template, isLoading } = useTemplateDetail(templateId)

// 获取评论列表
const reviewPage = ref(1)
const { data: reviewsData } = useTemplateReviews(templateId, reviewPage)
const reviews = computed(() => reviewsData.value?.list || [])
const reviewTotal = computed(() => reviewsData.value?.total || 0)

// 安装模板
const { mutateAsync: installTemplate, isPending: isInstalling } = useInstallTemplate()

// 创建评论
const { mutateAsync: createReview, isPending: isSubmittingReview } = useCreateTemplateReview()

// 点赞评论
const { mutateAsync: likeReview } = useLikeTemplateReview()

// 当前 Tab
const activeTab = ref('overview')

// 评论表单
const reviewForm = ref({
  rating: 5,
  content: '',
})
const showReviewDialog = ref(false)

// 安装模板
async function handleInstall() {
  if (!template.value)
    return

  try {
    const record = await installTemplate({ templateId: template.value.id })
    ElMessage.success(`模板"${template.value.name}"安装成功！`)
    router.push(`/application/detail/${record.applicationId}`)
  }
  catch (error) {
    ElMessage.error('安装失败，请稍后重试')
  }
}

// 提交评论
async function handleSubmitReview() {
  if (!reviewForm.value.content.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }

  try {
    await createReview({
      templateId: templateId.value,
      rating: reviewForm.value.rating,
      content: reviewForm.value.content,
    })
    ElMessage.success('评论成功')
    showReviewDialog.value = false
    reviewForm.value = { rating: 5, content: '' }
  }
  catch (error) {
    ElMessage.error('评论失败，请稍后重试')
  }
}

// 点赞评论
async function handleLikeReview(reviewId: string) {
  try {
    await likeReview(reviewId)
  }
  catch (error) {
    ElMessage.error('操作失败')
  }
}

// 评论分页变化
function handleReviewPageChange(page: number) {
  reviewPage.value = page
}
</script>

<template>
  <div class="template-detail-page">
    <el-card v-loading="isLoading">
      <template #header>
        <div class="card-header">
          <el-button text @click="router.back()">
            <el-icon><i-ep-arrow-left /></el-icon>
            返回
          </el-button>
        </div>
      </template>

      <div v-if="template" class="template-detail">
        <div class="template-header">
          <div class="template-icon">
            {{ template.icon }}
          </div>
          <div class="template-info">
            <h1 class="template-name">
              {{ template.name }}
            </h1>
            <div class="template-meta">
              <el-tag type="info">
                {{ template.category }}
              </el-tag>
              <span class="meta-item">
                <el-icon><i-ep-user /></el-icon>
                {{ template.author }}
              </span>
              <span class="meta-item">
                <el-icon><i-ep-download /></el-icon>
                {{ template.downloads }} 次安装
              </span>
              <span class="meta-item">
                <el-icon><i-ep-star-filled /></el-icon>
                {{ template.rating.toFixed(1) }} ({{ template.reviewCount }} 评论)
              </span>
            </div>
            <div class="template-description">
              {{ template.description }}
            </div>
            <div class="template-tags">
              <el-tag
                v-for="tag in template.tags"
                :key="tag"
                type="info"
                effect="plain"
              >
                {{ tag }}
              </el-tag>
            </div>
          </div>
          <div class="template-actions">
            <el-button
              type="primary"
              size="large"
              :loading="isInstalling"
              @click="handleInstall"
            >
              <el-icon><i-ep-download /></el-icon>
              安装模板
            </el-button>
          </div>
        </div>

        <el-tabs v-model="activeTab" class="template-tabs">
          <el-tab-pane label="模板概览" name="overview">
            <div class="overview-section">
              <div class="section-title">
                功能特性
              </div>
              <ul class="features-list">
                <li v-for="(feature, index) in template.features" :key="index">
                  <el-icon color="#67c23a"><i-ep-check /></el-icon>
                  {{ feature }}
                </li>
              </ul>

              <div class="section-title">
                版本信息
              </div>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="当前版本">
                  {{ template.version }}
                </el-descriptions-item>
                <el-descriptions-item label="发布时间">
                  {{ template.publishedAt }}
                </el-descriptions-item>
                <el-descriptions-item label="创建时间">
                  {{ template.createdAt }}
                </el-descriptions-item>
                <el-descriptions-item label="更新时间">
                  {{ template.updatedAt }}
                </el-descriptions-item>
              </el-descriptions>

              <div class="section-title">
                表单字段
              </div>
              <el-table :data="template.formSchemaSnapshot.fields" border>
                <el-table-column prop="label" label="字段名称" />
                <el-table-column prop="type" label="字段类型" width="120" />
                <el-table-column prop="required" label="是否必填" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.required ? 'success' : 'info'" size="small">
                      {{ row.required ? '必填' : '选填' }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>

              <div class="section-title">
                审批流程
              </div>
              <div class="workflow-preview">
                <div
                  v-for="node in template.workflowSnapshot.nodes"
                  :key="node.id"
                  class="workflow-node"
                >
                  <div class="node-icon">
                    <el-icon v-if="node.type === 'start'"><i-ep-video-play /></el-icon>
                    <el-icon v-else-if="node.type === 'approval'"><i-ep-user /></el-icon>
                    <el-icon v-else-if="node.type === 'cc'"><i-ep-message /></el-icon>
                    <el-icon v-else-if="node.type === 'condition'"><i-ep-share /></el-icon>
                    <el-icon v-else><i-ep-circle-check /></el-icon>
                  </div>
                  <div class="node-name">
                    {{ node.name }}
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane :label="`用户评价 (${reviewTotal})`" name="reviews">
            <div class="reviews-section">
              <div class="reviews-header">
                <el-button type="primary" @click="showReviewDialog = true">
                  <el-icon><i-ep-edit /></el-icon>
                  写评论
                </el-button>
              </div>

              <div v-if="reviews.length === 0" class="empty-reviews">
                <el-empty description="暂无评论" />
              </div>

              <div v-else class="reviews-list">
                <div
                  v-for="review in reviews"
                  :key="review.id"
                  class="review-item"
                >
                  <div class="review-header">
                    <el-avatar :src="review.userAvatar" :size="40">
                      {{ review.userName.charAt(0) }}
                    </el-avatar>
                    <div class="review-user-info">
                      <div class="review-user-name">
                        {{ review.userName }}
                      </div>
                      <el-rate
                        v-model="review.rating"
                        disabled
                        size="small"
                      />
                    </div>
                    <div class="review-time">
                      {{ review.createdAt }}
                    </div>
                  </div>
                  <div class="review-content">
                    {{ review.content }}
                  </div>
                  <div class="review-actions">
                    <el-button
                      text
                      size="small"
                      :type="review.isLiked ? 'primary' : 'default'"
                      @click="handleLikeReview(review.id)"
                    >
                      <el-icon><i-ep-thumb-up /></el-icon>
                      {{ review.likeCount }}
                    </el-button>
                  </div>
                </div>
              </div>

              <div v-if="reviewTotal > 10" class="pagination">
                <el-pagination
                  :current-page="reviewPage"
                  :page-size="10"
                  :total="reviewTotal"
                  layout="total, prev, pager, next"
                  @current-change="handleReviewPageChange"
                />
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-card>

    <!-- 评论对话框 -->
    <el-dialog
      v-model="showReviewDialog"
      title="写评论"
      width="500px"
    >
      <el-form :model="reviewForm" label-width="80px">
        <el-form-item label="评分">
          <el-rate v-model="reviewForm.rating" />
        </el-form-item>
        <el-form-item label="评论内容">
          <el-input
            v-model="reviewForm.content"
            type="textarea"
            :rows="5"
            placeholder="请输入评论内容"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showReviewDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="isSubmittingReview"
          @click="handleSubmitReview"
        >
          提交
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.template-detail-page {
  padding: 20px;
}

.card-header {
  display: flex;
  align-items: center;
}

.template-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.template-header {
  display: flex;
  gap: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e4e7ed;
}

.template-icon {
  font-size: 80px;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 12px;
}

.template-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-name {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.template-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 14px;
  color: #909399;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.template-description {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.template-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.template-actions {
  display: flex;
  align-items: flex-start;
}

.template-tabs {
  margin-top: 24px;
}

.overview-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.features-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.workflow-preview {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  overflow-x: auto;
}

.workflow-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 100px;
}

.node-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 2px solid #409eff;
  border-radius: 50%;
  font-size: 24px;
  color: #409eff;
}

.node-name {
  font-size: 13px;
  color: #606266;
  text-align: center;
}

.reviews-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.reviews-header {
  display: flex;
  justify-content: flex-end;
}

.empty-reviews {
  padding: 40px 0;
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-item {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.review-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.review-user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.review-user-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.review-time {
  font-size: 13px;
  color: #909399;
}

.review-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 12px;
}

.review-actions {
  display: flex;
  gap: 12px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
</style>
