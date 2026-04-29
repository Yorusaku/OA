<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ElButton,
  ElCard,
  ElMessage,
  ElMessageBox,
  ElTag,
} from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { useDevice } from '@/composables/useDevice'
import { useApprovalDetail } from '@/composables/useApprovalDetail'
import type { FormSchema, PermissionsMap } from '@/types/form-schema'
import DynamicForm from '@/components/dynamic-form/DynamicForm.vue'
import { useApprovalSubmit } from './composables/useApprovalSubmit'

const route = useRoute()
const router = useRouter()
const { isMobile } = useDevice()
const approvalId = route.params.id as string

const { data: approval, isLoading, error, refetch } = useApprovalDetail(approvalId)
const { isLoading: isSubmitLoading, submitApproval } = useApprovalSubmit()

const approvalData = computed(() => approval.value)
const dynamicFormRef = ref<InstanceType<typeof DynamicForm> | null>(null)

const isActionable = computed(() => {
  if (approval.value?.status !== 'pending')
    return false
  if (typeof approval.value?.canCurrentUserProcess === 'boolean')
    return approval.value.canCurrentUserProcess
  return true
})

const formSchema = computed((): FormSchema | undefined => approval.value?.formSchema)

const nodePermissions = computed((): PermissionsMap => approval.value?.nodePermissions || {})
const collaborationModeText = computed(() => {
  if (approval.value?.currentNodeMode === 'and')
    return '会签'
  if (approval.value?.currentNodeMode === 'or')
    return '或签'
  return '单人审批'
})
const currentNodeProgressText = computed(() => approval.value?.currentNodeProgressText || '-')
const pendingHandlerText = computed(() => {
  const handlers = approval.value?.pendingTaskHandlerNames || []
  return handlers.length ? handlers.join('、') : '-'
})

const statusTextMap: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
  cancelled: '已取消',
  withdrawn: '已撤回',
  transferred: '已转交',
}

const statusTagTypeMap: Record<string, 'warning' | 'success' | 'danger' | 'info' | 'primary'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'info',
  withdrawn: 'info',
  transferred: 'primary',
}

const slaTagType = computed<'success' | 'warning' | 'danger'>(() => {
  if (approval.value?.slaStatus === 'escalated')
    return 'danger'
  if (approval.value?.slaStatus === 'overdue')
    return 'warning'
  return 'success'
})

const slaText = computed(() => {
  if (approval.value?.slaStatus === 'escalated')
    return '已升级'
  if (approval.value?.slaStatus === 'overdue')
    return '已超时'
  return '正常'
})

async function submitProcess(
  operation: 'approve' | 'reject' | 'transfer' | 'addSign' | 'remind' | 'withdraw' | 'cancel',
  options?: {
    comment?: unknown
    commentText?: string
    targetUserId?: string
    targetUserName?: string
    attachments?: string[]
  },
): Promise<void> {
  const currentApproval = approvalData.value
  if (!currentApproval) {
    ElMessage.error('审批数据不存在，请刷新后重试')
    return
  }

  if (currentApproval.status !== 'pending') {
    ElMessage.warning('当前状态不允许继续审批')
    return
  }

  if (!isActionable.value) {
    ElMessage.warning('当前审批节点不在你的待办范围内')
    return
  }

  if ((operation === 'transfer' || operation === 'addSign')
    && !options?.targetUserId?.trim()
    && !options?.targetUserName?.trim()) {
    ElMessage.warning('请选择目标处理人后再提交')
    return
  }

  await submitApproval({
    action: 'process',
    id: approvalId,
    operation,
    comment: options?.comment,
    commentText: options?.commentText,
    targetUserId: options?.targetUserId,
    targetUserName: options?.targetUserName,
    attachments: options?.attachments,
  })

  await refetch()
}

async function handleApprove(): Promise<void> {
  if (isSubmitLoading.value || !dynamicFormRef.value)
    return

  try {
    const isValid = await dynamicFormRef.value.validate()
    if (!isValid) {
      ElMessage.warning('请完善必填表单内容')
      return
    }

    const formData = dynamicFormRef.value.getValues()
    await ElMessageBox.confirm(`确认通过《${approvalData.value?.title}》？`, '审批确认', { type: 'warning' })

    await submitProcess('approve', {
      comment: formData,
      commentText: extractCommentText(formData),
    })
  }
  catch (err) {
    if (err !== 'cancel') {
      console.error('审批通过失败:', err)
      ElMessage.error('审批失败，请重试')
    }
  }
}

