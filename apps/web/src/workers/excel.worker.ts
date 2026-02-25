/**
 * Excel 处理 Web Worker
 * 使用 Comlink 暴露 API，支持大数据量 Excel 文件的解析和导出
 */

import type {
  ColumnDefinition,
  ExcelExportOptions,
  ExcelParseOptions,
  ExcelParseResult,
  ParseError,
} from '@/types/document'
import { expose } from 'comlink'
import * as XLSX from 'xlsx'

/**
 * 解析 Excel 文件
 */
async function parseExcel(buffer: ArrayBuffer, options?: ExcelParseOptions): Promise<ExcelParseResult> {
  const {
    sheetNames: targetSheetNames,
    skipEmptyRows = true,
    maxRows = 100000,
    headerRow = true,
  } = options || {}

  try {
    // 读取工作簿
    const workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: true, // 自动解析日期
      cellNF: false, // 不使用格式字符串
      cellText: true, // 使用文本值
    })

    const sheets = workbook.SheetNames
    const result: ExcelParseResult = {
      sheets,
      data: {},
      stats: {
        totalRows: 0,
        validRows: 0,
        errorRows: 0,
      },
      errors: [],
      columns: [],
    }

    // 确定要解析的工作表
    const sheetsToParse = targetSheetNames || sheets

    // 列名集合（用于合并所有工作表的列）
    const allColumns = new Map<string, ColumnDefinition>()

    for (const sheetName of sheetsToParse) {
      if (!sheets.includes(sheetName)) {
        result.errors?.push({
          sheet: sheetName,
          row: 0,
          message: `工作表 "${sheetName}" 不存在`,
        })
        result.stats.errorRows++
        continue
      }

      const worksheet = workbook.Sheets[sheetName]

      // 转换为 JSON 数据
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, {
        header: headerRow ? 1 : undefined, // 第一行作为表头
        defval: '', // 空单元格默认值
        raw: false, // 使用格式化后的值
      })

      // 处理数据
      const processedData = processData(jsonData, sheetName, result, skipEmptyRows, maxRows, allColumns)

      result.data[sheetName] = processedData
    }

    // 合并列定义
    result.columns = Array.from(allColumns.values())

    return result
  }
  catch (error: any) {
    throw new WorkerError(
      'EXCEL_PARSE_ERROR',
      `解析 Excel 失败：${error.message}`,
      error.stack,
    )
  }
}

/**
 * 处理解析后的数据
 */
function processData(
  jsonData: any[],
  sheetName: string,
  result: ExcelParseResult,
  skipEmptyRows: boolean,
  maxRows: number,
  allColumns: Map<string, ColumnDefinition>,
): any[] {
  const processed: any[] = []

  // 如果是 headerRow 模式，第一行是表头
  let headers: string[] = []
  let startIndex = 0

  if (jsonData.length > 0 && Array.isArray(jsonData[0])) {
    headers = jsonData[0].map((h: any) => String(h ?? '').trim())
    startIndex = 1
  }

  for (let i = startIndex; i < jsonData.length; i++) {
    // 检查是否超过最大行数
    if (result.stats.totalRows >= maxRows) {
      result.errors?.push({
        sheet: sheetName,
        row: i + 1,
        message: `超过最大解析行数限制 (${maxRows})`,
      })
      break
    }

    result.stats.totalRows++

    const row = jsonData[i]

    // 跳过空行
    if (skipEmptyRows && isEmptyRow(row)) {
      continue
    }

    // 转换为对象格式
    const rowObj: Record<string, any> = {}

    if (headers.length > 0 && Array.isArray(row)) {
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j]
        if (header) {
          rowObj[header] = row[j] ?? ''

          // 更新列定义
          if (!allColumns.has(header)) {
            allColumns.set(header, {
              key: header,
              label: header,
              type: inferType(row[j]),
            })
          }
        }
      }
    }
    else {
      // 非数组格式，直接使用
      Object.assign(rowObj, row)

      // 更新列定义
      for (const [key, value] of Object.entries(rowObj)) {
        if (!allColumns.has(key)) {
          allColumns.set(key, {
            key,
            label: key,
            type: inferType(value),
          })
        }
      }
    }

    // 简单的数据验证
    const validationError = validateRow(rowObj, sheetName, i + 1)
    if (validationError) {
      result.errors?.push(validationError)
      result.stats.errorRows++
    }
    else {
      result.stats.validRows++
    }

    processed.push(rowObj)
  }

  return processed
}

/**
 * 推断数据类型
 */
function inferType(value: any): 'string' | 'number' | 'boolean' | 'date' {
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

  // 尝试解析数字
  if (!isNaN(Number(value))) {
    return 'number'
  }

  // 尝试解析日期
  const date = new Date(value)
  if (!isNaN(date.getTime())) {
    return 'date'
  }

  return 'string'
}

/**
 * 检查是否为空行
 */
function isEmptyRow(row: any): boolean {
  if (!row)
    return true
  if (Array.isArray(row)) {
    return row.every(cell => cell === null || cell === undefined || cell === '')
  }
  if (typeof row === 'object') {
    return Object.values(row).every(val => val === null || val === undefined || val === '')
  }
  return true
}

/**
 * 简单的行验证
 */
function validateRow(row: Record<string, any>, sheetName: string, rowNum: number): ParseError | null {
  // 这里可以进行基本的验证，如检查必要字段
  // 具体验证逻辑可以在 Service 层进行
  return null
}

/**
 * 导出 Excel 文件
 */
async function exportExcel(options: ExcelExportOptions): Promise<Uint8Array> {
  const { sheetName = 'Sheet1', columns, data } = options

  try {
    // 创建工作簿
    const workbook = XLSX.utils.book_new()

    // 准备数据
    let exportData: any[]
    let headers: string[] = []

    if (columns && columns.length > 0) {
      // 有列配置时，按配置格式化数据
      headers = columns.map(col => col.label)
      exportData = data.map((row) => {
        const formattedRow: any[] = []
        for (const col of columns) {
          let value = row[col.key]
          if (col.format && value !== undefined) {
            value = col.format(value, row)
          }
          formattedRow.push(value ?? '')
        }
        return formattedRow
      })
    }
    else {
      // 无列配置时，直接导出数据
      exportData = data
    }

    // 创建工作表
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exportData])

    // 设置列宽
    if (columns && columns.length > 0) {
      worksheet['!cols'] = columns.map(col => ({
        wch: col.width || 15, // 默认列宽 15
      }))
    }

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

    // 生成二进制数据
    const wbout = XLSX.write(workbook, {
      type: 'array',
      bookType: 'xlsx',
      bookSST: false,
    })

    return wbout
  }
  catch (error: any) {
    throw new WorkerError(
      'EXCEL_EXPORT_ERROR',
      `导出 Excel 失败：${error.message}`,
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
  parseExcel,
  exportExcel,
}

export type ExcelWorkerApi = typeof api

expose(api)
