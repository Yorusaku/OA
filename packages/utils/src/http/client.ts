import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { API_PREFIX, STORAGE_KEYS } from '../constants'
import { getStorage, removeStorage } from '../storage'
import { HttpError, UnauthorizedError, ForbiddenError, NotFoundError, NetworkError, TimeoutError } from './errors'
import type { ApiResponse } from '../types'

let axiosInstance: AxiosInstance | null = null

export function createHttpClient(config?: AxiosRequestConfig): AxiosInstance {
  if (axiosInstance)
    return axiosInstance

  const instance = axios.create({
    baseURL: API_PREFIX,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
    ...config,
  })

  instance.interceptors.request.use(
    (config) => {
      const token = getStorage<string>(STORAGE_KEYS.TOKEN)
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error),
  )

  instance.interceptors.response.use(
    (response: AxiosResponse<ApiResponse>) => {
      const { code, message, data } = response.data
      if (code === 0) {
        return data
      }
      else if (code === 401) {
        removeStorage(STORAGE_KEYS.TOKEN)
        removeStorage(STORAGE_KEYS.USER_INFO)
        throw new UnauthorizedError(message)
      }
      else if (code === 403) {
        throw new ForbiddenError(message)
      }
      else if (code === 404) {
        throw new NotFoundError(message)
      }
      else {
        throw new HttpError(message || '请求失败', code)
      }
    },
    (error) => {
      if (axios.isCancel(error)) {
        return Promise.reject(error)
      }
      else if (error.code === 'ECONNABORTED') {
        return Promise.reject(new TimeoutError())
      }
      else if (!error.response) {
        return Promise.reject(new NetworkError())
      }
      else {
        const status = error.response?.status
        const message = error.response?.data?.message || '请求失败'
        if (status === 401)
          return Promise.reject(new UnauthorizedError(message))
        if (status === 403)
          return Promise.reject(new ForbiddenError(message))
        if (status === 404)
          return Promise.reject(new NotFoundError(message))
        return Promise.reject(new HttpError(message, status))
      }
    },
  )

  axiosInstance = instance
  return instance
}

export function getHttpClient(): AxiosInstance {
  if (!axiosInstance) {
    return createHttpClient()
  }
  return axiosInstance
}
