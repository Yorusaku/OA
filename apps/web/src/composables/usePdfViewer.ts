/**
 * PDF 查看器组合式 API
 * 处理 PDF 加载、渲染、翻页和缩放
 */

import type { PdfInfo, PdfPageInfo, PdfViewerConfig } from '@/types/document'
import { computed, ref, watch } from 'vue'
import { pdfService } from '@/services/document'

export interface UsePdfViewerOptions extends PdfViewerConfig {
  /**
   * 初始页码
   * @default 1
   */
  initialPage?: number
  /**
   * 自动加载（设置 source 后自动加载）
   * @default true
   */
  autoLoad?: boolean
}

export function usePdfViewer(options?: UsePdfViewerOptions) {
  // 配置
  const config: Required<PdfViewerConfig> = {
    defaultScale: options?.defaultScale || 1.0,
    minScale: options?.minScale || 0.5,
    maxScale: options?.maxScale || 3.0,
    scaleStep: options?.scaleStep || 0.25,
    showToolbar: options?.showToolbar ?? true,
    showThumbnails: options?.showThumbnails ?? false,
    enablePrint: options?.enablePrint ?? true,
    enableDownload: options?.enableDownload ?? true,
  }

  // 状态
  const isLoading = ref(false)
  const isRendering = ref(false)
  const currentPage = ref(options?.initialPage || 1)
  const totalPages = ref(0)
  const scale = ref(config.defaultScale)
  const rotation = ref(0)
  const pdfInfo = ref<PdfInfo | null>(null)
  const pageInfo = ref<PdfPageInfo | null>(null)
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const containerRef = ref<HTMLElement | null>(null)
  const error = ref<Error | null>(null)
  const sourceRef = ref<File | URL | ArrayBuffer | null>(null)

  // 计算属性
  const canZoomIn = computed(() => scale.value < config.maxScale)
  const canZoomOut = computed(() => scale.value > config.minScale)
  const canGoPrev = computed(() => currentPage.value > 1)
  const canGoNext = computed(() => currentPage.value < totalPages.value)
  const hasError = computed(() => error.value !== null)
  const isReady = computed(() => !isLoading.value && totalPages.value > 0 && !error.value)

  /**
   * 加载 PDF
   */
  const loadPdf = async (source: File | URL | ArrayBuffer): Promise<PdfInfo> => {
    reset()
    sourceRef.value = source
    isLoading.value = true
    error.value = null

    try {
      // 获取 PDF 信息
      const info = await pdfService.getPdfInfo(source)
      pdfInfo.value = info
      totalPages.value = info.numPages

      // 验证页码
      if (currentPage.value > totalPages.value) {
        currentPage.value = 1
      }

      // 渲染第一页
      await renderPage(currentPage.value)

      return info
    }
    catch (err: any) {
      error.value = err instanceof Error ? err : new Error('加载 PDF 失败')
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * 渲染指定页
   */
  const renderPage = async (page: number): Promise<void> => {
    if (!sourceRef.value || isRendering.value) {
      return
    }

    isRendering.value = true
    error.value = null

    try {
      const { canvas, pageInfo: info } = await pdfService.renderPdf(sourceRef.value, {
        page,
        scale: scale.value,
      })

      // 更新 Canvas
      if (canvasRef.value && containerRef.value) {
        // 替换 Canvas
        containerRef.value.innerHTML = ''
        canvasRef.value = canvas
        containerRef.value.appendChild(canvas)
      }

      pageInfo.value = info
      currentPage.value = page
    }
    catch (err: any) {
      error.value = err instanceof Error ? err : new Error(`渲染第 ${page} 页失败`)
    }
    finally {
      isRendering.value = false
    }
  }

  /**
   * 跳转到指定页
   */
  const goToPage = (page: number): void => {
    const targetPage = Math.max(1, Math.min(page, totalPages.value))
    if (targetPage !== currentPage.value) {
      renderPage(targetPage)
    }
  }

  /**
   * 上一页
   */
  const prevPage = (): void => {
    if (canGoPrev.value) {
      goToPage(currentPage.value - 1)
    }
  }

  /**
   * 下一页
   */
  const nextPage = (): void => {
    if (canGoNext.value) {
      goToPage(currentPage.value + 1)
    }
  }

  /**
   * 缩放
   */
  const zoom = (newScale: number): void => {
    scale.value = Math.max(config.minScale, Math.min(newScale, config.maxScale))
    // 重新渲染当前页
    renderPage(currentPage.value)
  }

  /**
   * 放大
   */
  const zoomIn = (): void => {
    zoom(scale.value + config.scaleStep)
  }

  /**
   * 缩小
   */
  const zoomOut = (): void => {
    zoom(scale.value - config.scaleStep)
  }

  /**
   * 适应宽度
   */
  const fitToWidth = (): void => {
    if (!containerRef.value || !pageInfo.value) {
      return
    }

    const containerWidth = containerRef.value.clientWidth
    const pageWidth = pageInfo.value.scaledWidth
    const newScale = containerWidth / pageWidth
    zoom(newScale)
  }

  /**
   * 适应高度
   */
  const fitToHeight = (): void => {
    if (!containerRef.value || !pageInfo.value) {
      return
    }

    const containerHeight = containerRef.value.clientHeight
    const pageHeight = pageInfo.value.scaledHeight
    const newScale = containerHeight / pageHeight
    zoom(newScale)
  }

  /**
   * 重置缩放
   */
  const resetZoom = (): void => {
    zoom(config.defaultScale)
  }

  /**
   * 旋转
   */
  const rotate = (degrees: number): void => {
    rotation.value = (rotation.value + degrees) % 360
    // 旋转后重新渲染
    renderPage(currentPage.value)
  }

  /**
   * 顺时针旋转 90 度
   */
  const rotateClockwise = (): void => {
    rotate(90)
  }

  /**
   * 逆时针旋转 90 度
   */
  const rotateCounterClockwise = (): void => {
    rotate(-90)
  }

  /**
   * 下载 PDF
   */
  const download = async (): Promise<void> => {
    if (!sourceRef.value) {
      return
    }

    const source = sourceRef.value
    const filename = source instanceof File ? source.name : 'document.pdf'

    if (source instanceof File || source instanceof URL) {
      await pdfService.downloadPdf(source, filename)
    }
  }

  /**
   * 打印 PDF
   */
  const print = async (): Promise<void> => {
    if (!sourceRef.value) {
      return
    }

    const source = sourceRef.value
    if (source instanceof File || source instanceof URL) {
      await pdfService.printPdf(source)
    }
  }

  /**
   * 获取文本内容
   */
  const extractText = async (page?: number): Promise<string> => {
    if (!sourceRef.value) {
      throw new Error('未加载 PDF')
    }

    const result = await pdfService.extractText(sourceRef.value, page)
    return result.text
  }

  /**
   * 重置状态
   */
  const reset = (): void => {
    isLoading.value = false
    isRendering.value = false
    currentPage.value = options?.initialPage || 1
    totalPages.value = 0
    scale.value = config.defaultScale
    rotation.value = 0
    pdfInfo.value = null
    pageInfo.value = null
    canvasRef.value = null
    error.value = null
    sourceRef.value = null
  }

  /**
   * 销毁
   */
  const destroy = (): void => {
    reset()
    pdfService.terminateWorker()
  }

  // 监听 source 变化（自动加载）
  if (options?.autoLoad !== false) {
    watch(
      () => sourceRef.value,
      async (newSource) => {
        if (newSource) {
          await loadPdf(newSource)
        }
      },
    )
  }

  return {
    // 状态
    isLoading,
    isRendering,
    currentPage,
    totalPages,
    scale,
    rotation,
    pdfInfo,
    pageInfo,
    canvasRef,
    containerRef,
    error,
    sourceRef,
    // 配置
    config,
    // 计算属性
    canZoomIn,
    canZoomOut,
    canGoPrev,
    canGoNext,
    hasError,
    isReady,
    // 方法
    loadPdf,
    goToPage,
    prevPage,
    nextPage,
    zoom,
    zoomIn,
    zoomOut,
    fitToWidth,
    fitToHeight,
    resetZoom,
    rotate,
    rotateClockwise,
    rotateCounterClockwise,
    download,
    print,
    extractText,
    reset,
    destroy,
  }
}
