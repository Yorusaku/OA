import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app'
import type { BffConfig } from '../src/config'

describe('batch approval + drafts', () => {
  const config: BffConfig = {
    host: '127.0.0.1',
    port: 0,
    storage: 'inmemory',
    postgres: { connectionString: '' },
    knowledge: {
      qdrantUrl: 'http://127.0.0.1:6333',
      qdrantCollectionName: 'oa_knowledge_chunks_batch_test',
      embeddingDimensions: 1024,
    },
    idempotencyTtlHours: 24,
    enableRuleTraceDebug: true,
  }

  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => {
    app = await buildApp(config)
  })

  afterAll(async () => {
    await app.close()
  })

  async function createApproval(title: string) {
    const res = await app.inject({ method: 'POST', url: '/api/v1/approval', payload: { title, type: 'leave', applicant: '张三' } })
    expect(res.statusCode).toBe(200)
    return res.json().data.id as string
  }

  it('批量通过：两条都成功', async () => {
    const idA = await createApproval('批量A')
    const idB = await createApproval('批量B')
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/approval/batch-action',
      payload: { ids: [idA, idB], action: 'approve', operatorId: 'user-001', operatorName: 'admin' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json().data
    expect(body.succeeded).toBe(2)
    expect(body.failed).toBe(0)
    expect(body.results).toHaveLength(2)
    expect(body.results.every((item: { success: boolean }) => item.success)).toBe(true)

    const detail = await app.inject({ method: 'GET', url: `/api/v1/approval/${idA}` })
    expect(detail.json().data.status).toBe('approved')
  })

  it('批量含不存在 id：成功/失败逐条返回', async () => {
    const idA = await createApproval('批量C')
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/approval/batch-action',
      payload: { ids: [idA, 'no-such-id'], action: 'approve', operatorId: 'user-001', operatorName: 'admin' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json().data
    expect(body.succeeded).toBe(1)
    expect(body.failed).toBe(1)
    expect(body.results[0].success).toBe(true)
    expect(body.results[1].success).toBe(false)
    expect(body.results[1].error).toBeTruthy()
  })

  it('批量驳回已批准单：单条失败不阻塞其他', async () => {
    const idA = await createApproval('批量D')
    const idB = await createApproval('批量E')
    // 先全部批准 idA
    await app.inject({
      method: 'POST',
      url: '/api/v1/approval/batch-action',
      payload: { ids: [idA], action: 'approve', operatorId: 'user-001', operatorName: 'admin' },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/approval/batch-action',
      payload: { ids: [idA, idB], action: 'approve', operatorId: 'user-001', operatorName: 'admin' },
    })
    const body = res.json().data
    expect(body.failed).toBe(1)
    expect(body.succeeded).toBe(1)
    expect(body.results[0].success).toBe(false) // idA 已批准，重复处理失败
    expect(body.results[1].success).toBe(true)
  })

  it('批量参数校验：空 ids 返回 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/approval/batch-action',
      payload: { ids: [], action: 'approve' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('草稿：创建 / 列表 / 删除', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/drafts',
      payload: { workflowType: 'leave', title: '请假草稿', applicant: '张三', formData: { reason: '家中有事', days: 2 } },
    })
    expect(created.statusCode).toBe(200)
    const draft = created.json().data
    expect(draft.id).toBeTruthy()
    expect(draft.title).toBe('请假草稿')
    expect(draft.formData?.days).toBe(2)

    const list = await app.inject({ method: 'GET', url: '/api/v1/drafts' })
    expect(list.statusCode).toBe(200)
    const drafts = list.json().data
    expect(drafts.length).toBeGreaterThanOrEqual(1)
    expect(drafts.some((item: { id: string }) => item.id === draft.id)).toBe(true)

    const del = await app.inject({ method: 'DELETE', url: `/api/v1/drafts/${draft.id}` })
    expect(del.statusCode).toBe(200)

    const after = await app.inject({ method: 'GET', url: '/api/v1/drafts' })
    const afterDrafts = after.json().data
    expect(afterDrafts.some((item: { id: string }) => item.id === draft.id)).toBe(false)
  })

  it('草稿列表支持 keyword 过滤', async () => {
    await app.inject({ method: 'POST', url: '/api/v1/drafts', payload: { title: '报销草稿', workflowType: 'expense', applicant: '王五' } })
    const res = await app.inject({ method: 'GET', url: '/api/v1/drafts?keyword=报销' })
    const drafts = res.json().data
    expect(drafts.length).toBeGreaterThanOrEqual(1)
    expect(drafts.every((item: { title: string }) => item.title.includes('报销'))).toBe(true)
  })
})