import { http, delay, HttpResponse } from 'msw'
import { API_PREFIX } from '@oa/utils'
import { mockDeptTree } from '../data/org'

export const orgHandlers = [
  http.get(`${API_PREFIX}/dept/tree`, async () => {
    await delay(300)
    return HttpResponse.json({
      code: 0,
      message: '获取成功',
      data: mockDeptTree,
    })
  }),

  http.get(`${API_PREFIX}/dept/list`, async () => {
    await delay(200)
    const flattenDepts = (depts: any[]): any[] => {
      return depts.reduce((acc, dept) => {
        acc.push({
          id: dept.id,
          name: dept.name,
          parentId: dept.parentId,
          leaderId: dept.leaderId,
          leaderName: dept.leaderName,
        })
        if (dept.children?.length) {
          acc.push(...flattenDepts(dept.children))
        }
        return acc
      }, [] as any[])
    }
    return HttpResponse.json({
      code: 0,
      message: '获取成功',
      data: flattenDepts(mockDeptTree),
    })
  }),
]
