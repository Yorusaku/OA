export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

export interface PageParams {
  page: number
  pageSize: number
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface RequestConfig {
  timeout?: number
  headers?: Record<string, string>
  showLoading?: boolean
  showError?: boolean
}
