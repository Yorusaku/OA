/**
 * PDF 处理服务
 * 封装 Web Worker 调用，提供便捷的 PDF 渲染和信息提取 API
 */

import type { PdfInfo, PdfPageInfo, PdfRenderOptions } from '@/types/document'
import type { PdfWorkerApi } from '@/workers/pdf.worker'

/**
 * PDF 服务类
 */
class PdfService {
  private worker: Worker | null = null
  private workerApi: Promise<PdfWorkerApi> | null = null

  // PDF 文档缓存
  private pdfCache: Map<string, { data: ArrayBuffer, info: PdfInfo }> = new Map()

  /**
   * 初始化 Worker
   */
  private async initWorker(): Promise<PdfWorkerApi> {
    if (this.workerApi) {
      return this.workerApi
    }

    this.worker = new Worker(
      new URL('@/workers/pdf.worker.ts', import.meta.url),
      { type: 'module' },
    )

    // 动态导入 Comlink
    this.workerApi = (async () => {
      const { wrap } = await import('comlink')
      return wrap<PdfWorkerApi>(this.worker!)
    })()

    return this.workerApi
  }

  /**
   * 终止 Worker
   */
  terminateWorker(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
      this.workerApi = null
    }
  }

  /**
   * 渲染 PDF 页面到 Canvas
   * @param source PDF 源（File、URL 或 ArrayBuffer）
   * @param options 渲染选项
   * @returns Canvas 元素和页面信息
   */
  async renderPdf(
    source: File | URL | ArrayBuffer,
    options?: PdfRenderOptions,
  ): Promise<{
    canvas: HTMLCanvasElement
    pageInfo: PdfPageInfo
  }> {
    const workerApi = await this.initWorker()
    const data = await this.loadPdfData(source)

    const { scale = 1.0, page = 1 } = options || {}

    // 调用 Worker 渲染
    const result = await workerApi.renderPdf(data, { scale, page })

    // 创建 Canvas 并绘制图像数据
    const canvas = document.createElement('canvas')
    const { width, height } = result.pageInfo
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('无法创建 Canvas 上下文')
    }

    // 将 ImageData 绘制到 Canvas
    if (result.imageData instanceof ImageData) {
      ctx.putImageData(result.imageData, 0, 0)
    }
    else {
      // 如果是 base64 字符串，需要先创建 Image
      await this.drawImageBase64(ctx, result.imageData)
    }

    return {
      canvas,
      pageInfo: {
        pageNumber: page,
        width,
        height,
        scaledWidth: width,
        scaledHeight: height,
        rotation: 0,
      },
    }
  }

  /**
   * 获取 PDF 文档信息
   */
  async getPdfInfo(source: File | URL | ArrayBuffer): Promise<PdfInfo> {
    const workerApi = await this.initWorker()
    const data = await this.loadPdfData(source)

    return workerApi.getPdfInfo(data)
  }

  /**
   * 提取 PDF 文本内容
   */
  async extractText(
    source: File | URL | ArrayBuffer,
    page?: number,
  ): Promise<{ text: string, pageNumber?: number }> {
    const workerApi = await this.initWorker()
    const data = await this.loadPdfData(source)

    return workerApi.extractText(data, page)
  }

  /**
   * 下载 PDF 文件
   */
  async downloadPdf(source: URL | File, filename?: string): Promise<void> {
    if (source instanceof File) {
      // 文件直接下载
      const url = URL.createObjectURL(source)
      this.triggerDownload(url, filename || source.name)
      setTimeout(() => URL.revokeObjectURL(url), 100)
    }
    else {
      // URL 需要 fetch
      const response = await fetch(source)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      this.triggerDownload(url, filename || this.getFilenameFromUrl(source))
      setTimeout(() => URL.revokeObjectURL(url), 100)
    }
  }

  /**
   * 打印 PDF
   */
  async printPdf(source: URL | File): Promise<void> {
    // 创建打印窗口
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      throw new Error('无法打开打印窗口，请检查浏览器设置')
    }

    // 获取 PDF 数据
    let pdfUrl: string
    if (source instanceof File) {
      pdfUrl = URL.createObjectURL(source)
    }
    else {
      pdfUrl = source.toString()
    }

    // 嵌入 PDF 到打印窗口
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>打印 PDF</title>
          <style>
            body { margin: 0; padding: 0; }
            embed { width: 100%; height: 100vh; }
            @media print {
              embed { height: 100%; }
            }
          </style>
        </head>
        <body>
          <embed src="${pdfUrl}" type="application/pdf" />
        </body>
      </html>
    `)

    printWindow.document.close()

    // 等待 PDF 加载后打印
    printWindow.onload = () => {
      printWindow.focus()
      printWindow.print()
      if (source instanceof File) {
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 100)
      }
    }
  }

  /**
   * 获取 PDF 总页数
   */
  async getPageCount(source: File | URL | ArrayBuffer): Promise<number> {
    const info = await this.getPdfInfo(source)
    return info.numPages
  }

  /**
   * 渲染 PDF 所有页面缩略图
   */
  async renderThumbnails(
    source: File | URL | ArrayBuffer,
    thumbnailWidth = 150,
  ): Promise<{ page: number, canvas: HTMLCanvasElement }[]> {
    const info = await this.getPdfInfo(source)
    const thumbnails: { page: number, canvas: HTMLCanvasElement }[] = []

    for (let page = 1; page <= info.numPages; page++) {
      // 计算合适的缩放比例
      const pageInfo = await this.getPageInfo(source, page)
      const scale = thumbnailWidth / pageInfo.width

      const { canvas } = await this.renderPdf(source, { scale, page })
      thumbnails.push({ page, canvas })
    }

    return thumbnails
  }

  /**
   * 获取单页信息
   */
  async getPageInfo(
    source: File | URL | ArrayBuffer,
    page: number,
  ): Promise<{ width: number, height: number }> {
    const workerApi = await this.initWorker()
    const data = await this.loadPdfData(source)

    // 通过渲染获取页面尺寸
    const result = await workerApi.renderPdf(data, { scale: 1.0, page })
    return {
      width: result.pageInfo.width,
      height: result.pageInfo.height,
    }
  }

  /**
   * 加载 PDF 数据
   */
  private async loadPdfData(source: File | URL | ArrayBuffer): Promise<ArrayBuffer> {
    if (source instanceof ArrayBuffer) {
      return source
    }

    if (source instanceof File) {
      return await this.readFileAsArrayBuffer(source)
    }

    if (source instanceof URL) {
      // 检查缓存
      const cacheKey = source.toString()
      if (this.pdfCache.has(cacheKey)) {
        return this.pdfCache.get(cacheKey)!.data
      }

      const response = await fetch(source)
      const buffer = await response.arrayBuffer()

      // 缓存
      this.pdfCache.set(cacheKey, {
        data: buffer,
        info: await this.getPdfInfo(buffer),
      })

      return buffer
    }

    throw new Error('不支持的 PDF 源类型')
  }

  /**
   * 读取文件为 ArrayBuffer
   */
  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * 绘制 base64 图像到 Canvas
   */
  private async drawImageBase64(
    ctx: CanvasRenderingContext2D,
    base64: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0)
        resolve()
      }
      img.onerror = reject
      img.src = base64
    })
  }

  /**
   * 触发下载
   */
  private triggerDownload(url: string, filename: string): void {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * 从 URL 获取文件名
   */
  private getFilenameFromUrl(url: URL): string {
    const pathname = url.pathname
    return pathname.substring(pathname.lastIndexOf('/') + 1) || 'document.pdf'
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.pdfCache.clear()
  }
}

// 导出单例
export const pdfService = new PdfService()
