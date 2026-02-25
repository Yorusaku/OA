/**
 * @file useExcelExport.ts
 * @description Excel 导出组合式 API
 * 处理 Excel 文件导出和下载，支持进度显示和错误处理
 */

import type { ExcelExportOptions, ExportColumnConfig, ProcessProgress } from '@/types/document'
import { computed, ref } from 'vue'
import { excelService } from '@/services/document'

export interface UseExcelExportOptions {
  /** 默认文件名 */
  defaultFilename?: string
  /** 默认列配置 */
  defaultColumns?: ExportColumnConfig[]
  /** 导出前回调，用于数据处理 */
  beforeExport?: (data: any[]) => Promise<any[]> | any[]
  /** 导出后回调 */
  afterExport?: () => void
  /** 进度回调 */
  onProgress?: (progress: ProcessProgress) => void
}

/**
 * Excel 导出 Hook
 * @param options - 配置选项
 * @returns 导出相关状态和方法
 * @usage
 * ```ts
 * const { exportExcel, downloadExcel, isExporting, progress } = useExcelExport()
 * ```
 */
export function useExcelExport(options?: UseExcelExportOptions) {
  // 状态
  const isExporting = ref(false)
  const progress = ref<ProcessProgress>({
    stage: 'processing',
    percentage: 0,
  })
  const error = ref<Error | null>(null)

  // 计算属性
  const canExport = computed(() => !isExporting.value)

  /**
   * 导出 Excel（返回 Blob）
   * @param data - 导出数据
   * @param exportOptions - 导出配置
   * @returns Excel 文件 Blob
   */
  const exportExcel = async (
    data: any[],
    exportOptions?: Omit<ExcelExportOptions, 'data'>,
  ): Promise<Blob> => {
    isExporting.value = true
    error.value = null

    try {
      progress.value = {
        stage: 'processing',
        percentage: 0,
        message: '准备导出数据...',
      }

      // 导出前处理
      let processedData = data
      if (options?.beforeExport) {
        processedData = await options.beforeExport(data)
      }

      progress.value = {
        stage: 'processing',
        percentage: 30,
        currentRow: 0,
        totalRows: processedData.length,
        message: `共 ${processedData.length} 条数据`,
      }

      // 合并列配置
      const columns = exportOptions?.columns || options?.defaultColumns

      // 调用服务导出
      const blob = await excelService.exportExcel({
        sheetName: exportOptions?.sheetName || 'Sheet1',
        columns,
        data: processedData,
        stream: exportOptions?.stream || false,
      })

      progress.value = {
        stage: 'complete',
        percentage: 100,
        message: '导出完成',
      }

      // 导出后回调
      options?.afterExport?.()

      return blob
    }
    catch (err: any) {
      error.value = err instanceof Error ? err : new Error('导出失败')
      progress.value = {
        stage: 'complete',
        percentage: 0,
        message: `导出失败：${error.value.message}`,
      }
      throw err
    }
    finally {
      isExporting.value = false
    }
  }

  /**
   * 导出并下载 Excel 文件
   * @param data - 导出数据
   * @param filename - 文件名
   * @param exportOptions - 导出配置
   */
  const downloadExcel = async (
    data: any[],
    filename?: string,
    exportOptions?: Omit<ExcelExportOptions, 'data' | 'filename'>,
  ): Promise<void> => {
    const blob = await exportExcel(data, exportOptions)
    const name = filename || options?.defaultFilename || 'export.xlsx'
    downloadBlob(blob, name)
  }

  /**
   * 触发 Blob 下载
   * @param blob - 文件 Blob
   * @param filename - 文件名
   */
  const downloadBlob = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * 重置导出状态
   */
  const reset = (): void => {
    isExporting.value = false
    progress.value = {
      stage: 'processing',
      percentage: 0,
    }
    error.value = null
  }

  return {
    // 状态
    isExporting,
    progress,
    error,
    // 计算属性
    canExport,
    // 方法
    exportExcel,
    downloadExcel,
    reset,
  }
}
