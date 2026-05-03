/**
 * @oa/utils
 * Shared pure utility functions and constants.
 */

// ==================== generic helpers ====================

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return function (this: any, ...args: Parameters<T>) {
    if (timer)
      clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let lastTime = 0
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now()
    if (now - lastTime >= delay) {
      lastTime = now
      fn.apply(this, args)
    }
  }
}

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object')
    return obj
  if (obj instanceof Date)
    return new Date(obj) as T
  if (Array.isArray(obj))
    return obj.map(item => deepClone(item)) as T
  const cloned: Record<string, any> = {}
  Object.keys(obj as Record<string, any>).forEach((key) => {
    cloned[key] = deepClone((obj as Record<string, any>)[key])
  })
  return cloned as T
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ==================== formatters ====================

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

export function formatDateTime(date: Date | string | number): string {
  return formatDate(date, 'YYYY-MM-DD HH:mm:ss')
}

export function formatMoney(amount: number, decimals = 2): string {
  return amount.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0)
    return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

export function truncateText(text: string, maxLength = 50): string {
  if (text.length <= maxLength)
    return text
  return `${text.slice(0, maxLength)}...`
}

export function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function camelToKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, char) => char.toUpperCase())
}

// ==================== validators ====================

export function isMobilePhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone)
}

export function isEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(email)
}

export function isIdCard(idCard: string): boolean {
  return /(^\d{15}$)|(^\d{18}$)|(^\d{17}([\dX])$)/i.test(idCard)
}

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
 * Strict number check for wire contracts.
 * Only finite `number` is valid.
 */
export function isNumber(value: any): boolean {
  return typeof value === 'number' && Number.isFinite(value)
}

export function isInteger(value: any): boolean {
  return Number.isInteger(value)
}

export function isPositiveNumber(value: any): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function isNotEmpty(value: any): boolean {
  if (value === null || value === undefined)
    return false
  if (typeof value === 'string')
    return value.trim().length > 0
  if (Array.isArray(value))
    return value.length > 0
  return true
}

// ==================== condition engine ====================

export type ConditionOperator
  = | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'contains'
    | 'includes'
    | 'exists'

export interface Condition {
  field: string
  operator?: ConditionOperator
  value?: any
}

export function checkCondition(condition: Condition, formValues: Record<string, any>): boolean {
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
    case 'contains':
    case 'includes':
      if (Array.isArray(fieldValue))
        return fieldValue.includes(value)
      if (fieldValue == null)
        return false
      return String(fieldValue).includes(String(value))
    case 'exists':
      return value ? fieldValue != null && fieldValue !== '' : fieldValue == null || fieldValue === ''
    default:
      return fieldValue === value
  }
}

export function checkConditions(
  conditions: Condition | Condition[] | undefined,
  formValues: Record<string, any>,
): boolean {
  if (!conditions)
    return false
  const conditionList = Array.isArray(conditions) ? conditions : [conditions]
  return conditionList.some(cond => checkCondition(cond, formValues))
}

export function getConditionFields(conditions: Condition | Condition[] | undefined): string[] {
  if (!conditions)
    return []
  const conditionList = Array.isArray(conditions) ? conditions : [conditions]
  return conditionList.map(cond => cond.field).filter(Boolean)
}

// ==================== constants ====================

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
  WORKBENCH: '/',
  APPROVAL_LAUNCH: '/approval/launch',
  APPROVAL_MINE: '/approval/mine',
  APPROVAL_TODO: '/approval/todo',
  ORG_TREE: '/org/tree',
  CONTACTS: '/contacts/list',
  SYSTEM_USER: '/system/users',
  SYSTEM_ROLE: '/system/roles',
  WORKFLOW_LIST: '/workflow/list',
} as const
