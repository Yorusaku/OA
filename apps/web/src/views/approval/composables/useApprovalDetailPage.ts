import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox, type MessageBoxData } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import DynamicForm from '@/components/dynamic-form/DynamicForm.vue'
import { useDevice } from '@/composables/useDevice'
import { useApprovalDetail } from '@/composables/useApprovalDetail'
import type { FormSchema, PermissionsMap } from '@/types/form-schema'
import { useApprovalSubmit } from './useApprovalSubmit'

type ApprovalProcessOperation
  = | 'approve'
    | 'reject'
    | 'transfer'
    | 'addSign'
    | 'remind'
    | 'withdraw'
    | 'cancel'

interface SubmitOptions {
  comment?: unknown
  commentText?: string
  targetUserId?: string
  targetUserName?: string
  attachments?: string[]
}

export function useApprovalDetailPage() {
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

  function normalizePromptValue(result: MessageBoxData) {
    if (typeof result === 'string')
      return result
    if (result && typeof result === 'object' && 'value' in result)
      return String((result as { value?: unknown }).value || '')
    return ''
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

  async function submitProcess(
    operation: ApprovalProcessOperation,
    options?: SubmitOptions,
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
      const targetUserId = normalizePromptValue(promptResult).trim()
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
      const targetUserId = normalizePromptValue(promptResult).trim()
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
    ).then((result) => {
      const selected = actions.find(item => item.key === normalizePromptValue(result).trim())
      if (!selected) {
        ElMessage.warning('无效操作')
        return
      }
      selected.handler()
    }).catch(() => {})
  }

  return {
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
  }
}
