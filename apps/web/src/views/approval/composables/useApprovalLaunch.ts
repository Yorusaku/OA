/**
 * useApprovalLaunch - 发起审批业务逻辑
 * 管理流程选择、表单渲染、表单缓存、提交等核心功能
 */

import { nextTick, ref, computed, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useWorkflowList, type Workflow } from '@/composables/useWorkflowList'
import { useWorkflowSchema } from '@/composables/useWorkflowSchema'
import { useApprovalSubmit, type SubmitPayload } from './useApprovalSubmit'
import type { FormSchema } from '@/types/form-schema'

// ==================== 类型定义 ====================
export interface UseApprovalLaunchReturn {
  // 状态
  workflowList: Ref<Workflow[] | undefined>
  selectedWorkflow: Ref<Workflow | undefined>
  formSchema: Ref<FormSchema | undefined>
  
  // 加载状态
  isWorkflowLoading: Ref<boolean>
  isSchemaLoading: Ref<boolean>
  isSubmitLoading: Ref<boolean>
  
  // 表单引用
  dynamicFormRef: Ref<any>
  
  // 方法
  selectWorkflow: (workflow: Workflow) => void
  handleSubmit: () => Promise<void>
  handleSuccess: () => void
  resetForm: () => void
}

// ==================== 表单数据缓存 Map ====================
// key: workflowId, value: formData
const formCache = new Map<string, Record<string, any>>()

// ==================== 核心逻辑 ====================
export const useApprovalLaunch = (): UseApprovalLaunchReturn => {
  const router = useRouter()
  
  // ==================== 数据状态 ====================
  // 流程列表
  const { data: workflowList, isLoading: isWorkflowLoading } = useWorkflowList()
  
  // 选中的流程 ID
  const selectedWorkflowId = ref<string | null>(null)
  
  // 选中的流程
  const selectedWorkflow = computed(() => 
    workflowList.value?.find(w => w.id === selectedWorkflowId.value)
  )
  
  // 表单 Schema
  const { data: formSchema, isLoading: isSchemaLoading } = useWorkflowSchema(
    computed(() => selectedWorkflowId.value!)
  )
  
  // ==================== 表单引用 ====================
  const dynamicFormRef = ref<any>(null)
  
  // ==================== 提交状态 ====================
  const { isLoading: isSubmitLoading, submitApproval } = useApprovalSubmit()
  
  // ==================== 方法 ====================
  
  /**
   * 选择流程
   * @param workflow - 选中的流程
   */
  const selectWorkflow = async (workflow: Workflow): Promise<void> => {
    // Step 1: 在切换流程前,先保存当前正在填写的表单数据到 formCache
    if (dynamicFormRef.value) {
      const currentFormData = dynamicFormRef.value.getValues()
      if (Object.keys(currentFormData).length > 0 && selectedWorkflowId.value) {
        formCache.set(selectedWorkflowId.value, currentFormData)
      }
    }
    
    // Step 2: 切换选中的流程 ID
    selectedWorkflowId.value = workflow.id
    
    // Step 3: 使用 nextTick 确保 formSchema 已更新,DOM 已重新渲染
    await nextTick()
    
    // Step 4: 从缓存中恢复表单数据
    const cachedForm = formCache.get(workflow.id)
    if (cachedForm && dynamicFormRef.value) {
      dynamicFormRef.value.setValues(cachedForm)
    }
  }
  
  /**
   * 提交审批
   */
  const handleSubmit = async (): Promise<void> => {
    // Step 1: 校验表单
    if (!dynamicFormRef.value) {
      ElMessage.warning('请先选择一个流程并填写表单')
      return
    }
    
    const isValid = await dynamicFormRef.value.validate()
    if (!isValid) {
      ElMessage.warning('请完善表单内容')
      return
    }
    
    // Step 2: 获取表单数据
    const formData = dynamicFormRef.value.getValues()
    
    // Step 3: 保存到缓存
    if (selectedWorkflowId.value) {
      formCache.set(selectedWorkflowId.value, formData)
    }
    
    // Step 4: 真实的二次确认 (使用 ElMessageBox.confirm)
    try {
      await ElMessageBox.confirm(
        `确认提交【${selectedWorkflow.value?.name}】申请？`,
        '提交确认',
        {
          type: 'warning',
          confirmButtonText: '确认提交',
          cancelButtonText: '取消',
        }
      )
      
      // Step 5: 提交审批
      if (selectedWorkflowId.value) {
        const payload: SubmitPayload = {
          status: 'pending',
          comment: formData,
        }
        
        await submitApproval(selectedWorkflowId.value, payload)
        
        // Step 6: 成功处理
        handleSuccess()
      }
    } catch (err) {
      if (err !== 'cancel') {
        ElMessage.error('提交失败,请重试')
        throw err
      }
    }
  }
  
  /**
   * 提交成功处理
   */
  const handleSuccess = (): void => {
    ElMessage.success('审批提交成功')
    // 跳转到我的申请页面
    router.push('/approval/mine')
  }
  
  /**
   * 重置表单
   */
  const resetForm = (): void => {
    if (dynamicFormRef.value) {
      dynamicFormRef.value.resetFields()
    }
    // 清空缓存
    if (selectedWorkflowId.value) {
      formCache.delete(selectedWorkflowId.value)
    }
  }
  
  // ==================== 返回 ====================
  return {
    // 状态
    workflowList,
    selectedWorkflow,
    formSchema,
    
    // 加载状态
    isWorkflowLoading,
    isSchemaLoading,
    isSubmitLoading,
    
    // 表单引用
    dynamicFormRef,
    
    // 方法
    selectWorkflow,
    handleSubmit,
    handleSuccess,
    resetForm,
  }
}
