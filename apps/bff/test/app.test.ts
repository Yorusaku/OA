import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app'
import type { BffConfig } from '../src/config'

describe('oa bff', () => {
  const config: BffConfig = {
    host: '127.0.0.1',
    port: 0,
    storage: 'inmemory',
    postgres: {
      connectionString: '',
    },
    knowledge: {
      qdrantUrl: 'http://127.0.0.1:6333',
      qdrantCollectionName: 'oa_knowledge_chunks_test',
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

  it('supports login and health', async () => {
    const health = await app.inject({
      method: 'GET',
      url: '/health',
    })
    expect(health.statusCode).toBe(200)

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'admin',
        password: 'admin123',
      },
    })
    expect(login.statusCode).toBe(200)
    const loginBody = login.json()
    expect(loginBody.data.userInfo.name).toBe('admin')
  })

  it('supports idempotent approval submit', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/approval',
      headers: {
        'Idempotency-Key': 'test-idem-1',
      },
      payload: {
        title: '幂等测试审批',
        type: 'leave',
        applicant: '测试用户',
      },
    })
    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/approval',
      headers: {
        'Idempotency-Key': 'test-idem-1',
      },
      payload: {
        title: '幂等测试审批',
        type: 'leave',
        applicant: '测试用户',
      },
    })
    expect(first.statusCode).toBe(200)
    expect(second.statusCode).toBe(200)
    expect(first.json().data.id).toBe(second.json().data.id)
  })

  it('processes approval and exposes metrics', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/approval/list?page=1&pageSize=5&status=pending',
    })
    const listBody = listRes.json()
    const record = listBody.data.list[0]
    expect(record).toBeTruthy()

    const processRes = await app.inject({
      method: 'POST',
      url: `/api/v1/approval/${record.id}/action`,
      payload: {
        action: 'approve',
        operatorId: 'user-001',
        operatorName: 'admin',
      },
    })
    expect(processRes.statusCode).toBe(200)
    expect(processRes.json().data.status).toBe('approved')

    const metricsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/metrics/approval/overview',
    })
    expect(metricsRes.statusCode).toBe(200)
    expect(metricsRes.json().data.totals.approvals).toBeGreaterThan(0)
  })

  it('supports workflow publish, impact and rule trace', async () => {
    const workflowList = await app.inject({
      method: 'GET',
      url: '/api/v1/workflow/list?page=1&pageSize=10',
    })
    expect(workflowList.statusCode).toBe(200)
    const workflow = workflowList.json().data.list[0]
    expect(workflow).toBeTruthy()

    const publish = await app.inject({
      method: 'POST',
      url: `/api/v1/workflow/${workflow.id}/publish`,
      payload: { actor: 'admin' },
    })
    expect(publish.statusCode).toBe(200)

    const impact = await app.inject({
      method: 'GET',
      url: `/api/v1/workflow/${workflow.id}/impact`,
    })
    expect(impact.statusCode).toBe(200)
    expect(impact.json().data.workflowId).toBe(workflow.id)

    const trace = await app.inject({
      method: 'POST',
      url: `/api/v1/workflow/${workflow.id}/rule-trace`,
      payload: {
        nodeId: 'node-hr-approval',
        formData: { reason: '调休', days: 2 },
      },
    })
    expect(trace.statusCode).toBe(200)
    expect(Array.isArray(trace.json().data.fields)).toBe(true)
  })
  it('supports workflow version listing', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/workflow',
      payload: {
        name: '版本测试流程',
        nodes: [],
        edges: [],
        status: 'draft',
      },
    })

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/workflow/list',
    })
    const wfList = listRes.json()
    const wf = wfList.data.list[0]

    const versions = await app.inject({
      method: 'GET',
      url: `/api/v1/workflow/${wf.id}/versions`,
    })
    expect(versions.statusCode).toBe(200)
    const vData = versions.json()
    expect(vData.data.length).toBeGreaterThanOrEqual(1)
    expect(vData.data[0].workflowId).toBe(wf.id)
  })

  it('supports audit log listing', async () => {
    const logs = await app.inject({
      method: 'GET',
      url: '/api/v1/audit/logs?page=1&pageSize=10',
    })
    expect(logs.statusCode).toBe(200)
    const logData = logs.json()
    expect(logData.data).toHaveProperty('list')
    expect(logData.data).toHaveProperty('total')
  })

  it('publishes workflow and creates audit event', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/workflow',
      payload: {
        name: '发布审计测试流程',
        nodes: [],
        edges: [],
        status: 'draft',
      },
    })

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/workflow/list',
    })
    const wf = listRes.json().data.list.find((w: any) => w.name === '发布审计测试流程')
    expect(wf).toBeTruthy()

    const publishRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workflow/${wf.id}/publish`,
      payload: { actor: 'tester' },
    })
    expect(publishRes.statusCode).toBe(200)

    const logs = await app.inject({
      method: 'GET',
      url: '/api/v1/audit/logs?action=workflow.publish&pageSize=50',
    })
    const logData = logs.json()
    const publishLog = logData.data.list.find((l: any) => l.targetId === wf.id && l.action === 'workflow.publish')
    expect(publishLog).toBeTruthy()
    expect(publishLog.summary).toContain('发布')
  })

  it('rollback workflow and creates audit event', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/workflow',
      payload: {
        name: '回滚审计测试流程',
        nodes: [],
        edges: [],
        status: 'draft',
      },
    })

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/workflow/list',
    })
    const wf = listRes.json().data.list.find((w: any) => w.name === '回滚审计测试流程')

    await app.inject({
      method: 'POST',
      url: `/api/v1/workflow/${wf.id}/publish`,
      payload: { actor: 'tester' },
    })

    const versionsRes = await app.inject({
      method: 'GET',
      url: `/api/v1/workflow/${wf.id}/versions`,
    })
    const versions = versionsRes.json().data
    const publishedVersion = versions.find((v: any) => v.status === 'published')
    expect(publishedVersion).toBeTruthy()

    const rollbackRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workflow/${wf.id}/rollback`,
      payload: { versionId: publishedVersion.id, actor: 'tester' },
    })
    expect(rollbackRes.statusCode).toBe(200)

    const logs = await app.inject({
      method: 'GET',
      url: '/api/v1/audit/logs?action=workflow.rollback&pageSize=50',
    })
    const logData = logs.json()
    const rollbackLog = logData.data.list.find((l: any) => l.targetId === wf.id && l.action === 'workflow.rollback')
    expect(rollbackLog).toBeTruthy()
    expect(rollbackLog.summary).toContain('回滚')
  })

  it('delegation triggers audit events', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/approval/delegation',
      payload: {
        ownerId: 'user-test-delegate',
        ownerName: '委托人',
        delegateId: 'user-test-agent',
        delegateName: '代理人',
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 86400000).toISOString(),
        enabled: true,
      },
    })

    const logs = await app.inject({
      method: 'GET',
      url: '/api/v1/audit/logs?action=approval.delegate.enable&pageSize=50',
    })
    const logData = logs.json()
    expect(logData.data.list.some((l: any) => l.targetId === 'user-test-delegate')).toBeTruthy()
  })

  it('returns fallback ai approval suggestion when ark key is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/approval-suggestion',
      payload: {
        approvalId: 'APPROVE-SEED-001',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.suggestion).toBe('manual_review')
    expect(body.data.confidence).toBeLessThanOrEqual(0.5)
    expect(body.data.disclaimer).toContain('人工审批')
  })

  it('returns 404 when ai approval suggestion target does not exist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/approval-suggestion',
      payload: {
        approvalId: 'NOT-EXISTS',
      },
    })

    expect(response.statusCode).toBe(404)
  })

  it('streams ai approval suggestion events', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/approval-suggestion/stream',
      payload: {
        approvalId: 'APPROVE-SEED-001',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/event-stream')
    expect(response.body).toContain('"type":"meta"')
    expect(response.body).toContain('"type":"done"')
  })

  it('supports knowledge base CRUD and search in inmemory mode', async () => {
    const createKb = await app.inject({
      method: 'POST',
      url: '/api/v1/knowledge',
      payload: {
        name: '企业报销制度',
        description: '财务报销相关规则',
      },
    })

    expect(createKb.statusCode).toBe(200)
    const kbId = createKb.json().data.id as string

    const upload = await app.inject({
      method: 'POST',
      url: `/api/v1/knowledge/${kbId}/documents`,
      payload: {
        filename: '报销制度.txt',
        fileType: 'text/plain',
        content: '差旅住宿标准：北京出差单晚住宿标准不超过500元。交通费用需提供合规票据。',
      },
    })

    expect(upload.statusCode).toBe(200)
    expect(upload.json().data.chunkCount).toBeGreaterThan(0)

    const listDocs = await app.inject({
      method: 'GET',
      url: `/api/v1/knowledge/${kbId}/documents`,
    })

    expect(listDocs.statusCode).toBe(200)
    expect(listDocs.json().data.length).toBe(1)

    const search = await app.inject({
      method: 'POST',
      url: `/api/v1/knowledge/${kbId}/search`,
      payload: {
        query: '北京出差住宿标准是多少',
      },
    })

    expect(search.statusCode).toBe(200)
    expect(search.json().data.sources.length).toBeGreaterThan(0)

    const deleteDoc = await app.inject({
      method: 'DELETE',
      url: `/api/v1/knowledge/${kbId}/documents/${upload.json().data.id as string}`,
    })

    expect(deleteDoc.statusCode).toBe(200)

    const deleteKb = await app.inject({
      method: 'DELETE',
      url: `/api/v1/knowledge/${kbId}`,
    })

    expect(deleteKb.statusCode).toBe(200)
  })

  it('falls back to local chunk indexing when ark embedding config is missing', async () => {
    const createKb = await app.inject({
      method: 'POST',
      url: '/api/v1/knowledge',
      payload: {
        name: '联调降级知识库',
        description: '验证未配置 Ark 时的上传降级',
      },
    })

    expect(createKb.statusCode).toBe(200)
    const kbId = createKb.json().data.id as string

    const originalArkApiKey = process.env.ARK_API_KEY
    delete process.env.ARK_API_KEY

    try {
      const upload = await app.inject({
        method: 'POST',
        url: `/api/v1/knowledge/${kbId}/documents`,
        payload: {
          filename: '联调降级.txt',
          fileType: 'text/plain',
          content: '出差住宿标准：一线城市单晚不超过500元，超标需人工审批。',
        },
      })

      expect(upload.statusCode).toBe(200)
      expect(upload.json().data.status).toBe('ready')
      expect(upload.json().data.chunkCount).toBeGreaterThan(0)

      const search = await app.inject({
        method: 'POST',
        url: `/api/v1/knowledge/${kbId}/search`,
        payload: {
          query: '出差住宿标准',
        },
      })

      expect(search.statusCode).toBe(200)
      expect(search.json().data.sources.length).toBeGreaterThan(0)
    }
    finally {
      if (originalArkApiKey)
        process.env.ARK_API_KEY = originalArkApiKey
    }
  })

})
