<script setup lang="ts">
import {
  ElButton,
  ElDialog,
  ElInput,
  ElMessage,
  ElPagination,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus'
/**
 * 待我审批 - 需要我处理的审批单
 */
import { ref } from 'vue'
import { useApprovalList, useSubmitApproval } from '@/composables/useApproval'

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
  actionDialogVisible.value = true
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
            <ElButton link type="info" @click="handleApprove(row)">
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
      title="审批操作"
      width="500px"
    >
      <div v-if="selectedRecord">
        <p class="mb-4">
          <strong>申请：</strong>{{ selectedRecord.title }}
        </p>
        <p class="mb-4">
          <strong>申请人：</strong>{{ selectedRecord.applicant }}
        </p>

        <ElInput
          v-model="comment"
          type="textarea"
          :rows="3"
          placeholder="请输入审批意见"
        />
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
</style>
