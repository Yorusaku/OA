/**
 * useFormSchemaAdapter.ts - 核心转换层（Adapter Pattern）
 *
 * 设计理念：
 * Adapter Layer 模式 - 隔离第三方库（@form-create/designer）
 * 确保现有 DynamicForm 引擎不受第三方数据结构污染
 */

import type { FormSchema, FormFieldSchema, FieldType, ValidationRule, SelectOption } from '@/types/form-schema'

// ==================== 类型定义 ====================

/**
 * Designer 原始配置对象
 */
export interface DesignerConfig {
  rule: DesignerRuleItem[]
  option?: DesignerOption
}

/**
 * Designer 规则项
 */
export interface DesignerRuleItem {
  name: string
  type: string
  props?: Record<string, unknown>
  validate?: DesignerValidation
}

/**
 * Designer 校验配置
 */
export interface DesignerValidation {
  required?: boolean
  rules?: DesignerRule[]
}

/**
 * Designer 规则项
 */
export interface DesignerRule {
  different?: unknown
  pattern?: RegExp | string
  range?: [number, number]
  min?: number
  max?: number
  message?: string
  trigger?: string
  [key: string]: unknown
}

/**
 * Designer 选项配置
 */
export interface DesignerOption {
  labelWidth?: string
  submitBtn?: boolean
  resetBtn?: boolean
  [key: string]: unknown
}

// ==================== 字段类型映射表 ====================
// Designer 类型 → 系统 FieldType 映射
export const FIELD_TYPE_MAP: Readonly<Record<string, FieldType>> = {
  'input': 'text',
  'inputNumber': 'number',
  'select': 'select',
  'cascader': 'cascader',
  'radio': 'radio',
  'checkbox': 'checkbox',
  'date-picker': 'date',
  'time-picker': 'time',
  'switch': 'switch',
  'textarea': 'textarea',
  'upload': 'upload',
  'rate': 'number',
  'color-picker': 'text',
  'slider': 'number',
  'transfer': 'checkbox',
  'tree': 'cascader',
} as const

// ==================== 核心转换函数 ====================

/**
 * 将 Designer 配置转换为 FormSchema（纯函数）
 *
 * @param config Designer 原始配置
 * @returns FormSchema 我们系统的标准格式
 */
export const designerToFormSchema = (config: DesignerConfig): FormSchema => {
  const { rule, option } = config

  // 转换 fields 数组
  const fields = rule.map(item => designerRuleItemToFormField(item))

  // 构建 FormSchema
  return {
    fields,
    labelWidth: option?.labelWidth ?? '100px',
    submitButton: {
      text: '提交',
      show: true,
    },
    cancelButton: {
      text: '重置',
      show: option?.resetBtn ?? false,
    },
  }
}

/**
 * 将 Designer 规则项转换为 FormFieldSchema（纯函数）
 *
 * @param item Designer 规则项
 * @returns FormFieldSchema 系统字段定义
 */
export const designerRuleItemToFormField = (item: DesignerRuleItem): FormFieldSchema => {
  const { name, type, props = {}, validate } = item

  // 映射字段类型（带优雅降级）
  const fieldType = mapFieldType(type)

  // 提取基础属性
  const field: FormFieldSchema = {
    key: name,
    label: props.label as string ?? '',
    type: fieldType,
    placeholder: props.placeholder as string,
    defaultValue: props.value,
    required: validate?.required ?? false,
    description: props.tips as string,
    span: props.span as number,
  }

  // 转换校验规则
  field.rules = convertValidationToRules(validate)

  // 处理组件特殊属性（提纯）
  field.componentProps = extractComponentProps(type, props)

  // 处理选项类型字段的 options（提纯）
  if (['select', 'radio', 'checkbox'].includes(type) && props.options) {
    field.options = extractSelectOptions(props.options)
  }

  return field
}

/**
 * 将 Designer 字段类型映射为系统类型（带优雅降级）
 *
 * @param designerType Designer 的类型（如 'input', 'select'）
 * @returns 系统的字段类型（如 'text', 'select'）
 */
export const mapFieldType = (designerType: string): FieldType => {
  // 尝试使用原始类型匹配
  let fieldType = FIELD_TYPE_MAP[designerType as keyof typeof FIELD_TYPE_MAP]
  
  // 优雅降级：未知类型警告并 fallback
  if (!fieldType) {
    console.warn(
      `[FormDesigner] 未知组件类型 "${designerType}"，已自动 fallback 到 'text' 类型`
    )
    fieldType = 'text'
  }
  
  return fieldType
}

