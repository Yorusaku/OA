import { ElMessage, ElNotification } from 'element-plus'

export interface ErrorHandlerOptions {
  showMessage?: boolean
  showNotification?: boolean
  customMessage?: string
  onError?: (error: any) => void
}

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

function getErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error
  }

  if (error?.message) {
    return error.message
  }

  if (error?.response?.data?.message) {
    return error.response.data.message
  }

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

  if (error?.code === 'NETWORK_ERROR') {
    return '网络连接失败，请检查网络'
  }

  return '操作失败，请稍后重试'
}
