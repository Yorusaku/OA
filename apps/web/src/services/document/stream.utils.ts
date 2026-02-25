/**
 * 流式处理工具函数
 * 用于处理大文件和数据流
 */

import type { ProcessProgress } from '@/types/document'

/**
 * 流式读取大文件（分块）
 * @param file 文件
 * @param chunkSize 块大小（字节）
 */
export async function* readFileStream(
  file: File,
  chunkSize = 1024 * 1024, // 默认 1MB
): AsyncGenerator<{
  chunk: Uint8Array
  loaded: number
  total: number
  percentage: number
}> {
  const total = file.size
  let loaded = 0

  const stream = file.stream()
  const reader = stream.getReader()

  try {
    const chunks: Uint8Array[] = []
    let currentChunkSize = 0

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        // 处理剩余数据
        if (currentChunkSize > 0) {
          const combined = concatUint8Arrays(chunks)
          yield {
            chunk: combined,
            loaded,
            total,
            percentage: Math.round((loaded / total) * 100),
          }
        }
        break
      }

      chunks.push(value)
      currentChunkSize += value.length
      loaded += value.length

      // 达到块大小时 yield
      if (currentChunkSize >= chunkSize) {
        const combined = concatUint8Arrays(chunks)
        yield {
          chunk: combined,
          loaded,
          total,
          percentage: Math.round((loaded / total) * 100),
        }
        chunks.length = 0
        currentChunkSize = 0
      }
    }
  }
  finally {
    reader.releaseLock()
  }
}

/**
 * 合并 Uint8Array 数组
 */
function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0

  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }

  return result
}

/**
 * 异步迭代器转换为 Progress
 * @param iterator 异步迭代器
 * @param onProgress 进度回调
 */
export async function consumeAsyncIterator<T, R>(
  iterator: AsyncGenerator<T, R, unknown>,
  onProgress?: (progress: ProcessProgress) => void,
): Promise<{ results: T[], final: R }> {
  const results: T[] = []
  let final: R

  while (true) {
    const { done, value } = await iterator.next()

    if (done) {
      final = value
      break
    }

    results.push(value)

    // 如果值包含进度信息，调用回调
    if (onProgress && typeof value === 'object' && value !== null && 'progress' in value) {
      const progressValue = value as any
      onProgress({
        stage: 'processing',
        percentage: progressValue.progress || 0,
        currentRow: progressValue.currentRow,
        totalRows: progressValue.totalRows,
        message: `已处理 ${progressValue.currentRow || 0} / ${progressValue.totalRows || '?'} 行`,
      })
    }
  }

  return { results, final }
}

/**
 * 分块处理数组（避免阻塞主线程）
 * @param array 要处理的数组
 * @param processor 处理函数
 * @param chunkSize 块大小
 * @param onProgress 进度回调
 */
export async function processInChunks<T, R>(
  array: T[],
  processor: (chunk: T[]) => Promise<R[]>,
  chunkSize = 100,
  onProgress?: (progress: ProcessProgress) => void,
): Promise<R[]> {
  const results: R[] = []
  const totalChunks = Math.ceil(array.length / chunkSize)

  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize)
    const chunkResults = await processor(chunk)
    results.push(...chunkResults)

    if (onProgress) {
      const currentChunk = Math.floor(i / chunkSize) + 1
      onProgress({
        stage: 'processing',
        percentage: Math.round((currentChunk / totalChunks) * 100),
        currentRow: i + chunk.length,
        totalRows: array.length,
        message: `已处理 ${i + chunk.length} / ${array.length} 条`,
      })
    }

    // 让出主线程，避免阻塞 UI
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  return results
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 创建进度跟踪器
 */
export function createProgressTracker(
  total: number,
  onProgress: (progress: ProcessProgress) => void,
): {
  update: (completed: number, message?: string) => void
  complete: () => void
} {
  let completed = 0

  return {
    update: (newCompleted: number, message?: string) => {
      completed = newCompleted
      const percentage = Math.round((completed / total) * 100)
      onProgress({
        stage: 'processing',
        percentage,
        currentRow: completed,
        totalRows: total,
        message: message || `已处理 ${completed} / ${total}`,
      })
    },
    complete: () => {
      onProgress({
        stage: 'complete',
        percentage: 100,
        currentRow: total,
        totalRows: total,
        message: '处理完成',
      })
    },
  }
}

/**
 * 限制并发数量的异步处理
 * @param tasks 任务列表
 * @param concurrency 最大并发数
 */
export async function processWithConcurrency<T, R>(
  tasks: T[],
  processor: (task: T) => Promise<R>,
  concurrency = 3,
): Promise<R[]> {
  const results: R[] = []
  let index = 0

  async function worker(): Promise<void> {
    while (index < tasks.length) {
      const currentIndex = index++
      const result = await processor(tasks[currentIndex])
      results[currentIndex] = result
    }
  }

  // 创建并发 worker
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker())
  await Promise.all(workers)

  return results
}

/**
 * 带超时的 Promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = '操作超时',
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs),
    ),
  ])
}

/**
 * 可取消的 Promise
 */
export function withCancellation<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => {
      reject(new Error('操作已取消'))
    })

    promise.then(resolve, reject)
  })
}

/**
 * 批量处理（适合大量数据的分批处理）
 */
export async function* batchProcess<T>(
  items: T[],
  batchSize = 100,
): AsyncGenerator<T[]> {
  for (let i = 0; i < items.length; i += batchSize) {
    yield items.slice(i, i + batchSize)
  }
}
