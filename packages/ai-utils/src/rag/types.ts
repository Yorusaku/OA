export interface TextChunk {
  index: number
  content: string
  startOffset: number
  endOffset: number
}

export interface TextSplitterOptions {
  chunkSize?: number
  chunkOverlap?: number
}

export interface RagVectorRecord {
  id: string
  documentId: string
  knowledgeBaseId: string
  filename: string
  content: string
  index: number
  startOffset: number
  endOffset: number
  vector: number[]
}

export interface RagSearchHit {
  id: string
  score: number
  payload: Omit<RagVectorRecord, 'vector'>
}
