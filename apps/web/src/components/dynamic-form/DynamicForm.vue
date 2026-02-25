<script setup lang="ts">
/**
 * 动态表单组件
 * 基于 Element Plus 和 VeeValidate 实现
 * 通过 JSON Schema 配置生成表单
 */

// 导入类型定义
import type { FormFieldSchema, FormSchema } from '@/types/form-schema'

// 导入 Element Plus 图标
import { QuestionFilled } from '@element-plus/icons-vue'

// 导入 Element Plus 组件
import {
  ElButton,
  ElCol,
  ElForm,
  ElFormItem,
  ElIcon,
  ElRow,
  ElTooltip,
} from 'element-plus'

// 导入 VeeValidate 钩子
import { useField } from 'vee-validate'

// 导入 Vue 组合式 API
import { computed, ref, watch } from 'vue'

// 导入自定义组合式函数
import { useDynamicForm } from './composables'
import { useFieldState } from './composables/useFieldState'

// 导入字段渲染器
import { getFieldRenderer } from './renderers'

/**
 * 组件属性定义
 */
const props = withDefaults(defineProps<{
  /** 表单配置 schema */
  schema: FormSchema
  /** 表单数据模型 */
  modelValue?: Record<string, any>
  /** 是否只读模式 */
  readonly?: boolean
  /** 是否禁用状态 */
  disabled?: boolean
  /** 是否显示提交按钮 */
  showSubmit?: boolean
  /** 是否显示取消按钮 */
  showCancel?: boolean
}>(), {
  modelValue: () => ({}),
  readonly: false,
  disabled: false,
  showSubmit: true,
  showCancel: false,
})

/**
 * 组件事件定义
 */
const emit = defineEmits<{
  /** 表单数据更新事件 */
  'update:modelValue': [values: Record<string, any>]
  /** 表单提交成功事件 */
  'submit': [values: Record<string, any>]
  /** 表单重置事件 */
  'reset': []
  /** 表单验证失败事件 */
  'invalid': [errors: Record<string, string>]
}>()

// ==================== 状态管理 ====================

/**
 * 表单数据模型引用
 */
const modelValueRef = ref(props.modelValue)

/**
 * 监听外部 modelValue 变化，同步到内部状态
 */
watch(() => props.modelValue, (newVal) => {
  modelValueRef.value = newVal
})

// ==================== 组合式 API ====================

/**
 * 使用动态表单组合式函数
 * 处理表单核心逻辑，包括验证、提交等
 */
const {
  values, // 表单当前值
  errors, // 表单验证错误
  meta, // 表单元信息
  validate, // 表单验证方法
  resetForm, // 表单重置方法
  setFieldValue, // 设置字段值方法
  setFieldTouched, // 设置字段触摸状态方法
  handleSubmit, // 表单提交处理方法
} = useDynamicForm({
  schema: computed(() => props.schema),
  modelValue: modelValueRef,
  emit: emit as any,
})

/**
 * 使用字段状态组合式函数
 * 处理字段的可见性、禁用状态、必填状态等
 */
const {
  isFieldVisible,
  isFieldDisabled,
  isFieldRequired,
  isFieldReadonly,
} = useFieldState({
  values,
  disabled: props.disabled,
  readonly: props.readonly,
})

// ==================== 字段渲染 ====================

/**
 * 渲染表单字段组件
 * @param field 字段配置 schema
 * @returns 渲染后的字段组件
 */
function renderField(field: FormFieldSchema) {
  // 获取字段状态
  const disabled = isFieldDisabled(field)
  const fieldReadonly = isFieldReadonly(field)

  // 使用 useField 获取字段状态（来自 VeeValidate）
  const { value: fieldValue, handleChange, handleBlur } = useField(
    field.key,
    undefined,
    {
      initialValue: field.defaultValue,
    },
  )

  // 构建字段通用属性
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

  // 构建渲染上下文
  const renderContext = {
    field,
    fieldValue,
    handleChange,
    handleBlur,
    disabled,
    fieldReadonly,
    commonProps,
  }

  // 使用映射表获取渲染器并渲染字段
  const renderFunc = getFieldRenderer(field.type)
  return renderFunc(renderContext)
}

// ==================== 表单提交/重置 ====================

/**
 * 表单提交处理
 */
const onSubmit = handleSubmit(
  // 提交成功回调
  (values) => {
    emit('submit', { ...values })
  },
  // 提交失败回调
  (submissionContext) => {
    const errorMap: Record<string, string> = {}
    const errors = submissionContext.errors || {}

    // 处理错误信息
    Object.keys(errors).forEach((field) => {
      const message = errors[field as keyof typeof errors]
      if (message && typeof message === 'string') {
        errorMap[field] = message
      }
    })

    // 触发验证失败事件
    emit('invalid', errorMap)
  },
)

/**
 * 表单重置处理
 */
function onReset() {
  // 重置表单
  resetForm()
  // 触发重置事件
  emit('reset')
}

// ==================== 暴露方法给父组件 ====================

defineExpose({
  /** 手动触发表单校验 */
  validate,
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

// ==================== 模板计算属性 ====================

/**
 * 表单标签宽度
 */
const labelWidth = computed(() => props.schema.labelWidth || '100px')

/**
 * 表单栅格间距
 */
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
        <ElCol
          v-show="isFieldVisible(field)"
          :span="field.span || 24"
          :class="field.class"
        >
          <ElFormItem
            :label="field.label"
            :prop="field.key"
            :rules="{ required: isFieldRequired(field) }"
          >
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

            <component :is="renderField(field)" />
          </ElFormItem>
        </ElCol>
      </template>
    </ElRow>

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
