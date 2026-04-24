<script setup lang="ts">
import type { DocumentType } from '@/types/document'
import { ElMessage } from 'element-plus'
/**
 * 统一文档预览组件
 * 自动识别文档类型（Excel/PDF）并渲染
 */
import { computed, ref, watch } from 'vue'
import { excelService } from '@/services/document'
import ExcelPreview from './excel/ExcelPreview.vue'
import PdfViewer from './pdf/PdfViewer.vue'

interface Props {
  /**
   * 文档源（File、URL 或 ArrayBuffer）
   */
  source?: File | URL | string | ArrayBuffer | null
  /**
   * 强制指定文档类型
   */
  type?: DocumentType
  /**
   * 是否自动加载
   */
  autoLoad?: boolean
  /**
   * PDF 查看器配置
   */
  pdfConfig?: {
    showToolbar?: boolean
    showThumbnails?: boolean
    enablePrint?: boolean
    enableDownload?: boolean
  }
}

const props = withDefaults(defineProps<Props>(), {
  autoLoad: true,
})

const emit = defineEmits<{
  /**
   * 加载完成
   */
  load: [info: any]
  /**
   * 加载失败
   */
  error: [error: Error]
}>()

// 文档类型
const documentType = ref<DocumentType>('unknown')

// 加载状态
const isLoading = ref(false)
const error = ref<Error | null>(null)

// Excel 数据
const excelData = ref<Record<string, any[]>>({})

// 计算属性
const isPdf = computed(() => documentType.value === 'pdf')
const isExcel = computed(() => documentType.value === 'excel')
const hasError = computed(() => error.value !== null)

// 识别文档类型
function detectDocumentType(source: File | URL | string | ArrayBuffer): DocumentType {
  // 如果指定了类型，直接返回
  if (props.type && props.type !== 'unknown') {
    return props.type
  }

  // 从文件名或 URL 识别
  let filename = ''

  if (source instanceof File) {
    filename = source.name.toLowerCase()
  }
  else if (source instanceof URL) {
    filename = source.pathname.toLowerCase()
  }
  else if (typeof source === 'string') {
    filename = source.toLowerCase()
  }

  if (filename.endsWith('.pdf')) {
    return 'pdf'
  }

  if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
    return 'excel'
  }

  // 从 Content-Type 识别（如果是 File）
  if (source instanceof File) {
    const contentType = source.type.toLowerCase()
    if (contentType.includes('pdf')) {
      return 'pdf'
    }
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) {
      return 'excel'
    }
  }

  return 'unknown'
}

// 加载文档
async function load(source: File | URL | string | ArrayBuffer) {
  isLoading.value = true
  error.value = null

  try {
    // 识别类型
    documentType.value = detectDocumentType(source)

    if (documentType.value === 'unknown') {
      throw new Error('无法识别文档类型，请指定 type 属性')
    }

    // 加载对应类型
    if (documentType.value === 'excel') {
      await loadExcel(source)
    }
    else if (documentType.value === 'pdf') {
      // PDF 由 PdfViewer 自己加载
    }

    emit('load', { type: documentType.value })
  }
  catch (err: any) {
    error.value = err instanceof Error ? err : new Error('加载失败')
    ElMessage.error(error.value.message)
    emit('error', error.value)
  }
  finally {
    isLoading.value = false
  }
}

// 加载 Excel
async function loadExcel(source: File | URL | string | ArrayBuffer) {
  let file: File

  if (source instanceof File) {
    file = source
  }
  else {
    // 其他类型需要转换
    let buffer: ArrayBuffer

    if (source instanceof URL) {
      const response = await fetch(source)
      buffer = await response.arrayBuffer()
    }
    else if (typeof source === 'string') {
      const response = await fetch(source)
      buffer = await response.arrayBuffer()
    }
    else {
      buffer = source
    }

    file = new File([buffer], 'document.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  }

  const result = await excelService.parseExcel(file)
  excelData.value = result.data
}

// 监听 source 变化
watch(
  () => props.source,
  (newSource) => {
    if (newSource && props.autoLoad) {
      load(newSource)
    }
  },
  { immediate: true },
)

// 暴露方法
defineExpose({
  load,
})
</script>

<template>
  <div class="document-preview">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-state">
      <el-progress type="circle" :percentage="50" :show-text="false" />
      <p>加载文档中...</p>
    </div>

    <!-- 错误状态 -->
    <el-alert
      v-else-if="hasError"
      type="error"
      :closable="false"
      show-icon
      class="error-state"
    >
      {{ error?.message }}
    </el-alert>

    <!-- 未知类型 -->
    <el-alert
      v-else-if="documentType === 'unknown' && source"
      type="warning"
      :closable="false"
      show-icon
    >
      无法识别文档类型，请通过 type 属性指定（'excel' 或 'pdf'）
    </el-alert>

    <!-- PDF 预览 -->
    <PdfViewer
      v-else-if="isPdf && source"
      :source="source"
      :config="pdfConfig"
      @load="emit('load', $event)"
      @error="emit('error', $event)"
    />

    <!-- Excel 预览 -->
    <div v-else-if="isExcel" class="excel-preview-wrapper">
      <ExcelPreview
        :data="excelData"
        :show-preview="true"
      />
    </div>

    <!-- 空状态 -->
    <el-empty
      v-if="!source"
      description="请选择文档"
      :image-size="100"
    />
  </div>
</template>

<style scoped >
.document-preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-fill-color-lighter);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;

  p {
    color: var(--el-text-color-secondary);
  }
}

.error-state {
  margin: 20px;
}

.excel-preview-wrapper {
  flex: 1;
  overflow: auto;
  padding: 20px;
  background: var(--el-bg-color);
}
</style>
