<script setup lang="ts">
import { ElButton, ElCard, ElDescriptions, ElDescriptionsItem, ElTag } from 'element-plus'
import { useRoute } from 'vue-router'
import { useApprovalDetail } from '@/composables/useApprovalDetail'

const route = useRoute()
const approvalId = route.params.id as string

// 获取审批详情
const { data: approval, isLoading } = useApprovalDetail(approvalId)
</script>

<template>
  <div class="approval-detail">
    <ElCard v-if="approval" :loading="isLoading">
      <template #header>
        <div class="detail-header">
          <h3>{{ approval.title }}</h3>
          <ElTag :type="approval.status === 'approved' ? 'success' : approval.status === 'rejected' ? 'danger' : 'warning'">
            {{ approval.status === 'pending' ? '待审批' : approval.status === 'approved' ? '已通过' : '已驳回' }}
          </ElTag>
        </div>
      </template>

      <ElDescriptions :column="2" border>
        <ElDescriptionsItem label="申请人">
          {{ approval.applicant }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="申请时间">
          {{ approval.applyTime }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="描述" :span="2">
          {{ approval.description }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="类型" :span="2">
          <ElTag v-if="approval.type === 'leave'" type="success">
            请假
          </ElTag>
          <ElTag v-else-if="approval.type === 'expense'" type="warning">
            报销
          </ElTag>
          <ElTag v-else>
            其他
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem v-if="approval.amount" label="金额" :span="2">
          ¥{{ approval.amount }}
        </ElDescriptionsItem>
      </ElDescriptions>

      <!-- 审批历史 -->
      <div class="approval-history" v-if="approval.history && approval.history.length > 0">
        <h4>审批历史</h4>
        <div class="history-list">
          <div v-for="record in approval.history" :key="record.id" class="history-item">
            <div class="history-info">
              <span class="handler">{{ record.handlerName }}</span>
              <span class="status">{{ record.status === 'approved' ? '通过' : '驳回' }}</span>
              <span class="time">{{ record.handledAt }}</span>
            </div>
            <div v-if="record.comment" class="comment">
              {{ record.comment }}
            </div>
          </div>
        </div>
      </div>
    </ElCard>

    <div v-else-if="!isLoading" class="empty-state">
      审批单不存在
    </div>
  </div>
</template>

<style scoped>
.approval-detail {
  padding: 20px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.approval-history {
  margin-top: 24px;
}

.approval-history h4 {
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 600;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #f5f7fa;
}

.history-info {
  display: flex;
  gap: 16px;
  margin-bottom: 4px;
}

.handler {
  font-weight: 600;
  color: #303133;
}

.status {
  color: #67c23a;
}

.status.rejected {
  color: #f56c6c;
}

.time {
  color: #909399;
  font-size: 12px;
}

.comment {
  color: #606266;
  font-size: 14px;
  padding-left: 16px;
  border-left: 2px solid #dcdfe6;
}
</style>