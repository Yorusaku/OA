/**
 * @oa/utils - 共享工具函数库
 * 
 * 纯函数集合，无业务逻辑依赖
 * 可在多个项目/包之间复用
 */

// ==================== 日期时间格式化 ====================

/**
 * 格式化日期
 * @param date 日期对象/字符串/时间戳
 * @param format 格式模板，默认 'YYYY-MM-DD'
 */
export function formatDate(date: Date | string | number, format = 'YYYY-MM-DD'): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime()))
    return ''

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 格式化日期时间
 */
export function formatDateTime(date: Date | string | number): string {
  return formatDate(date, 'YYYY-MM-DD HH:mm:ss')
}

/**
 * 格式化金额
 * @param amount 金额
 * @param decimals 小数位数，默认 2
 */
export function formatMoney(amount: number, decimals = 2): string {
  return amount.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0)
    return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

/**
 * 截断文本
 */
export function truncateText(text: string, maxLength = 50): string {
  if (text.length <= maxLength)
    return text
  return `${text.slice(0, maxLength)}...`
}

/**
 * 首字母大写
 */
export function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * 驼峰转短横线
 */
export function camelToKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * 短横线转驼峰
 */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, char) => char.toUpperCase())
}

// ==================== 数据验证 ====================

/**
 * 是否为手机号
 */
export function isMobilePhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone)
}

/**
 * 是否为邮箱
 */
export function isEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(email)
}

/**
 * 是否为身份证号
 */
export function isIdCard(idCard: string): boolean {
  return /(^\d{15}$)|(^\d{18}$)|(^\d{17}([\dX])$)/i.test(idCard)
}

/**
 * 是否为 URL
 */
export function isUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  }
  catch {
    return false
  }
}

/**
 * 是否为数字
 */
export function isNumber(value: any): boolean {
  return !Number.isNaN(Number(value))
}

/**
 * 是否为整数
 */
export function isInteger(value: any): boolean {
  return Number.isInteger(Number(value))
}

/**
 * 是否为正数
 */
export function isPositiveNumber(value: any): boolean {
  const num = Number(value)
  return !Number.isNaN(num) && num > 0
}

/**
 * 是否非空
 */
export function isNotEmpty(value: any): boolean {
  if (value === null || value === undefined)
    return false
  if (typeof value === 'string')
    return value.trim().length > 0
  if (Array.isArray(value))
    return value.length > 0
  return true
}

// ==================== 条件判断引擎 ====================

export type ConditionOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'includes' | 'exists'

export interface Condition {
  field: string
  operator?: ConditionOperator
  value?: any
}

/**
 * 检查单个条件是否满足
 */
export function checkCondition(
  condition: Condition,
  formValues: Record<string, any>,
): boolean {
  const { field, operator = 'eq', value } = condition
  const fieldValue = formValues[field]

  switch (operator) {
    case 'eq':
      return fieldValue === value
    case 'ne':
      return fieldValue !== value
    case 'gt':
      return Number(fieldValue) > Number(value)
    case 'gte':
      return Number(fieldValue) >= Number(value)
    case 'lt':
      return Number(fieldValue) < Number(value)
    case 'lte':
      return Number(fieldValue) <= Number(value)
    case 'in':
      return Array.isArray(value) ? value.includes(fieldValue) : false
    case 'includes':
      return Array.isArray(fieldValue) ? fieldValue.includes(value) : String(fieldValue)?.includes(value)
    case 'exists':
      return value ? fieldValue != null && fieldValue !== '' : fieldValue == null || fieldValue === ''
    default:
      return fieldValue === value
  }
}

/**
 * 检查条件数组是否有满足的
 */
export function checkConditions(
  conditions: Condition | Condition[] | undefined,
  formValues: Record<string, any>,
): boolean {
  if (!conditions)
    return false
  const conditionList = Array.isArray(conditions) ? conditions : [conditions]
  return conditionList.some(cond => checkCondition(cond, formValues))
}

/**
 * 获取条件中依赖的字段列表
 */
export function getConditionFields(conditions: Condition | Condition[] | undefined): string[] {
  if (!conditions)
    return []
  const conditionList = Array.isArray(conditions) ? conditions : [conditions]
  const fields: string[] = []

  conditionList.forEach((cond) => {
    if (cond?.field) {
      fields.push(cond.field)
    }
  })

  return fields
}

// ==================== 常量定义 ====================

export const API_PREFIX = '/api'

export const ERROR_CODES = {
  SUCCESS: 0,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
} as const

export const FORM_FIELD_TYPES = {
  INPUT: 'input',
  TEXTAREA: 'textarea',
  NUMBER: 'number',
  SELECT: 'select',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  DATE: 'date',
  DATETIME: 'datetime',
  TIME: 'time',
  SWITCH: 'switch',
  CASCADER: 'cascader',
  UPLOAD: 'upload',
} as const

export const STORAGE_KEYS = {
  TOKEN: 'oa_token',
  USER_INFO: 'oa_user_info',
  SIDEBAR_COLLAPSED: 'oa_sidebar_collapsed',
} as const

export const ROUTES = {
  LOGIN: '/login',
  WORKBENCH: '/dashboard/workbench',
  APPROVAL_LAUNCH: '/approval/launch',
  APPROVAL_MINE: '/approval/mine',
  APPROVAL_TODO: '/approval/todo',
  ORG_TREE: '/org/tree',
  CONTACTS: '/contacts/list',
  SYSTEM_USER: '/system/user',
  SYSTEM_ROLE: '/system/role',
  WORKFLOW_LIST: '/workflow/list',
} as const
