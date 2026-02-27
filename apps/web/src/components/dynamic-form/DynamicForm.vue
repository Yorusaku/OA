<script setup lang="ts">
/**
 * DynamicForm - 企业级动态表单组件
 * 基于 @form-create/element-ui 实现（声明式渲染）
 * 支持 JSON Schema 驱动、表单验证、联动逻辑、节点级权限控制
 */
import { ref, computed, watch } from 'vue'
import formCreate from '@form-create/element-ui'
import type { FormSchema } from '@/types/form-schema'
import { useSchemaAdapter } from './composables/useSchemaAdapter'
import { usePermissionMutator, type PermissionsMap } from './composables/usePermissionMutator'

// 定义组件名称，便于测试和调试
defineOptions({
  name: 'DynamicForm'
})

// ==================== Props ====================
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
  permissions: () => ({})
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>): void
  (e: 'submit', values: Record<string, any>): void
  (e: 'reset'): void
}>()

// ==================== State ====================
const fApi = ref<any>(null)

// ==================== Composables: 流水线处理 ====================
// Step 1: Schema 适配器 - 将 FormSchema 转换为 baseRules
const baseRules = useSchemaAdapter(props.schema)

// Step 2: 权限变异引擎 - 应用权限后得到最终 rules
const finalRules = computed(() => {
  const rules = usePermissionMutator(baseRules, props.permissions)

  // 如果组件处于 readonly 模式，应用 readonly 到所有字段
  if (props.readonly) {
    return rules.map((rule: any) => {
      const clonedRule = { ...rule }
      clonedRule.props = { ...clonedRule.props, disabled: true, readonly: true }
      return clonedRule
    })
  }

  return rules
})

// ==================== Computed: form-create 配置 ====================
const formOptions = computed(() => ({
  submitBtn: props.showSubmit
    ? { show: true, props: { type: 'primary' } }
    : false,
  resetBtn: props.showCancel ? { show: true } : false,
  form: {
    labelWidth: props.schema?.labelWidth || '100px',
    disabled: props.disabled || props.readonly,
    readonly: props.readonly,
    size: props.disabled || props.readonly ? 'default' : undefined as any,
  },
}))

// ==================== 声明式组件构造器 ====================
const FormCreateComponent = computed(() => formCreate.$form())

// ==================== Watch: modelValue 变化时设置表单值 ====================
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal && fApi.value) {
      fApi.value.setValues?.(newVal)
    }
  },
  { deep: true, immediate: true }
)

// ==================== Expose API ====================
const validate = async (): Promise<boolean | undefined> => {
  return fApi.value?.validate?.()
}

const getValues = (): any => {
  return fApi.value?.formData?.()
}

const setValues = (values: any): void => {
  fApi.value?.setValues?.(values)
}

const resetFields = (): void => {
  fApi.value?.reset?.()
}

const handleSubmit = (): void => {
  fApi.value?.submit?.()
  emit('submit', fApi.value?.formData?.())
}

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
