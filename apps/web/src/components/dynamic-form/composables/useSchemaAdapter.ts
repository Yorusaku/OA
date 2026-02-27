/**
 * useSchemaAdapter - Schema 适配器 Composable
 * 将外部传入的 FormSchema 转换为 form-create 认识的基础 Rule[]
 */
import type { FormSchema, FormFieldSchema } from '@/types/form-schema'

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

// ==================== 核心函数 ====================
/**
 * 适配 Schema 为 form-create 规则
 * @param schema - 外部传入的 FormSchema
 * @returns form-create 认识的基础 Rule[]
 */
export function useSchemaAdapter(schema: FormSchema) {
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
        ...field.componentProps,
      },
      validate: field.required
        ? [{ required: true, message: `${field.label}是必填项`, trigger: 'blur' }]
        : [],
    }

    // 选项
    if (field.options?.length) {
      baseRule.options = field.options.map((opt: any) => ({
        label: opt.label,
        value: opt.value,
        disabled: opt.disabled,
      }))
    }

    return baseRule
  })
}

// ==================== 类型导出 ====================
// 注意：BaseRule 和 FieldSchema 类型已存在于 '@/types/form-schema'
// 此处无需重复导出
