import type { FormFieldSchema } from '@/types/form-schema'
import { checkConditions } from '@/utils/form-conditions'

export interface UseFieldStateOptions {
  values: Record<string, any>
  disabled?: boolean
  readonly?: boolean
}

export interface UseFieldStateReturn {
  isFieldVisible: (field: FormFieldSchema) => boolean
  isFieldDisabled: (field: FormFieldSchema) => boolean
  isFieldRequired: (field: FormFieldSchema) => boolean
  isFieldReadonly: (field: FormFieldSchema) => boolean
}

/**
 * 字段状态计算 Composable
 */
export function useFieldState(options: UseFieldStateOptions): UseFieldStateReturn {
  const { values, disabled: globalDisabled, readonly: globalReadonly } = options

  /**
   * 判断字段是否应该显示
   */
  function isFieldVisible(field: FormFieldSchema): boolean {
    if (!field.linkage?.visibleWhen)
      return true
    return !checkConditions(field.linkage.visibleWhen, values)
  }

  /**
   * 判断字段是否应该禁用
   */
  function isFieldDisabled(field: FormFieldSchema): boolean {
    // 优先级：field.disabled > globalDisabled > linkage.disabledWhen
    if (field.disabled)
      return true
    if (globalDisabled)
      return true
    if (field.linkage?.disabledWhen) {
      return checkConditions(field.linkage.disabledWhen, values)
    }
    return false
  }

  /**
   * 判断字段是否应该必填（联动必填）
   */
  function isFieldRequired(field: FormFieldSchema): boolean {
    // 静态必填
    if (field.required)
      return true
    // 联动必填
    if (field.linkage?.requiredWhen) {
      return checkConditions(field.linkage.requiredWhen, values)
    }
    return false
  }

  /**
   * 判断字段是否只读
   */
  function isFieldReadonly(field: FormFieldSchema): boolean {
    return globalReadonly || field.readonly || false
  }

  return {
    isFieldVisible,
    isFieldDisabled,
    isFieldRequired,
    isFieldReadonly,
  }
}
