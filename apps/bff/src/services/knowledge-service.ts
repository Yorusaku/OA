import type {
  CreateKnowledgeBaseRequest,
  KnowledgeBaseItem,
  KnowledgeDocumentItem,
  RagSearchResponse,
  UploadKnowledgeDocumentRequest,
} from '@oa/contracts'
import {
  createArkEmbeddingService,
  createLLM,
  createQdrantVectorStore,
  createTextSplitter,
} from '@oa/ai-utils'
import type { BffConfig } from '../config'
import type { RuntimeStore } from '../store'
import { uid } from '../utils'
import { processDocument } from './document-pipeline'

interface InMemoryKnowledgeBase extends KnowledgeBaseItem {}

interface InMemoryKnowledgeDocument extends KnowledgeDocumentItem {
  content: string
}

interface InMemoryKnowledgeChunk {
  id: string
  documentId: string
  knowledgeBaseId: string
  filename: string
  content: string
  scoreSeed: number
}

const inMemoryState = {
  bases: [] as InMemoryKnowledgeBase[],
  documents: [] as InMemoryKnowledgeDocument[],
  chunks: [] as InMemoryKnowledgeChunk[],
}

export const __knowledgeState = inMemoryState

export function __resetKnowledgeRuntimeState(): void {
  inMemoryState.bases = []
  inMemoryState.documents = []
  inMemoryState.chunks = []
}

function hasSqlStore(store: RuntimeStore): store is RuntimeStore & Required<Pick<RuntimeStore, 'query'>> {
  return store.storage === 'postgres' && typeof store.query === 'function'
}

function qdrantStoreFor(config: BffConfig) {
  return createQdrantVectorStore({
    url: config.knowledge.qdrantUrl,
    collectionName: config.knowledge.qdrantCollectionName,
  })
}

function createEmbeddingService() {
  return createArkEmbeddingService()
}

function mapKnowledgeBase(row: Record<string, any>): KnowledgeBaseItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    chunkSize: Number(row.chunk_size),
    chunkOverlap: Number(row.chunk_overlap),
    createdAt: new Date(row.created_at).toISOString(),
  }
}

