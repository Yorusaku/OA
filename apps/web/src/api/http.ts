/**
 * @file http.ts
 * @description Axios HTTP 实例封装
 * 统一处理请求响应拦截、错误处理、401 登录过期逻辑
 */

import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import type { ApiResponse } from './types'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

/**
 * HTTP 请求实例
 */
const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000, // 10 秒超时
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 统一错误处理
 * @param error - 错误对象
 * @returns Promise.reject
 */
function handleError(error: any): Promise<never> {
  let message = '请求失败，请稍后重试'

  if (error.response) {
    const { status, data } = error.response

    switch (status) {
      case 400:
        message = (data as any)?.message || '请求参数错误'
        break
      case 401:
        message = '登录已过期，请重新登录'
        break
      case 403:
        message = '无权限访问'
        break
      case 404:
        message = '请求的资源不存在'
        break
      case 500:
        message = '服务器内部错误'
        break
      case 502:
        message = '网关错误'
        break
      case 503:
        message = '服务不可用'
        break
      case 504:
        message = '网关超时'
        break
      default:
        message = data?.message || `请求失败 (${status})`
    }

    console.error(`API Error [${status}]:`, message)
  }
  else if (error.request) {
    console.error('Request Error: 未收到响应', error.request)
    message = '网络错误，请检查网络连接'
  }
  else {
    console.error('Error:', error.message)
    message = error.message || '请求失败'
  }

  // 显示错误提示（401 除外，由 401 处理器单独处理）
  if (error.response?.status !== 401) {
    ElMessage.error(message)
  }

  return Promise.reject({ error, message })
}

/**
 * 401 统一处理 - 登录过期
 * 清除用户状态并跳转到登录页
 */
function handle401() {
  const userStore = useUserStore()

  // 清除用户状态
  userStore.clearUser()

  // 跳转到登录页，携带重定向参数
  const redirect = encodeURIComponent(window.location.pathname + window.location.search)
  window.location.href = `/login?redirect=${redirect}`
}

/**
 * 请求拦截器
 * 自动添加 Authorization 头
 */
http.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

/**
 * 响应拦截器
 * 统一处理业务错误和 401 登录过期
 */
http.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { code, message, data } = response.data

    if (code === 200) {
      return data
    }

    // 业务错误
    console.error(`API Error: ${message}`)
    return Promise.reject(new Error(message))
  },
  (error) => {
    // 401 特殊处理
    if (error.response?.status === 401) {
      handle401()
      return Promise.reject(error)
    }

    // 其他错误统一处理
    return handleError(error)
  },
)

/**
 * GET 请求
 * @param url - 请求 URL
 * @param config - 请求配置
 */
export function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return http.get(url, config)
}

/**
 * POST 请求
 * @param url - 请求 URL
 * @param data - 请求数据
 * @param config - 请求配置
 */
export function post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
  return http.post(url, data, config)
}

/**
 * PUT 请求
 * @param url - 请求 URL
 * @param data - 请求数据
 * @param config - 请求配置
 */
export function put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
  return http.put(url, data, config)
}

/**
 * DELETE 请求
 * @param url - 请求 URL
 * @param config - 请求配置
 */
export function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return http.delete(url, config)
}

export default http
