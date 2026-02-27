/**
 * 动态表单 Schema 类型定义
 * 用于驱动 DynamicForm 组件渲染和校验
 */

/**
 * 字段类型枚举
 */
export type FieldType
  = | 'input' // 文本输入
    | 'textarea' // 多行文本
    | 'number' // 数字输入
    | 'select' // 下拉选择
    | 'radio' // 单选框
    | 'checkbox' // 复选框
    | 'date' // 日期选择
    | 'datetime' // 日期时间选择
    | 'time' // 时间选择
    | 'upload' // 文件上传
    | 'switch' // 开关
    | 'cascader' // 级联选择

/**
 * 条件表达式配置
 * 支持简单的条件判断，用于控制字段的显示/必填等联动行为
 */
export interface ConditionConfig {
  /** 依赖的字段 key */
  field: string
  /** 比较操作符 */
  operator?: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'exists'
  /** 比较值 */
  value?: any
}

/**
 * 联动配置
 */
export interface LinkageConfig {
  /** 显示条件 - 满足条件时字段才显示 */
  visibleWhen?: ConditionConfig | ConditionConfig[]
  /** 必填条件 - 满足条件时字段变为必填 */
  requiredWhen?: ConditionConfig | ConditionConfig[]
  /** 禁用条件 - 满足条件时字段禁用 */
  disabledWhen?: ConditionConfig | ConditionConfig[]
}

/**
 * 校验规则配置
 */
export interface ValidationRule {
  /** 是否必填 */
  required?: boolean
  /** 最小长度 */
  min?: number
  /** 最大长度 */
  max?: number
  /** 正则表达式 */
  pattern?: string | RegExp
  /** 自定义校验消息 */
  message?: string
  /** 校验器类型 */
  type?: 'string' | 'number' | 'boolean' | 'array' | 'date' | 'url' | 'email'
  /** 自定义校验函数 (通过 validatorName 引用) */
  validator?: string
}

/**
 * 下拉选项配置
 */
export interface SelectOption {
  label: string
  value: any
  disabled?: boolean
  children?: SelectOption[] // 用于级联选择
}

/**
 * 字段 Schema 定义
 */
export interface FormFieldSchema {
  /** 字段唯一标识（对应表单 model 的 key） */
  key: string
  /** 字段标签 */
  label: string
  /** 字段类型 */
  type: FieldType
  /** 占位符 */
  placeholder?: string
  /** 是否必填（静态必填，不考虑联动） */
  required?: boolean
  /** 默认值 */
  defaultValue?: any
  /** 校验规则 */
  rules?: ValidationRule
  /** 联动配置 */
  linkage?: LinkageConfig
  /** 下拉选项（select/radio/checkbox 使用） */
  options?: SelectOption[]
  /** 选项数据源类型（用于从后端拉取） */
  optionsType?: string
  /** Element Plus 组件的额外 props */
  componentProps?: Record<string, any>
  /** 是否只读 */
  readonly?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 字段描述/提示信息 */
  description?: string
  /** 自定义 class */
  class?: string
  /** 栅格布局 span (1-24) */
  span?: number
  /** 子字段（用于对象类型或级联） */
  children?: FormFieldSchema[]
}

/**
 * 表单 Schema 配置
 */
export interface FormSchema {
  /** 字段列表 */
  fields: FormFieldSchema[]
  /** 表单初始值 */
  initialValues?: Record<string, any>
  /** 表单布局 */
  layout?: 'horizontal' | 'vertical' | 'inline'
  /** 标签宽度 */
  labelWidth?: string
  /** 每行栅格数 */
  gutter?: number
  /** 提交按钮配置 */
  submitButton?: {
    text?: string
    show?: boolean
  }
  /** 取消按钮配置 */
  cancelButton?: {
    text?: string
    show?: boolean
  }
}

/**
 * 条件判断结果
 */
export interface ConditionResult {
  /** 是否满足条件 */
  satisfied: boolean
  /** 触发条件的字段值 */
  triggeredBy?: string
}

/**
 * 节点级表单权限类型
 * 用于在不同审批节点控制表单字段的可见性、可编辑性、必填性
 * 
 * @see permissions 映射表使用示例：{ hr_comment: 'required', amount: 'readonly', secret_note: 'hidden' }
 */
export type NodePermissionType
  = 'hidden'    // 字段隐藏（不渲染到 DOM）
  | 'readonly'  // 字段只读（用户不可编辑）
  | 'editable'  // 字段可编辑（恢复默认状态）
  | 'required'  // 字段必填（强制校验）

/**
 * 权限类型说明
 */
export const PERMISSION_TYPE_LABELS = {
  hidden: '隐藏',
  readonly: '只读',
  editable: '可编辑',
  required: '必填',
} as const

/**
 * 节点权限映射表
 * key 是字段的 key，value 是权限类型
 * 
 * @example
 * ```ts
 * const permissions: PermissionsMap = {
 *   hr_comment: 'required',  // HR 评论字段必填
 *   amount: 'readonly',      // 金额字段只读
 *   secret_note: 'hidden',   // 内部备注隐藏
 * }
 * ```
 */
export type PermissionsMap = Record<string, NodePermissionType>
