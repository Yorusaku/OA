<script setup lang="ts">
import {
  ElButton,
  ElCard,
  ElDialog,
  ElInput,
  ElMessage,
  ElPagination,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus'
import { useRouter } from 'vue-router'
/**
 * 待我审批 - 需要我处理的审批单
 */
import { ref } from 'vue'
import { DynamicForm } from '@/components/dynamic-form'
import type { FormSchema } from '@/types/form-schema'
import { useApprovalList, useSubmitApproval } from '@/composables/useApproval'

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
const actionDialogVisible = ref(false)
const selectedRecord = ref<any>(null)
const comment = ref('')

function handleApprove(row: any) {
  selectedRecord.value = row

  // 🚀 模拟后端返回该审批单关联的 Schema 和填写的 Data
  if (row.type === 'leave') {
    currentSchema.value = mockFormSchemas.leave
    currentFormData.value = { leaveType: 'sick', days: 2.5, reason: '重感冒发烧，去医院打点滴。' }
  } else if (row.type === 'expense') {
    currentSchema.value = mockFormSchemas.expense
    currentFormData.value = { expenseType: 'travel', amount: 1250, description: '上海出张往返高铁及两晚住宿费。' }
  } else {
    currentSchema.value = null
    currentFormData.value = {}
  }

  actionDialogVisible.value = true
}

/**
 * 跳转到详情页
 */
function goToDetail(row: any) {
  router.push(`/approval/detail/${row.id}`)
}

const submitMutation = useSubmitApproval()

async function handleConfirmApprove(approved: boolean) {
  try {
    await submitMutation.mutateAsync({
      title: selectedRecord.value?.title || '审批',
      type: 'leave',
      applicant: '当前用户',
      amount: 0,
    })

    ElMessage.success(approved ? '已通过' : '已驳回')
    actionDialogVisible.value = false
    refetch()
  }
  catch (error) {
    ElMessage.error('操作失败')
  }
}

// ==================== 状态映射 ====================
const statusMap: Record<string, { text: string, type: string }> = {
  pending: { text: '待审批', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
}
</script>

<template>
  <div class="approval-todo">
    <ElCard>
      <template #header>
        <h2>待我审批</h2>
      </template>

      <!-- 搜索栏 -->
      <div class="search-bar mb-4">
        <ElInput
          v-model="searchForm.keyword"
          placeholder="搜索申请标题"
          clearable
          style="width: 240px"
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
            <ElButton link type="info" @click="goToDetail(row)">
              查看详情
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

    <!-- 审批操作对话框 -->
    <ElDialog
      v-model="actionDialogVisible"
      :title="'审批处理 - ' + (selectedRecord?.title || '')"
      width="650px"
      destroy-on-close
    >
      <div v-if="selectedRecord" class="approval-dialog-body">
        <!-- 单据详情 -->
        <div class="detail-section" v-if="currentSchema">
          <div class="section-title">单据详情</div>
          <div class="form-container">
            <DynamicForm 
              :schema="currentSchema" 
              v-model="currentFormData" 
              :readonly="true" 
              :disabled="true" 
            />
          </div>
        </div>

        <!-- 审批意见 -->
        <div class="action-section">
          <div class="section-title">审批意见</div>
          <ElInput
            v-model="comment"
            type="textarea"
            :rows="3"
            placeholder="请输入审批意见（驳回时必填）"
          />
        </div>
      </div>

      <template #footer>
        <ElButton @click="actionDialogVisible = false">
          取消
        </ElButton>
        <ElButton type="danger" @click="handleConfirmApprove(false)">
          驳回
        </ElButton>
        <ElButton type="primary" @click="handleConfirmApprove(true)">
          通过
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.approval-todo {
  padding: 20px;
}

.search-bar {
  display: flex;
  align-items: center;
}

.approval-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.form-container {
  background-color: #f8f9fa;
  padding: 16px 16px 0 16px;
  border-radius: 4px;
}
</style>
