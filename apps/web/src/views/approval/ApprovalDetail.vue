<script setup lang="ts">
import { ElButton, ElCard, ElTag } from 'element-plus'
import DynamicForm from '@/components/dynamic-form/DynamicForm.vue'
import AiSuggestion from './components/AiSuggestion.vue'
import { useApprovalDetailPage } from './composables/useApprovalDetailPage'

const {
  router,
  isMobile,
  approvalData,
  isLoading,
  error,
  isSubmitLoading,
  dynamicFormRef,
  isActionable,
  formSchema,
  nodePermissions,
  collaborationModeText,
  currentNodeProgressText,
  pendingHandlerText,
  statusTextMap,
  statusTagTypeMap,
  slaTagType,
  slaText,
  handleApprove,
  handleReject,
  handleTransfer,
  handleAddSign,
  handleRemind,
  handleWithdraw,
  handleCancel,
  handleRetry,
  showMoreActions,
} = useApprovalDetailPage()
</script>

<template>
  <div :class="isMobile ? 'approval-detail-mobile' : 'approval-detail'">
    <!-- 桌面端布局 -->
    <template v-if="!isMobile">
      <ElCard v-if="isLoading" class="card-wrapper">
      <div class="text-center py-8">
        <p>加载中...</p>
      </div>
    </ElCard>

    <ElCard v-else-if="error" class="card-wrapper">
      <div class="text-center py-8">
        <p class="text-red-500 mb-4">加载失败</p>
        <div class="flex justify-center gap-3">
          <ElButton type="primary" @click="handleRetry">重试</ElButton>
          <ElButton @click="router.push('/approval/todo')">返回待办</ElButton>
        </div>
      </div>
    </ElCard>

    <ElCard v-else-if="approvalData" class="card-wrapper">
      <template #header>
        <div class="flex justify-between items-center gap-3 flex-wrap">
          <span class="text-lg font-bold">{{ approvalData.title }}</span>
          <div class="flex gap-2 items-center flex-wrap">
            <ElTag :type="statusTagTypeMap[approvalData.status] || 'warning'">
              {{ statusTextMap[approvalData.status] || approvalData.status }}
            </ElTag>
            <ElTag :type="slaTagType">SLA: {{ slaText }}</ElTag>
          </div>
        </div>
      </template>

      <div class="mb-6 info-grid">
        <p><strong>申请人：</strong>{{ approvalData.applicant }}</p>
        <p><strong>申请时间：</strong>{{ approvalData.applyTime }}</p>
        <p><strong>当前节点：</strong>{{ approvalData.currentNode?.name || approvalData.currentNodeName || '待处理' }}</p>
        <p><strong>审批策略：</strong>{{ collaborationModeText }}</p>
        <p><strong>节点进度：</strong>{{ currentNodeProgressText }}</p>
        <p><strong>SLA 截止：</strong>{{ approvalData.deadlineAt || '-' }}</p>
        <p><strong>催办次数：</strong>{{ approvalData.remindCount }}</p>
        <p><strong>最近催办：</strong>{{ approvalData.lastRemindAt || '-' }}</p>
        <p><strong>升级时间：</strong>{{ approvalData.escalatedAt || '-' }}</p>
        <p><strong>升级摘要：</strong>{{ approvalData.currentEscalationSummary || '-' }}</p>
        <p><strong>代理处理：</strong>{{ approvalData.currentDelegationSummary || '-' }}</p>
        <p><strong>描述：</strong>{{ approvalData.description || '-' }}</p>
      </div>

      <div v-if="isActionable">
        <DynamicForm
          v-if="formSchema"
          ref="dynamicFormRef"
          :schema="formSchema"
          :model-value="approvalData.formData"
          :permissions="nodePermissions"
          :show-submit="false"
          :disabled="!isActionable"
        />

        <div class="action-buttons mt-6 flex flex-wrap justify-end gap-3">
          <ElButton
            type="success"
            class="approve-btn"
            :loading="isSubmitLoading"
            @click="handleApprove"
          >
            同意
          </ElButton>
          <ElButton
            type="danger"
            class="reject-btn"
            :loading="isSubmitLoading"
            @click="handleReject"
          >
            驳回
          </ElButton>
          <ElButton class="transfer-btn" :loading="isSubmitLoading" @click="handleTransfer">
            转交
          </ElButton>
          <ElButton class="addsign-btn" :loading="isSubmitLoading" @click="handleAddSign">
            加签
          </ElButton>
          <ElButton class="remind-btn" :loading="isSubmitLoading" @click="handleRemind">
            催办
          </ElButton>
          <ElButton class="withdraw-btn" :loading="isSubmitLoading" @click="handleWithdraw">
            撤回
          </ElButton>
          <ElButton class="cancel-btn" :loading="isSubmitLoading" @click="handleCancel">
            取消
          </ElButton>
        </div>
      </div>

      <div v-else class="mb-6 text-gray-500">
        <template v-if="approvalData.status === 'pending'">
          当前节点待 {{ pendingHandlerText }} 处理，你暂无操作权限
        </template>
        <template v-else>
          审批已结束，当前状态：{{ statusTextMap[approvalData.status] || approvalData.status }}
        </template>
      </div>

      <div class="timeline-block">
        <h3 class="mb-3 text-base font-semibold">审批轨迹</h3>
        <el-timeline>
          <el-timeline-item
            v-for="item in approvalData.timeline"
            :key="item.id"
            :timestamp="item.operatedAt"
            placement="top"
          >
            <div class="timeline-item">
              <div class="timeline-head">
                <strong>{{ item.summary }}</strong>
                <ElTag size="small" :type="statusTagTypeMap[item.status] || 'info'">
                  {{ statusTextMap[item.status] || item.status }}
                </ElTag>
              </div>
              <p class="timeline-operator">操作人：{{ item.operatorName }}</p>
              <p v-if="item.comment" class="timeline-comment">备注：{{ item.comment }}</p>
              <p v-if="item.attachments?.length" class="timeline-comment">
                附件：{{ item.attachments.join('，') }}
              </p>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
      <AiSuggestion :approval-id="approvalData.id" />
    </ElCard>

    <div v-else class="empty-state">
      审批单不存在
    </div>
    </template>

    <!-- 移动端布局 -->
    <div v-else class="h-full flex flex-col bg-gray-50">
      <!-- 加载中 -->
      <div v-if="isLoading" class="flex-1 flex items-center justify-center">
        <p class="text-gray-500">加载中...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center px-4">
        <p class="text-red-500 mb-4">加载失败</p>
        <div class="flex gap-3">
          <el-button type="primary" size="small" @click="handleRetry">重试</el-button>
          <el-button size="small" @click="router.push('/approval/todo')">返回待办</el-button>
        </div>
      </div>

      <!-- 内容区域 -->
      <div v-else-if="approvalData" class="flex-1 overflow-y-auto pb-20">
        <!-- 头部卡片 -->
        <div class="bg-white border-b border-gray-200 p-4">
          <div class="flex items-start justify-between mb-3">
            <h1 class="text-lg font-bold text-gray-800 flex-1 mr-3">
              {{ approvalData.title }}
            </h1>
            <el-tag :type="statusTagTypeMap[approvalData.status] || 'warning'" size="small">
              {{ statusTextMap[approvalData.status] || approvalData.status }}
            </el-tag>
          </div>

          <!-- 申请人信息 -->
          <div class="flex items-center gap-3 mb-3">
            <el-avatar :size="40" class="bg-primary">
              {{ approvalData.applicant.charAt(0) }}
            </el-avatar>
            <div class="flex-1">
              <div class="text-sm font-medium text-gray-700">
                {{ approvalData.applicant }}
              </div>
              <div class="text-xs text-gray-500">
                {{ approvalData.applyTime }}
              </div>
            </div>
          </div>

          <!-- 基本信息 -->
          <div class="space-y-2 text-sm">
            <div class="flex items-center text-gray-600">
              <span class="text-gray-500 w-20">当前节点</span>
              <span class="flex-1">{{ approvalData.currentNode?.name || approvalData.currentNodeName || '待处理' }}</span>
            </div>
            <div class="flex items-center text-gray-600">
              <span class="text-gray-500 w-20">审批策略</span>
              <span class="flex-1">{{ collaborationModeText }}</span>
            </div>
            <div class="flex items-center text-gray-600">
              <span class="text-gray-500 w-20">节点进度</span>
              <span class="flex-1">{{ currentNodeProgressText }}</span>
            </div>
            <div v-if="approvalData.currentDelegationSummary" class="flex items-start text-gray-600">
              <span class="text-gray-500 w-20">代理说明</span>
              <span class="flex-1">{{ approvalData.currentDelegationSummary }}</span>
            </div>
            <div v-if="approvalData.description" class="flex items-start text-gray-600">
              <span class="text-gray-500 w-20">描述</span>
              <span class="flex-1">{{ approvalData.description }}</span>
            </div>
            <div class="flex items-center">
              <span class="text-gray-500 w-20">SLA状态</span>
              <el-tag :type="slaTagType" size="small">{{ slaText }}</el-tag>
            </div>
            <div
              v-if="approvalData.status === 'pending' && !isActionable"
              class="text-xs text-amber-600"
            >
              当前节点待 {{ pendingHandlerText }} 处理
            </div>
          </div>
        </div>

        <!-- 表单内容卡片 -->
        <div v-if="formSchema" class="bg-white mt-3 p-4">
          <h3 class="text-base font-semibold text-gray-800 mb-4">表单内容</h3>
          <DynamicForm
            ref="dynamicFormRef"
            :schema="formSchema"
            :model-value="approvalData.formData"
            :permissions="nodePermissions"
            :show-submit="false"
            :disabled="!isActionable"
          />
        </div>

        <!-- 审批轨迹卡片 -->
        <div class="bg-white mt-3 p-4">
          <h3 class="text-base font-semibold text-gray-800 mb-4">审批轨迹</h3>
          <el-timeline>
            <el-timeline-item
              v-for="item in approvalData.timeline"
              :key="item.id"
              :timestamp="item.operatedAt"
              placement="top"
            >
              <div class="text-sm">
                <div class="flex items-center justify-between mb-1">
                  <strong class="text-gray-800">{{ item.summary }}</strong>
                  <el-tag size="small" :type="statusTagTypeMap[item.status] || 'info'">
                    {{ statusTextMap[item.status] || item.status }}
                  </el-tag>
                </div>
                <p class="text-gray-600 mb-1">操作人：{{ item.operatorName }}</p>
                <p v-if="item.comment" class="text-gray-600">备注：{{ item.comment }}</p>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="flex-1 flex items-center justify-center">
        <p class="text-gray-500">审批单不存在</p>
      </div>

      <!-- 底部固定操作栏 -->
      <div v-if="approvalData && isActionable" class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 safe-area-inset-bottom">
        <div class="flex gap-2">
          <el-button
            type="success"
            class="flex-1"
            :loading="isSubmitLoading"
            @click="handleApprove"
          >
            通过
          </el-button>
          <el-button
            type="danger"
            class="flex-1"
            :loading="isSubmitLoading"
            @click="handleReject"
          >
            驳回
          </el-button>
          <el-button
            class="w-16"
            :loading="isSubmitLoading"
            @click="showMoreActions"
          >
            更多
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.approval-detail {
  padding: 24px;
}

.approval-detail-mobile {
  height: 100%;
}

.safe-area-inset-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

.card-wrapper {
  max-width: 960px;
  margin: 0 auto;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 8px 16px;
}

.timeline-block {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.timeline-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.timeline-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.timeline-operator,
.timeline-comment {
  margin: 0;
  color: #606266;
}
</style>
