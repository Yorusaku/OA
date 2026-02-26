<script setup lang="ts">
/**
 * DynamicForm - 企业级动态表单组件
 * 基于 @form-create/element-ui 实现
 * 支持 JSON Schema 驱动、表单验证、联动逻辑
 *
 * @version 2.3.0
 * @since 2026-02-26
 */
import { nextTick, onMounted, onUnmounted, ref, watch, computed } from 'vue'
import formCreate from '@form-create/element-ui'
import type { FormSchema, FormFieldSchema } from '@/types/form-schema'

// ==================== Props ====================
const props = withDefaults(defineProps<{
  schema: FormSchema
  modelValue?: any
  disabled?: boolean
  readonly?: boolean
  showSubmit?: boolean
  showCancel?: boolean
}>(), {
  modelValue: () => ({}),
  disabled: false,
  readonly: false,
  showSubmit: false,
  showCancel: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'submit', values: any): void
  (e: 'reset'): void
}>()

// ==================== State ====================
const fApi = ref<any>(null)
const formData = ref<Record<string, any>>({})
const elRef = ref<HTMLDivElement | null>(null)

// ==================== Computed (Adapter) ====================
/** 类型映射：将表单 schema 类型映射到 form-create 类型 */
const typeMap: Record<string, string> = {
  textarea: 'input',
  date: 'datePicker',
  time: 'timePicker',
  number: 'inputNumber',
  upload: 'upload',
  switch: 'switch',
  slider: 'slider',
  rate: 'rate',
  color: 'colorPicker',
}

/** 生成表单规则 */
const rules = computed(() => {
  if (!props.schema?.fields?.length) return []

  return props.schema.fields.map((field: FormFieldSchema) => {
    const mappedType = typeMap[field.type] || field.type

    const baseRule: any = {
      type: mappedType,
      field: field.key,
      title: field.label,
      value: field.defaultValue,
      props: {
        type: field.type === 'textarea' ? 'textarea' : undefined,
        placeholder: field.placeholder,
        disabled: props.disabled || field.disabled,
        readonly: props.readonly || field.readonly,
        clearable: true,
        ...field.componentProps
      },
      validate: field.required
        ? [{ required: true, message: `${field.label}是必填项`, trigger: 'blur' }]
        : []
    }

    if (field.options?.length) {
      baseRule.options = field.options.map((opt: any) => ({
        label: opt.label,
        value: opt.value,
        disabled: opt.disabled
      }))
    }

    return baseRule
  })
})

/** form-create 配置 */
const formOptions = computed(() => ({
  submitBtn: props.showSubmit ? {
    show: true,
    props: {
      type: 'primary'
    }
  } : false,
  resetBtn: props.showCancel ? {
    show: true
  } : false,
  form: {
    labelWidth: props.schema?.labelWidth || '100px',
    disabled: props.disabled,
    size: props.disabled ? 'default' : undefined as any
  }
}))

// ==================== Watchers ====================
/** 监听 schema 变化 */
watch(rules, (newRules) => {
  fApi.value?.rule?.(newRules)
})

/** 监听外部 modelValue 变化，同步到 form-create */
watch(() => props.modelValue, (newVal) => {
  if (!newVal || !fApi.value) return

  const currentFormData = fApi.value.formData?.() || {}
  if (JSON.stringify(newVal) !== JSON.stringify(currentFormData)) {
    fApi.value.setValue?.(newVal)
  }
}, { deep: true })

/** 监听表单内部数据变化，同步到外部 */
watch(() => fApi.value?.formData?.(), (newVal) => {
  if (!newVal || JSON.stringify(newVal) === JSON.stringify(formData.value)) return

  formData.value = { ...newVal }
  emit('update:modelValue', newVal)
}, { deep: true })

// ==================== Lifecycle ====================
/** 初始化表单 */
const initForm = () => {
  if (!elRef.value) return

  try {
    const api = formCreate(rules.value, {
      ...formOptions.value,
      el: elRef.value,
      onSubmit: (formData: any) => {
        emit('submit', formData)
      },
      onReset: () => {
        emit('reset')
      }
    })

    fApi.value = api

    if (props.modelValue && api?.setValue) {
      api.setValue(props.modelValue)
    }
  }
  catch (error) {
    console.error('[DynamicForm] 初始化表单失败:', error)
  }
}

onMounted(() => {
  nextTick(() => {
    initForm()
  })
})

onUnmounted(() => {
  fApi.value?.destroy?.()
  fApi.value = null
})

// ==================== Expose ====================
const validate = async (): Promise<boolean | undefined> => {
  return fApi.value?.validate?.()
}

const getValues = (): any => {
  return fApi.value?.formData?.()
}

const setValues = (values: any): void => {
  fApi.value?.setValue?.(values)
}

const resetFields = (): void => {
  fApi.value?.reset?.()
}

const handleSubmit = (): void => {
  fApi.value?.submit?.()
}

defineExpose({
  validate,
  getValues,
  setValues,
  resetFields,
  handleSubmit
})
</script>

<template>
  <div class="dynamic-form w-full">
    <div ref="elRef" />
  </div>
</template>
