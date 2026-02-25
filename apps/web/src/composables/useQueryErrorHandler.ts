/**
 * @file useQueryErrorHandler.ts
 * @description Vue Query 错误处理工具
 * 统一处理查询错误并显示友好的错误提示
 */

import { ElMessage, ElNotification } from 'element-plus'

export interface ErrorHandlerOptions {
  /** 是否显示 Message 提示 */
  showMessage?: boolean
  /** 是否显示 Notification 通知 */
  showNotification?: boolean
  /** 自定义错误消息 */
  customMessage?: string
  /** 额外错误回调 */
  onError?: (error: any) => void
}

/**
 * 处理 Vue Query 查询错误
 * @param error - 错误对象
 * @param options - 处理选项
 * @usage
 * ```ts
 * try {
 *   await queryFn()
 * } catch (error) {
 *   handleQueryError(error, { showMessage: true })
 * }
 * ```
 */
export function handleQueryError(error: any, options: ErrorHandlerOptions = {}) {
  const {
    showMessage = true,
    showNotification = false,
    customMessage,
    onError,
  } = options

  console.error('Query Error:', error)

  const errorMessage = customMessage || getErrorMessage(error)

  if (showMessage) {
    ElMessage.error(errorMessage)
  }

  if (showNotification) {
    ElNotification.error({
      title: '错误',
      message: errorMessage,
      duration: 5000,
    })
  }

  if (onError) {
    onError(error)
  }
}

/**
 * 根据错误类型获取错误消息
 * @param error - 错误对象
 * @returns 友好的错误提示文本
 */
function getErrorMessage(error: any): string {
  // 字符串错误
  if (typeof error === 'string') {
    return error
  }

  // 有 message 属性
  if (error?.message) {
    return error.message
  }

  // API 响应错误
  if (error?.response?.data?.message) {
    return error.response.data.message
  }

  // 根据状态码判断
  if (error?.response?.status === 401) {
    return '登录已过期，请重新登录'
  }

  if (error?.response?.status === 403) {
    return '没有权限访问该资源'
  }

  if (error?.response?.status === 404) {
    return '请求的资源不存在'
  }

  if (error?.response?.status >= 500) {
    return '服务器错误，请稍后重试'
  }

  // 网络错误
  if (error?.code === 'NETWORK_ERROR') {
    return '网络连接失败，请检查网络'
  }

  return '操作失败，请稍后重试'
}