async function handleReject(): Promise<void> {
  if (isSubmitLoading.value || !dynamicFormRef.value)
    return

  try {
    const isValid = await dynamicFormRef.value.validate()
    if (!isValid) {
      ElMessage.warning('请完善必填表单内容')
      return
    }

    const formData = dynamicFormRef.value.getValues()
    await ElMessageBox.confirm('确认驳回此申请？', '驳回确认', { type: 'error' })

    await submitProcess('reject', {
      comment: formData,
      commentText: extractCommentText(formData),
    })
  }
  catch (err) {
    if (err !== 'cancel')
      ElMessage.error('驳回失败，请重试')
  }
}

async function handleTransfer(): Promise<void> {
  if (isSubmitLoading.value)
    return

  try {
    const promptResult = await ElMessageBox.prompt('请输入转交人账号（示例：user-002）', '转交审批', {
      inputPlaceholder: '请输入转交人账号',
      confirmButtonText: '确认转交',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '转交人不能为空',
    })
    const targetUserId = (typeof promptResult === 'string' ? promptResult : promptResult.value).trim()
    if (!targetUserId) {
      ElMessage.warning('转交人不能为空')
      return
    }

    await submitProcess('transfer', {
      targetUserId,
      targetUserName: targetUserId,
      commentText: `审批已转交给 ${targetUserId}`,
    })
  }
  catch (err) {
    if (err !== 'cancel')
      ElMessage.error('转交失败，请重试')
  }
}

async function handleAddSign(): Promise<void> {
  if (isSubmitLoading.value)
    return

  try {
    const promptResult = await ElMessageBox.prompt('请输入加签人账号（示例：user-003）', '发起加签', {
      inputPlaceholder: '请输入加签人账号',
      confirmButtonText: '确认加签',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '加签人不能为空',
    })
    const targetUserId = (typeof promptResult === 'string' ? promptResult : promptResult.value).trim()
    if (!targetUserId) {
      ElMessage.warning('加签人不能为空')
      return
    }

    await submitProcess('addSign', {
      targetUserId,
      targetUserName: targetUserId,
      commentText: `已向 ${targetUserId} 发起加签`,
    })
  }
  catch (err) {
    if (err !== 'cancel')
      ElMessage.error('加签失败，请重试')
  }
}

async function handleRemind(): Promise<void> {
  if (isSubmitLoading.value)
    return

  try {
    await submitProcess('remind', { commentText: '发起催办提醒' })
  }
  catch {
    ElMessage.error('催办失败，请重试')
  }
}

async function handleWithdraw(): Promise<void> {
  if (isSubmitLoading.value)
    return

  try {
    await ElMessageBox.confirm('确认撤回该审批申请？', '撤回确认', { type: 'warning' })
    await submitProcess('withdraw', { commentText: '发起人撤回审批' })
  }
  catch (err) {
    if (err !== 'cancel')
      ElMessage.error('撤回失败，请重试')
  }
}

async function handleCancel(): Promise<void> {
  if (isSubmitLoading.value)
    return

  try {
    await ElMessageBox.confirm('确认取消该审批申请？', '取消确认', { type: 'warning' })
    await submitProcess('cancel', { commentText: '审批流程取消' })
  }
  catch (err) {
    if (err !== 'cancel')
      ElMessage.error('取消失败，请重试')
  }
}

async function handleRetry(): Promise<void> {
  await refetch()
}

function extractCommentText(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object')
    return undefined

  const data = payload as Record<string, unknown>
  if (typeof data.comment === 'string' && data.comment.trim())
    return data.comment.trim()
  if (typeof data.reason === 'string' && data.reason.trim())
    return data.reason.trim()
  if (typeof data.description === 'string' && data.description.trim())
    return data.description.trim()
  return undefined
}

// 移动端更多操作菜单
function showMoreActions() {
  const actions = [
    { key: '1', label: '转交', handler: handleTransfer },
    { key: '2', label: '加签', handler: handleAddSign },
    { key: '3', label: '催办', handler: handleRemind },
    { key: '4', label: '撤回', handler: handleWithdraw },
    { key: '5', label: '取消', handler: handleCancel },
  ]

  ElMessageBox.prompt(
    actions.map(item => `${item.key}. ${item.label}`).join('\n'),
    '更多操作',
    {
      inputPlaceholder: '请输入编号 1-5',
      inputPattern: /^[1-5]$/,
      inputErrorMessage: '请输入有效编号',
      confirmButtonText: '执行',
      cancelButtonText: '取消',
    },
  ).then(({ value }) => {
    const selected = actions.find(item => item.key === value.trim())
    if (!selected) {
      ElMessage.warning('无效操作')
      return
    }
    selected.handler()
  }).catch(() => {})
}
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
