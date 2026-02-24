export class HttpError extends Error {
  public code: number
  public data?: any

  constructor(message: string, code: number, data?: any) {
    super(message)
    this.name = 'HttpError'
    this.code = code
    this.data = data
  }
}

export class NetworkError extends HttpError {
  constructor(message = '网络连接失败') {
    super(message, 0)
    this.name = 'NetworkError'
  }
}

export class TimeoutError extends HttpError {
  constructor(message = '请求超时') {
    super(message, 408)
    this.name = 'TimeoutError'
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = '未授权，请登录') {
    super(message, 401)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = '无权限访问') {
    super(message, 403)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends HttpError {
  constructor(message = '资源不存在') {
    super(message, 404)
    this.name = 'NotFoundError'
  }
}
