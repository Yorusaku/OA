/**
 * Approval launch business logic.
 */

import type { Ref } from 'vue'
import type { ApprovalDraft, ApprovalRecord } from '@/api/types'
import type { FormSchema } from '@/types/form-schema'
import type { Workflow } from '@/types/workflow'
import { computed, nextTick, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { useWorkflowList } from '@/composables/useWorkflowList'
import { useWorkflowSchema } from '@/composables/useWorkflowSchema'
import { useUserStore } from '@/stores/user'
import { createDraft, listDrafts, removeDraft as removeDraftApi } from '@/api/draft'
import { useApprovalSubmit } from './useApprovalSubmit'

export interface UseApprovalLaunchReturn {
  workflowList: Ref<Workflow[] | undefined>
  selectedWorkflow: Ref<Workflow | undefined>
  formSchema: Ref<FormSchema | undefined>
  isWorkflowLoading: Ref<boolean>
  isSchemaLoading: Ref<boolean>
  isSubmitLoading: Ref<boolean>
  dynamicFormRef: Ref<any>
  drafts: Ref<ApprovalDraft[]>
  isDraftLoading: Ref<boolean>
  showDraftPanel: Ref<boolean>
  selectWorkflow: (workflow: Workflow) => Promise<void>
  handleSubmit: () => Promise<void>
  handleSuccess: () => void
  resetForm: () => void
  loadDrafts: () => Promise<void>
  saveDraft: () => Promise<void>
  loadDraft: (draft: ApprovalDraft) => Promise<void>
  removeDraftItem: (id: string) => Promise<void>
}

const formCache = new Map<string, Record<string, any>>()

async function waitForFormReady(
  getForm: () => any,
  apply: () => void,
  timeout = 2000,
): Promise<boolean> {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeout) {
    if (getForm()?.setValues) {
      apply()
      return true
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  return false
}

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

  const drafts = ref<ApprovalDraft[]>([])
  const isDraftLoading = ref(false)
  const showDraftPanel = ref(false)

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

  const loadDrafts = async (): Promise<void> => {
    isDraftLoading.value = true
    try {
      drafts.value = await listDrafts()
    }
    finally {
      isDraftLoading.value = false
    }
  }

  const saveDraft = async (): Promise<void> => {
    if (!selectedWorkflow.value) {
      ElMessage.warning('请先选择审批流程')
      return
    }

    const formData = dynamicFormRef.value?.getValues?.() ?? {}
    await createDraft({
      workflowId: selectedWorkflow.value.id,
      workflowType: selectedWorkflow.value.name,
      title: `${selectedWorkflow.value.name} - 草稿`,
      applicant: userStore.userInfo?.name || '当前用户',
      applicantAvatar: userStore.userInfo?.avatar,
      formData,
      description: String(formData.reason ?? formData.description ?? ''),
      amount: Number(formData.amount ?? formData.budget ?? formData.days ?? 0),
      isUrgent: Boolean(formData.isUrgent),
    })
    ElMessage.success('草稿已保存')
    await loadDrafts()
  }

  const loadDraft = async (draft: ApprovalDraft): Promise<void> => {
    if (draft.workflowId) {
      const workflow = workflowList.value?.find(w => w.id === draft.workflowId)
      if (workflow) {
        if (dynamicFormRef.value && selectedWorkflowId.value) {
          const currentFormData = dynamicFormRef.value.getValues?.() ?? {}
          if (Object.keys(currentFormData).length > 0)
            formCache.set(selectedWorkflowId.value, currentFormData)
        }
        selectedWorkflowId.value = workflow.id
      }
    }

    formCache.set(selectedWorkflowId.value, draft.formData ?? {})
    const applied = await waitForFormReady(
      () => dynamicFormRef.value,
      () => dynamicFormRef.value?.setValues?.(draft.formData ?? {}),
    )

    showDraftPanel.value = false
    if (applied) {
      ElMessage.success(`已载入草稿「${draft.title}」`)
    }
    else {
      ElMessage.warning('表单尚未就绪，请重新选择流程后再查看草稿')
    }
  }

  const removeDraftItem = async (id: string): Promise<void> => {
    await removeDraftApi(id)
    await loadDrafts()
    ElMessage.success('草稿已删除')
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
        throw err
      }
    }
  }

  const handleSuccess = (): void => {
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
    drafts,
    isDraftLoading,
    showDraftPanel,
    selectWorkflow,
    handleSubmit,
    handleSuccess,
    resetForm,
    loadDrafts,
    saveDraft,
    loadDraft,
    removeDraftItem,
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