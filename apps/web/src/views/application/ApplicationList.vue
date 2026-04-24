<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, Plus, Search, View } from '@element-plus/icons-vue'
import type { Application, ApplicationCategory, ApplicationStatus } from '@/types/application'
import {
  useApplicationList,
  useDeleteApplication,
  useDuplicateApplication,
} from '@/composables/useApplication'

const router = useRouter()

// 筛选表单
const filterForm = reactive({
  category: '' as ApplicationCategory | '',
  status: '' as ApplicationStatus | '',
  keyword: '',
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 12,
})

// 查询参数
const queryParams = computed(() => ({
  ...pagination,
  category: filterForm.category || undefined,
  status: filterForm.status || undefined,
  keyword: filterForm.keyword || undefined,
}))

// 获取应用列表
const { data: appsData, isLoading, refetch } = useApplicationList(queryParams)

// 删除应用
const { mutateAsync: deleteApp } = useDeleteApplication()

// 复制应用
const { mutateAsync: duplicateApp } = useDuplicateApplication()

// 分类选项
const categoryOptions = [
  { label: '审批类', value: 'approval' },
  { label: '人事类', value: 'hr' },
  { label: '财务类', value: 'finance' },
  { label: '行政类', value: 'admin' },
  { label: '项目类', value: 'project' },
  { label: '其他', value: 'other' },
]

// 状态选项
const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '已停用', value: 'disabled' },
  { label: '已归档', value: 'archived' },
]

// 搜索
function handleSearch() {
  pagination.page = 1
  refetch()
}

// 重置
function handleReset() {
  filterForm.category = ''
  filterForm.status = ''
  filterForm.keyword = ''
  pagination.page = 1
  refetch()
}

// 创建应用
function handleCreate() {
  router.push('/application/create')
}

// 查看详情
function handleViewDetail(app: Application) {
  router.push(`/application/detail/${app.id}`)
}

// 编辑应用
function handleEdit(app: Application) {
  router.push(`/application/edit/${app.id}`)
}

// 发起审批
function handleLaunch(app: Application) {
  router.push(`/approval/launch?appId=${app.id}`)
}

// 删除应用
async function handleDelete(app: Application) {
  try {
    await ElMessageBox.confirm(
      `确定要删除应用"${app.name}"吗？删除后将无法恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    await deleteApp(app.id)
    ElMessage.success('删除成功')
  }
  catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 复制应用
async function handleDuplicate(app: Application) {
  try {
    const duplicated = await duplicateApp(app.id)
    ElMessage.success('复制成功')
    router.push(`/application/edit/${duplicated.id}`)
  }
  catch (error) {
    ElMessage.error('复制失败')
  }
}

// 分页变化
function handlePageChange(page: number) {
  pagination.page = page
}

function handleSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
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
</script>

<template>
  <div class="application-list-page">
    <!-- 筛选区域 -->
    <el-card class="mb-4">
      <el-form :model="filterForm" inline>
        <el-form-item label="分类">
          <el-select
            v-model="filterForm.category"
            placeholder="请选择分类"
            clearable
            style="width: 150px"
          >
            <el-option
              v-for="item in categoryOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="filterForm.status"
            placeholder="请选择状态"
            clearable
            style="width: 150px"
          >
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filterForm.keyword"
            placeholder="应用名称、标签"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">
            搜索
          </el-button>
          <el-button @click="handleReset">
            重置
          </el-button>
          <el-button type="primary" :icon="Plus" @click="handleCreate">
            新建应用
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 应用卡片列表 -->
    <el-card v-loading="isLoading">
      <div v-if="appsData?.list && appsData.list.length > 0" class="app-grid">
        <div
          v-for="app in appsData.list"
          :key="app.id"
          class="app-card"
        >
          <div class="app-card-header">
            <div class="app-icon">
              {{ app.icon }}
            </div>
            <el-tag :type="getStatusType(app.status)" size="small">
              {{ formatStatus(app.status) }}
            </el-tag>
          </div>
          <div class="app-card-body">
            <h3 class="app-name">
              {{ app.name }}
            </h3>
            <p class="app-description">
              {{ app.description || '暂无描述' }}
            </p>
            <div class="app-meta">
              <span class="meta-item">
                <span class="meta-label">分类：</span>
                <span class="meta-value">{{ formatCategory(app.category) }}</span>
              </span>
              <span class="meta-item">
                <span class="meta-label">使用：</span>
                <span class="meta-value">{{ app.usageCount || 0 }} 次</span>
              </span>
            </div>
            <div v-if="app.tags && app.tags.length > 0" class="app-tags">
              <el-tag
                v-for="tag in app.tags"
                :key="tag"
                size="small"
                type="info"
                effect="plain"
              >
                {{ tag }}
              </el-tag>
            </div>
          </div>
          <div class="app-card-footer">
            <el-button
              v-if="app.status === 'published'"
              type="primary"
              size="small"
              @click="handleLaunch(app)"
            >
              发起审批
            </el-button>
            <el-button
              type="primary"
              link
              :icon="View"
              size="small"
              @click="handleViewDetail(app)"
            >
              详情
            </el-button>
            <el-button
              type="primary"
              link
              :icon="Edit"
              size="small"
              @click="handleEdit(app)"
            >
              编辑
            </el-button>
            <el-dropdown trigger="click" @command="(cmd: string) => {
              if (cmd === 'duplicate') handleDuplicate(app)
              else if (cmd === 'delete') handleDelete(app)
            }">
              <el-button type="primary" link size="small">
                更多
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="duplicate">
                    复制
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided>
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <el-empty v-else description="暂无应用" />

      <!-- 分页 -->
      <div v-if="appsData?.total && appsData.total > 0" class="mt-4 flex justify-end">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[12, 24, 48]"
          :total="appsData.total"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.application-list-page {
  padding: 20px;
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.app-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.app-card:hover {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.app-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.app-icon {
  font-size: 32px;
  line-height: 1;
}

.app-card-body {
  flex: 1;
  margin-bottom: 12px;
}

.app-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #303133;
}

.app-description {
  font-size: 14px;
  color: #606266;
  margin: 0 0 12px 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 42px;
}

.app-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
}

.meta-label {
  color: #909399;
}

.meta-value {
  color: #606266;
}

.app-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.app-card-footer {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #e4e7ed;
}
</style>
