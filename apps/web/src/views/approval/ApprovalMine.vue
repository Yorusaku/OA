<script setup lang="ts">
import {
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElInput,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus'
/**
 * 我的申请 - 查看我发起的审批单
 */
import { ref } from 'vue'
import { useApprovalList } from '@/composables/useApproval'

// ==================== 搜索条件 ====================
const searchForm = ref({
  keyword: '',
  status: '',
})

// ==================== 分页 ====================
const pagination = ref({
  page: 1,
  pageSize: 10,
})

// ==================== Vue Query ====================
const { data, isLoading } = useApprovalList({
  page: pagination.value.page,
  pageSize: pagination.value.pageSize,
  ...searchForm.value,
})

// ==================== 详情对话框 ====================
const detailVisible = ref(false)
const selectedRecord = ref<any>(null)

function handleViewDetail(row: any) {
  selectedRecord.value = row
  detailVisible.value = true
}

// ==================== 状态映射 ====================
const statusMap: Record<string, { text: string, type: 'primary' | 'success' | 'warning' | 'info' | 'danger' }> = {
  pending: { text: '审批中', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  cancelled: { text: '已撤销', type: 'info' },
}
</script>

<template>
  <div class="approval-mine">
    <ElCard>
      <template #header>
        <h2>我的申请</h2>
      </template>

      <!-- 搜索栏 -->
      <div class="search-bar mb-4">
        <ElInput
          v-model="searchForm.keyword"
          placeholder="搜索申请标题"
          clearable
          style="width: 240px"
        />
        <ElSelect
          v-model="searchForm.status"
          placeholder="审批状态"
          clearable
          style="width: 150px; margin-left: 12px"
        >
          <ElOption label="审批中" value="pending" />
          <ElOption label="已通过" value="approved" />
          <ElOption label="已驳回" value="rejected" />
        </ElSelect>
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
        <ElTableColumn prop="status" label="状态" width="100">
          <template #default="{ row }">
            <ElTag :type="statusMap[row.status]?.type">
              {{ statusMap[row.status]?.text }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="applicant" label="申请人" width="100" />
        <ElTableColumn prop="applyTime" label="申请时间" width="180" />
        <ElTableColumn label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="handleViewDetail(row)">
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

    <!-- 详情对话框 -->
    <ElDialog
      v-model="detailVisible"
      title="申请详情"
      width="600px"
    >
      <ElDescriptions v-if="selectedRecord" :column="1" border>
        <ElDescriptionsItem label="标题">
          {{ selectedRecord.title }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="类型">
          <ElTag size="small" :type="selectedRecord.type === 'leave' ? 'success' : 'warning'">
            {{ selectedRecord.type === 'leave' ? '请假' : '报销' }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="状态">
          <ElTag :type="statusMap[selectedRecord.status]?.type">
            {{ statusMap[selectedRecord.status]?.text }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="申请人">
          {{ selectedRecord.applicant }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="申请时间">
          {{ selectedRecord.applyTime }}
        </ElDescriptionsItem>
        <ElDescriptionsItem v-if="selectedRecord.amount" label="金额">
          ¥{{ selectedRecord.amount }}
        </ElDescriptionsItem>
      </ElDescriptions>
    </ElDialog>
  </div>
</template>

<style scoped>
.approval-mine {
  padding: 20px;
}

.search-bar {
  display: flex;
  align-items: center;
}
</style>
