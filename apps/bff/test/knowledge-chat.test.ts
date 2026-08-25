import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app'
import type { BffConfig } from '../src/config'

describe('knowledge chat bff', () => {
  const config: BffConfig = {
    host: '127.0.0.1',
    port: 0,
    storage: 'inmemory',
    postgres: {
      connectionString: '',
    },
    knowledge: {
      qdrantUrl: 'http://127.0.0.1:6333',
      qdrantCollectionName: 'oa_knowledge_chunks_chat_test',
      embeddingDimensions: 1024,
    },
    idempotencyTtlHours: 24,
    enableRuleTraceDebug: true,
  }

  let app: Awaited<ReturnType<typeof buildApp>>
  let kbId = ''

  beforeAll(async () => {
    app = await buildApp(config)

    const createKb = await app.inject({
      method: 'POST',
      url: '/api/v1/knowledge',
      payload: {
        name: '企业报销制度',
        description: '财务报销相关规则',
      },
    })
    kbId = createKb.json().data.id as string

    await app.inject({
      method: 'POST',
      url: `/api/v1/knowledge/${kbId}/documents`,
      payload: {
        filename: '报销制度.txt',
        fileType: 'text/plain',
        content: '差旅住宿标准：北京出差单晚住宿标准不超过500元。交通费用需提供合规票据。',
      },
    })
  })

  afterAll(async () => {
    await app.close()
  })

  it('creates a session with derived title and lists it', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/knowledge/${kbId}/chat/sessions`,
      payload: {
        firstMessage: '北京出差住宿标准是多少？',
      },
    })

    expect(response.statusCode).toBe(200)
    const session = response.json().data
    expect(session.kbId).toBe(kbId)
    expect(session.title).toContain('北京出差住宿标准')

    const list = await app.inject({
      method: 'GET',
      url: `/api/v1/knowledge/${kbId}/chat/sessions`,
    })
    expect(list.statusCode).toBe(200)
    expect(list.json().data.some((item: { id: string }) => item.id === session.id)).toBe(true)
  })

  it('returns 404 when creating a session for a missing knowledge base', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/knowledge/kb-not-exist/chat/sessions',
      payload: {
        firstMessage: '任意问题',
      },
    })
    expect(response.statusCode).toBe(404)
  })

  it('streams chat events and persists user and assistant messages', async () => {
    const createSession = await app.inject({
      method: 'POST',
      url: `/api/v1/knowledge/${kbId}/chat/sessions`,
      payload: {
        firstMessage: '北京出差住宿标准是多少？',
      },
    })
    const sessionId = createSession.json().data.id as string

    const stream = await app.inject({
      method: 'POST',
      url: `/api/v1/knowledge/${kbId}/chat/sessions/${sessionId}/stream`,
      payload: {
        message: '北京出差住宿标准是多少？',
      },
    })

    expect(stream.statusCode).toBe(200)
    expect(stream.headers['content-type']).toContain('text/event-stream')
    expect(stream.body).toContain('"type":"meta"')
    expect(stream.body).toContain('"type":"sources"')
    expect(stream.body).toContain('"type":"chunk"')
    expect(stream.body).toContain('"type":"done"')

    const messages = await app.inject({
      method: 'GET',
      url: `/api/v1/knowledge/${kbId}/chat/sessions/${sessionId}/messages`,
    })
    expect(messages.statusCode).toBe(200)
    const items = messages.json().data as { role: string, content: string, sources?: unknown[] }[]
    expect(items.length).toBe(2)
    expect(items[0].role).toBe('user')
    expect(items[1].role).toBe('assistant')
    expect(items[1].content.length).toBeGreaterThan(0)
    expect(Array.isArray(items[1].sources) && items[1].sources!.length).toBeTruthy()
  })

  it('writes an error event when the session does not exist', async () => {
    const stream = await app.inject({
      method: 'POST',
      url: `/api/v1/knowledge/${kbId}/chat/sessions/session-not-exist/stream`,
      payload: {
        message: '任意问题',
      },
    })
    expect(stream.statusCode).toBe(200)
    expect(stream.body).toContain('"type":"error"')
  })

  it('renames a session and rejects empty titles', async () => {
    const createSession = await app.inject({
      method: 'POST',
      url: `/api/v1/knowledge/${kbId}/chat/sessions`,
      payload: {
        firstMessage: '临时会话',
      },
    })
    const sessionId = createSession.json().data.id as string

    const rename = await app.inject({
      method: 'PUT',
      url: `/api/v1/knowledge/${kbId}/chat/sessions/${sessionId}`,
      payload: {
        title: '报销政策咨询',
      },
    })
    expect(rename.statusCode).toBe(200)
    expect(rename.json().data.title).toBe('报销政策咨询')

    const invalid = await app.inject({
      method: 'PUT',
      url: `/api/v1/knowledge/${kbId}/chat/sessions/${sessionId}`,
      payload: {
        title: '   ',
      },
    })
    expect(invalid.statusCode).toBe(400)

    const missing = await app.inject({
      method: 'PUT',
      url: `/api/v1/knowledge/${kbId}/chat/sessions/session-not-exist`,
      payload: {
        title: '任意标题',
      },
    })
    expect(missing.statusCode).toBe(404)
  })

  it('deletes a session together with its messages', async () => {
    const createSession = await app.inject({
      method: 'POST',
      url: `/api/v1/knowledge/${kbId}/chat/sessions`,
      payload: {
        firstMessage: '待删除会话',
      },
    })
    const sessionId = createSession.json().data.id as string

    await app.inject({
      method: 'POST',
      url: `/api/v1/knowledge/${kbId}/chat/sessions/${sessionId}/stream`,
      payload: {
        message: '北京出差住宿标准',
      },
    })

    const remove = await app.inject({
      method: 'DELETE',
      url: `/api/v1/knowledge/${kbId}/chat/sessions/${sessionId}`,
    })
    expect(remove.statusCode).toBe(200)

    const list = await app.inject({
      method: 'GET',
      url: `/api/v1/knowledge/${kbId}/chat/sessions`,
    })
    expect(list.json().data.some((item: { id: string }) => item.id === sessionId)).toBe(false)

    const messages = await app.inject({
      method: 'GET',
      url: `/api/v1/knowledge/${kbId}/chat/sessions/${sessionId}/messages`,
    })
    expect(messages.json().data.length).toBe(0)
  })
})