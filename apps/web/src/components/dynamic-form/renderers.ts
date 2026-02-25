import type { UploadProps } from 'element-plus'
import type { FieldRenderContext, FieldRenderer } from './types'
import {
  ElCascader,
  ElCheckbox,
  ElCheckboxGroup,
  ElDatePicker,
  ElInput,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElSwitch,
  ElTimePicker,
  ElUpload,
} from 'element-plus'
import { h } from 'vue'

// ==================== 输入类字段 ====================

/**
 * 渲染输入框字段
 */
export function renderInputField(ctx: FieldRenderContext) {
  return h(ElInput, ctx.commonProps)
}

/**
 * 渲染文本域字段
 */
export function renderTextareaField(ctx: FieldRenderContext) {
  return h(ElInput, { ...ctx.commonProps, type: 'textarea', rows: 4 })
}

/**
 * 渲染数字输入框字段
 */
export function renderNumberField(ctx: FieldRenderContext) {
  return h(ElInput, { ...ctx.commonProps, type: 'number' })
}

// ==================== 选择类字段 ====================

/**
 * 渲染选择器字段
 */
export function renderSelectField(ctx: FieldRenderContext) {
  const { field, commonProps } = ctx
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
}

/**
 * 渲染单选框字段
 */
export function renderRadioField(ctx: FieldRenderContext) {
  const { field, fieldValue, handleChange, disabled } = ctx
  return h(
    ElRadioGroup,
    {
      'modelValue': fieldValue.value,
      'onUpdate:modelValue': (val: any) => {
        fieldValue.value = val
        handleChange?.(val)
      },
      disabled,
    },
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
}

/**
 * 渲染复选框字段
 */
export function renderCheckboxField(ctx: FieldRenderContext) {
  const { field, fieldValue, handleChange, disabled } = ctx
  return h(
    ElCheckboxGroup,
    {
      'modelValue': fieldValue.value,
      'onUpdate:modelValue': (val: any) => {
        fieldValue.value = val
        handleChange?.(val)
      },
      disabled,
    },
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
}

// ==================== 日期时间类字段 ====================

/**
 * 渲染日期选择器字段
 */
export function renderDateField(ctx: FieldRenderContext) {
  const { commonProps } = ctx
  return h(ElDatePicker, {
    ...commonProps,
    type: 'date',
    style: { width: '100%' },
    valueFormat: 'YYYY-MM-DD',
  })
}

/**
 * 渲染日期时间选择器字段
 */
export function renderDatetimeField(ctx: FieldRenderContext) {
  const { commonProps } = ctx
  return h(ElDatePicker, {
    ...commonProps,
    type: 'datetime',
    style: { width: '100%' },
    valueFormat: 'YYYY-MM-DD HH:mm:ss',
  })
}

/**
 * 渲染时间选择器字段
 */
export function renderTimeField(ctx: FieldRenderContext) {
  const { commonProps } = ctx
  return h(ElTimePicker, {
    ...commonProps,
    style: { width: '100%' },
    valueFormat: 'HH:mm:ss',
  })
}

// ==================== 特殊字段 ====================

/**
 * 渲染开关字段
 */
export function renderSwitchField(ctx: FieldRenderContext) {
  const { fieldValue, handleChange, disabled } = ctx
  return h(ElSwitch, {
    'modelValue': fieldValue.value,
    'onUpdate:modelValue': (val: any) => {
      fieldValue.value = val
      handleChange?.(val)
    },
    disabled,
  })
}

/**
 * 渲染级联选择器字段
 */
export function renderCascaderField(ctx: FieldRenderContext) {
  const { field, commonProps } = ctx
  return h(ElCascader, {
    ...commonProps,
    options: (field.options || []) as any,
    style: { width: '100%' },
  })
}

/**
 * 渲染上传字段
 */
export function renderUploadField(ctx: FieldRenderContext) {
  const { field, disabled } = ctx
  const uploadProps: UploadProps = {
    ...field.componentProps,
    disabled,
  }
  return h(ElUpload, uploadProps)
}

/**
 * 默认渲染器（兜底）
 */
export const renderDefault: FieldRenderer = renderInputField

/**
 * 字段渲染映射表
 */
export const fieldRenderMap: Record<string, FieldRenderer> = {
  input: renderInputField,
  textarea: renderTextareaField,
  number: renderNumberField,
  select: renderSelectField,
  radio: renderRadioField,
  checkbox: renderCheckboxField,
  date: renderDateField,
  datetime: renderDatetimeField,
  time: renderTimeField,
  switch: renderSwitchField,
  cascader: renderCascaderField,
  upload: renderUploadField,
}

/**
 * 获取字段渲染器（带默认值）
 */
export function getFieldRenderer(type: string): FieldRenderer {
  return fieldRenderMap[type] || renderDefault
}
