<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, View } from '@element-plus/icons-vue'
import { useDevice } from '@/composables/useDevice'
import { useBatchMarkCCAsRead, useCCList, useMarkCCAsRead } from '@/composables/useApprovalCC'
import type { ApprovalStatus, CCRecord } from '@/api/types'

const router = useRouter()
const { isMobile } = useDevice()

// 筛选表单
const filterForm = reactive({
  keyword: '',
  status: '' as ApprovalStatus | '',
  read: undefined as boolean | undefined,
  dateRange: null as [Date, Date] | null,
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
})

// 查询参数
const queryParams = computed(() => ({
  ...pagination,
  keyword: filterForm.keyword || undefined,
  status: filterForm.status || undefined,
  read: filterForm.read,
  dateRange: filterForm.dateRange || undefined,
}))

// 获取抄送列表
const { data: ccData, isLoading, refetch } = useCCList(queryParams)

// 标记已读
const { mutateAsync: markAsRead } = useMarkCCAsRead()
const { mutateAsync: batchMarkAsRead } = useBatchMarkCCAsRead()

// 选中的记录
const selectedIds = ref<string[]>([])

// 状态选项
const statusOptions = [
  { label: '待审批', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
  { label: '已撤回', value: 'withdrawn' },
  { label: '已取消', value: 'cancelled' },
]

// 已读/未读选项
const readOptions = [
  { label: '未读', value: false },
  { label: '已读', value: true },
]

// 搜索
function handleSearch() {
  pagination.page = 1
  refetch()
}

// 重置
function handleReset() {
  filterForm.keyword = ''
  filterForm.status = ''
  filterForm.read = undefined
  filterForm.dateRange = null
  pagination.page = 1
  refetch()
}

// 查看详情
async function handleViewDetail(record: CCRecord) {
  // 标记为已读
  if (!record.read) {
    await markAsRead(record.id)
  }
  // 跳转到审批详情页
  router.push(`/approval/detail/${record.approvalId}`)
}

// 标记已读
async function handleMarkAsRead(record: CCRecord) {
  try {
    await markAsRead(record.id)
    ElMessage.success('已标记为已读')
  }
  catch (error) {
    ElMessage.error('操作失败')
  }
}

// 批量标记已读
async function handleBatchMarkAsRead() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要标记的记录')
    return
  }

  try {
    await batchMarkAsRead(selectedIds.value)
    ElMessage.success('已批量标记为已读')
    selectedIds.value = []
  }
  catch (error) {
    ElMessage.error('操作失败')
  }
}

// 选择变化
function handleSelectionChange(selection: CCRecord[]) {
  selectedIds.value = selection.map(item => item.id)
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
function formatStatus(status: ApprovalStatus): string {
  const map: Record<ApprovalStatus, string> = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已驳回',
    cancelled: '已取消',
    withdrawn: '已撤回',
    transferred: '已转交',
  }
  return map[status] || status
}

// 状态标签类型
function getStatusType(status: ApprovalStatus): 'warning' | 'success' | 'danger' | 'info' {
  const map: Record<ApprovalStatus, 'warning' | 'success' | 'danger' | 'info'> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    cancelled: 'info',
    withdrawn: 'info',
    transferred: 'info',
  }
  return map[status] || 'info'
}
</script>

