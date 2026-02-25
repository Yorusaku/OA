import { API_PREFIX } from '@oa/utils'
import { delay, http, HttpResponse } from 'msw'
import { mockWorkflowDetail, mockWorkflows } from '../data/workflow'

export const workflowHandlers = [
  http.get(`${API_PREFIX}/workflow/list`, async () => {
    await delay(300)
    return HttpResponse.json({
      code: 0,
      message: '获取成功',
      data: {
        list: mockWorkflows,
        total: mockWorkflows.length,
        page: 1,
        pageSize: 10,
      },
    })
  }),

  http.get(`${API_PREFIX}/workflow/:id`, async () => {
    await delay(200)
    return HttpResponse.json({
      code: 0,
      message: '获取成功',
      data: mockWorkflowDetail,
    })
  }),

  http.post(`${API_PREFIX}/workflow`, async () => {
    await delay(500)
    return HttpResponse.json({
      code: 0,
      message: '创建成功',
      data: { id: `workflow-${Date.now()}` },
    })
  }),

  http.put(`${API_PREFIX}/workflow/:id`, async () => {
    await delay(300)
    return HttpResponse.json({
      code: 0,
      message: '更新成功',
      data: null,
    })
  }),

  http.delete(`${API_PREFIX}/workflow/:id`, async () => {
    await delay(300)
    return HttpResponse.json({
      code: 0,
      message: '删除成功',
      data: null,
    })
  }),

  http.post(`${API_PREFIX}/workflow/:id/publish`, async () => {
    await delay(300)
    return HttpResponse.json({
      code: 0,
      message: '发布成功',
      data: null,
    })
  }),
]
