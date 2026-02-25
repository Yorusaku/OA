# Phase 13: 文档与表格引擎

> 纯前端文档处理引擎：海量财务数据的 Excel 导入导出与 PDF 跨端预览

## 📋 阶段目标

构建一个**纯前端**的文档处理引擎，支持：

1. **海量财务数据 Excel 导入导出** - 使用 Web Worker 避免主线程阻塞
2. **电子发票/审批单 PDF 预览** - 跨端一致的 PDF 渲染体验
3. **纯净流式处理** - 大数据量场景下的性能优化

## 🎯 核心价值

- **企业级稳定方案** - 选用成熟的 xlsx (SheetJS) + pdf.js，稳定可控
- **Web Worker 隔离计算** - Excel 解析和 PDF 渲染在 Worker 线程执行，不阻塞 UI
- **流式处理大文件** - 支持 10 万 + 行数据的分块处理，避免内存溢出
- **开箱即用组件** - 提供 ExcelImporter/Exporter、PdfViewer 等封装组件

## 🛠️ 技术选型

| 模块 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **Excel 处理** | `xlsx` (SheetJS) | ^0.18.5 | 项目已有依赖，功能最全 |
| **PDF 渲染** | `pdfjs-dist` | ^5.4.x | Mozilla 官方，稳定可靠 |
| **Worker 通信** | `comlink` | ^4.4.2 | 简化 Worker 调用 |
| **构建工具** | Vite | 7.x | 原生 Worker 支持 |

## 📁 交付物

### 目录结构

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
│   ├── index.ts                  # 组件统一导出
│   ├── README.md                 # 详细文档
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

### 核心 API

#### Excel 导入

```typescript
import { ExcelImporter } from '@/components/document'
import type { ExcelValidationRule } from '@/types/document'

const validationRules: ExcelValidationRule[] = [
  { field: 'amount', required: true, type: 'number' },
  { field: 'date', required: true, type: 'date' },
]

async function handleComplete(data: any[]) {
  console.log('导入数据:', data)
}
```

#### Excel 导出

```typescript
import { ExcelExporter } from '@/components/document'
import type { ExportColumnConfig } from '@/types/document'

const columns: ExportColumnConfig[] = [
  { key: 'name', label: '姓名', width: 12 },
  { key: 'amount', label: '金额', width: 10, format: (v) => `¥${v.toFixed(2)}` },
]

<ExcelExporter :data="data" :columns="columns" filename="导出数据.xlsx" />
```

#### PDF 预览

```typescript
import { DocumentPreview } from '@/components/document'

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
```

## 📝 执行步骤

### Step 1: 安装依赖

```bash
cd apps/web
pnpm add pdfjs-dist comlink
```

### Step 2: 创建类型定义

- `types/document.ts` - 完整的 TypeScript 类型定义
- `workers/worker.types.ts` - Worker 通信类型

### Step 3: 实现 Web Worker

- `workers/excel.worker.ts` - Excel 解析和导出
- `workers/pdf.worker.ts` - PDF 渲染和信息提取

### Step 4: 实现 Service 层

- `services/document/excel.service.ts` - Excel 服务封装
- `services/document/pdf.service.ts` - PDF 服务封装
- `services/document/stream.utils.ts` - 流式处理工具

### Step 5: 实现 Composables

- `composables/useExcelImport.ts` - Excel 导入逻辑
- `composables/useExcelExport.ts` - Excel 导出逻辑
- `composables/usePdfViewer.ts` - PDF 查看逻辑

### Step 6: 实现 UI 组件

**Excel 组件：**
- `ExcelImporter.vue` - 拖拽上传、解析、验证
- `ExcelExporter.vue` - 自定义列、格式化导出
- `ExcelPreview.vue` - 数据预览、分页、搜索
- `ExcelFieldMapper.vue` - 字段映射配置

**PDF 组件：**
- `PdfViewer.vue` - 完整 PDF 查看器
- `PdfToolbar.vue` - 工具栏（缩放、翻页、打印、下载）
- `PdfThumbnail.vue` - 缩略图侧边栏

**通用组件：**
- `DocumentPreview.vue` - 统一文档预览（自动识别类型）
- `DocumentUploader.vue` - 文档上传组件

### Step 7: 集成测试

- 运行 `pnpm typecheck` 确保类型正确
- 运行 `pnpm build` 确保构建成功
- 创建 `examples.ts` 展示使用示例
- 创建 `README.md` 详细文档

## ✅ 验收标准

### 功能验收

- [ ] Excel 导入组件能正常解析 .xlsx/.xls 文件
- [ ] Excel 导入支持数据验证和错误报告导出
- [ ] Excel 导出组件支持自定义列和格式化
- [ ] PDF 查看器能正常渲染 PDF 文件
- [ ] PDF 查看器支持缩放、翻页、打印、下载
- [ ] 统一文档预览组件能自动识别 Excel/PDF 类型
- [ ] Web Worker 正常工作，大文件不阻塞 UI

### 性能验收

- [ ] 10 万 + 行 Excel 数据解析不阻塞 UI
- [ ] 大文件（50MB+）能正常处理
- [ ] PDF 渲染流畅，缩放无卡顿
- [ ] Worker 通信正常，内存无泄漏

### 代码质量

- [ ] TypeScript 类型完整，无 `any` 滥用
- [ ] 所有公开 API 有 JSDoc 注释
- [ ] 组件有完整的 props 和 emits 定义
- [ ] 代码风格与项目一致

## 🎯 使用场景

| 场景 | 组件/服务 | 说明 |
|------|----------|------|
| 财务数据批量导入 | `ExcelImporter` | 支持拖拽上传、数据预览、字段验证 |
| 审批记录导出 | `ExcelExporter` | 支持自定义列、格式化数据 |
| 电子发票预览 | `DocumentPreview` | PDF 在线预览，支持缩放、翻页 |
| 审批单查看 | `PdfViewer` | 完整 PDF 查看器，支持打印、下载 |
| 附件预览 | `DocumentPreview` | 自动识别 Excel/PDF 类型 |
| 外部数据导入 | `ExcelFieldMapper` | 字段映射，适配不同数据源 |

## 📄 相关文档

- [详细 API 文档](./apps/web/src/components/document/README.md)
- [使用示例](./apps/web/src/components/document/examples.ts)
- [类型定义](./apps/web/src/types/document.ts)

## 🔗 外部资源

- [PDF.js 文档](https://mozilla.github.io/pdf.js/)
- [SheetJS 文档](https://docs.sheetjs.com/)
- [Comlink 文档](https://github.com/GoogleChromeLabs/comlink)
