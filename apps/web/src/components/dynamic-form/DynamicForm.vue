<script setup lang="ts">
import type { UploadProps } from 'element-plus'
import type { FormFieldSchema, FormSchema } from '@/types/form-schema'
import { QuestionFilled } from '@element-plus/icons-vue'
import {
  ElButton,
  ElCascader,
  ElCheckbox,
  ElCheckboxGroup,
  ElCol,
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElRow,
  ElSelect,
  ElSwitch,
  ElTimePicker,
  ElTooltip,
  ElUpload,
} from 'element-plus'
import { useField, useForm } from 'vee-validate'
import { computed, h, watch } from 'vue'
import { checkConditions } from '@/utils/form-conditions'

const props = withDefaults(defineProps<{
  schema: FormSchema
  modelValue?: Record<string, any>
  readonly?: boolean
  disabled?: boolean
  showSubmit?: boolean
  showCancel?: boolean
}>(), {
  modelValue: () => ({}),
  readonly: false,
  disabled: false,
  showSubmit: true,
  showCancel: false,
})

const emit = defineEmits<{
  'update:modelValue': [values: Record<string, any>]
  'submit': [values: Record<string, any>]
  'reset': []
  'invalid': [errors: Record<string, string>]
}>()

// ==================== VeeValidate 表单初始化 ====================
// 构建初始校验规则
function buildInitialRules(fields: FormFieldSchema[]) {
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
        // 自定义校验器通过 yup 或 zod 在外部定义
        console.warn(`自定义校验器 ${validator} 需要在外部定义`)
      }
    }

    if (Object.keys(fieldRules).length > 0) {
      rules[field.key] = fieldRules
    }
  })

  return rules
}

// 合并初始值
const initialValues = computed(() => {
  const merged: Record<string, any> = {}

  // 从 schema 获取默认值
  props.schema.fields.forEach((field) => {
    if (field.defaultValue !== undefined) {
      merged[field.key] = field.defaultValue
    }
  })

  // 从 schema.initialValues 合并
  if (props.schema.initialValues) {
    Object.assign(merged, props.schema.initialValues)
  }

  // 从 v-model 合并（优先级最高）
  Object.assign(merged, props.modelValue)

  return merged
})

// 初始化 VeeValidate useForm
const {
  values,
  errors,
  meta,
  validate: validateForm,
  resetForm,
  setFieldValue,
  setFieldTouched,
  defineField,
  handleSubmit,
} = useForm({
  initialValues: initialValues.value,
  validationSchema: buildInitialRules(props.schema.fields),
})

// ==================== 字段可见性/状态计算 ====================
/**
 * 判断字段是否应该显示
 */
function isFieldVisible(field: FormFieldSchema): boolean {
  if (!field.linkage?.visibleWhen)
    return true
  return !checkConditions(field.linkage.visibleWhen, values)
}

/**
 * 判断字段是否应该禁用
 */
function isFieldDisabled(field: FormFieldSchema): boolean {
  // 优先级：field.disabled > props.disabled > linkage.disabledWhen
  if (field.disabled)
    return true
  if (props.disabled)
    return true
  if (field.linkage?.disabledWhen) {
    return checkConditions(field.linkage.disabledWhen, values)
  }
  return false
}

/**
 * 判断字段是否应该必填（联动必填）
 */
function isFieldRequired(field: FormFieldSchema): boolean {
  // 静态必填
  if (field.required)
    return true
  // 联动必填
  if (field.linkage?.requiredWhen) {
    return checkConditions(field.linkage.requiredWhen, values)
  }
  return false
}

// ==================== 监听 modelValue 变化同步到表单 ====================
watch(() => props.modelValue, (newVal) => {
  Object.entries(newVal).forEach(([key, value]) => {
    if (values[key] !== value) {
      setFieldValue(key, value)
    }
  })
}, { deep: true })

// ==================== 监听表单值变化同步给父组件 ====================
watch(values, (newValues) => {
  emit('update:modelValue', { ...newValues })
}, { deep: true })

// ==================== 渲染不同类型的表单字段 ====================
/**
 * 渲染表单字段组件
 */
