/**
 * Excel 处理服务
 * 封装 Web Worker 调用，提供便捷的 Excel 解析和导出 API
 */

import type {
  ColumnDefinition,
  ExcelExportOptions,
  ExcelParseOptions,
  ExcelParseResult,
  ExcelValidationRule,
  ValidationError,
  ValidationResult,
} from '@/types/document'
import type { ExcelWorkerApi } from '@/workers/excel.worker'

/**
 * Excel 服务类
 */
class ExcelService {
  private worker: Worker | null = null
  private workerApi: Promise<ExcelWorkerApi> | null = null

  /**
   * 初始化 Worker
   */
  private initWorker(): Promise<ExcelWorkerApi> {
    if (this.workerApi) {
      return this.workerApi
    }

    this.worker = new Worker(
      new URL('@/workers/excel.worker.ts', import.meta.url),
      { type: 'module' },
    )

    // 动态导入 Comlink
    this.workerApi = (async () => {
      const { wrap } = await import('comlink')
      return wrap<ExcelWorkerApi>(this.worker!)
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
   * 解析 Excel 文件
   * @param file Excel 文件
   * @param options 解析选项
   * @returns 解析结果
   */
  async parseExcel(file: File, options?: ExcelParseOptions): Promise<ExcelParseResult> {
    const workerApi = await this.initWorker()

    // 读取文件为 ArrayBuffer
    const buffer = await this.readFileAsArrayBuffer(file)

    // 调用 Worker 解析
    return workerApi.parseExcel(buffer, options)
  }

  /**
   * 从 ArrayBuffer 解析 Excel
   */
  async parseExcelFromArrayBuffer(buffer: ArrayBuffer, options?: ExcelParseOptions): Promise<ExcelParseResult> {
    const workerApi = await this.initWorker()
    return workerApi.parseExcel(buffer, options)
  }

  /**
   * 导出 Excel 文件
   * @param options 导出选项
   * @returns Excel Blob
   */
  async exportExcel(options: ExcelExportOptions): Promise<Blob> {
    const workerApi = await this.initWorker()

    // 调用 Worker 导出
    const uint8Array = await workerApi.exportExcel(options)

    // 转换为 Blob
    return new Blob([uint8Array.buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  }

  /**
   * 下载 Excel 文件
   * @param options 导出选项
   * @param filename 文件名
   */
  async downloadExcel(options: ExcelExportOptions, filename = 'export.xlsx'): Promise<void> {
    const blob = await this.exportExcel(options)
    this.downloadBlob(blob, filename)
  }

  /**
   * 验证 Excel 数据
   * @param data 数据
   * @param rules 验证规则
   * @returns 验证结果
   */
  validateData(data: Record<string, any>[], rules: ExcelValidationRule[]): ValidationResult {
    const errors: ValidationError[] = []
    let validCount = 0

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowErrors: ValidationError[] = []

      for (const rule of rules) {
        const value = row[rule.field]
        const error = this.validateField(value, rule, row, i + 1)

        if (error) {
          rowErrors.push(error)
        }
      }

      if (rowErrors.length === 0) {
        validCount++
      }
      else {
        errors.push(...rowErrors)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      stats: {
        total: data.length,
        valid: validCount,
        invalid: data.length - validCount,
      },
    }
  }

  /**
   * 验证单个字段
   */
  private validateField(
    value: any,
    rule: ExcelValidationRule,
    row: Record<string, any>,
    rowNum: number,
  ): ValidationError | null {
    // 必填验证
    if (rule.required && (value === null || value === undefined || value === '')) {
      return {
        row: rowNum,
        field: rule.field,
        message: rule.message || `${rule.field} 不能为空`,
        value,
      }
    }

    // 如果值为空且非必填，跳过后续验证
    if (value === null || value === undefined || value === '') {
      return null
    }

    // 类型验证
    if (rule.type) {
      const typeError = this.validateType(value, rule.type)
      if (typeError) {
        return {
          ...typeError,
          row: rowNum,
          field: rule.field,
          message: rule.message || typeError.message,
        }
      }
    }

    // 最小值验证
    if (rule.min !== undefined) {
      if (typeof value === 'number' && value < rule.min) {
        return {
          row: rowNum,
          field: rule.field,
          message: rule.message || `${rule.field} 不能小于 ${rule.min}`,
          value,
        }
      }
      if (typeof value === 'string' && value.length < rule.min) {
        return {
          row: rowNum,
          field: rule.field,
          message: rule.message || `${rule.field} 长度不能小于 ${rule.min}`,
          value,
        }
      }
    }

    // 最大值验证
    if (rule.max !== undefined) {
      if (typeof value === 'number' && value > rule.max) {
        return {
          row: rowNum,
          field: rule.field,
          message: rule.message || `${rule.field} 不能大于 ${rule.max}`,
          value,
        }
      }
      if (typeof value === 'string' && value.length > rule.max) {
        return {
          row: rowNum,
          field: rule.field,
          message: rule.message || `${rule.field} 长度不能大于 ${rule.max}`,
          value,
        }
      }
    }

    // 正则表达式验证
    if (rule.pattern && !rule.pattern.test(value)) {
      return {
        row: rowNum,
        field: rule.field,
        message: rule.message || `${rule.field} 格式不正确`,
        value,
      }
    }

    // 自定义验证器
    if (rule.validator) {
      const result = rule.validator(value, row)
      if (result === false || typeof result === 'string') {
        return {
          row: rowNum,
          field: rule.field,
          message: typeof result === 'string' ? result : (rule.message || `${rule.field} 验证失败`),
          value,
        }
      }
    }

    return null
  }

  /**
   * 验证数据类型
   */
  private validateType(value: any, type: string): ValidationError | null {
    switch (type) {
      case 'number':
        if (isNaN(Number(value))) {
          return {
            row: 0,
            field: '',
            message: '必须是数字',
            value,
          }
        }
        break
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          return {
            row: 0,
            field: '',
            message: '邮箱格式不正确',
            value,
          }
        }
        break
      case 'date':
        const date = new Date(value)
        if (isNaN(date.getTime())) {
          return {
            row: 0,
            field: '',
            message: '日期格式不正确',
            value,
          }
        }
        break
    }
    return null
  }

  /**
   * 流式处理大文件（分块读取）
   */
  async* streamProcess(file: File, chunkSize = 1000): AsyncGenerator<{
    chunk: Record<string, any>[]
    progress: number
    totalRows: number
  }> {
    const workerApi = await this.initWorker()

    // 读取文件
    const buffer = await this.readFileAsArrayBuffer(file)

    // 先解析获取全部数据
    const result = await workerApi.parseExcel(buffer, {
      maxRows: Number.MAX_SAFE_INTEGER,
    })

    const allData = Object.values(result.data).flat()
    const totalRows = allData.length

    // 分块返回
    for (let i = 0; i < allData.length; i += chunkSize) {
      const chunk = allData.slice(i, i + chunkSize)
      yield {
        chunk,
        progress: Math.min(100, Math.round(((i + chunkSize) / totalRows) * 100)),
        totalRows,
      }
    }
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
   * 下载 Blob
   */
  private downloadBlob(blob: Blob, filename: string): void {
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
   * 推断列类型
   */
  inferColumnTypes(data: Record<string, any>[]): ColumnDefinition[] {
    const columns = new Map<string, ColumnDefinition>()

    for (const row of data) {
      for (const [key, value] of Object.entries(row)) {
        if (!columns.has(key)) {
          columns.set(key, {
            key,
            label: key,
            type: this.inferType(value),
          })
        }
      }
    }

    return Array.from(columns.values())
  }

  /**
   * 推断单个值的类型
   */
  private inferType(value: any): 'string' | 'number' | 'boolean' | 'date' {
    if (value === null || value === undefined || value === '') {
      return 'string'
    }

    if (typeof value === 'boolean') {
      return 'boolean'
    }

    if (value instanceof Date) {
      return 'date'
    }

    if (typeof value === 'number') {
      return 'number'
    }

    if (!isNaN(Number(value))) {
      return 'number'
    }

    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return 'date'
    }

    return 'string'
  }
}

// 导出单例
export const excelService = new ExcelService()
