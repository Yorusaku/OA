/**
 * Dynamic form schema types.
 */

export type FieldType
  = | 'input'
    | 'text' // compatibility alias for legacy designer output
    | 'textarea'
    | 'number'
    | 'select'
    | 'radio'
    | 'checkbox'
    | 'date'
    | 'datetime'
    | 'time'
    | 'upload'
    | 'switch'
    | 'cascader'

export interface ConditionConfig {
  field: string
  operator?:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'contains'
    | 'includes'
    | 'exists'
  value?: any
}

export interface LinkageConfig {
  visibleWhen?: ConditionConfig | ConditionConfig[]
  requiredWhen?: ConditionConfig | ConditionConfig[]
  disabledWhen?: ConditionConfig | ConditionConfig[]
}

export interface ValidationRule {
  required?: boolean
  min?: number
  max?: number
  pattern?: string | RegExp
  message?: string
  type?: 'string' | 'number' | 'boolean' | 'array' | 'date' | 'url' | 'email'
  trigger?: string
  validator?: string | ((rule: ValidationRule, value: unknown, callback: (error?: Error) => void) => void)
}

export interface SelectOption {
  label: string
  value: any
  disabled?: boolean
  children?: SelectOption[]
}

export interface FormFieldSchema {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  required?: boolean
  defaultValue?: any
  rules?: ValidationRule | ValidationRule[]
  linkage?: LinkageConfig
  options?: SelectOption[]
  optionsType?: string
  componentProps?: Record<string, any>
  readonly?: boolean
  disabled?: boolean
  description?: string
  class?: string
  span?: number
  children?: FormFieldSchema[]
  min?: number
  max?: number
}

export interface FormSchema {
  fields: FormFieldSchema[]
  initialValues?: Record<string, any>
  layout?: 'horizontal' | 'vertical' | 'inline'
  labelWidth?: string
  gutter?: number
  submitButton?: {
    text?: string
    show?: boolean
  }
  cancelButton?: {
    text?: string
    show?: boolean
  }
}

export interface ConditionResult {
  satisfied: boolean
  triggeredBy?: string
}

export type NodePermissionType = 'hidden' | 'readonly' | 'editable' | 'required'

export const PERMISSION_TYPE_LABELS = {
  hidden: '隐藏',
  readonly: '只读',
  editable: '可编辑',
  required: '必填',
} as const

export type PermissionsMap = Record<string, NodePermissionType>
