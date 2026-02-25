# 文档与表格引擎 (Document Engine)

企业级 OA 系统的纯前端文档处理引擎，支持海量财务数据的 Excel 导入导出与 PDF 跨端预览。

## 📦 技术选型

| 模块 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **Excel 处理** | `xlsx` (SheetJS) | ^0.18.5 | 项目已有依赖，功能最全 |
| **PDF 渲染** | `pdfjs-dist` | ^5.4.x | Mozilla 官方，稳定可靠 |
| **Worker 通信** | `comlink` | ^4.4.2 | 简化 Worker 调用 |
| **构建工具** | Vite | 7.x | 原生 Worker 支持 |

## 📁 目录结构

```
apps/web/src/
├── components/document/          # 文档组件
│   ├── excel/
│   │   ├── ExcelImporter.vue     # Excel 导入组件
│   │   ├── ExcelExporter.vue     # Excel 导出组件
│   │   ├── ExcelPreview.vue      # Excel 数据预览
│   │   └── ExcelFieldMapper.vue  # 字段映射组件
│   ├── pdf/
│   │   ├── PdfViewer.vue         # PDF 查看器
│   │   ├── PdfToolbar.vue        # PDF 工具栏
│   │   └── PdfThumbnail.vue      # PDF 缩略图
│   ├── common/
│   │   ├── DocumentPreview.vue   # 统一文档预览
│   │   └── DocumentUploader.vue  # 文档上传组件
│   ├── components.d.ts           # Vue 组件类型声明
│   ├── index.ts                  # 组件统一导出
│   └── examples.ts               # 使用示例
│
├── services/document/            # 文档服务层
│   ├── excel.service.ts          # Excel 处理服务
│   ├── pdf.service.ts            # PDF 处理服务
│   ├── stream.utils.ts           # 流式处理工具
│   └── index.ts                  # 服务统一导出
│
├── workers/                      # Web Worker
│   ├── excel.worker.ts           # Excel 处理 Worker
│   ├── pdf.worker.ts             # PDF 渲染 Worker
│   └── worker.types.ts           # Worker 类型定义
│
├── composables/                  # 组合式 API
│   ├── useExcelImport.ts         # Excel 导入
│   ├── useExcelExport.ts         # Excel 导出
│   └── usePdfViewer.ts           # PDF 查看
│
└── types/
    └── document.ts               # 文档类型定义
```

## 🚀 快速开始

### 1. Excel 导入

```vue
<script setup lang="ts">
import { ExcelImporter } from '@/components/document'
import type { ExcelValidationRule } from '@/types/document'

const validationRules: ExcelValidationRule[] = [
  { field: 'amount', required: true, type: 'number' },
  { field: 'date', required: true, type: 'date' },
]

async function handleComplete(data: any[]) {
  console.log('导入数据:', data)
}
</script>

<template>
  <ExcelImporter
    :validation-rules="validationRules"
    :auto-validate="true"
    @complete="handleComplete"
  />
</template>
```

### 2. Excel 导出

```vue
<script setup lang="ts">
import { ExcelExporter } from '@/components/document'
import type { ExportColumnConfig } from '@/types/document'

const columns: ExportColumnConfig[] = [
  { key: 'name', label: '姓名', width: 12 },
  { key: 'amount', label: '金额', width: 10, format: (v) => `¥${v.toFixed(2)}` },
  { key: 'date', label: '日期', width: 15 },
]

const data = [
  { name: '张三', amount: 1000, date: '2024-01-01' },
  { name: '李四', amount: 2000, date: '2024-01-02' },
]
</script>

<template>
  <ExcelExporter
    :data="data"
    :columns="columns"
    filename="导出数据.xlsx"
  />
</template>
```

### 3. PDF 预览

```vue
<script setup lang="ts">
import { DocumentPreview } from '@/components/document'
import { ref } from 'vue'

const pdfUrl = ref('https://example.com/document.pdf')
</script>

<template>
  <DocumentPreview
    :source="pdfUrl"
    type="pdf"
    :pdf-config="{
      showToolbar: true,
      showThumbnails: true,
      enablePrint: true,
      enableDownload: true,
    }"
  />
</template>
```

### 4. 统一文档预览（自动识别类型）

```vue
<script setup lang="ts">
import { DocumentPreview } from '@/components/document'
</script>

<template>
  <!-- 自动识别 Excel 或 PDF -->
  <DocumentPreview
    :source="fileUrl"
    auto-load
  />
</template>
```

## 📖 API 文档

### Composables

#### useExcelImport

```typescript
function useExcelImport(options?: UseExcelImportOptions) {
  return {
    // 状态
    isParsing: Ref<boolean>
    progress: Ref<ProcessProgress>
    result: Ref<ExcelParseResult | null>
    error: Ref<Error | null>
    
    // 方法
    parseFile: (file: File) => Promise<ExcelParseResult>
    validateData: (rules: ExcelValidationRule[]) => Promise<ValidationResult>
    getSheetData: (sheetName?: string) => Record<string, any>[]
    getAllData: () => Record<string, any>[]
    reset: () => void
    downloadErrorReport: (filename?: string) => Promise<void>
  }
}
```

#### useExcelExport

