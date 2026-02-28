<script setup lang="ts">
/**
 * ApprovalTodo.vue - 待办审批列表页
 * 实现多维度筛选、批量操作、状态标签、路由跳转等核心功能
 */

import { computed, ref, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useApprovalTodo } from './composables/useApprovalTodo'
import type { ApprovalRecord } from '@/api/types'

// ==================== Composables ====================
const { 
  filters,
  selectedIds,
  isAllSelected,
  pagination,
  data,
  isLoading,
  error,
  handleSearch,
  toggleSelect,
  toggleSelectAll,
  batchApprove,
  batchReject,
  handleRowClick,
  handleProcess,
} = useApprovalTodo()

const router = useRouter()

// ==================== 常量定义 ====================
const CONSTANTS = {
  PAGE_TITLE: '待办审批',
  EMPTY_DESCRIPTION: '太棒了，当前没有需要处理的审批！',
  BATCH_ACTIONS: {
    APPROVE: '批量通过',
    REJECT: '批量驳回',
  },
  STATUS_CONFIG: {
    pending: { label: '待审批', type: 'warning' as const },
    approved: { label: '已通过', type: 'success' as const },
    rejected: { label: '已驳回', type: 'danger' as const },
    processing: { label: '审批中', type: 'warning' as const },
  },
  TYPE_CONFIG: {
    leave: { label: '请假', icon: 'Calendar', color: '#67c23a' },
    expense: { label: '报销', icon: 'Money', color: '#e6a23c' },
    purchase: { label: '采购', icon: 'Cart', color: '#409eff' },
  },
  DATE_RANGE_OPTIONS: [
    { label: '今日', value: 'today' },
    { label: '近7天', value: '7days' },
    { label: '近30天', value: '30days' },
  ],
}

// ==================== 计算属性 ====================
// 必要字段验证
const hasRequiredFields = computed((): boolean => {
  return (
    selectedIds.value.size > 0 ||
    data.value?.list.length === 0 ||
    data.value?.list.every(item =>
      'applicant' in item &&
      'type' in item &&
      'currentNodeName' in item
    )
  )
})

// ==================== 状态标签映射 ====================
const getStatusConfig = (status: string | undefined) => {
  return CONSTANTS.STATUS_CONFIG[status as keyof typeof CONSTANTS.STATUS_CONFIG] || {
    label: status,
    type: 'info' as const
  }
}

// ==================== 类型标签映射 ====================
const getTypeConfig = (type: string | undefined) => {
  return CONSTANTS.TYPE_CONFIG[type as keyof typeof CONSTANTS.TYPE_CONFIG] || {
    label: type,
    icon: 'Document',
    color: '#909399'
  }
}

// ==================== 批量操作 ====================
const batchApproveDisabled = computed(() => selectedIds.value.size === 0)
const batchRejectDisabled = computed(() => selectedIds.value.size === 0)

// ==================== 路由跳转 ====================
const handleProcessApproval = (row: ApprovalRecord): void => {
  handleProcess(row)
}

// ==================== 清除筛选 ====================
const clearFilters = (): void => {
  filters.keyword = ''
  filters.status = null
  filters.type = null
  filters.dateRange = null
}

// ==================== 空状态操作 ====================
const handleGoToLaunch = (): void => {
  router.push('/approval/launch')
}
</script>

