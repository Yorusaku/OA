import type { Ref } from 'vue'
import type { FormSchema } from '@/types/form-schema'
import { useForm } from 'vee-validate'
import { computed, watch } from 'vue'

export interface UseDynamicFormOptions {
  schema: Ref<FormSchema>
  modelValue: Ref<Record<string, any>>
  emit: (event: 'update:modelValue' | 'submit' | 'reset' | 'invalid', ...args: any[]) => void
}

export interface UseDynamicFormReturn {
  values: any
  errors: any
  meta: any
  validate: () => Promise<any>
  resetForm: (state?: any) => void
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void
  setFieldTouched: (field: string, isTouched: boolean, shouldValidate?: boolean) => void
  handleSubmit: (onSubmit: (values: any) => void, onError?: (ctx: any) => void) => (e?: Event) => Promise<void>
  initialValues: Record<string, any>
}

/**
 * 构建初始校验规则
 */
function buildInitialRules(fields: FormSchema['fields']) {
  const rules: Record<string, any> = {}

  fields.forEach((field) => {
    const fieldRules: any = {}

    // 静态必填
    if (field.required) {
      fieldRules.required = true
    }

    // 合并 schema 中的 rules
    if (field.rules) {
      const { required, min, max, pattern, message, type, validator } = field.rules
      if (required)
        fieldRules.required = true
      if (min != null)
        fieldRules.min = min
      if (max != null)
        fieldRules.max = max
      if (pattern) {
        fieldRules.pattern = typeof pattern === 'string' ? new RegExp(pattern) : pattern
      }
      if (type)
        fieldRules.type = type
      if (message)
        fieldRules.message = message
      if (validator) {
        console.warn(`自定义校验器 ${validator} 需要在外部定义`)
      }
    }

    if (Object.keys(fieldRules).length > 0) {
      rules[field.key] = fieldRules
    }
  })

  return rules
}

/**
 * 动态表单核心逻辑 Composable
 */
export function useDynamicForm(options: UseDynamicFormOptions): UseDynamicFormReturn {
  const { schema, modelValue, emit } = options

  // 合并初始值
  const initialValues = computed(() => {
    const merged: Record<string, any> = {}

    // 从 schema 获取默认值
    schema.value.fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        merged[field.key] = field.defaultValue
      }
    })

    // 从 schema.initialValues 合并
    if (schema.value.initialValues) {
      Object.assign(merged, schema.value.initialValues)
    }

    // 从 v-model 合并（优先级最高）
    Object.assign(merged, modelValue.value)

    return merged
  })

  // 初始化 VeeValidate useForm
  const {
    values,
    errors,
    meta,
    validate,
    resetForm,
    setFieldValue,
    setFieldTouched,
    handleSubmit,
  } = useForm({
    initialValues: initialValues.value,
    validationSchema: buildInitialRules(schema.value.fields),
  })

  // 监听 modelValue 变化同步到表单
  watch(modelValue, (newVal) => {
    Object.entries(newVal).forEach(([key, value]) => {
      if (values[key] !== value) {
        setFieldValue(key, value)
      }
    })
  }, { deep: true })

  // 监听表单值变化同步给父组件
  watch(values, (newValues) => {
    emit('update:modelValue', { ...newValues })
  }, { deep: true })

  return {
    values,
    errors,
    meta,
    validate,
    resetForm,
    setFieldValue,
    setFieldTouched,
    handleSubmit,
    initialValues: initialValues.value,
  }
}