function mapKnowledgeDocument(row: Record<string, any>): KnowledgeDocumentItem {
  return {
    id: row.id,
    kbId: row.kb_id,
    filename: row.filename,
    fileType: row.file_type,
    fileSize: Number(row.file_size),
    chunkCount: Number(row.chunk_count),
    status: row.status as KnowledgeDocumentItem['status'],
    errorMessage: row.error_message,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

function normalizeChunkOptions(payload: CreateKnowledgeBaseRequest): { chunkSize: number, chunkOverlap: number } {
  const chunkSize = Math.max(100, Math.floor(payload.chunkSize ?? 500))
  const chunkOverlap = Math.max(0, Math.min(chunkSize - 1, Math.floor(payload.chunkOverlap ?? 50)))
  return { chunkSize, chunkOverlap }
}

function scoreTextMatch(query: string, content: string): number {
  const normalizedQuery = query.trim().toLowerCase()
  const normalizedContent = content.toLowerCase()
  if (!normalizedQuery)
    return 0

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)
  if (!tokens.length)
    return 0

  const hitCount = tokens.filter(token => normalizedContent.includes(token)).length
  return hitCount / tokens.length
}

function scoreSqlDocumentMatch(query: string, content: string, filename: string, chunkIndex: number): number {
  const textScore = scoreTextMatch(query, content)
  const fileBonus = filename.toLowerCase().includes(query.trim().toLowerCase()) ? 0.08 : 0
  const orderBonus = 1 / (chunkIndex + 10)
  return textScore + fileBonus + orderBonus
}

function countChunks(content: string, chunkSize: number, chunkOverlap: number): number {
  return createTextSplitter({
    chunkSize,
    chunkOverlap,
  }).split(content).length
}

function canUseVectorPipeline(): boolean {
  return Boolean(process.env.ARK_API_KEY?.trim())
}

function buildFallbackSourcesFromDocument(
  document: {
    id: string
    filename: string
    content: string
    chunkSize: number
    chunkOverlap: number
  },
  query: string,
  topK: number,
): RagSearchResponse['sources'] {
  const splitter = createTextSplitter({
    chunkSize: document.chunkSize,
    chunkOverlap: document.chunkOverlap,
  })

  return splitter
    .split(document.content)
    .map(chunk => ({
      documentId: document.id,
      filename: document.filename,
      chunkId: `${document.id}_chunk_${chunk.index}`,
      score: scoreSqlDocumentMatch(query, chunk.content, document.filename, chunk.index),
      content: chunk.content,
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

async function synthesizeAnswer(query: string, sources: RagSearchResponse['sources']): Promise<string> {
  if (sources.length === 0)
    return '未检索到足够相关的制度内容，建议人工判断。'

  try {
    const llm = createLLM({ temperature: 0.2, maxTokens: 500 })
    const sourceText = sources
      .map((item, index) => `来源${index + 1}（${item.filename}）：${item.content}`)
      .join('\n')

    const response = await llm.invoke([
      {
        role: 'system',
        content: [
          '你是企业制度知识库助手。',
          '请严格依据提供的制度片段回答，不要编造不存在的条款。',
          '如果证据不足，请明确说明需要人工确认。',
          '输出中文自然语言答案，不要输出 Markdown 列表。',
        ].join('\n'),
      },
      {
        role: 'user',
        content: `问题：${query}\n\n制度片段：\n${sourceText}`,
      },
    ])

    return response.content.trim()
  }
  catch {
    return `已找到 ${sources.length} 条相关制度片段，建议结合来源内容人工确认。`
  }
}

export async function initializeKnowledgeInfrastructure(config: BffConfig): Promise<void> {
  await qdrantStoreFor(config).ensureCollection(config.knowledge.embeddingDimensions)
}

export async function createKnowledgeBase(
  store: RuntimeStore,
  _config: BffConfig,
  payload: CreateKnowledgeBaseRequest,
): Promise<KnowledgeBaseItem> {
  const { chunkSize, chunkOverlap } = normalizeChunkOptions(payload)
  const item: KnowledgeBaseItem = {
    id: uid('kb'),
    name: payload.name.trim(),
    description: payload.description?.trim() || '',
    chunkSize,
    chunkOverlap,
    createdAt: new Date().toISOString(),
  }

  if (!hasSqlStore(store)) {
    inMemoryState.bases.unshift(item)
    return item
  }

  await store.query(
    'INSERT INTO knowledge_bases(id, name, description, chunk_size, chunk_overlap) VALUES ($1, $2, $3, $4, $5)',
    [item.id, item.name, item.description, item.chunkSize, item.chunkOverlap],
  )

  return item
}

export async function listKnowledgeBases(store: RuntimeStore): Promise<KnowledgeBaseItem[]> {
  if (!hasSqlStore(store))
    return [...inMemoryState.bases]

  const result = await store.query('SELECT * FROM knowledge_bases ORDER BY created_at DESC')
  return result.rows.map(mapKnowledgeBase)
}

export async function deleteKnowledgeBase(
  store: RuntimeStore,
  config: BffConfig,
  id: string,
): Promise<void> {
  if (!hasSqlStore(store)) {
    inMemoryState.bases = inMemoryState.bases.filter(item => item.id !== id)
    const documentIds = inMemoryState.documents.filter(item => item.kbId === id).map(item => item.id)
    inMemoryState.documents = inMemoryState.documents.filter(item => item.kbId !== id)
    inMemoryState.chunks = inMemoryState.chunks.filter(item => !documentIds.includes(item.documentId))
    return
  }

  const documents = await store.query<{ id: string }>(
    'SELECT id FROM knowledge_documents WHERE kb_id = $1',
    [id],
  )

  for (const document of documents.rows) {
    try {
      await qdrantStoreFor(config).deleteByDocumentId(document.id)
    }
    catch {
      // Ignore vector cleanup failures to avoid blocking metadata deletion.
    }
  }

  await store.query('DELETE FROM knowledge_bases WHERE id = $1', [id])
}

export async function listKnowledgeDocuments(store: RuntimeStore, kbId: string): Promise<KnowledgeDocumentItem[]> {
  if (!hasSqlStore(store))
    return inMemoryState.documents.filter(item => item.kbId === kbId)

  const result = await store.query('SELECT * FROM knowledge_documents WHERE kb_id = $1 ORDER BY created_at DESC', [kbId])
  return result.rows.map(mapKnowledgeDocument)
}

export async function uploadDocument(
  store: RuntimeStore,
  config: BffConfig,
  payload: UploadKnowledgeDocumentRequest & { kbId: string },
): Promise<KnowledgeDocumentItem> {
  if (!hasSqlStore(store)) {
    const base = inMemoryState.bases.find(item => item.id === payload.kbId)
    if (!base)
      throw new Error('knowledge-base-not-found')

    const document: InMemoryKnowledgeDocument = {
      id: uid('doc'),
      kbId: payload.kbId,
      filename: payload.filename,
      fileType: payload.fileType,
      fileSize: payload.fileSize ?? 0,
      chunkCount: 0,
      status: 'processing',
      errorMessage: null,
      createdAt: new Date().toISOString(),
      content: payload.content,
    }

    inMemoryState.documents.unshift(document)

    const splitter = createTextSplitter({
      chunkSize: base.chunkSize,
      chunkOverlap: base.chunkOverlap,
    })
    const chunks = splitter.split(payload.content)
    document.chunkCount = chunks.length
    document.status = 'ready'
    inMemoryState.chunks.push(
      ...chunks.map(chunk => ({
        id: `${document.id}_chunk_${chunk.index}`,
        documentId: document.id,
        knowledgeBaseId: document.kbId,
        filename: document.filename,
        content: chunk.content,
        scoreSeed: chunk.index,
      })),
    )

    return document
  }

  const kbResult = await store.query<{ id: string, chunk_size: number, chunk_overlap: number }>(
    'SELECT id, chunk_size, chunk_overlap FROM knowledge_bases WHERE id = $1',
    [payload.kbId],
  )
  if (kbResult.rowCount === 0)
    throw new Error('knowledge-base-not-found')

  const kb = kbResult.rows[0]
  const docId = uid('doc')
  await store.query(
    `INSERT INTO knowledge_documents(id, kb_id, filename, file_type, file_size, content, chunk_count, status)
     VALUES ($1, $2, $3, $4, $5, $6, 0, 'processing')`,
    [docId, payload.kbId, payload.filename, payload.fileType, payload.fileSize ?? 0, payload.content],
  )

  const qdrantStore = qdrantStoreFor(config)
  const fallbackChunkCount = countChunks(
    payload.content,
    Number(kb.chunk_size),
    Number(kb.chunk_overlap),
  )

  if (!canUseVectorPipeline()) {
    await store.query(
      `UPDATE knowledge_documents
       SET chunk_count = $2, status = 'ready', error_message = NULL
       WHERE id = $1`,
      [docId, fallbackChunkCount],
    )

    const docResult = await store.query('SELECT * FROM knowledge_documents WHERE id = $1', [docId])
    return mapKnowledgeDocument(docResult.rows[0])
  }

  try {
    await qdrantStore.ensureCollection(config.knowledge.embeddingDimensions)
    const embeddingService = createEmbeddingService()
    const chunkCount = await processDocument(
      { embeddingService, qdrantStore },
      {
        docId,
        kbId: payload.kbId,
        filename: payload.filename,
        content: payload.content,
        chunkSize: Number(kb.chunk_size),
        chunkOverlap: Number(kb.chunk_overlap),
      },
    )

    await store.query(
      `UPDATE knowledge_documents
       SET chunk_count = $2, status = 'ready', error_message = NULL
       WHERE id = $1`,
      [docId, chunkCount],
    )
  }
  catch (error) {
    await store.query(
      `UPDATE knowledge_documents
       SET chunk_count = $2, status = 'ready', error_message = $3
       WHERE id = $1`,
      [
        docId,
        fallbackChunkCount,
        error instanceof Error ? `vector-index-skipped: ${error.message}` : 'vector-index-skipped',
      ],
    )
  }

  const docResult = await store.query('SELECT * FROM knowledge_documents WHERE id = $1', [docId])
  return mapKnowledgeDocument(docResult.rows[0])
}

export async function reindexKnowledgeDocument(
  store: RuntimeStore,
  config: BffConfig,
  kbId: string,
  id: string,
): Promise<KnowledgeDocumentItem> {
  if (!hasSqlStore(store)) {
    const document = inMemoryState.documents.find(item => item.id === id && item.kbId === kbId)
    const base = inMemoryState.bases.find(item => item.id === kbId)
    if (!document || !base)
      throw new Error('knowledge-document-not-found')

    inMemoryState.chunks = inMemoryState.chunks.filter(item => item.documentId !== id)
    const splitter = createTextSplitter({ chunkSize: base.chunkSize, chunkOverlap: base.chunkOverlap })
    const chunks = splitter.split(document.content)
    document.chunkCount = chunks.length
    document.status = 'ready'
    document.errorMessage = null
    inMemoryState.chunks.push(...chunks.map(chunk => ({
      id: `${document.id}_chunk_${chunk.index}`,
      documentId: document.id,
      knowledgeBaseId: document.kbId,
      filename: document.filename,
      content: chunk.content,
      scoreSeed: chunk.index,
    })))
    return document
  }

  const result = await store.query<{
    id: string
    kb_id: string
    filename: string
    file_type: string
    file_size: number
    content: string
    chunk_size: number
    chunk_overlap: number
  }>(
    `SELECT d.*, k.chunk_size, k.chunk_overlap
     FROM knowledge_documents d
     JOIN knowledge_bases k ON k.id = d.kb_id
     WHERE d.id = $1 AND d.kb_id = $2`,
    [id, kbId],
  )
  if (result.rowCount === 0)
    throw new Error('knowledge-document-not-found')

  const document = result.rows[0]
  const fallbackChunkCount = countChunks(document.content, Number(document.chunk_size), Number(document.chunk_overlap))
  await store.query(
    `UPDATE knowledge_documents SET status = 'processing', error_message = NULL WHERE id = $1`,
    [id],
  )

  if (!canUseVectorPipeline()) {
    await store.query(
      `UPDATE knowledge_documents SET chunk_count = $2, status = 'ready', error_message = NULL WHERE id = $1`,
      [id, fallbackChunkCount],
    )
  }
  else {
    try {
      const qdrantStore = qdrantStoreFor(config)
      await qdrantStore.deleteByDocumentId(id)
      await qdrantStore.ensureCollection(config.knowledge.embeddingDimensions)
      const chunkCount = await processDocument(
        { embeddingService: createEmbeddingService(), qdrantStore },
        {
          docId: id,
          kbId,
          filename: document.filename,
          content: document.content,
          chunkSize: Number(document.chunk_size),
          chunkOverlap: Number(document.chunk_overlap),
        },
      )
      await store.query(
        `UPDATE knowledge_documents SET chunk_count = $2, status = 'ready', error_message = NULL WHERE id = $1`,
        [id, chunkCount],
      )
    }
    catch (error) {
      await store.query(
        `UPDATE knowledge_documents SET chunk_count = $2, status = 'ready', error_message = $3 WHERE id = $1`,
        [id, fallbackChunkCount, error instanceof Error ? `vector-index-skipped: ${error.message}` : 'vector-index-skipped'],
      )
    }
  }

  const updated = await store.query('SELECT * FROM knowledge_documents WHERE id = $1', [id])
  return mapKnowledgeDocument(updated.rows[0])
}

export async function deleteKnowledgeDocument(
  store: RuntimeStore,
  config: BffConfig,
  id: string,
): Promise<void> {
  if (!hasSqlStore(store)) {
    inMemoryState.documents = inMemoryState.documents.filter(item => item.id !== id)
    inMemoryState.chunks = inMemoryState.chunks.filter(item => item.documentId !== id)
    return
  }

  const result = await store.query('SELECT id FROM knowledge_documents WHERE id = $1', [id])
  if (result.rowCount === 0)
    return

  try {
    await qdrantStoreFor(config).deleteByDocumentId(id)
  }
  catch {
    // Qdrant 不可用时仍允许删除元数据，避免文档无法清理。
  }

  await store.query('DELETE FROM knowledge_documents WHERE id = $1', [id])
}

export async function searchKnowledge(
  store: RuntimeStore,
  config: BffConfig,
  payload: { kbId: string, query: string, topK?: number },
): Promise<RagSearchResponse> {
  const sources = await retrieveKnowledgeSources(store, config, payload)
  return {
    answer: await synthesizeAnswer(payload.query, sources),
    sources,
  }
}

export async function retrieveKnowledgeSources(
  store: RuntimeStore,
  config: BffConfig,
  payload: { kbId: string, query: string, topK?: number },
): Promise<RagSearchResponse['sources']> {
  if (!hasSqlStore(store)) {
    const hits = inMemoryState.chunks
      .filter(item => item.knowledgeBaseId === payload.kbId)
      .map(item => ({
        documentId: item.documentId,
        filename: item.filename,
        chunkId: item.id,
        score: scoreTextMatch(payload.query, item.content) + (1 / (item.scoreSeed + 10)),
        content: item.content,
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, payload.topK ?? 5)

    return hits
  }

  const kbResult = await store.query('SELECT id FROM knowledge_bases WHERE id = $1', [payload.kbId])
  if (kbResult.rowCount === 0)
    throw new Error('knowledge-base-not-found')

  const qdrantStore = qdrantStoreFor(config)
  const topK = payload.topK ?? 5

  try {
    await qdrantStore.ensureCollection(config.knowledge.embeddingDimensions)

    const embeddingService = createEmbeddingService()
    const [queryVector] = await embeddingService.embedTexts([payload.query])
    const hits = await qdrantStore.search(queryVector, payload.kbId, topK)

    const sources = hits.map(hit => ({
      documentId: hit.payload.documentId,
      filename: hit.payload.filename,
      chunkId: hit.id,
      score: hit.score,
      content: hit.payload.content,
    }))

    return sources
  }
  catch {
    const fallbackDocs = await store.query<{
      id: string
      filename: string
      content: string
      chunk_count: number
      status: string
      chunk_size: number
      chunk_overlap: number
    }>(
      `SELECT d.id, d.filename, d.content, d.chunk_count, d.status, b.chunk_size, b.chunk_overlap
       FROM knowledge_documents d
       INNER JOIN knowledge_bases b ON b.id = d.kb_id
       WHERE d.kb_id = $1 AND d.status = 'ready'
       ORDER BY d.created_at DESC`,
      [payload.kbId],
    )

    const sources = fallbackDocs.rows
      .flatMap(item =>
        buildFallbackSourcesFromDocument(
          {
            id: item.id,
            filename: item.filename,
            content: item.content,
            chunkSize: Number(item.chunk_size),
            chunkOverlap: Number(item.chunk_overlap),
          },
          payload.query,
          topK,
        ),
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)

    return sources
  }
}
