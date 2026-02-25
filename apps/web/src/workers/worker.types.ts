/**
 * Web Worker 通用类型定义
 */

import type {
  ExcelExportOptions,
  ExcelParseOptions,
  ExcelParseResult,
  PdfInfo,
  PdfRenderOptions,
  ProcessProgress,
} from '@/types/document'

// ==================== Worker 消息类型 ====================

/**
 * Worker 请求类型
 */
export type WorkerRequestType
  = | 'EXCEL_PARSE'
    | 'EXCEL_EXPORT'
    | 'PDF_RENDER'
    | 'PDF_GET_INFO'
    | 'PDF_EXTRACT_TEXT'

/**
 * Worker 响应类型
 */
export type WorkerResponseType
  = | 'SUCCESS'
    | 'ERROR'
    | 'PROGRESS'

// ==================== Excel Worker ====================

/**
 * Excel Worker 请求
 */
export interface ExcelParseRequest {
  type: 'EXCEL_PARSE'
  payload: {
    /** 文件 ArrayBuffer */
    buffer: ArrayBuffer
    /** 解析选项 */
    options?: ExcelParseOptions
  }
}

export interface ExcelExportRequest {
  type: 'EXCEL_EXPORT'
  payload: {
    /** 导出选项 */
    options: ExcelExportOptions
  }
}

/**
 * Excel Worker 响应
 */
export interface ExcelParseResponse {
  type: 'SUCCESS' | 'ERROR'
  payload: ExcelParseResult | WorkerError
}

export interface ExcelExportResponse {
  type: 'SUCCESS' | 'ERROR'
  payload: Uint8Array | WorkerError
}

// ==================== PDF Worker ====================

/**
 * PDF Worker 请求
 */
export interface PdfRenderRequest {
  type: 'PDF_RENDER'
  payload: {
    /** PDF 数据 */
    data: ArrayBuffer | string
    /** 渲染选项 */
    options: PdfRenderOptions
  }
}

export interface PdfGetInfoRequest {
  type: 'PDF_GET_INFO'
  payload: {
    /** PDF 数据 */
    data: ArrayBuffer | string
  }
}

export interface PdfExtractTextRequest {
  type: 'PDF_EXTRACT_TEXT'
  payload: {
    /** PDF 数据 */
    data: ArrayBuffer | string
    /** 页码，不传则提取全部 */
    page?: number
  }
}

/**
 * PDF Worker 响应
 */
export interface PdfRenderResponse {
  type: 'SUCCESS' | 'ERROR'
  payload: {
    /** 渲染后的图像数据 (ImageData 或 base64) */
    imageData: ImageData | string
    /** 页面信息 */
    pageInfo: {
      pageNumber: number
      width: number
      height: number
    }
  } | WorkerError
}

export interface PdfGetInfoResponse {
  type: 'SUCCESS' | 'ERROR'
  payload: PdfInfo | WorkerError
}

export interface PdfExtractTextResponse {
  type: 'SUCCESS' | 'ERROR'
  payload: {
    text: string
    pageNumber?: number
  } | WorkerError
}

// ==================== 通用类型 ====================

/**
 * Worker 错误
 */
export interface WorkerError {
  /** 错误代码 */
  code: string
  /** 错误消息 */
  message: string
  /** 堆栈跟踪 */
  stack?: string
  /** 额外信息 */
  details?: any
}

/**
 * Worker 进度消息
 */
export interface WorkerProgressMessage {
  type: 'PROGRESS'
  payload: ProcessProgress
}

/**
 * 所有 Worker 请求的联合类型
 */
export type WorkerRequest
  = | ExcelParseRequest
    | ExcelExportRequest
    | PdfRenderRequest
    | PdfGetInfoRequest
    | PdfExtractTextRequest

/**
 * 所有 Worker 响应的联合类型
 */
export type WorkerResponse
  = | ExcelParseResponse
    | ExcelExportResponse
    | PdfRenderResponse
    | PdfGetInfoResponse
    | PdfExtractTextResponse

// ==================== Worker 接口定义 ====================

/**
 * Excel Worker API
 */
export interface ExcelWorkerApi {
  parseExcel: (buffer: ArrayBuffer, options?: ExcelParseOptions) => Promise<ExcelParseResult>
  exportExcel: (options: ExcelExportOptions) => Promise<Uint8Array>
}

/**
 * PDF Worker API
 */
export interface PdfWorkerApi {
  renderPdf: (data: ArrayBuffer | string, options: PdfRenderOptions) => Promise<{
    imageData: ImageData | string
    pageInfo: { pageNumber: number, width: number, height: number }
  }>
  getPdfInfo: (data: ArrayBuffer | string) => Promise<PdfInfo>
  extractText: (data: ArrayBuffer | string, page?: number) => Promise<{ text: string, pageNumber?: number }>
}
