<script setup lang="ts">
/**
 * DynamicForm - 企业级动态表单组件
 * 基于 @form-create/element-ui 实现
 * 支持 JSON Schema 驱动、表单验证、联动逻辑
 */
import { onMounted, onUnmounted, ref, watch } from 'vue'
import formCreate from '@form-create/element-ui'
import type { FormSchema } from '@/types/form-schema'
import { ElButton } from 'element-plus'

// ==================== Props & Emits ====================
const props = withDefaults(defineProps<{
  /** 表单 schema 配置 */
  schema: FormSchema
  /** 表单数据模型 (v-model) */
  modelValue?: Record<string, any>
  /** 是否禁用 */
  disabled?: boolean
  /** 是否只读 */
  readonly?: boolean
  /** 是否显示提交按钮 */
  showSubmit?: boolean
  /** 是否显示重置按钮 */
  showCancel?: boolean
}>(), {
  modelValue: () => ({}),
  disabled: false,
  readonly: false,
  showSubmit: false,
  showCancel: false
})

const emit = defineEmits(['update:modelValue', 'submit', 'reset'])

// form-create API 实例
const fApi = ref<any>(null)
const formData = ref({ ...props.modelValue })
const elRef = ref<HTMLDivElement | null>(null)

// ==================== 生成规则 ====================
function getRules() {
  if (!props.schema || !props.schema.fields) return []
  return props.schema.fields.map(field => {
    const rule: any = {
      type: field.type === 'textarea' ? 'input' : field.type,
      field: field.key,
      title: field.label,
      value: field.defaultValue,
      props: {
        type: field.type === 'textarea' ? 'textarea' : field.type,
        placeholder: field.placeholder,
        disabled: props.disabled || field.disabled,
        readonly: props.readonly || field.readonly,
        clearable: true,
        ...field.componentProps
      },
      validate: field.required ? [{ required: true, message: `${field.label}是必填项`, trigger: 'blur' }] : []
    }

    // 处理选项字段（select/radio/checkbox）
    if (field.options) {
      rule.options = field.options.map(opt => ({
        label: opt.label,
        value: opt.value,
        disabled: opt.disabled
      }))
    }

    return rule
  })
}

// ==================== form-create 配置 ====================
function getOptions() {
  return {
    submitBtn: false,
    resetBtn: false,
    form: {
      labelWidth: props.schema.labelWidth || '100px',
      disabled: props.disabled,
      size: 'default'
    }
  }
}

// ==================== 初始化表单 ====================
function initForm() {
  if (!elRef.value) return
  
  // 清空容器
  elRef.value.innerHTML = ''
  
  // 创建表单实例
  fApi.value = formCreate.create(getRules(), {
    ...getOptions(),
    el: elRef.value
  })
  
  // 设置初始值
  if (props.modelValue && fApi.value) {
    fApi.value.setValue(props.modelValue)
  }
  
  console.log('[DynamicForm] form created with el:', elRef.value)
}

// ==================== 监听变化 ====================
watch(() => props.schema, () => {
  if (fApi.value) {
    fApi.value.rule(getRules())
  }
})

watch(() => props.modelValue, (newVal) => {
  if (newVal && fApi.value) {
    fApi.value.setValue(newVal)
  }
}, { deep: true })

// 监听表单数据变化
watch(formData, (newVal) => {
  emit('update:modelValue', newVal)
}, { deep: true })

// ==================== 生命钩子 ====================
onMounted(() => {
  initForm()
})

onUnmounted(() => {
  if (fApi.value) {
    fApi.value.unmount()
  }
})

// ==================== 对外暴露方法 ====================
function validate() {
  return fApi.value?.validate()
}

function getValues() {
  return fApi.value?.formData(true)
}

function setValues(values: Record<string, any>) {
  if (fApi.value) {
    fApi.value.setValue(values)
  }
}

function resetFields() {
  if (fApi.value) {
    fApi.value.reset()
  }
}

function handleSubmit() {
  if (fApi.value) {
    fApi.value.submit()
  }
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
  <div class="enterprise-dynamic-form">
    <!-- form-create 会自动挂载到这个元素 -->
    <div ref="elRef"></div>
  </div>
</template>

<style scoped>
.enterprise-dynamic-form {
  width: 100%;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #303133;
}

:deep(.el-form-item__content) {
  width: 100%;
}
</style>
