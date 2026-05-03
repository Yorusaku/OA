<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import formCreate from '@form-create/element-ui'
import type { FormSchema } from '@/types/form-schema'
import { checkConditions } from '@oa/utils'
import { useDevice } from '@/composables/useDevice'
import { usePermissionMutator, type PermissionsMap } from './composables/usePermissionMutator'
import { useSchemaAdapter } from './composables/useSchemaAdapter'

defineOptions({ name: 'DynamicForm' })

const props = withDefaults(defineProps<{
  schema: FormSchema
  modelValue?: Record<string, any>
  disabled?: boolean
  readonly?: boolean
  showSubmit?: boolean
  showCancel?: boolean
  permissions?: PermissionsMap
}>(), {
  modelValue: () => ({}),
  disabled: false,
  readonly: false,
  showSubmit: false,
  showCancel: false,
  permissions: () => ({}),
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>): void
  (e: 'submit', values: Record<string, any>): void
  (e: 'reset'): void
}>()

const { isMobile } = useDevice()
const fApi = ref<any>(null)
const formDataRef = ref<Record<string, any>>({})

const baseRules = useSchemaAdapter(props.schema)
const finalRules = computed(() => {
  const rules = usePermissionMutator(baseRules, props.permissions)
  if (!props.readonly)
    return rules
  return rules.map((rule: any) => ({
    ...rule,
    props: { ...rule.props, disabled: true, readonly: true },
  }))
})

const formOptions = computed(() => ({
  submitBtn: props.showSubmit ? { show: true, props: { type: 'primary' } } : false,
  resetBtn: props.showCancel ? { show: true } : false,
  form: {
    labelWidth: isMobile.value ? 'auto' : (props.schema?.labelWidth || '120px'),
    labelPosition: isMobile.value ? 'top' : 'right',
    disabled: props.disabled || props.readonly,
    readonly: props.readonly,
    size: props.disabled || props.readonly ? 'default' : undefined as any,
  },
}))

const FormCreateComponent = computed(() => formCreate.$form())

const fieldValidators = computed(() => {
  const validators: Record<string, any> = {}
  props.schema.fields.forEach((field) => {
    const fieldKey = field.key || field.id
    if (!fieldKey)
      return
    validators[fieldKey] = {
      isRequired: field.required || checkConditions(field.linkage?.requiredWhen, formDataRef.value),
      isDisabled: field.disabled || checkConditions(field.linkage?.disabledWhen, formDataRef.value),
      isVisible: !field.linkage?.visibleWhen || checkConditions(field.linkage?.visibleWhen, formDataRef.value),
    }
  })
  return validators
})

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal && fApi.value)
      fApi.value.setValues?.(newVal)
  },
  { deep: true, immediate: true },
)

watch(formDataRef, () => {
  void fieldValidators.value
}, { deep: true })

watch(
  () => fApi.value,
  async (api) => {
    if (!api)
      return
    await nextTick()
  },
)

const validate = async (): Promise<boolean | undefined> => fApi.value?.validate?.()

const getValues = (): any => {
  const values = fApi.value?.formData?.() || {}
  formDataRef.value = values
  return values
}

const setValues = (values: any): void => {
  formDataRef.value = values || {}
  fApi.value?.setValues?.(values)
}

const resetFields = (): void => {
  formDataRef.value = {}
  fApi.value?.reset?.()
}

const handleSubmit = (): void => {
  getValues()
  fApi.value?.submit?.()
  emit('submit', formDataRef.value)
}

if (props.modelValue)
  formDataRef.value = props.modelValue

defineExpose({
  validate,
  getValues,
  setValues,
  resetFields,
  handleSubmit,
})
</script>

<template>
  <div class="dynamic-form w-full">
    <component
      v-if="FormCreateComponent && finalRules.length > 0"
      :is="FormCreateComponent"
      v-model:api="fApi"
      :rule="finalRules"
      :option="formOptions"
    />
  </div>
</template>

