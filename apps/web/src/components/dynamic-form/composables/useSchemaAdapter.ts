/**
 * useSchemaAdapter - Schema 适配器 Composable（V2 · 联动校验增强版）
 * 将外部传入的 FormSchema 转换为 form-create 认识的基础 Rule[]
 * 支持联动校验（requiredWhen/visibleWhen/disabledWhen）、日期限制、选项映射等
 */
import type { FormSchema, FormFieldSchema } from '@/types/form-schema'
import { checkCondition, checkConditions, getConditionFields } from '@oa/utils'

// ==================== 类型映射 ====================
/** 将表单字段类型映射为 form-create 类型 */
const TYPE_MAP: Readonly<Record<string, string>> = {
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

// ==================== 工具函数 ====================

/**
 * 生成动态必填验证器（用于 requiredWhen）
 * @param field - 表单字段
 * @param formDataRef - 表单值引用（用于条件判断）
 * @returns form-create 格式的验证器
 */
function createRequiredWhenValidator(
  field: FormFieldSchema,
  formDataRef: { value: Record<string, any> },
): any {
  return {
    validator: (rule: any, value: any, callback: any) => {
      const formData = formDataRef.value
      const condition = field.linkage?.requiredWhen

      if (condition && checkConditions(condition, formData)) {
        // 联动必填条件满足，检查值是否为空
        if (value === undefined || value === null || value === '') {
          callback(new Error(`${field.label}是必填项`))
        } else {
          callback()
        }
      } else {
        // 联动必填条件不满足，跳过校验
        callback()
      }
    },
    trigger: 'change',
  }
}

/**
 * 检查字段是否应该禁用（联动 disabledWhen）
 * @param field - 表单字段
 * @param formDataRef - 表单值引用
 * @returns true = 禁用
 */
function isFieldDisabledWhen(
  field: FormFieldSchema,
  formDataRef: { value: Record<string, any> },
): boolean {
  const formData = formDataRef.value
  const condition = field.linkage?.disabledWhen

  if (condition && checkConditions(condition, formData)) {
    return true
  }

  return false
}

/**
 * 检查字段是否应该隐藏（联动 visibleWhen）
 * @param field - 表单字段
 * @param formDataRef - 表单值引用
 * @returns false = 隐藏
 */
function isFieldVisibleWhen(
  field: FormFieldSchema,
  formDataRef: { value: Record<string, any> },
): boolean {
  const formData = formDataRef.value
  const condition = field.linkage?.visibleWhen

  // 无 visibleWhen 配置，始终显示
  if (!condition) {
    return true
  }

  // 有 visibleWhen，检查条件
  return checkConditions(condition, formData)
}

// ==================== 核心函数 ====================
/**
 * 适配 Schema 为 form-create 规则
 * @param schema - 外部传入的 FormSchema
 * @param formDataRef - 表单值引用（用于联动校验）
 * @returns form-create 认识的基础 Rule[]
 */
export function useSchemaAdapter(
  schema: FormSchema,
  formDataRef?: { value: Record<string, any> },
) {
  const fields = schema?.fields
  if (!fields?.length) return []

  return fields.map((field: FormFieldSchema) => {
    const mappedType = TYPE_MAP[field.type] || field.type
    const today = new Date()

    // 构建基础规则
    const baseRule: any = {
      type: mappedType,
      field: field.key,
      title: field.label,
      // 优先使用 modelValue 中的值,否则使用 defaultValue
      value: undefined,
      props: {
        type: field.type === 'textarea' ? 'textarea' : undefined,
        placeholder: field.placeholder,
        clearable: true,
        // 日期字段限制：只能选择今天及以后
        ...((field.type === 'date' || field.type === 'datetime') && {
          disabledDate: (date: Date) => {
            return date.getTime() < today.setHours(0, 0, 0, 0)
          },
        }),
        // 静态禁用
        disabled: field.disabled || field.readonly,
        ...field.componentProps,
      },
      validate: [] as any[],
    }

    // ==================== 静态必填校验 ====================
    if (field.required) {
      baseRule.validate.push({
        required: true,
        message: `${field.label}是必填项`,
        trigger: 'blur',
      })
    }

    // ==================== 联动必填校验 ====================
    if (field.linkage?.requiredWhen && formDataRef) {
      baseRule.validate.push(createRequiredWhenValidator(field, formDataRef))
    }

    // ==================== 选项映射 ====================
    if (field.options?.length) {
      baseRule.options = field.options.map((opt: any) => ({
        label: opt.label,
        value: opt.value,
        disabled: opt.disabled,
      }))
    }

    // ==================== 链式调用支持 ====================
    // 保存 formDataRef 引用，用于后续动态计算
    if (formDataRef) {
      baseRule._formDataRef = formDataRef
      baseRule._field = field
    }

    return baseRule
  })
}

// ==================== 类型导出 ====================
// 注意：BaseRule 和 FieldSchema 类型已存在于 '@/types/form-schema'
// 此处无需重复导出

// ==================== 导出工具函数 ====================
export {
  createRequiredWhenValidator,
  isFieldDisabledWhen,
  isFieldVisibleWhen,
}
