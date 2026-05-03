import { post } from './http'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  userInfo: {
    id: string
    name: string
  }
}

export function loginByBff(payload: LoginRequest): Promise<LoginResponse> {
  return post('/v1/auth/login', payload)
}
