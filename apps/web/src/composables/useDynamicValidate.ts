import type { Ref } from 'vue'
import type { FormFieldSchema } from '@/types/form-schema'
import { onUnmounted, watch } from 'vue'
import { checkConditions, getConditionFields } from '@/utils/form-conditions'

export function useDynamicValidate(
  schemaFields: Ref<FormFieldSchema[]> | FormFieldSchema[],
  formValues: Ref<Record<string, any>>,
) {
  const fields = Array.isArray(schemaFields) ? schemaFields : schemaFields.value

  const cleanupFns: Array<() => void> = []

  /**
   * 设置字段联动监听
   * 当依赖字段变化时，触发表单重新校验
   */
  function setupFieldWatch(field: FormFieldSchema) {
    const { key, linkage } = field

    // 如果没有联动配置，跳过
    if (!linkage)
      return

    // 收集所有需要监听的依赖字段
    const deps = new Set<string>()

    if (linkage.requiredWhen) {
      getConditionFields(linkage.requiredWhen).forEach(f => deps.add(f))
    }
    if (linkage.visibleWhen) {
      getConditionFields(linkage.visibleWhen).forEach(f => deps.add(f))
    }
    if (linkage.disabledWhen) {
      getConditionFields(linkage.disabledWhen).forEach(f => deps.add(f))
    }

    // 为每个依赖字段设置监听
    deps.forEach((depField) => {
      const stop = watch(
        () => formValues.value[depField],
        () => {
          // 条件变化时，可以在这里触发额外的逻辑
          // 注意：VeeValidate 的规则更新需要通过 useForm 的 API
          // 这里主要是提供一个扩展点
          console.log(`字段 ${depField} 变化，可能影响字段 ${key} 的校验状态`)
        },
      )
      cleanupFns.push(stop)
    })
  }

  /**
   * 判断字段是否应该必填（联动必填）
   * 供外部组件调用
   */
  function isFieldRequired(field: FormFieldSchema): boolean {
    // 静态必填
    if (field.required)
      return true
    // 联动必填
    if (field.linkage?.requiredWhen) {
      return checkConditions(field.linkage.requiredWhen, formValues.value)
    }
    return false
  }

  /**
   * 判断字段是否应该显示
   */
  function isFieldVisible(field: FormFieldSchema): boolean {
    if (!field.linkage?.visibleWhen)
      return true
    return !checkConditions(field.linkage.visibleWhen, formValues.value)
  }

  /**
   * 判断字段是否应该禁用
   */
  function isFieldDisabled(field: FormFieldSchema): boolean {
    if (field.disabled)
      return true
    if (field.linkage?.disabledWhen) {
      return checkConditions(field.linkage.disabledWhen, formValues.value)
    }
    return false
  }

  // 为每个有联动配置的字段设置监听
  fields.forEach((field) => {
    setupFieldWatch(field)
  })

  /**
   * 手动刷新某个字段的校验状态
   * 当外部数据变化时可以调用此方法
   */
  function refreshFieldValidation(_fieldKey: string) {
    // 可以在这里触发额外的校验逻辑
    console.log('刷新字段校验状态')
  }

  /**
   * 重新加载所有联动校验规则
   * 当 schema 发生变化时调用
   */
  function reloadValidationRules(newFields: FormFieldSchema[]) {
    // 清理旧的监听器
    cleanupFns.forEach(fn => fn())
    cleanupFns.length = 0

    // 重新设置
    newFields.forEach((field) => {
      setupFieldWatch(field)
    })
  }

  // 组件卸载时清理所有监听器
  onUnmounted(() => {
    cleanupFns.forEach(fn => fn())
  })

  return {
    /** 判断字段是否必填 */
    isFieldRequired,
    /** 判断字段是否可见 */
    isFieldVisible,
    /** 判断字段是否禁用 */
    isFieldDisabled,
    /** 手动刷新某个字段的校验状态 */
    refreshFieldValidation,
    /** 重新加载所有联动校验规则 */
    reloadValidationRules,
  }
}
