<script setup lang="ts">
import { computed, defineComponent, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElCard, ElButton, ElTag } from 'element-plus'
import { useApprovalDetail } from '@/composables/useApprovalDetail'
import { useApprovalSubmit } from './composables/useApprovalSubmit'
import DynamicForm from '@/components/dynamic-form/DynamicForm.vue'
import type { FormSchema, PermissionsMap } from '@/types/form-schema'

// ==================== 组件定义 ====================
defineComponent({
  name: 'ApprovalDetail',
})

// ==================== 路由与数据 ====================
const route = useRoute()
const router = useRouter()
const approvalId = route.params.id as string

console.log(' ApprovalDetail - approvalId:', approvalId)

// 获取审批详情
const { data: approval, isLoading, error, refetch } = useApprovalDetail(approvalId)

// 获取审批提交逻辑
const { isLoading: isSubmitLoading, submitApproval } = useApprovalSubmit()

// 解包 ref 数据（用于模板中的响应式引用）
const approvalData = computed(() => {
  const data = approval.value
  console.log(' ApprovalDetail - approvalData:', data)
  return data
})

// ==================== DynamicForm 引用 ====================
const dynamicFormRef = ref<InstanceType<typeof DynamicForm> | null>(null)

// ==================== 计算属性 ====================
// Test #6：pending 状态显示表单与按钮
const isActionable = computed(() => approval.value?.status === 'pending')

// Test #2：传递表单 Schema
const formSchema = computed((): FormSchema | undefined => {
  const schema = approval.value?.formSchema
  console.log(' ApprovalDetail - formSchema:', schema)
  return schema
})

// Test #3：传递节点权限
const nodePermissions = computed((): PermissionsMap => {
  const permissions = approval.value?.nodePermissions || {}
  console.log(' ApprovalDetail - nodePermissions:', permissions)
  return permissions
})

// ==================== 常量定义 ====================
const CONSTANTS = {
  APPROVE_TITLE: '审批确认',
  REJECT_TITLE: '驳回确认',
  SUCCESS_APPROVE: '审批通过成功',
  SUCCESS_REJECT: '审批驳回成功',
  ERROR_RETRY: '操作失败，请重试',
  REQUIRED_FIELDS: '请完善必填表单内容',
  UNKNOW_ERROR: '未知错误',
}

// ==================== 操作方法 ====================
// Test #4 & #7：点击同意触发 validate()
const handleApprove = async (): Promise<void> => {
  if (!dynamicFormRef.value) return

  try {
    // 核心：提交前校验
    const isValid = await dynamicFormRef.value.validate()
    if (!isValid) {
      ElMessage.warning(CONSTANTS.REQUIRED_FIELDS)
      return
    }

    // 获取表单数据
    const formData = dynamicFormRef.value.getValues()

    // 二次确认
    await ElMessageBox.confirm(`确认通过【${approvalData.value?.title}】？`, CONSTANTS.APPROVE_TITLE, { type: 'warning' })

    // 提交审批
    await submitApproval(approvalId, {
      status: 'approved',
      comment: formData,
    })
    
    ElMessage.success(CONSTANTS.SUCCESS_APPROVE)
    await refetch()
  } catch (err) {
    if (err !== 'cancel') console.error('审批失败:', err)
  }
}

// 驳回逻辑
const handleReject = async (): Promise<void> => {
  if (!dynamicFormRef.value) return

  try {
    await dynamicFormRef.value.validate()
    const formData = dynamicFormRef.value.getValues()
    
    await ElMessageBox.confirm('确认驳回此申请？', CONSTANTS.REJECT_TITLE, { type: 'error' })

    // 提交审批
    await submitApproval(approvalId, {
      status: 'rejected',
      comment: formData,
    })
    
    ElMessage.success(CONSTANTS.SUCCESS_REJECT)
    await refetch()
  } catch (err) {
    // 忽略取消操作
  }
}
</script>

<template>
  <div class="approval-detail">
    <!-- 加载中状态 -->
    <ElCard v-if="isLoading" class="card-wrapper">
      <div class="text-center py-8">
        <p>加载中...</p>
      </div>
    </ElCard>

    <!-- 加载错误状态 -->
    <ElCard v-else-if="error" class="card-wrapper">
      <div class="text-center py-8">
        <p class="text-red-500 mb-4">加载失败</p>
        <ElButton @click="router.back()">返回</ElButton>
      </div>
    </ElCard>

    <!-- 正常审批详情 -->
    <ElCard v-else-if="approvalData" class="card-wrapper">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-bold">{{ approvalData.title }}</span>
          <ElTag :type="approvalData.status === 'approved' ? 'success' : approvalData.status === 'rejected' ? 'danger' : 'warning'">
            {{ approvalData.status === 'pending' ? '待审批' : approvalData.status === 'approved' ? '已通过' : '已驳回' }}
          </ElTag>
        </div>
      </template>

      <!-- 审批基础信息 -->
      <div class="mb-6">
        <p><strong>申请人：</strong>{{ approvalData.applicant }}</p>
        <p><strong>申请时间：</strong>{{ approvalData.applyTime }}</p>
        <p><strong>描述：</strong>{{ approvalData.description }}</p>
      </div>

      <!-- Test #6：仅 pending 状态显示表单 -->
      <div v-if="isActionable">
        <!--
          Test #1：DynamicForm 挂载
          Test #2：传递 schema
          Test #3：传递 permissions
        -->
        <DynamicForm
          ref="dynamicFormRef"
          :schema="formSchema"
          :model-value="approvalData.formData"
          :permissions="nodePermissions"
          :show-submit="false"
          :disabled="!isActionable || approvalData.status !== 'pending'"
        />

        <!-- Test #5：显示同意/驳回按钮 -->
        <div class="action-buttons mt-6 flex justify-end gap-4">
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
        </div>
      </div>

      <!-- 审批结束状态 -->
      <div v-else>
        <p>审批已结束</p>
      </div>
    </ElCard>

    <div v-else class="empty-state">
      审批单不存在
    </div>
  </div>
</template>

<style scoped>
.approval-detail { padding: 24px; }
.card-wrapper { max-width: 900px; margin: 0 auto; }
</style>
