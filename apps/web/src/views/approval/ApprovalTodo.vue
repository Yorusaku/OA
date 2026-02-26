<script setup lang="ts">
import {
  ElButton,
  ElCard,
  ElMessage,
  ElPagination,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus'
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import { DynamicForm } from '@/components/dynamic-form'
import type { FormSchema } from '@/types/form-schema'
import { useApprovalList } from '@/composables/useApproval'

const router = useRouter()

// 🚀 1. 准备 Mock Schemas (模拟后端下发的表单结构)
const mockFormSchemas: Record<string, FormSchema> = {
  leave: {
    fields: [
      { key: 'leaveType', label: '请假类型', type: 'select', span: 12, options: [{ label: '事假', value: 'personal' }, { label: '病假', value: 'sick' }] },
      { key: 'days', label: '请假天数', type: 'number', span: 12 },
      { key: 'reason', label: '请假事由', type: 'textarea', span: 24 }
    ],
    labelWidth: '100px'
  },
  expense: {
    fields: [
      { key: 'expenseType', label: '费用类型', type: 'select', span: 12, options: [{ label: '差旅费', value: 'travel' }, { label: '招待费', value: 'entertainment' }] },
      { key: 'amount', label: '金额', type: 'number', span: 12 },
      { key: 'description', label: '费用说明', type: 'textarea', span: 24 }
    ],
    labelWidth: '100px'
  }
}

// 🚀 2. 响应式状态：当前表单的 Schema 和 Data
const currentSchema = ref<FormSchema | null>(null)
const currentFormData = ref<Record<string, any>>({})

// ==================== 搜索条件 ====================
const searchForm = ref({
  keyword: '',
})

// ==================== 分页 ====================
const pagination = ref({
  page: 1,
  pageSize: 10,
})

// ==================== Vue Query ====================
const { data, isLoading, refetch } = useApprovalList({
  page: pagination.value.page,
  pageSize: pagination.value.pageSize,
  status: 'pending',
  ...searchForm.value,
})

// ==================== 审批操作 ====================
function handleApprove(row: any) {
  // 跳转到详情页，并携带单据 ID 和类型
  router.push(`/approval/detail/${row.id || 'mock-id'}?type=${row.type}`)
}

// ==================== 状态映射 ====================
const statusMap: Record<string, { text: string, type: string }> = {
  pending: { text: '待审批', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
}
</script>

<template>
  <div class="p-6">
    <ElCard>
      <template #header>
        <h2 class="text-lg font-semibold text-gray-800">待我审批</h2>
      </template>

      <!-- 搜索栏 -->
      <div class="mb-4 flex items-center gap-4">
        <ElInput
          v-model="searchForm.keyword"
          placeholder="搜索申请标题"
          clearable
          class="w-60"
        />
      </div>

      <!-- 表格 -->
      <ElTable
        v-loading="isLoading"
        :data="data?.list || []"
        style="width: 100%"
      >
        <ElTableColumn prop="title" label="标题" min-width="200" />
        <ElTableColumn prop="type" label="类型" width="100">
          <template #default="{ row }">
            <ElTag v-if="row.type === 'leave'" type="success">
              请假
            </ElTag>
            <ElTag v-else-if="row.type === 'expense'" type="warning">
              报销
            </ElTag>
            <ElTag v-else>
              其他
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="applicant" label="申请人" width="100" />
        <ElTableColumn prop="applyTime" label="申请时间" width="180" />
        <ElTableColumn v-if="data?.list?.[0]?.amount" prop="amount" label="金额" width="100">
          <template #default="{ row }">
            ¥{{ row.amount }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="handleApprove(row)">
              审批
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <!-- 分页 -->
      <ElPagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="data?.total || 0"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        class="mt-4 flex justify-end"
      />
    </ElCard>
  </div>
</template>

<style scoped>
</style>
