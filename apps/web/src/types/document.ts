/**
 * 文档与表格引擎类型定义
 */

// ==================== Excel 相关类型 ====================

/**
 * Excel 解析选项
 */
export interface ExcelParseOptions {
  /**
   * 需要解析的工作表名称列表
   * 默认为所有工作表
   */
  sheetNames?: string[]
  /**
   * 是否跳过空行
   * @default true
   */
  skipEmptyRows?: boolean
  /**
   * 最大解析行数（防止超大文件）
   * @default 100000
   */
  maxRows?: number
  /**
   * 是否解析表头
   * @default true
   */
  headerRow?: boolean
}

/**
 * Excel 解析结果
 */
export interface ExcelParseResult<T = Record<string, any>> {
  /** 所有工作表名称 */
  sheets: string[]
  /** 工作表数据 */
  data: Record<string, T[]>
  /** 统计信息 */
  stats: {
    /** 总行数 */
    totalRows: number
    /** 有效行数 */
    validRows: number
    /** 错误行数 */
    errorRows: number
  }
  /** 解析错误列表 */
  errors?: ParseError[]
  /** 列定义（从表头推断） */
  columns?: ColumnDefinition[]
}

/**
 * 列定义
 */
export interface ColumnDefinition {
  /** 列名 */
  key: string
  /** 列标题 */
  label: string
  /** 数据类型推断 */
  type?: 'string' | 'number' | 'boolean' | 'date'
}

/**
 * 解析错误
 */
export interface ParseError {
  /** 工作表名称 */
  sheet: string
  /** 行号 */
  row: number
  /** 列名 */
  column?: string
  /** 错误信息 */
  message: string
  /** 原始数据 */
  raw?: any
}

/**
 * Excel 导出选项
 */
export interface ExcelExportOptions {
  /** 工作表名称 */
  sheetName?: string
  /** 列配置 */
  columns?: ExportColumnConfig[]
  /** 导出数据 */
  data: any[]
  /** 是否启用流式导出 */
  stream?: boolean
  /** 文件名 */
  filename?: string
}

/**
 * 导出列配置
 */
export interface ExportColumnConfig {
  /** 字段名 */
  key: string
  /** 列标题 */
  label: string
  /** 列宽 */
  width?: number
  /** 数据类型 */
  type?: 'string' | 'number' | 'date' | 'boolean'
  /** 格式化函数 */
  format?: (value: any, row: any) => string | number
}

/**
 * Excel 验证规则
 */
export interface ExcelValidationRule {
  /** 字段名 */
  field: string
  /** 是否必填 */
  required?: boolean
  /** 数据类型 */
  type?: 'string' | 'number' | 'boolean' | 'date' | 'email'
  /** 最小值 */
  min?: number
  /** 最大值 */
  max?: number
  /** 正则表达式 */
  pattern?: RegExp
  /** 自定义验证器 */
  validator?: (value: any, row: any) => boolean | string
  /** 错误消息 */
  message?: string
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否通过验证 */
  valid: boolean
  /** 错误列表 */
  errors: ValidationError[]
  /** 统计数据 */
  stats: {
    total: number
    valid: number
    invalid: number
  }
}

/**
 * 验证错误
 */
export interface ValidationError {
  /** 行号 */
  row: number
  /** 字段名 */
  field: string
  /** 错误信息 */
  message: string
  /** 原始值 */
  value?: any
}

// ==================== PDF 相关类型 ====================

/**
 * PDF 渲染选项
 */
export interface PdfRenderOptions {
  /**
   * 缩放比例
   * @default 1.0
   */
  scale?: number
  /**
   * 页码（从 1 开始）
   * @default 1
   */
  page?: number
  /**
   * 渲染容器
   */
  container?: HTMLElement
  /**
   * 是否渲染文本层（用于文本选择和搜索）
   * @default true
   */
  renderTextLayer?: boolean
  /**
   * 是否渲染注释层
   * @default false
   */
  renderAnnotations?: boolean
}

/**
 * PDF 文档信息
 */
export interface PdfInfo {
  /** 总页数 */
  numPages: number
  /** 标题 */
  title?: string
  /** 作者 */
  author?: string
  /** 创建者 */
  creator?: string
  /** 创建日期 */
  creationDate?: string
  /** 文件大小 */
  fileSize: number
}

/**
 * PDF 页面信息
 */
export interface PdfPageInfo {
  /** 页码 */
  pageNumber: number
  /** 宽度 */
  width: number
  /** 高度 */
  height: number
  /** 缩放后的宽度 */
  scaledWidth: number
  /** 缩放后的高度 */
  scaledHeight: number
  /** 旋转角度 */
  rotation: number
}

/**
 * PDF 查看器配置
 */
export interface PdfViewerConfig {
  /** 默认缩放比例 */
  defaultScale?: number
  /** 最小缩放比例 */
  minScale?: number
  /** 最大缩放比例 */
  maxScale?: number
  /** 缩放步进 */
  scaleStep?: number
  /** 是否显示工具栏 */
  showToolbar?: boolean
  /** 是否显示缩略图 */
  showThumbnails?: boolean
  /** 是否启用打印 */
  enablePrint?: boolean
  /** 是否启用下载 */
  enableDownload?: boolean
}

// ==================== 通用类型 ====================

/**
 * 文档类型
 */
export type DocumentType = 'excel' | 'pdf' | 'unknown'

/**
 * 文档源（文件或 URL）
 */
export type DocumentSource = File | URL | string | ArrayBuffer | Blob

/**
 * 文档解析通用结果
 */
export interface DocumentParseResult {
  /** 文档类型 */
  type: DocumentType
  /** 解析结果 */
  data: any
  /** 错误信息 */
  error?: Error
}

/**
 * 上传进度
 */
export interface UploadProgress {
  /** 已上传字节数 */
  loaded: number
  /** 总字节数 */
  total: number
  /** 进度百分比 (0-100) */
  percentage: number
}

/**
 * 处理进度
 */
export interface ProcessProgress {
  /** 当前阶段 */
  stage: 'parsing' | 'validating' | 'processing' | 'complete'
  /** 进度百分比 (0-100) */
  percentage: number
  /** 当前处理的行数 */
  currentRow?: number
  /** 总行数 */
  totalRows?: number
  /** 状态消息 */
  message?: string
}