function renderField(field: FormFieldSchema) {
  const disabled = isFieldDisabled(field)
  const fieldReadonly = props.readonly || field.readonly || false

  // 使用 useField 获取字段状态
  const { value: fieldValue, errorMessage, handleChange, handleBlur } = useField(
    field.key,
    undefined,
    {
      initialValue: initialValues.value[field.key],
    },
  )

  const commonProps = {
    'modelValue': fieldValue.value,
    'onUpdate:modelValue': (val: any) => {
      fieldValue.value = val
      handleChange?.(val)
    },
    'onBlur': handleBlur,
    'placeholder': field.placeholder,
    'disabled': disabled || fieldReadonly,
    'clearable': !fieldReadonly,
    ...field.componentProps,
  }

  switch (field.type) {
    case 'input':
      return h(ElInput, commonProps)

    case 'textarea':
      return h(ElInput, { ...commonProps, type: 'textarea', rows: 4 })

    case 'number':
      return h(ElInput, { ...commonProps, type: 'number' })

    case 'select':
      return h(
        ElSelect,
        { ...commonProps, style: { width: '100%' } },
        () =>
          field.options?.map(opt =>
            h(ElOption, {
              key: opt.value,
              label: opt.label,
              value: opt.value,
              disabled: opt.disabled,
            }),
          ),
      )

    case 'radio':
      return h(
        ElRadioGroup,
        { 'modelValue': fieldValue.value, 'onUpdate:modelValue': (val: any) => {
          fieldValue.value = val
          handleChange?.(val)
        }, disabled },
        () =>
          field.options?.map(opt =>
            h(ElRadio, {
              key: opt.value,
              label: opt.label,
              value: opt.value,
              disabled: opt.disabled,
            }),
          ),
      )

    case 'checkbox':
      return h(
        ElCheckboxGroup,
        { 'modelValue': fieldValue.value, 'onUpdate:modelValue': (val: any) => {
          fieldValue.value = val
          handleChange?.(val)
        }, disabled },
        () =>
          field.options?.map(opt =>
            h(ElCheckbox, {
              key: opt.value,
              label: opt.label,
              value: opt.value,
              disabled: opt.disabled,
            }),
          ),
      )

    case 'date':
      return h(ElDatePicker, {
        ...commonProps,
        type: 'date',
        style: { width: '100%' },
        valueFormat: 'YYYY-MM-DD',
      })

    case 'datetime':
      return h(ElDatePicker, {
        ...commonProps,
        type: 'datetime',
        style: { width: '100%' },
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
      })

    case 'time':
      return h(ElTimePicker, {
        ...commonProps,
        style: { width: '100%' },
        valueFormat: 'HH:mm:ss',
      })

    case 'switch':
      return h(ElSwitch, {
        'modelValue': fieldValue.value,
        'onUpdate:modelValue': (val: any) => {
          fieldValue.value = val
          handleChange?.(val)
        },
        disabled,
      })

    case 'cascader':
      return h(ElCascader, {
        ...commonProps,
        options: (field.options || []) as any,
        style: { width: '100%' },
      })

    case 'upload': {
      const uploadProps: UploadProps = {
        ...field.componentProps,
        disabled,
      }
      return h(ElUpload, uploadProps)
    }

    default:
      return h(ElInput, commonProps)
  }
}

// ==================== 表单提交/重置 ====================
/**
 * 提交表单
 */
const onSubmit = handleSubmit(
  (values) => {
    emit('submit', { ...values })
  },
  (submissionContext) => {
    // 将错误信息转换为 Record<string, string> 格式
    const errorMap: Record<string, string> = {}
    // submissionContext.errors 是 Record<string, string> 类型
    Object.entries(submissionContext.errors).forEach(([field, message]) => {
      if (message) {
        errorMap[field] = message
      }
    })
    emit('invalid', errorMap)
  },
)

/**
 * 重置表单
 */
function onReset() {
  resetForm()
  emit('reset')
}

// ==================== 暴露方法给父组件 ====================
defineExpose({
  /** 手动触发表单校验 */
  validate: validateForm,
  /** 重置表单 */
  reset: onReset,
  /** 设置某个字段的值 */
  setFieldValue,
  /** 设置某个字段的 touched 状态 */
  setFieldTouched,
  /** 获取当前表单值 */
  getValues: () => ({ ...values }),
  /** 获取校验错误 */
  getErrors: () => errors.value,
  /** 表单是否有效 */
  isValid: computed(() => meta.value.valid),
})

// ==================== 模板渲染 ====================
const labelWidth = computed(() => props.schema.labelWidth || '100px')
const gutter = computed(() => props.schema.gutter || 20)
</script>

<template>
  <ElForm
    :model="values"
    :label-width="labelWidth"
    :disabled="disabled"
    @submit.prevent="onSubmit"
  >
    <ElRow :gutter="gutter">
      <template v-for="field in schema.fields" :key="field.key">
        <ElCol v-show="isFieldVisible(field)" :span="field.span || 24" :class="field.class">
          <ElFormItem
            :label="field.label"
            :prop="field.key"
            :rules="{ required: isFieldRequired(field) }"
          >
            <!-- 字段描述 -->
            <template v-if="field.description" #label>
              <span>
                {{ field.label }}
                <ElTooltip :content="field.description" placement="top">
                  <ElIcon style="margin-left: 4px; font-size: 14px">
                    <QuestionFilled />
                  </ElIcon>
                </ElTooltip>
              </span>
            </template>

            <!-- 渲染字段 -->
            <component :is="renderField(field)" />
          </ElFormItem>
        </ElCol>
      </template>
    </ElRow>

    <!-- 表单操作按钮 -->
    <div v-if="showSubmit || showCancel" style="margin-top: 20px; text-align: right">
      <ElButton v-if="showCancel" @click="onReset">
        {{ schema.cancelButton?.text || '重置' }}
      </ElButton>
      <ElButton v-if="showSubmit" type="primary" @click="onSubmit">
        {{ schema.submitButton?.text || '提交' }}
      </ElButton>
    </div>
  </ElForm>
</template>

<style scoped>
/* 可以添加一些自定义样式 */
</style>
