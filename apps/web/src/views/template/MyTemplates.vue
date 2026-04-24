<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  useMyTemplates,
  useMyInstallRecords,
  useDeleteTemplate,
  usePublishTemplate,
  useToggleTemplateStatus,
} from '@/composables/useTemplate'

const router = useRouter()

// 当前 Tab
const activeTab = ref('my-templates')

// 我的模板分页
const templatePagination = reactive({
  page: 1,
  pageSize: 10,
})

// 安装记录分页
const recordPagination = reactive({
  page: 1,
  pageSize: 10,
})

// 获取我的模板列表
const { data: templatesData, isLoading: isLoadingTemplates } = useMyTemplates(
  computed(() => templatePagination.page),
  computed(() => templatePagination.pageSize),
)
const templates = computed(() => templatesData.value?.list || [])
const templateTotal = computed(() => templatesData.value?.total || 0)

// 获取安装记录
const { data: recordsData, isLoading: isLoadingRecords } = useMyInstallRecords(
  computed(() => recordPagination.page),
  computed(() => recordPagination.pageSize),
)
const records = computed(() => recordsData.value?.list || [])
const recordTotal = computed(() => recordsData.value?.total || 0)

// 删除模板
const { mutateAsync: deleteTemplate } = useDeleteTemplate()

// 发布模板
const { mutateAsync: publishTemplate } = usePublishTemplate()

// 切换模板状态
const { mutateAsync: toggleStatus } = useToggleTemplateStatus()

// 查看模板详情
function handleViewDetail(templateId: string) {
  router.push(`/template/detail/${templateId}`)
}

// 编辑模板
function handleEdit(templateId: string) {
  ElMessage.info('编辑功能开发中')
}

// 删除模板
async function handleDelete(templateId: string, templateName: string) {
  try {
    await ElMessageBox.confirm(
      `确定要删除模板"${templateName}"吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    await deleteTemplate(templateId)
    ElMessage.success('删除成功')
  }
  catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 发布模板
async function handlePublish(templateId: string, templateName: string) {
  try {
    await ElMessageBox.confirm(
      `确定要发布模板"${templateName}"吗？发布后将在模板市场展示。`,
      '发布确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
      },
    )

    await publishTemplate(templateId)
    ElMessage.success('发布成功')
  }
  catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('发布失败')
    }
  }
}

// 停用/启用模板
async function handleToggleStatus(templateId: string, currentStatus: string, templateName: string) {
  const newStatus = currentStatus === 'published' ? 'disabled' : 'published'
  const action = newStatus === 'published' ? '启用' : '停用'

  try {
    await ElMessageBox.confirm(
      `确定要${action}模板"${templateName}"吗？`,
      `${action}确认`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    await toggleStatus({ id: templateId, status: newStatus })
    ElMessage.success(`${action}成功`)
  }
  catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`${action}失败`)
    }
  }
}

// 查看应用详情
function handleViewApplication(applicationId: string) {
  router.push(`/application/detail/${applicationId}`)
}

// 模板分页变化
function handleTemplatePageChange(page: number) {
  templatePagination.page = page
}

// 记录分页变化
function handleRecordPageChange(page: number) {
  recordPagination.page = page
}

// 状态标签类型
function getStatusType(status: string) {
  const map: Record<string, any> = {
    draft: 'info',
    published: 'success',
    disabled: 'warning',
  }
  return map[status] || 'info'
}

// 状态文本
function getStatusText(status: string) {
  const map: Record<string, string> = {
    draft: '草稿',
    published: '已发布',
    disabled: '已停用',
  }
  return map[status] || status
}
</script>

<template>
  <div class="my-templates-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">我的模板</span>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="我创建的模板" name="my-templates">
          <div v-loading="isLoadingTemplates">
            <div v-if="templates.length === 0" class="empty-state">
              <el-empty description="暂无模板">
                <el-button type="primary" @click="router.push('/application/list')">
                  从应用创建模板
                </el-button>
              </el-empty>
            </div>

            <el-table v-else :data="templates" border>
              <el-table-column prop="name" label="模板名称" min-width="200">
                <template #default="{ row }">
                  <div class="template-name-cell">
                    <span class="icon">{{ row.icon }}</span>
                    <span>{{ row.name }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="category" label="分类" width="100" />
              <el-table-column prop="version" label="版本" width="100" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="getStatusType(row.status)" size="small">
                    {{ getStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="downloads" label="安装次数" width="100" />
              <el-table-column prop="rating" label="评分" width="100">
                <template #default="{ row }">
                  <span>{{ row.rating.toFixed(1) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="createdAt" label="创建时间" width="180" />
              <el-table-column label="操作" width="280" fixed="right">
                <template #default="{ row }">
                  <el-button
                    text
                    type="primary"
                    size="small"
                    @click="handleViewDetail(row.id)"
                  >
                    查看
                  </el-button>
                  <el-button
                    v-if="row.status === 'draft'"
                    text
                    type="success"
                    size="small"
                    @click="handlePublish(row.id, row.name)"
                  >
                    发布
                  </el-button>
                  <el-button
                    v-if="row.status === 'published'"
                    text
                    type="warning"
                    size="small"
                    @click="handleToggleStatus(row.id, row.status, row.name)"
                  >
                    停用
                  </el-button>
                  <el-button
                    v-if="row.status === 'disabled'"
                    text
                    type="success"
                    size="small"
                    @click="handleToggleStatus(row.id, row.status, row.name)"
                  >
                    启用
                  </el-button>
                  <el-button
                    text
                    type="danger"
                    size="small"
                    @click="handleDelete(row.id, row.name)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <div v-if="templateTotal > templatePagination.pageSize" class="pagination">
              <el-pagination
                :current-page="templatePagination.page"
                :page-size="templatePagination.pageSize"
                :total="templateTotal"
                layout="total, prev, pager, next"
                @current-change="handleTemplatePageChange"
              />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="我的安装记录" name="install-records">
          <div v-loading="isLoadingRecords">
            <div v-if="records.length === 0" class="empty-state">
              <el-empty description="暂无安装记录">
                <el-button type="primary" @click="router.push('/template/market')">
                  去模板市场
                </el-button>
              </el-empty>
            </div>

            <el-table v-else :data="records" border>
              <el-table-column prop="templateName" label="模板名称" min-width="200" />
              <el-table-column prop="success" label="安装状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.success ? 'success' : 'danger'" size="small">
                    {{ row.success ? '成功' : '失败' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="installedAt" label="安装时间" width="180" />
              <el-table-column label="操作" width="150">
                <template #default="{ row }">
                  <el-button
                    v-if="row.success"
                    text
                    type="primary"
                    size="small"
                    @click="handleViewApplication(row.applicationId)"
                  >
                    查看应用
                  </el-button>
                  <span v-else class="error-message">
                    {{ row.errorMessage }}
                  </span>
                </template>
              </el-table-column>
            </el-table>

            <div v-if="recordTotal > recordPagination.pageSize" class="pagination">
              <el-pagination
                :current-page="recordPagination.page"
                :page-size="recordPagination.pageSize"
                :total="recordTotal"
                layout="total, prev, pager, next"
                @current-change="handleRecordPageChange"
              />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped>
.my-templates-page {
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

.empty-state {
  padding: 60px 0;
}

.template-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-name-cell .icon {
  font-size: 20px;
}

.error-message {
  font-size: 13px;
  color: #f56c6c;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>
