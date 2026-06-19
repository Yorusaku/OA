import type { RagSearchHit, RagVectorRecord } from './types'

export interface QdrantStoreOptions {
  url: string
  collectionName: string
}

interface QdrantPoint {
  id: string
  vector: number[]
  payload: Omit<RagVectorRecord, 'vector'>
}

function normalizeBaseUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

export function createQdrantVectorStore(options: QdrantStoreOptions) {
  const baseUrl = normalizeBaseUrl(options.url)
  const collectionName = options.collectionName

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    })

    if (!response.ok) {
      const message = await response.text()
      throw new Error(`Qdrant 请求失败(${response.status}): ${message}`)
    }

    return response.json() as Promise<T>
  }

  return {
    async ensureCollection(vectorSize: number): Promise<void> {
      const describe = await fetch(`${baseUrl}/collections/${collectionName}`)
      if (describe.ok)
        return

      if (describe.status !== 404) {
        const message = await describe.text()
        throw new Error(`Qdrant collection 检查失败(${describe.status}): ${message}`)
      }

      await request(`/collections/${collectionName}`, {
        method: 'PUT',
        body: JSON.stringify({
          vectors: {
            size: vectorSize,
            distance: 'Cosine',
          },
        }),
      })
    },

    async upsertVectors(records: RagVectorRecord[]): Promise<void> {
      if (records.length === 0)
        return

      const points: QdrantPoint[] = records.map(record => ({
        id: record.id,
        vector: record.vector,
        payload: {
          id: record.id,
          documentId: record.documentId,
          knowledgeBaseId: record.knowledgeBaseId,
          filename: record.filename,
          content: record.content,
          index: record.index,
          startOffset: record.startOffset,
          endOffset: record.endOffset,
        },
      }))

      await request(`/collections/${collectionName}/points?wait=true`, {
        method: 'PUT',
        body: JSON.stringify({ points }),
      })
    },

    async search(vector: number[], knowledgeBaseId: string, topK = 5): Promise<RagSearchHit[]> {
      const result = await request<{
        result?: Array<{
          id: string
          score: number
          payload: Omit<RagVectorRecord, 'vector'>
        }>
      }>(`/collections/${collectionName}/points/search`, {
        method: 'POST',
        body: JSON.stringify({
          vector,
          limit: topK,
          with_payload: true,
          filter: {
            must: [
              {
                key: 'knowledgeBaseId',
                match: { value: knowledgeBaseId },
              },
            ],
          },
        }),
      })

      return (result.result || []).map(item => ({
        id: item.id,
        score: item.score,
        payload: item.payload,
      }))
    },

    async deleteByDocumentId(documentId: string): Promise<void> {
      await request(`/collections/${collectionName}/points/delete?wait=true`, {
        method: 'POST',
        body: JSON.stringify({
          filter: {
            must: [
              {
                key: 'documentId',
                match: { value: documentId },
              },
            ],
          },
        }),
      })
    },
  }
}
