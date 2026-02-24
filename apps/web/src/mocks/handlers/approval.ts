import { http, delay, HttpResponse } from 'msw'
import { API_PREFIX } from '@oa/utils'
import { mockApprovals, mockApprovalDetail, mockComments } from '../data/approval'

export const approvalHandlers = [
  http.get(`${API_PREFIX}/approval/list`, async ({ request }) => {
    await delay(300)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    let list = mockApprovals
    if (status) {
      list = mockApprovals.filter(item => item.status === status)
    }
    return HttpResponse.json({
      code: 0,
      message: '获取成功',
      data: {
        list,
        total: list.length,
        page: 1,
        pageSize: 10,
      },
    })
  }),

  http.get(`${API_PREFIX}/approval/:id`, async ({ params }) => {
    await delay(200)
    return HttpResponse.json({
      code: 0,
      message: '获取成功',
      data: mockApprovalDetail,
    })
  }),

  http.post(`${API_PREFIX}/approval`, async () => {
    await delay(500)
    return HttpResponse.json({
      code: 0,
      message: '提交成功',
      data: { id: 'new-' + Date.now() },
    })
  }),

  http.post(`${API_PREFIX}/approval/:id/approve`, async () => {
    await delay(300)
    return HttpResponse.json({
      code: 0,
      message: '审批通过',
      data: null,
    })
  }),

  http.post(`${API_PREFIX}/approval/:id/reject`, async () => {
    await delay(300)
    return HttpResponse.json({
      code: 0,
      message: '审批驳回',
      data: null,
    })
  }),

  http.get(`${API_PREFIX}/approval/:id/comments`, async () => {
    await delay(200)
    return HttpResponse.json({
      code: 0,
      message: '获取成功',
      data: mockComments,
    })
  }),

  http.post(`${API_PREFIX}/approval/:id/comments`, async () => {
    await delay(200)
    return HttpResponse.json({
      code: 0,
      message: '评论成功',
      data: { id: 'comment-' + Date.now() },
    })
  }),
]
