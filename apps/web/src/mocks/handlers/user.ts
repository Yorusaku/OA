import { http, delay, HttpResponse } from 'msw'
import { API_PREFIX } from '@oa/utils'
import { mockUsers, mockCurrentUser } from '../data/user'

export const userHandlers = [
  http.post(`${API_PREFIX}/auth/login`, async () => {
    await delay(300)
    return HttpResponse.json({
      code: 0,
      message: '登录成功',
      data: {
        token: 'mock-token-' + Date.now(),
        userInfo: mockCurrentUser,
      },
    })
  }),

  http.post(`${API_PREFIX}/auth/logout`, async () => {
    await delay(200)
    return HttpResponse.json({
      code: 0,
      message: '退出成功',
      data: null,
    })
  }),

  http.get(`${API_PREFIX}/user/info`, async () => {
    await delay(200)
    return HttpResponse.json({
      code: 0,
      message: '获取成功',
      data: mockCurrentUser,
    })
  }),

  http.get(`${API_PREFIX}/user/list`, async () => {
    await delay(300)
    return HttpResponse.json({
      code: 0,
      message: '获取成功',
      data: {
        list: mockUsers,
        total: mockUsers.length,
        page: 1,
        pageSize: 10,
      },
    })
  }),
]