<template>
  <div :class="isMobile ? 'h-full' : 'approval-cc-page'">
    <!-- 桌面端布局 -->
    <template v-if="!isMobile">
      <!-- 筛选区域 -->
      <el-card class="mb-4">
      <el-form :model="filterForm" inline>
        <el-form-item label="关键词">
          <el-input
            v-model="filterForm.keyword"
            placeholder="标题、申请人"
            clearable
            style="width: 200px"
          />
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
        <el-form-item label="已读状态">
          <el-select
            v-model="filterForm.read"
            placeholder="请选择"
            clearable
            style="width: 120px"
          >
            <el-option
              v-for="item in readOptions"
              :key="String(item.value)"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="抄送时间">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">
            搜索
          </el-button>
          <el-button @click="handleReset">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格区域 -->
    <el-card>
      <div class="mb-4">
        <el-button
          type="primary"
          :disabled="selectedIds.length === 0"
          @click="handleBatchMarkAsRead"
        >
          批量标记已读
        </el-button>
      </div>

      <el-table
        v-loading="isLoading"
        :data="ccData?.list || []"
        stripe
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column label="已读" width="80">
          <template #default="{ row }">
            <el-tag v-if="!row.read" type="danger" size="small">
              未读
            </el-tag>
            <el-tag v-else type="info" size="small">
              已读
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ formatStatus(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请人" width="120">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <el-avatar v-if="row.applicantAvatar" :src="row.applicantAvatar" :size="24" />
              <span>{{ row.applicant }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="120">
          <template #default="{ row }">
            {{ row.amount ? `¥${row.amount.toLocaleString()}` : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="ccNodeName" label="抄送节点" width="120" />
        <el-table-column prop="ccTime" label="抄送时间" width="180" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              :icon="View"
              @click="handleViewDetail(row)"
            >
              查看详情
            </el-button>
            <el-button
              v-if="!row.read"
              type="primary"
              link
              @click="handleMarkAsRead(row)"
            >
              标记已读
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="mt-4 flex justify-end">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="ccData?.total || 0"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>
    </template>

    <!-- 移动端布局 -->
    <div v-else class="h-full flex flex-col bg-gray-50">
      <!-- 顶部工具栏 -->
      <div class="bg-white border-b border-gray-200 px-4 py-3 shrink-0">
        <h2 class="text-lg font-semibold text-gray-800 mb-2">
          抄送我的
        </h2>
        <div class="text-sm text-gray-500">
          共 {{ ccData?.total || 0 }} 条抄送
        </div>
      </div>

      <!-- 列表 -->
      <div class="flex-1 overflow-y-auto p-3">
        <div v-if="isLoading" class="space-y-3">
          <el-skeleton v-for="i in 5" :key="i" :rows="3" animated />
        </div>

        <div v-else-if="!ccData?.list?.length" class="text-center py-12">
          <el-empty description="暂无抄送记录" />
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="record in ccData.list"
            :key="record.id"
            class="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
            @click="handleViewDetail(record)"
          >
            <!-- 未读标记 -->
            <div v-if="!record.read" class="absolute top-2 right-2">
              <span class="inline-block w-2 h-2 bg-red-500 rounded-full" />
            </div>

            <div class="flex items-start justify-between mb-3">
              <div class="flex-1 min-w-0 mr-3">
                <h3 class="text-base font-semibold text-gray-800 truncate mb-1">
                  {{ record.title }}
                </h3>
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <span>{{ record.type }}</span>
                </div>
              </div>
              <el-tag :type="getStatusType(record.status)" size="small">
                {{ formatStatus(record.status) }}
              </el-tag>
            </div>

            <div class="flex items-center gap-2 mb-2">
              <el-avatar :size="28" class="bg-primary shrink-0">
                {{ record.applicant.charAt(0) }}
              </el-avatar>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-700">
                  {{ record.applicant }}
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between text-xs text-gray-500">
              <span>{{ record.ccNodeName }}</span>
              <span>{{ record.ccTime }}</span>
            </div>

            <div v-if="record.amount" class="mt-2 text-sm">
              <span class="text-gray-500">金额：</span>
              <span class="font-semibold text-primary">¥{{ record.amount.toLocaleString() }}</span>
            </div>
          </div>

          <!-- 分页 -->
          <div v-if="ccData.total > pagination.pageSize" class="text-center py-4">
            <el-button
              v-if="pagination.page * pagination.pageSize < ccData.total"
              size="small"
              @click="pagination.page++"
            >
              加载更多
            </el-button>
            <div v-else class="text-sm text-gray-400">
              没有更多了
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.approval-cc-page {
  padding: 20px;
}
</style>
