/**
 * Approval launch business logic.
 */

import type { Ref } from 'vue'
import type { ApprovalRecord } from '@/api/types'
import type { FormSchema } from '@/types/form-schema'
import type { Workflow } from '@/types/workflow'
import { computed, nextTick, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { useWorkflowList } from '@/composables/useWorkflowList'
import { useWorkflowSchema } from '@/composables/useWorkflowSchema'
import { useUserStore } from '@/stores/user'
import { useApprovalSubmit } from './useApprovalSubmit'

export interface UseApprovalLaunchReturn {
  workflowList: Ref<Workflow[] | undefined>
  selectedWorkflow: Ref<Workflow | undefined>
  formSchema: Ref<FormSchema | undefined>
  isWorkflowLoading: Ref<boolean>
  isSchemaLoading: Ref<boolean>
  isSubmitLoading: Ref<boolean>
  dynamicFormRef: Ref<any>
  selectWorkflow: (workflow: Workflow) => Promise<void>
  handleSubmit: () => Promise<void>
  handleSuccess: () => void
  resetForm: () => void
}

const formCache = new Map<string, Record<string, any>>()

export const useApprovalLaunch = (): UseApprovalLaunchReturn => {
  const router = useRouter()
  const userStore = useUserStore()
  const { data: workflowList, isLoading: isWorkflowLoading } = useWorkflowList()
  const selectedWorkflowId = ref<string>('')

  const selectedWorkflow = computed(() =>
    workflowList.value?.find(w => w.id === selectedWorkflowId.value),
  )

  const selectedSchemaId = computed(() => selectedWorkflow.value?.schemaId ?? '')

  const { data: formSchema, isLoading: isSchemaLoading } = useWorkflowSchema(selectedSchemaId)

  const dynamicFormRef = ref<any>(null)
  const { isLoading: isSubmitLoading, submitApproval } = useApprovalSubmit()

  const selectWorkflow = async (workflow: Workflow): Promise<void> => {
    if (dynamicFormRef.value && selectedWorkflowId.value) {
      const currentFormData = dynamicFormRef.value.getValues?.() ?? {}
      if (Object.keys(currentFormData).length > 0)
        formCache.set(selectedWorkflowId.value, currentFormData)
    }

    selectedWorkflowId.value = workflow.id
    await nextTick()

    const cachedForm = formCache.get(workflow.id)
    if (cachedForm && dynamicFormRef.value)
      dynamicFormRef.value.setValues?.(cachedForm)
  }

  const handleSubmit = async (): Promise<void> => {
    if (!dynamicFormRef.value) {
      ElMessage.warning('请先选择流程并填写表单')
      return
    }

    const isValid = await dynamicFormRef.value.validate?.()
    if (!isValid) {
      ElMessage.warning('请完善表单内容')
      return
    }

    const formData = dynamicFormRef.value.getValues?.() ?? {}
    if (selectedWorkflowId.value)
      formCache.set(selectedWorkflowId.value, formData)

    try {
      await ElMessageBox.confirm(
        `确认提交《${selectedWorkflow.value?.name ?? '审批单'}》申请？`,
        '提交确认',
        {
          type: 'warning',
          confirmButtonText: '确认提交',
          cancelButtonText: '取消',
        },
      )

      if (!selectedWorkflowId.value)
        return

      const createData: Omit<ApprovalRecord, 'id' | 'status' | 'applyTime'> = {
        title: `${selectedWorkflow.value?.name ?? '审批单'} - ${new Date().toLocaleDateString('zh-CN')}`,
        type: resolveApprovalType(selectedWorkflow.value),
        applicant: userStore.userInfo?.name || '当前用户',
        applicantAvatar: userStore.userInfo?.avatar,
        amount: Number(formData.amount ?? formData.budget ?? formData.days ?? 0),
        description: String(formData.reason ?? formData.description ?? selectedWorkflow.value?.description ?? ''),
        currentNodeName: '发起申请',
        formData,
        isUrgent: Boolean(formData.isUrgent),
        latestComment: String(formData.reason ?? formData.description ?? ''),
        latestAttachments: Array.isArray(formData.attachments)
          ? formData.attachments.map((item: unknown) => String(item))
          : undefined,
      }

      await submitApproval({
        action: 'create',
        data: createData,
      })
      handleSuccess()
    }
    catch (err) {
      if (err !== 'cancel') {
        ElMessage.error('提交失败，请重试')
        throw err
      }
    }
  }

  const handleSuccess = (): void => {
    ElMessage.success('审批提交成功')
    router.push('/approval/mine')
  }

  const resetForm = (): void => {
    dynamicFormRef.value?.resetFields?.()
    if (selectedWorkflowId.value)
      formCache.delete(selectedWorkflowId.value)
  }

  return {
    workflowList,
    selectedWorkflow,
    formSchema,
    isWorkflowLoading,
    isSchemaLoading,
    isSubmitLoading,
    dynamicFormRef,
    selectWorkflow,
    handleSubmit,
    handleSuccess,
    resetForm,
  }
}

function resolveApprovalType(workflow?: Workflow): ApprovalRecord['type'] {
  const id = workflow?.id ?? ''
  const name = workflow?.name ?? ''
  if (id.includes('leave') || name.includes('请假'))
    return 'leave'
  if (id.includes('expense') || id.includes('reimbursement') || name.includes('报销'))
    return 'expense'
  if (id.includes('purchase') || name.includes('采购'))
    return 'purchase'
  return 'other'
}
