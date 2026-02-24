export const API_PREFIX = '/api'

export const ERROR_CODES = {
  SUCCESS: 0,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
} as const

export const STORAGE_KEYS = {
  TOKEN: 'oa_token',
  USER_INFO: 'oa_user_info',
  SIDEBAR_COLLAPSED: 'oa_sidebar_collapsed',
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
