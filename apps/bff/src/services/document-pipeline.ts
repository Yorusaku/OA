import type { ArkEmbeddingService } from '@oa/ai-utils'
import { createQdrantVectorStore, createTextSplitter } from '@oa/ai-utils'

export interface DocumentPipelineDeps {
  embeddingService: ArkEmbeddingService
  qdrantStore: ReturnType<typeof createQdrantVectorStore>
}

export async function processDocument(
  deps: DocumentPipelineDeps,
  params: {
    docId: string
    kbId: string
    filename: string
    content: string
    chunkSize: number
    chunkOverlap: number
  },
): Promise<number> {
  const splitter = createTextSplitter({
    chunkSize: params.chunkSize,
    chunkOverlap: params.chunkOverlap,
  })

  const chunks = splitter.split(params.content)
  if (chunks.length === 0)
    return 0

  const batchSize = 20
  for (let index = 0; index < chunks.length; index += batchSize) {
    const batch = chunks.slice(index, index + batchSize)
    const vectors = await deps.embeddingService.embedTexts(batch.map(item => item.content))

    await deps.qdrantStore.upsertVectors(
      batch.map((chunk, chunkIndex) => ({
        id: `${params.docId}_chunk_${index + chunkIndex}`,
        documentId: params.docId,
        knowledgeBaseId: params.kbId,
        filename: params.filename,
        content: chunk.content,
        index: chunk.index,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        vector: vectors[chunkIndex],
      })),
    )
  }

  return chunks.length
}
