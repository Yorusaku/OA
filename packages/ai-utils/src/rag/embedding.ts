function readEnv(key: string): string | undefined {
  const maybeProcess = globalThis as { process?: { env?: Record<string, string | undefined> } }
  return maybeProcess.process?.env?.[key]
}

function resolveEmbeddingBaseUrl(): string {
  return readEnv('ARK_EMBEDDING_BASE_URL')
    || readEnv('ARK_BASE_URL')
    || 'https://ark.cn-beijing.volces.com/api/v3'
}

function resolveEmbeddingModel(): string {
  return readEnv('ARK_EMBEDDING_MODEL') || 'doubao-embedding-text-240715'
}

function resolveTimeout(): number {
  const raw = readEnv('ARK_REQUEST_TIMEOUT_MS')
  const value = raw ? Number(raw) : NaN
  return Number.isFinite(value) && value > 0 ? value : 30_000
}

export class ArkEmbeddingService {
  private readonly apiKey: string

  constructor() {
    const apiKey = readEnv('ARK_API_KEY')
    if (!apiKey)
      throw new Error('缺少 ARK_API_KEY 环境变量')
    this.apiKey = apiKey
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0)
      return []

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), resolveTimeout())

    try {
      const response = await fetch(`${resolveEmbeddingBaseUrl()}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: resolveEmbeddingModel(),
          input: texts,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(`Ark embedding 请求失败(${response.status}): ${message}`)
      }

      const json = await response.json() as {
        data?: Array<{
          embedding?: number[]
          index?: number
        }>
      }

      const vectors = (json.data || [])
        .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
        .map(item => item.embedding || [])

      if (vectors.length !== texts.length)
        throw new Error('Ark embedding 返回向量数量异常')

      return vectors
    }
    finally {
      clearTimeout(timer)
    }
  }
}

export function createArkEmbeddingService() {
  return new ArkEmbeddingService()
}
