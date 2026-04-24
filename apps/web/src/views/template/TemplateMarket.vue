<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useTemplateList, useInstallTemplate, usePopularTags } from '@/composables/useTemplate'
import type { ApplicationCategory, TemplateSearchParams } from '@/types/application'

const router = useRouter()

// 筛选条件
const filterForm = reactive<TemplateSearchParams>({
  keyword: '',
  category: undefined,
  tags: [],
  sortBy: 'downloads',
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 12,
})

// 查询参数
const queryParams = computed(() => ({
  ...filterForm,
  ...pagination,
}))

// 获取模板列表
const { data: templatesData, isLoading } = useTemplateList(queryParams)
const templates = computed(() => templatesData.value?.list || [])
const total = computed(() => templatesData.value?.total || 0)

// 获取热门标签
const { data: popularTags } = usePopularTags()

// 安装模板
const { mutateAsync: installTemplate, isPending: isInstalling } = useInstallTemplate()

// 分类选项
const categoryOptions = [
  { label: '全部', value: '' },
  { label: '审批类', value: 'approval' },
  { label: '人事类', value: 'hr' },
  { label: '财务类', value: 'finance' },
  { label: '行政类', value: 'admin' },
  { label: '项目类', value: 'project' },
  { label: '其他', value: 'other' },
]

// 排序选项
const sortOptions = [
  { label: '下载量', value: 'downloads' },
  { label: '评分', value: 'rating' },
  { label: '最新', value: 'latest' },
]

// 分类图标映射
const categoryIconMap: Record<ApplicationCategory, string> = {
  approval: '📋',
  hr: '👥',
  finance: '💰',
  admin: '🏢',
  project: '📊',
  other: '📦',
}

// 搜索
function handleSearch() {
  pagination.page = 1
}

// 重置筛选
function handleReset() {
  filterForm.keyword = ''
  filterForm.category = undefined
  filterForm.tags = []
  filterForm.sortBy = 'downloads'
  pagination.page = 1
}

// 切换标签
function toggleTag(tag: string) {
  if (!filterForm.tags) {
    filterForm.tags = []
  }
  const index = filterForm.tags.indexOf(tag)
  if (index > -1) {
    filterForm.tags.splice(index, 1)
  }
  else {
    filterForm.tags.push(tag)
  }
  pagination.page = 1
}

// 查看详情
function handleViewDetail(templateId: string) {
  router.push(`/template/detail/${templateId}`)
}

// 安装模板
async function handleInstall(templateId: string, templateName: string) {
  try {
    const record = await installTemplate({ templateId })
    ElMessage.success(`模板"${templateName}"安装成功！`)
    router.push(`/application/detail/${record.applicationId}`)
  }
  catch (error) {
    ElMessage.error('安装失败，请稍后重试')
  }
}

// 分页变化
function handlePageChange(page: number) {
  pagination.page = page
}
</script>

<template>
  <div class="template-market-page">
    <el-card class="filter-card">
      <div class="filter-section">
        <div class="filter-row">
          <el-input
            v-model="filterForm.keyword"
            placeholder="搜索模板名称、描述、标签"
            clearable
            style="width: 300px"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><i-ep-search /></el-icon>
            </template>
          </el-input>

          <el-select
            v-model="filterForm.category"
            placeholder="选择分类"
            clearable
            style="width: 150px; margin-left: 12px"
            @change="handleSearch"
          >
            <el-option
              v-for="item in categoryOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>

          <el-select
            v-model="filterForm.sortBy"
            placeholder="排序方式"
            style="width: 120px; margin-left: 12px"
            @change="handleSearch"
          >
            <el-option
              v-for="item in sortOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>

          <el-button type="primary" style="margin-left: 12px" @click="handleSearch">
            搜索
          </el-button>
          <el-button @click="handleReset">
            重置
          </el-button>
        </div>

        <div v-if="popularTags && popularTags.length > 0" class="tags-section">
          <span class="tags-label">热门标签：</span>
          <el-tag
            v-for="item in popularTags.slice(0, 10)"
            :key="item.tag"
            :type="filterForm.tags?.includes(item.tag) ? 'primary' : 'info'"
            style="margin-right: 8px; cursor: pointer"
            @click="toggleTag(item.tag)"
          >
            {{ item.tag }} ({{ item.count }})
          </el-tag>
        </div>
      </div>
    </el-card>

    <el-card v-loading="isLoading" class="templates-card">
      <template #header>
        <div class="card-header">
          <span class="title">模板广场</span>
          <span class="count">共 {{ total }} 个模板</span>
        </div>
      </template>

      <div v-if="templates.length === 0" class="empty-state">
        <el-empty description="暂无模板" />
      </div>

      <div v-else class="templates-grid">
        <div
          v-for="template in templates"
          :key="template.id"
          class="template-card"
          @click="handleViewDetail(template.id)"
        >
          <div class="template-icon">
            {{ template.icon || categoryIconMap[template.category] }}
          </div>
          <div class="template-info">
            <div class="template-name">
              {{ template.name }}
            </div>
            <div class="template-description">
              {{ template.description }}
            </div>
            <div class="template-meta">
              <el-tag size="small" type="info">
                {{ categoryOptions.find(c => c.value === template.category)?.label }}
              </el-tag>
              <span class="meta-item">
                <el-icon><i-ep-download /></el-icon>
                {{ template.downloads }}
              </span>
              <span class="meta-item">
                <el-icon><i-ep-star-filled /></el-icon>
                {{ template.rating.toFixed(1) }}
              </span>
            </div>
            <div class="template-tags">
              <el-tag
                v-for="tag in template.tags?.slice(0, 3)"
                :key="tag"
                size="small"
                type="info"
                effect="plain"
              >
                {{ tag }}
              </el-tag>
            </div>
          </div>
          <div class="template-actions" @click.stop>
            <el-button
              type="primary"
              size="small"
              :loading="isInstalling"
              @click="handleInstall(template.id, template.name)"
            >
              安装
            </el-button>
            <el-button size="small" @click="handleViewDetail(template.id)">
              查看详情
            </el-button>
          </div>
        </div>
      </div>

      <div v-if="total > pagination.pageSize" class="pagination">
        <el-pagination
          :current-page="pagination.page"
          :page-size="pagination.pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.template-market-page {
  padding: 20px;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-row {
  display: flex;
  align-items: center;
}

.tags-section {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.tags-label {
  font-weight: 500;
  color: #606266;
  margin-right: 8px;
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

.count {
  font-size: 14px;
  color: #909399;
}

.empty-state {
  padding: 60px 0;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.template-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.2);
  transform: translateY(-2px);
}

.template-icon {
  font-size: 48px;
  text-align: center;
}

.template-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.template-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.template-description {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.template-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #909399;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.template-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.template-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #e4e7ed;
}

.template-actions .el-button {
  flex: 1;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>