<template>
  <div class="approval-todo p-6 max-w-7xl mx-auto">
    <!-- 页面标题 -->
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">{{ CONSTANTS.PAGE_TITLE }}</h1>
        <p class="text-gray-500 mt-1">
          {{ data?.total || 0 }} 条待办审批
        </p>
      </div>
      <div class="flex gap-3">
        <ElButton 
          type="primary"
          @click="batchApprove"
          :disabled="batchApproveDisabled"
        >
          {{ CONSTANTS.BATCH_ACTIONS.APPROVE }} ({{ selectedIds.size }})
        </ElButton>
        <ElButton 
          type="danger"
          @click="batchReject"
          :disabled="batchRejectDisabled"
        >
          {{ CONSTANTS.BATCH_ACTIONS.REJECT }} ({{ selectedIds.size }})
        </ElButton>
      </div>
    </div>

    <!-- 高级搜索栏 -->
    <div class="filter-bar mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
      <div class="flex flex-wrap gap-4 items-center">
        <!-- 关键词搜索 -->
        <ElInput
          v-model="filters.keyword"
          placeholder="搜索标题、申请人"
          clearable
          class="w-64"
          @change="handleSearch"
        >
          <template #prefix>
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </template>
        </ElInput>

        <!-- 状态筛选 -->
        <ElSelect
          v-model="filters.status"
          placeholder="全部状态"
          clearable
          class="w-40"
        >
          <ElOption value="" label="全部状态"></ElOption>
          <ElOption value="pending" label="待审批"></ElOption>
          <ElOption value="approved" label="已通过"></ElOption>
          <ElOption value="rejected" label="已驳回"></ElOption>
        </ElSelect>

        <!-- 类型筛选 -->
        <ElSelect
          v-model="filters.type"
          placeholder="全部类型"
          clearable
          class="w-40"
        >
          <ElOption value="" label="全部类型"></ElOption>
          <ElOption value="leave" label="请假"></ElOption>
          <ElOption value="expense" label="报销"></ElOption>
          <ElOption value="purchase" label="采购"></ElOption>
        </ElSelect>

        <!-- 时间范围 -->
        <ElDatePicker
          v-model="filters.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          class="w-64"
        />

        <!-- 操作按钮 -->
        <ElButton link type="primary" @click="clearFilters">
          清除筛选
        </ElButton>
      </div>
    </div>

    <!-- 加载中骨架屏 -->
    <ElSkeleton v-if="isLoading" :rows="6" class="mb-6" />
    
    <!-- 错误状态 -->
    <div v-else-if="error" class="error-state text-center py-12">
      <p class="text-gray-500">加载失败，请刷新重试</p>
      <ElButton @click="window.location.reload()" class="mt-2">
        刷新页面
      </ElButton>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!data?.list?.length" class="empty-state text-center py-12">
      <div class="empty-icon mb-4 text-6xl text-gray-300">
        📭
      </div>
      <h3 class="text-xl font-semibold text-gray-700 mb-2">
        {{ CONSTANTS.EMPTY_DESCRIPTION }}
      </h3>
      <p class="text-gray-500 mb-6">
        没有需要处理的审批，去发起一个新的审批吧
      </p>
      <ElButton type="primary" @click="handleGoToLaunch">
        发起审批
      </ElButton>
    </div>

    <!-- 数据表格 -->
    <div v-else class="table-container bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <!-- 表格头部操作栏 -->
      <div class="table-header p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <div class="flex items-center gap-4">
          <ElCheckbox 
            v-model="isAllSelected"
            @change="toggleSelectAll"
          >
            全选 ({{ selectedIds.size }}/{{ data.total }})
          </ElCheckbox>
          <span class="text-sm text-gray-500">
            已选择 {{ selectedIds.size }} 条
          </span>
        </div>
        <div class="text-sm text-gray-500">
          共 {{ data.total }} 条记录
        </div>
      </div>

      <!-- 表格主体 -->
      <ElTable
        :data="data.list"
        stripe
        border
        v-loading="isLoading"
        @row-click="handleRowClick"
      >
        <!-- 选择列 -->
        <ElTableColumn type="selection" width="55" fixed />
        
        <!-- ID 列 -->
        <ElTableColumn prop="id" label="单据编号" width="180" fixed>
          <template #default="{ row }">
            <span class="text-gray-600 font-mono text-sm">
              {{ row.id }}
            </span>
          </template>
        </ElTableColumn>

        <!-- 标题列 -->
        <ElTableColumn prop="title" label="标题" min-width="240">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <span class="text-gray-800 font-medium hover:text-blue-600 cursor-pointer">
                {{ row.title }}
              </span>
              <ElTag v-if="row.isUrgent" size="small" type="danger">
                🚨 超时
              </ElTag>
            </div>
          </template>
        </ElTableColumn>

        <!-- 类型列 -->
        <ElTableColumn prop="type" label="类型" width="100" fixed="right">
          <template #default="{ row }">
            <ElTag 
              :type="getStatusConfig(row.status).type"
              size="small"
              class="font-medium"
            >
              <svg 
                v-if="getTypeConfig(row.type).icon === 'Calendar'" 
                class="w-3 h-3 mr-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              {{ getTypeConfig(row.type).label }}
            </ElTag>
          </template>
        </ElTableColumn>

        <!-- 申请人列 -->
        <ElTableColumn prop="applicant" label="申请人" width="100">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                {{ row.applicant?.substring(0, 2) }}
              </div>
              <span class="text-gray-700">{{ row.applicant }}</span>
            </div>
          </template>
        </ElTableColumn>

        <!-- 申请时间列 -->
        <ElTableColumn prop="applyTime" label="申请时间" width="160">
          <template #default="{ row }">
            <span class="text-gray-600 text-sm">
              {{ row.applyTime?.substring(0, 10) }}
            </span>
          </template>
        </ElTableColumn>

        <!-- 当前节点列 -->
        <ElTableColumn prop="currentNodeName" label="当前节点" width="140">
          <template #default="{ row }">
            <ElTag size="small" type="info">
              {{ row.currentNodeName || '未知节点' }}
            </ElTag>
          </template>
        </ElTableColumn>

        <!-- 状态列 -->
        <ElTableColumn prop="status" label="状态" width="100">
          <template #default="{ row }">
            <ElTag 
              :type="getStatusConfig(row.status).type"
              size="small"
              class="font-medium"
            >
              {{ getStatusConfig(row.status).label }}
            </ElTag>
          </template>
        </ElTableColumn>

        <!-- 操作列 (固定右侧) -->
        <ElTableColumn label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <ElButton 
              link 
              type="primary" 
              size="small"
              @click.stop="handleProcessApproval(row)"
            >
              处理
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <!-- 分页 -->
      <div class="table-footer p-4 border-t border-gray-100 flex justify-end items-center">
        <ElPagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="data.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          class="pagination"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.approval-todo {
  min-height: calc(100vh - 120px);
}

/* 表格容器 */
.table-container {
  transition: all 0.3s ease;
}

/* 空状态 */
.empty-state {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 分页 */
.pagination :deep(.el-pagination__) {
  display: flex;
  align-items: center;
}
</style>