```typescript
function useExcelExport(options?: UseExcelExportOptions) {
  return {
    // 状态
    isExporting: Ref<boolean>
    progress: Ref<ProcessProgress>
    
    // 方法
    exportExcel: (data: any[], options?: ExcelExportOptions) => Promise<Blob>
    downloadExcel: (data: any[], filename?: string, options?: ExcelExportOptions) => Promise<void>
    reset: () => void
  }
}
```

#### usePdfViewer

```typescript
function usePdfViewer(options?: UsePdfViewerOptions) {
  return {
    // 状态
    isLoading: Ref<boolean>
    currentPage: Ref<number>
    totalPages: Ref<number>
    scale: Ref<number>
    canvasRef: Ref<HTMLCanvasElement | null>
    
    // 方法
    loadPdf: (source: File | URL | ArrayBuffer) => Promise<PdfInfo>
    goToPage: (page: number) => void
    prevPage: () => void
    nextPage: () => void
    zoomIn: () => void
    zoomOut: () => void
    resetZoom: () => void
    download: () => void
    print: () => void
    extractText: (page?: number) => Promise<string>
  }
}
```

### Services

#### excelService

```typescript
const excelService = {
  // 解析 Excel
  parseExcel: (file: File, options?: ExcelParseOptions) => Promise<ExcelParseResult>
  
  // 导出 Excel
  exportExcel: (options: ExcelExportOptions) => Promise<Blob>
  
  // 下载 Excel
  downloadExcel: (options: ExcelExportOptions, filename?: string) => Promise<void>
  
  // 验证数据
  validateData: (data: any[], rules: ExcelValidationRule[]) => ValidationResult
  
  // 流式处理
  streamProcess: (file: File, chunkSize?: number) => AsyncGenerator
}
```

#### pdfService

```typescript
const pdfService = {
  // 渲染 PDF
  renderPdf: (source: File | URL | ArrayBuffer, options?: PdfRenderOptions) => Promise<{ canvas: HTMLCanvasElement }>
  
  // 获取 PDF 信息
  getPdfInfo: (source: File | URL | ArrayBuffer) => Promise<PdfInfo>
  
  // 下载 PDF
  downloadPdf: (source: URL | File, filename?: string) => Promise<void>
  
  // 打印 PDF
  printPdf: (source: URL | File) => Promise<void>
  
  // 提取文本
  extractText: (source: File | URL | ArrayBuffer, page?: number) => Promise<{ text: string }>
}
```

## 🔧 配置选项

### Excel 解析选项

```typescript
interface ExcelParseOptions {
  sheetNames?: string[]      // 指定工作表
  skipEmptyRows?: boolean    // 跳过空行 (默认 true)
  maxRows?: number           // 最大解析行数 (默认 100000)
  headerRow?: boolean        // 是否解析表头 (默认 true)
}
```

### Excel 导出选项

```typescript
interface ExcelExportOptions {
  sheetName?: string         // 工作表名称
  columns?: ExportColumnConfig[]  // 列配置
  data: any[]                // 导出数据
  stream?: boolean           // 流式导出
  filename?: string          // 文件名
}
```

### PDF 查看器配置

```typescript
interface PdfViewerConfig {
  defaultScale?: number      // 默认缩放 (默认 1.0)
  minScale?: number          // 最小缩放 (默认 0.5)
  maxScale?: number          // 最大缩放 (默认 3.0)
  showToolbar?: boolean      // 显示工具栏 (默认 true)
  showThumbnails?: boolean   // 显示缩略图 (默认 false)
  enablePrint?: boolean      // 启用打印 (默认 true)
  enableDownload?: boolean   // 启用下载 (默认 true)
}
```

## 🎯 使用场景

| 场景 | 组件/服务 | 说明 |
|------|----------|------|
| 财务数据批量导入 | `ExcelImporter` | 支持拖拽上传、数据预览、字段验证 |
| 审批记录导出 | `ExcelExporter` | 支持自定义列、格式化数据 |
| 电子发票预览 | `DocumentPreview` | PDF 在线预览，支持缩放、翻页 |
| 审批单查看 | `PdfViewer` | 完整 PDF 查看器，支持打印、下载 |
| 附件预览 | `DocumentPreview` | 自动识别 Excel/PDF 类型 |
| 外部数据导入 | `ExcelFieldMapper` | 字段映射，适配不同数据源 |

## ⚡ 性能优化

1. **Web Worker 隔离计算** - Excel 解析和 PDF 渲染在 Worker 线程执行，不阻塞 UI
2. **流式处理** - 大文件分块处理，避免内存溢出
3. **按需渲染** - PDF 只渲染可见页面
4. **缓存策略** - PDF 文档和解析结果缓存

## 📝 注意事项

1. **大文件处理** - 建议限制文件大小（默认 50MB），超大文件使用流式处理
2. **PDF 字体** - 使用系统字体，特殊字体需要额外配置
3. **浏览器兼容** - 需要支持 OffscreenCanvas 的浏览器
4. **Worker 清理** - 组件销毁时调用 `destroy()` 或 `terminateWorker()` 清理 Worker

## 🔗 相关文档

- [使用示例](./examples.ts)
- [类型定义](../../types/document.ts)
- [PDF.js 文档](https://mozilla.github.io/pdf.js/)
- [SheetJS 文档](https://docs.sheetjs.com/)
