import { http, delay, HttpResponse } from 'msw'
import { API_PREFIX } from '@oa/utils'
import { mockDictData } from '../data/dict'

export const dictHandlers = [
  http.get(`${API_PREFIX}/dict/:type`, async ({ params }) => {
    await delay(200)
    const type = params.type as string
    return HttpResponse.json({
      code: 0,
      message: '获取成功',
      data: mockDictData[type] || [],
    })
  }),

  http.get(`${API_PREFIX}/dict/batch`, async ({ request }) => {
    await delay(300)
    const url = new URL(request.url)
    const types = url.searchParams.get('types')?.split(',') || []
    const result: Record<string, any[]> = {}
    types.forEach(type => {
      result[type] = mockDictData[type] || []
    })
    return HttpResponse.json({
      code: 0,
      message: '获取成功',
      data: result,
    })
  }),
]