/**
 * 将 Designer 的校验配置转换为 Element Plus 标准的 rules 数组
 *
 * @param validate Designer 的校验配置
 * @returns Element Plus 的 rules 数组
 */
export const convertValidationToRules = (validate?: DesignerValidation): ValidationRule[] => {
  const rules: ValidationRule[] = []

  if (!validate) return rules

  // 处理 required 规则
  if (validate.required) {
    rules.push({
      required: true,
      message: '请输入必填项',
      trigger: 'blur',
    })
  }

  // 处理自定义规则
  if (validate.rules && validate.rules.length > 0) {
    validate.rules.forEach(rule => {
      const convertedRule = convertSingleRule(rule)
      if (convertedRule) {
        rules.push(convertedRule)
      }
    })
  }

  return rules
}

/**
 * 转换单个 Designer 规则为 Element Plus 规则（纯函数）
 *
 * @param rule Designer 规则项
 * @returns Element Plus 规则，如果无法转换则返回 undefined
 */
export const convertSingleRule = (rule: DesignerRule): ValidationRule | undefined => {
  // 处理 different 规则
  if ('different' in rule) {
    return {
      validator: (ruleObj: ValidationRule, value: unknown, callback: (error?: Error) => void) => {
        const differentValue = rule.different
        if (value !== differentValue) {
          callback(new Error(rule.message as string || '两次输入不一致'))
        } else {
          callback()
        }
      },
      trigger: rule.trigger as string ?? 'blur',
    }
  }
  
  // 处理 pattern 规则
  if ('pattern' in rule) {
    return {
      pattern: normalizePattern(rule.pattern),
      message: rule.message as string ?? '格式不正确',
      trigger: rule.trigger as string ?? 'blur',
    }
  }
  
  // 处理 range 规则（数字范围）
  if (Array.isArray(rule.range)) {
    return {
      type: 'number',
      min: rule.range[0] as number,
      max: rule.range[1] as number,
      message: rule.message as string ?? `长度在 ${rule.range[0]} 到 ${rule.range[1]} 个字符`,
      trigger: rule.trigger as string ?? 'blur',
    }
  }
  
  // 处理 min/max 规则
  if ('min' in rule || 'max' in rule) {
    return {
      min: rule.min as number,
      max: rule.max as number,
      message: rule.message as string ?? '长度不符合要求',
      trigger: rule.trigger as string ?? 'blur',
    }
  }
  
  // 其他规则直接透传
  const passedRule: ValidationRule = {
    message: rule.message as string ?? '格式不正确',
  }
  
  if ('trigger' in rule) {
    passedRule.trigger = rule.trigger as string
  }
  
  return passedRule
}

/**
 * 规范化 pattern 规则（纯函数）
 *
 * @param pattern RegExp 或 string 格式的正则表达式
 * @returns RegExp 实例
 */
export const normalizePattern = (pattern: unknown): RegExp | undefined => {
  if (pattern instanceof RegExp) {
    return pattern
  }
  
  if (typeof pattern === 'string') {
    try {
      // Extract flags from string format like "/pattern/flags"
      const match = pattern.match(/^\/(.+)\/([gimuy]*)$/)
      if (match) {
        return new RegExp(match[1], match[2])
      }
      // Simple string pattern
      return new RegExp(pattern)
    } catch (e) {
      console.warn(`[FormDesigner] 无效的正则表达式: ${pattern}`, e)
      return undefined
    }
  }
  
  return undefined
}

/**
 * 提取选项类型字段的 options（纯函数）
 *
 * @param options Designer 的 options 数组
 * @returns SelectOption 数组
 */
export const extractSelectOptions = (options: unknown): SelectOption[] => {
  if (!Array.isArray(options)) return []
  
  return options.map((opt: { label?: string; value?: unknown; disabled?: boolean }) => ({
    label: String(opt.label ?? ''),
    value: opt.value,
    disabled: Boolean(opt.disabled),
  }))
}

/**
 * 提取组件特定的 props（纯函数）
 *
 * @param type 组件类型
 * @param props 原始 props
 * @returns 组件 props 对象
 */
export const extractComponentProps = (type: string, props?: Record<string, unknown>): Record<string, unknown> => {
  if (!props) return {}
  
  // 复制 props 并过滤保留字段
  const filteredProps: Record<string, unknown> = { ...props }
  
  // 过滤掉不需要透传的通用属性
  const reservedProps = [
    'label', 'placeholder', 'value', 'tips', 'span',
    'options', 'required', 'rules', 'name', 'type', 'validate',
  ]
  
  reservedProps.forEach(prop => {
    delete filteredProps[prop]
  })
  
  return filteredProps
}
