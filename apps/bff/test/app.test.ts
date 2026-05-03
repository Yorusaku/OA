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
})
