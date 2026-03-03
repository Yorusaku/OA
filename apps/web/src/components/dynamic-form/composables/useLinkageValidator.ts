/**
 * useLinkageValidator - 联动校验 Composable（纯函数 + 响应式管理）
 *
 * 设计理念：
 * 1. 纯函数分离（checkCondition, getFieldRules）
 * 2. 响应式状态管理（watch 依赖字段变化）
 * 3. 防御性编程（空值保护、默认值兜底）
 * 4. 性能优化（ shallowRef、避免 deep watch）
 *
 * 功能：
 * - requiredWhen: 条件满足时字段变为必填
 * - visibleWhen: 条件满足时字段显示/隐藏
 * - disabledWhen: 条件满足时字段禁用
 */

import { ref, computed, watch, shallowRef, type Ref } from 'vue'
import { debounce } from 'lodash-es'
import type { FormFieldSchema, FormSchema } from '@/types/form-schema'
import { checkCondition, checkConditions, getConditionFields } from '@oa/utils'

// ==================== 类型定义 ====================

export interface LinkageValidationState {
  /** 字段的必填状态（动态计算） */
  required: Ref<boolean>
  /** 字段的禁用状态（动态计算） */
  disabled: Ref<boolean>
}

export interface UseLinkageValidatorProps {
  /** 字段 Schema */
  field: Ref<FormFieldSchema | null>
  /** 表单所有值（用于条件判断） */
  formValues: Ref<Record<string, any>>
}

export interface UseLinkageValidatorReturn {
  /** 必填状态 */
  isRequired: Ref<boolean>
  /** 禁用状态 */
  isDisabled: Ref<boolean>
  /** 隐藏状态 */
  isVisible: Ref<boolean>
  /** 联动依赖的字段列表 */
  linkageFields: ComputedRef<string[]>
  /** 校验规则（包含静态 + 动态） */
  validationRules: ComputedRef<any[]>
}

// ==================== 纯函数：辅助工具 ====================

/**
 * 从字段 Schema 中提取联动必填规则
 * @param field - 表单字段
 * @returns form-create 格式的验证规则数组
 */
function getRequiredRules(field: FormFieldSchema): any[] {
  if (!field.required && !field.linkage?.requiredWhen) {
    return []
  }

  const rules: any[] = []

  // 静态必填
  if (field.required) {
    rules.push({
      required: true,
      message: `${field.label}是必填项`,
      trigger: 'blur',
    })
  }

  // 联动必填（通过 validator 验证器实现）
  if (field.linkage?.requiredWhen) {
    rules.push({
      validator: (rule: any, value: any, callback: any) => {
        // dynamic required validation
        // 这里无法直接访问 formValues，需要在外部传入
        // 暂时返回 pass，实际验证在外部处理
        callback()
      },
      trigger: 'change',
    })
  }

  return rules
}

/**
 * 检查字段是否应该显示
 * @param field - 表单字段
 * @param formValues - 表单值
 * @returns true = 显示, false = 隐藏
 */
export function shouldFieldShow(
  field: FormFieldSchema,
  formValues: Record<string, any>,
): boolean {
  const { linkage } = field

  // 无联动配置，始终显示
  if (!linkage?.visibleWhen) {
    return true
  }

  // 有 visibleWhen，检查条件
  return checkConditions(linkage.visibleWhen, formValues)
}

/**
 * 检查字段是否应该禁用
 * @param field - 表单字段
 * @param formValues - 表单值
 * @returns true = 禁用, false = 启用
 */
export function shouldFieldDisable(
  field: FormFieldSchema,
  formValues: Record<string, any>,
): boolean {
  const { linkage } = field

  // 无 disabledWhen 配置，不禁用
  if (!linkage?.disabledWhen) {
    return false
  }

  // 有 disabledWhen，检查条件
  return checkConditions(linkage.disabledWhen, formValues)
}

/**
 * 获取字段的所有联动依赖字段
 * @param field - 表单字段
 * @returns 依赖字段 key 列表
 */
export function getLinkageFields(field: FormFieldSchema): string[] {
  const fields: string[] = []

  if (field.linkage?.requiredWhen) {
    fields.push(...getConditionFields(field.linkage.requiredWhen))
  }

  if (field.linkage?.visibleWhen) {
    fields.push(...getConditionFields(field.linkage.visibleWhen))
  }

  if (field.linkage?.disabledWhen) {
    fields.push(...getConditionFields(field.linkage.disabledWhen))
  }

  return fields
}

// ==================== 核心 Hook ====================

/**
 * 联动校验 Hook
 * @param props - 使用参数
 * @returns 联动校验响应式对象
 */
export function useLinkageValidator(
  props: UseLinkageValidatorProps,
): UseLinkageValidatorReturn {
  // ==================== 响应式状态 ====================
  const field = props.field
  const formValues = props.formValues

  // 必填状态（响应式）
  const isRequired = computed(() => {
    if (!field.value) return false

    // 1. 静态必填
    if (field.value.required) {
      return true
    }

    // 2. 联动必填
    if (field.value.linkage?.requiredWhen) {
      return checkConditions(field.value.linkage.requiredWhen, formValues.value)
    }

    return false
  })

  // 禁用状态（响应式）
  const isDisabled = computed(() => {
    if (!field.value) return false
    if (field.value.disabled) return true // 静态禁用

    // 联动禁用
    if (field.value.linkage?.disabledWhen) {
      return checkConditions(field.value.linkage.disabledWhen, formValues.value)
    }

    return false
  })

  // 显示状态（响应式）
  const isVisible = computed(() => {
    if (!field.value) return false

    // 无 visibleWhen，始终显示
    if (!field.value.linkage?.visibleWhen) {
      return true
    }

    return checkConditions(field.value.linkage.visibleWhen, formValues.value)
  })

  // 联动依赖字段列表
  const linkageFields = computed(() => {
    if (!field.value) return []

    return getLinkageFields(field.value)
  })

  // 校验规则（静态 + 动态）
  const validationRules = computed(() => {
    if (!field.value) return []

    const rules: any[] = []

    // 静态校验规则
    if (field.value.rules) {
      if (field.value.rules.required) {
        rules.push({
          required: true,
          message: `${field.value.label}是必填项`,
          trigger: 'blur',
        })
      }

      if (field.value.rules.min !== undefined) {
        rules.push({
          min: field.value.rules.min,
          message: `${field.value.label}长度不能小于${field.value.rules.min}`,
          trigger: 'blur',
        })
      }

      if (field.value.rules.max !== undefined) {
        rules.push({
          max: field.value.rules.max,
          message: `${field.value.label}长度不能大于${field.value.rules.max}`,
          trigger: 'blur',
        })
      }
    }

    // 动态必填（联动）
    if (isRequired.value && !rules.some((r) => r.required === true)) {
      rules.push({
        required: true,
        message: `${field.value.label}是必填项`,
        trigger: 'blur',
      })
    }

    return rules
  })

  // ==================== Watch 依赖字段变化 ====================
  // 当依赖字段变化时，重新计算联动状态
  if (linkageFields.value.length > 0) {
    watch(
      () => {
        // 提取依赖字段的值
        return linkageFields.value.map((f) => formValues.value?.[f])
      },
      () => {
        // 依赖字段变化时，重新计算（Vue 会自动更新 computed）
        // 这里不需要显式操作，仅用于建立依赖关系
      },
      { deep: false, flush: 'sync' },
    )
  }

  // ==================== 返回 ====================
  return {
    isRequired,
    isDisabled,
    isVisible,
    linkageFields,
    validationRules,
  }
}
