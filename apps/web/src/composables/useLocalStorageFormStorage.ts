/**
 * useLocalStorageFormStorage.ts - 表单数据持久化层（纯函数 Composable）
 *
 * 设计理念：
 * - 使用 @vueuse/core 的 useLocalStorage 自动同步响应式数据
 * - 采用纯函数设计，便于单元测试
 * - 包含高危操作防御：重复名称拦截、已绑定表单删除警告
 */

import { useLocalStorage } from '@vueuse/core'
import { nanoid } from 'nanoid'
import { ElMessage } from 'element-plus'
import type { Ref } from 'vue'
import type { FormSchema } from '@/types/form-schema'

// ==================== 类型定义 ====================

/**
 * 表单数据传输对象（DTO）
 */
export interface FormDTO {
  id: string
  name: string
  schema: FormSchema
  createTime: number
  updateTime: number
}

/**
 * 新建表单参数（不含自动生成字段）
 */
export interface CreateFormParams {
  name: string
  schema: FormSchema
}

/**
 * 更新表单参数（含完整字段）
 */
export interface UpdateFormParams extends FormDTO {}

/**
 * 审批配置基础结构（仅包含 formId 字段）
 */
interface ApprovalBase {
  formId?: string
}

/**
 * 审批配置列表类型
 */
type ApprovalList = Record<string, unknown>[]

/**
 * 表单存储接口定义
 */
export interface FormStorageAPI {
  formList: Ref<FormDTO[]>
  addForm: (params: CreateFormParams) => Promise<void>
  updateForm: (form: UpdateFormParams) => Promise<void>
  deleteForm: (id: string) => Promise<void>
  getFormById: (id: string) => FormDTO | undefined
  checkBindingCount: (id: string) => number
  formatDate: (timestamp: number) => string
}

// ==================== 纯函数：时间格式化 ====================

/**
 * 格式化时间戳为可读日期（纯函数）
 *
 * @param timestamp 时间戳
 * @returns 格式化后的日期字符串
 */
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

// ==================== 核心实现 ====================

/**
 * 表单 LocalStorage 持久化管理
 *
 * @returns FormStorageAPI 表单存储 API
 */
export const useLocalStorageFormStorage = (): FormStorageAPI => {
  // 使用 @vueuse/core 的 useLocalStorage 自动同步
  const formList = useLocalStorage<FormDTO[]>('form-list', [])

  /**
   * 检查表单名称是否重复（纯函数）
   *
   * @param name 表单名称
   * @param excludeId 排除的 ID（用于更新时）
   */
  const checkDuplicateName = (name: string, excludeId?: string): void => {
    const exists = formList.value.some(
      (f) => f.name === name && f.id !== excludeId
    )
    if (exists) {
      throw new Error(`表单名称 "${name}" 已存在`)
    }
  }

  /**
   * 检查表单被工作流引用的次数（纯函数）
   * 直接读取 localStorage 保证数据一致性
   *
   * @param id 表单 ID
   * @returns 引用次数
   */
  const checkBindingCount = (id: string): number => {
    try {
      const stored = localStorage.getItem('approval-list')
      if (!stored) return 0

      const list = JSON.parse(stored) as ApprovalList
      if (!Array.isArray(list)) return 0

      // 统计包含 formId 的审批配置数量
      return list.filter(
        (approval: ApprovalBase) => approval.formId === id
      ).length
    } catch {
      return 0
    }
  }

  /**
   * 添加新表单
   */
  const addForm = async (params: CreateFormParams): Promise<void> => {
    try {
      // 检查重名
      checkDuplicateName(params.name)

      const newForm: FormDTO = {
        id: nanoid(),
        name: params.name,
        schema: params.schema,
        createTime: Date.now(),
        updateTime: Date.now(),
      }

      formList.value = [...formList.value, newForm]
      ElMessage.success('表单保存成功')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '保存失败'
      ElMessage.error(errorMessage)
      throw error
    }
  }

  /**
   * 更新表单
   */
  const updateForm = async (form: UpdateFormParams): Promise<void> => {
    try {
      // 检查重名（排除自己）
      checkDuplicateName(form.name, form.id)

      const index = formList.value.findIndex((f) => f.id === form.id)
      if (index === -1) {
        throw new Error('表单不存在')
      }

      const updatedForm: FormDTO = {
        ...form,
        updateTime: Date.now(),
      }

      formList.value = [...formList.value]
      formList.value[index] = updatedForm

      ElMessage.success('表单更新成功')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '更新失败'
      ElMessage.error(errorMessage)
      throw error
    }
  }

  /**
   * 删除表单（含高危拦截）
   */
  const deleteForm = async (id: string): Promise<void> => {
    try {
      const form = getFormById(id)
      if (!form) {
        throw new Error('表单不存在')
      }

      const bindingCount = checkBindingCount(id)

      if (bindingCount > 0) {
        throw new Error(
          `该表单已被 ${bindingCount} 个审批流程引用，删除后将导致流程引用失效！`
        )
      }

      formList.value = formList.value.filter((f) => f.id !== id)
      ElMessage.success('表单删除成功')
    } catch (error: unknown) {
      // Element Plus 的ElMessageBox.confirm 取消时抛出 'cancel' 字符串
      if (error === 'cancel') {
        // 取消操作不显示错误
        return
      }
      const errorMessage = error instanceof Error ? error.message : '删除失败'
      ElMessage.error(errorMessage)
      throw error
    }
  }

  /**
   * 根据 ID 获取表单（纯函数）
   */
  const getFormById = (id: string): FormDTO | undefined => {
    return formList.value.find((f) => f.id === id)
  }

  return {
    formList,
    addForm,
    updateForm,
    deleteForm,
    getFormById,
    checkBindingCount,
    formatDate,
  }
}
