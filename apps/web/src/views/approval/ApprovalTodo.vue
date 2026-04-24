<script setup lang="ts">
import type { ApprovalRecord } from '@/api/types'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDevice } from '@/composables/useDevice'
import { useApprovalTodo } from './composables/useApprovalTodo'
import ApprovalListMobile from './components/ApprovalListMobile.vue'
import ApprovalFilterDrawer from './components/ApprovalFilterDrawer.vue'

const todoReturn = useApprovalTodo()

const {
  filters,
  selectedIds,
  pagination,
  data,
  isLoading,
  error,
  handleSearch,
  handleSelectionChange,
  batchApprove,
  batchReject,
  handleProcess,
} = todoReturn

const router = useRouter()
const { isMobile } = useDevice()

const batchApproveDisabled = computed(() => selectedIds.value.size === 0)
const batchRejectDisabled = computed(() => selectedIds.value.size === 0)

const statusTagTypeMap: Record<string, 'warning' | 'success' | 'danger' | 'info' | 'primary'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  transferred: 'primary',
  cancelled: 'info',
  withdrawn: 'info',
}

const statusTextMap: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
  transferred: '已转交',
  cancelled: '已取消',
  withdrawn: '已撤回',
}

function clearFilters() {
  filters.keyword = ''
  filters.status = ''
  filters.type = ''
  filters.dateRange = null
  handleSearch('')
}

function goLaunch() {
  router.push('/approval/launch')
}

function reloadPage() {
  window.location.reload()
}

function onProcess(row: ApprovalRecord) {
  handleProcess(row)
}

function handleFilterUpdate(newFilters: typeof filters) {
  Object.assign(filters, newFilters)
}

function handleFilterSearch() {
  handleSearch(filters.keyword)
}

function handleFilterReset() {
  clearFilters()
}
</script>

<template>
  <!-- 移动端布局 -->
  <div v-if="isMobile" class="h-full">
    <ApprovalListMobile :todo-return="todoReturn" />
    <ApprovalFilterDrawer
      :filters="filters"
      @update:filters="handleFilterUpdate"
      @search="handleFilterSearch"
      @reset="handleFilterReset"
    />
  </div>

  <!-- 桌面端布局 -->
  <div v-else class="approval-todo p-6 max-w-7xl mx-auto">
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">待我审批</h1>
        <p class="text-gray-500 mt-1">{{ data?.total || 0 }} 条待办审批</p>
      </div>
      <div class="flex gap-3">
        <ElButton type="primary" :disabled="batchApproveDisabled" @click="batchApprove">
          批量通过 ({{ selectedIds.size }})
        </ElButton>
        <ElButton type="danger" :disabled="batchRejectDisabled" @click="batchReject">
          批量驳回 ({{ selectedIds.size }})
        </ElButton>
      </div>
    </div>

    <div class="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
      <ElInput
        v-model="filters.keyword"
        placeholder="搜索标题、申请人"
        clearable
        class="w-64"
        @change="handleSearch"
      />
      <ElSelect v-model="filters.status" placeholder="全部状态" clearable class="w-40">
        <ElOption value="" label="全部状态" />
        <ElOption value="pending" label="待审批" />
        <ElOption value="approved" label="已通过" />
        <ElOption value="rejected" label="已驳回" />
        <ElOption value="transferred" label="已转交" />
        <ElOption value="withdrawn" label="已撤回" />
        <ElOption value="cancelled" label="已取消" />
      </ElSelect>
      <ElSelect v-model="filters.type" placeholder="全部类型" clearable class="w-40">
        <ElOption value="" label="全部类型" />
        <ElOption value="leave" label="请假" />
        <ElOption value="expense" label="报销" />
        <ElOption value="purchase" label="采购" />
      </ElSelect>
      <ElDatePicker
        v-model="filters.dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        class="w-64"
      />
      <ElButton link type="primary" @click="clearFilters">清除筛选</ElButton>
    </div>

    <ElSkeleton v-if="isLoading" :rows="6" class="mb-6" />

    <div v-else-if="error" class="text-center py-12">
      <p class="text-gray-500">加载失败，请重试</p>
      <ElButton class="mt-2" @click="reloadPage">刷新页面</ElButton>
    </div>

    <div v-else-if="!data?.list?.length" class="text-center py-12">
      <ElEmpty description="当前没有待处理的审批">
        <ElButton type="primary" @click="goLaunch">发起审批</ElButton>
      </ElEmpty>
    </div>

    <div v-else class="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <span class="text-sm text-gray-500">共 {{ data.total }} 条</span>
        <span class="text-sm text-gray-500">已选 {{ selectedIds.size }} 条</span>
      </div>

      <ElTable :data="data.list" stripe border @selection-change="handleSelectionChange">
        <ElTableColumn type="selection" width="55" fixed />
        <ElTableColumn prop="id" label="单据编号" width="220" fixed />
        <ElTableColumn prop="title" label="标题" min-width="260" />
        <ElTableColumn prop="type" label="类型" width="100" />
        <ElTableColumn prop="applicant" label="申请人" width="120" />
        <ElTableColumn prop="applyTime" label="申请时间" width="180" />
        <ElTableColumn prop="currentNodeName" label="当前节点" width="140" />
        <ElTableColumn prop="status" label="状态" width="120">
          <template #default="{ row }">
            <ElTag :type="statusTagTypeMap[row.status] || 'warning'">
              {{ statusTextMap[row.status] || row.status }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" size="small" @click.stop="onProcess(row)">
              {{ row.status === 'pending' ? '处理' : '查看' }}
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="p-4 border-t border-gray-100 flex justify-end items-center">
        <ElPagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="data.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </div>
  </div>
</template>
