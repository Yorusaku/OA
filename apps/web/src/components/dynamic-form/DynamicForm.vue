<script setup lang="ts">
/**
 * DynamicForm - 企业级动态表单组件
 * 基于 @form-create/element-ui 实现
 * 支持 JSON Schema 驱动、表单验证、联动逻辑
 */
import { ref, computed, watch } from 'vue'
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
const fApi = ref<any>({})
const formData = ref({ ...props.modelValue })

// 🚀 核心：Schema 适配器 (Adapter)
// 将我们业务的 FormSchema 转换为 form-create 需要的 Rule[]
const parsedRules = computed(() => {
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
})

// form-create 全局配置
const options = computed(() => ({
  submitBtn: false, // 隐藏默认提交按钮，由外部控制
  resetBtn: false,
  form: {
    labelWidth: props.schema.labelWidth || '100px',
    disabled: props.disabled,
    size: 'default'
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

// ==================== 对外暴露方法 ====================
/**
 * 手动触发表单校验
 */
function validate() {
  return fApi.value.validate()
}

/**
 * 获取当前表单值
 */
function getValues() {
  return formData.value
}

/**
 * 设置表单值
 */
function setValues(values: Record<string, any>) {
  formData.value = { ...values }
  if (fApi.value && fApi.value.setValue) {
    fApi.value.setValue(values)
  }
}

/**
 * 重置表单
 */
function resetFields() {
  if (fApi.value && fApi.value.reset) {
    fApi.value.reset()
  }
}

/**
 * 提交表单
 */
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
    <component
      :is="formCreate.component"
      v-model:api="fApi"
      v-model="formData"
      :rule="parsedRules"
      :option="options"
      @submit="emit('submit', formData)"
    />
    
    <!-- 自定义按钮区 -->
    <div v-if="showSubmit || showCancel" class="form-actions">
      <ElButton v-if="showCancel" @click="resetFields">
        {{ schema.cancelButton?.text || '重置' }}
      </ElButton>
      <ElButton v-if="showSubmit" type="primary" @click="handleSubmit">
        {{ schema.submitButton?.text || '提交' }}
      </ElButton>
    </div>
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

.form-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>