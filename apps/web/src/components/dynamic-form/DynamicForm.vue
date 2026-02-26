<script setup lang="ts">
/**
 * DynamicForm - 企业级动态表单组件
 * 基于 @form-create/element-ui 实现
 * 支持 JSON Schema 驱动、表单验证、联动逻辑
 */
import { ref, computed, watch } from 'vue'
import formCreate from '@form-create/element-ui'
import type { FormSchema } from '@/types/form-schema'

// 获取 form-create 的 Vue 3 挂载组件
const FormCreateComponent = formCreate.$form()

const props = withDefaults(defineProps<{
  /** 表单 schema 配置 */
  schema: FormSchema
  /** 表单数据模型 (v-model) */
  modelValue?: Record<string, any>
  /** 是否禁用 */
  disabled?: boolean
  /** 是否只读 */
  readonly?: boolean
}>(), {
  modelValue: () => ({}),
  disabled: false,
  readonly: false
})

const emit = defineEmits(['update:modelValue', 'submit', 'reset'])

// form-create API 实例
const fApi = ref<any>({})

// 内部表单数据
const formData = ref({ ...props.modelValue })

// 🚀 核心：Schema 适配器 (Adapter)
// 将我们业务的 FormSchema 转换为 form-create 需要的 Rule[]
const parsedRules = computed(() => {
  if (!props.schema || !props.schema.fields) return []
  
  return props.schema.fields.map(field => {
    // 构建验证规则
    const validateRules: any[] = []
    if (field.required) {
      validateRules.push({
        required: true,
        message: `${field.label}是必填项`,
        trigger: 'blur'
      })
    }
    if (field.rules?.min != null) {
      validateRules.push({
        min: field.rules.min,
        message: `${field.label}长度不能少于${field.rules.min}个字符`,
        trigger: 'blur'
      })
    }
    if (field.rules?.max != null) {
      validateRules.push({
        max: field.rules.max,
        message: `${field.label}长度不能超过${field.rules.max}个字符`,
        trigger: 'blur'
      })
    }
    if (field.rules?.pattern) {
      validateRules.push({
        pattern: typeof field.rules.pattern === 'string' 
          ? new RegExp(field.rules.pattern) 
          : field.rules.pattern,
        message: field.rules.message || `${field.label}格式不正确`,
        trigger: 'blur'
      })
    }
    if (field.rules?.type) {
      validateRules.push({
        type: field.rules.type,
        message: `${field.label}类型不正确`,
        trigger: 'blur'
      })
    }

    // 映射字段类型
    let fieldType = field.type
    let inputType = 'text'
    
    if (field.type === 'textarea') {
      fieldType = 'input'
      inputType = 'textarea'
    } else if (field.type === 'number') {
      fieldType = 'input'
      inputType = 'number'
    } else if (field.type === 'datetime') {
      fieldType = 'input'
      inputType = 'date'
    } else if (field.type === 'date') {
      fieldType = 'input'
      inputType = 'date'
    } else if (field.type === 'time') {
      fieldType = 'input'
      inputType = 'time'
    }

    return {
      type: fieldType,
      field: field.key,
      title: field.label,
      value: field.defaultValue,
      props: {
        type: inputType,
        placeholder: field.placeholder,
        disabled: props.disabled || field.disabled,
        readonly: props.readonly || field.readonly,
        clearable: true,
        ...field.componentProps
      },
      options: field.options 
        ? field.options.map(opt => ({ 
            label: opt.label, 
            value: opt.value,
            disabled: opt.disabled 
          })) 
        : [],
      validate: validateRules,
      info: field.description || ''
    }
  })
})

// form-create 全局配置
const options = computed(() => ({
  submitBtn: false, // 隐藏默认提交按钮，由外部控制
  resetBtn: false,
  form: {
    labelWidth: props.schema.labelWidth || '100px',
    disabled: props.disabled,
    size: 'default',
    labelPosition: 'right'
  },
  row: {
    gutter: props.schema.gutter || 20
  }
}))

// 监听数据变化抛出给父组件
watch(formData, (newVal) => {
  emit('update:modelValue', newVal)
}, { deep: true })

// 监听外部数据变化同步进来
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    formData.value = { ...newVal }
    // 同步到 form-create 实例
    if (fApi.value && fApi.value.setValue) {
      fApi.value.setValue(newVal)
    }
  }
}, { deep: true })

// 暴露 API 给父组件
defineExpose({
  /**
   * 手动触发表单校验
   */
  validate: async () => {
    try {
      await fApi.value.validate()
      return true
    } catch (e) {
      console.error('表单验证失败:', e)
      return false
    }
  },
  
  /**
   * 获取当前表单值
   */
  getValues: () => formData.value,
  
  /**
   * 设置表单值
   */
  setValues: (values: Record<string, any>) => {
    formData.value = { ...values }
    if (fApi.value && fApi.value.setValue) {
      fApi.value.setValue(values)
    }
  },
  
  /**
   * 重置表单
   */
  resetFields: () => {
    if (fApi.value && fApi.value.resetFields) {
      fApi.value.resetFields()
    }
    emit('reset')
  },
  
  /**
   * 获取 form-create API 实例
   */
  getApi: () => fApi.value
})
</script>

<template>
  <div class="enterprise-dynamic-form">
    <FormCreateComponent
      v-model:api="fApi"
      v-model="formData"
      :rule="parsedRules"
      :option="options"
      @submit="emit('submit', formData)"
    />
  </div>
</template>

<style scoped>
.enterprise-dynamic-form {
  width: 100%;
  padding: 16px 0;
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
