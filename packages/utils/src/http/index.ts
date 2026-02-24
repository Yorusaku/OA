import { createHttpClient, getHttpClient } from './client'
import * as errors from './errors'

export { createHttpClient, getHttpClient, errors }

export function httpGet<T = any>(url: string, config?: any): Promise<T> {
  return getHttpClient().get(url, config)
}

export function httpPost<T = any>(url: string, data?: any, config?: any): Promise<T> {
  return getHttpClient().post(url, data, config)
}

export function httpPut<T = any>(url: string, data?: any, config?: any): Promise<T> {
  return getHttpClient().put(url, data, config)
}

export function httpDelete<T = any>(url: string, config?: any): Promise<T> {
  return getHttpClient().delete(url, config)
}

export function httpPatch<T = any>(url: string, data?: any, config?: any): Promise<T> {
  return getHttpClient().patch(url, data, config)
}
