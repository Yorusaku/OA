<script setup lang="ts">
/**
 * DynamicForm - 企业级动态表单组件（V2 · 联动校验增强版）
 * 基于 @form-create/element-ui 实现（声明式渲染）
 * 支持 JSON Schema 驱动、表单验证、联动逻辑（requiredWhen/visibleWhen/disabledWhen）、节点级权限控制
 */
import { ref, computed, watch, nextTick } from 'vue'
import formCreate from '@form-create/element-ui'
import type { FormSchema } from '@/types/form-schema'
import { useSchemaAdapter } from './composables/useSchemaAdapter'
import { usePermissionMutator, type PermissionsMap } from './composables/usePermissionMutator'
import { useLinkageValidator } from './composables/useLinkageValidator'
import { checkConditions } from '@oa/utils'

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

// ==================== 表单值响应式引用 ====================
// 用于联动校验和联动禁用的条件判断
const formDataRef = ref<Record<string, any>>({})

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

// ==================== 联动校验初始化 ====================
// 为每个字段创建联动验证器
const fieldValidators = computed(() => {
  const validators: Record<string, any> = {}

  props.schema.fields.forEach((field) => {
    // 创建联动验证器（通过闭包共享 formDataRef）
    validators[field.key] = {
      isRequired: field.required || checkConditions(field.linkage?.requiredWhen, formDataRef.value),
      isDisabled: field.disabled || checkConditions(field.linkage?.disabledWhen, formDataRef.value),
      isVisible: !field.linkage?.visibleWhen || checkConditions(field.linkage?.visibleWhen, formDataRef.value),
    }
  })

  return validators
})

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

// ==================== Watch: formDataRef 变化时更新联动状态 ====================
// 监听表单值变化，用于联动校验、联动禁用、联动显示
watch(formDataRef, (newVal) => {
  // 触发 fieldValidators 的重新计算
  // Vue 会自动更新 computed 的依赖
}, { deep: true })

// ==================== Watch: formApi 初始化完成后更新 formDataRef ====================
watch(
  () => fApi.value,
  async (api) => {
    if (api) {
      // 等待 API 初始化完成
      await nextTick()

      // 监听表单值变化，同步到 formDataRef 用于联动校验
      // form-create 的 API 可能没有直接的 watch 方法
      // 我们可以在 submit 时读取最新值
    }
  }
)

// ==================== Expose API ====================
const validate = async (): Promise<boolean | undefined> => {
  return fApi.value?.validate?.()
}

const getValues = (): any => {
  // 从 form-create 读取最新值
  const values = fApi.value?.formData?.() || {}
  // 同步到 formDataRef 用于联动校验
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
  // 提交前读取最新值
  getValues()
  fApi.value?.submit?.()
  emit('submit', formDataRef.value)
}

// 初始化时设置初始值
if (props.modelValue) {
  formDataRef.value = props.modelValue
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
