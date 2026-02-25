/**
 * PDF 渲染 Web Worker
 * 使用 PDF.js 进行 PDF 文档的渲染和信息提取
 */

import type { PdfInfo, PdfRenderOptions } from '@/types/document'
import { expose } from 'comlink'
import * as pdfjs from 'pdfjs-dist'

// 设置 PDF.js Worker
// 使用 CDN 或本地路径，这里使用动态导入
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

/**
 * 渲染 PDF 页面
 */
async function renderPdf(
  data: ArrayBuffer | string,
  options: PdfRenderOptions,
): Promise<{
  imageData: ImageData | string
  pageInfo: { pageNumber: number, width: number, height: number }
}> {
  const { scale = 1.0, page = 1 } = options

  try {
    // 加载 PDF 文档
    const loadingTask = pdfjs.getDocument({
      data,
      useSystemFonts: true, // 使用系统字体
      cMapUrl: undefined, // 不使用 CMap（简化配置）
      standardFontDataUrl: undefined,
    })

    const pdf = await loadingTask.promise

    // 获取指定页面
    const pdfPage = await pdf.getPage(page)

    // 计算视口
    const viewport = pdfPage.getViewport({ scale })

    // 创建离屏 Canvas
    const canvas = new OffscreenCanvas(viewport.width, viewport.height)
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new WorkerError('PDF_RENDER_ERROR', '无法创建 Canvas 上下文')
    }

    // 渲染页面
    const renderTask = pdfPage.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
      canvas: canvas as unknown as HTMLCanvasElement,
    })

    await renderTask.promise

    // 获取图像数据
    const imageData = ctx.getImageData(0, 0, viewport.width, viewport.height)

    return {
      imageData,
      pageInfo: {
        pageNumber: page,
        width: viewport.width,
        height: viewport.height,
      },
    }
  }
  catch (error: any) {
    throw new WorkerError(
      'PDF_RENDER_ERROR',
      `渲染 PDF 失败：${error.message}`,
      error.stack,
    )
  }
}

/**
 * 获取 PDF 文档信息
 */
async function getPdfInfo(data: ArrayBuffer | string): Promise<PdfInfo> {
  try {
    const loadingTask = pdfjs.getDocument({
      data,
      useSystemFonts: true,
    })

    const pdf = await loadingTask.promise

    // 获取元数据
    const metadata = await pdf.getMetadata()

    // 计算文件大小
    let fileSize = 0
    if (data instanceof ArrayBuffer) {
      fileSize = data.byteLength
    }
    else if (typeof data === 'string') {
      fileSize = data.length
    }

    const info = metadata.info as any

    return {
      numPages: pdf.numPages,
      title: info?.Title,
      author: info?.Author,
      creator: info?.Creator,
      creationDate: info?.CreationDate,
      fileSize,
    }
  }
  catch (error: any) {
    throw new WorkerError(
      'PDF_INFO_ERROR',
      `获取 PDF 信息失败：${error.message}`,
      error.stack,
    )
  }
}

/**
 * 提取 PDF 文本内容
 */
async function extractText(
  data: ArrayBuffer | string,
  page?: number,
): Promise<{ text: string, pageNumber?: number }> {
  try {
    const loadingTask = pdfjs.getDocument({
      data,
      useSystemFonts: true,
    })

    const pdf = await loadingTask.promise

    // 如果指定了页码，只提取该页
    if (page !== undefined) {
      const pdfPage = await pdf.getPage(page)
      const textContent = await pdfPage.getTextContent()
      const text = textContent.items.map((item: any) => item.str).join(' ')
      return { text, pageNumber: page }
    }

    // 否则提取所有页面
    const allText: string[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
      const pdfPage = await pdf.getPage(i)
      const textContent = await pdfPage.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(' ')
      allText.push(`--- 第 ${i} 页 ---\n${pageText}`)
    }

    return { text: allText.join('\n\n') }
  }
  catch (error: any) {
    throw new WorkerError(
      'PDF_EXTRACT_TEXT_ERROR',
      `提取 PDF 文本失败：${error.message}`,
      error.stack,
    )
  }
}

/**
 * Worker 错误类
 */
class WorkerError {
  constructor(
    public code: string,
    public message: string,
    public stack?: string,
    public details?: any,
  ) {}
}

// 使用 Comlink 暴露 API
const api = {
  renderPdf,
  getPdfInfo,
  extractText,
}

export type PdfWorkerApi = typeof api

expose(api)
