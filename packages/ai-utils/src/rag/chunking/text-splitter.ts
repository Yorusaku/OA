import type { TextChunk, TextSplitterOptions } from '../types'

const DEFAULT_CHUNK_SIZE = 500
const DEFAULT_CHUNK_OVERLAP = 50
const PREFERRED_BOUNDARIES = ['\n\n', '\n', '。', '！', '？', '. ', ' ']

function normalizeText(input: string): string {
  return input.replace(/\r\n/g, '\n').replace(/\u0000/g, '').trim()
}

function findBoundary(slice: string, chunkSize: number): number {
  const boundary = PREFERRED_BOUNDARIES.reduce((max, marker) => {
    return Math.max(max, slice.lastIndexOf(marker))
  }, -1)

  return boundary >= Math.floor(chunkSize * 0.5) ? boundary : -1
}

export function createTextSplitter(options: TextSplitterOptions = {}) {
  const chunkSize = Math.max(100, options.chunkSize ?? DEFAULT_CHUNK_SIZE)
  const chunkOverlap = Math.max(0, Math.min(chunkSize - 1, options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP))

  return {
    split(input: string): TextChunk[] {
      const text = normalizeText(input)
      if (!text)
        return []

      const chunks: TextChunk[] = []
      let cursor = 0
      let index = 0

      while (cursor < text.length) {
        let end = Math.min(cursor + chunkSize, text.length)
        if (end < text.length) {
          const slice = text.slice(cursor, end)
          const boundary = findBoundary(slice, chunkSize)
          if (boundary >= 0)
            end = cursor + boundary + 1
        }

        const content = text.slice(cursor, end).trim()
        if (content) {
          chunks.push({
            index,
            content,
            startOffset: cursor,
            endOffset: end,
          })
          index += 1
        }

        if (end >= text.length)
          break

        cursor = Math.max(end - chunkOverlap, cursor + 1)
      }

      return chunks
    },
  }
}
