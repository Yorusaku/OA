<script setup lang="ts">
import type { PdfViewerConfig } from '@/types/document'
import { ElMessage } from 'element-plus'
/**
 * PDF 查看器组件
 * 支持翻页、缩放、旋转、下载和打印
 */
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { usePdfViewer } from '@/composables/usePdfViewer'

interface Props {
  /**
   * PDF 源（File、URL 或 ArrayBuffer）
   */
  source?: File | URL | string | null
  /**
   * 查看器配置
   */
  config?: PdfViewerConfig
  /**
   * 是否显示工具栏
   */
  showToolbar?: boolean
  /**
   * 是否显示缩略图
   */
  showThumbnails?: boolean
  /**
   * 是否自动加载
   */
  autoLoad?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showToolbar: true,
  showThumbnails: false,
  autoLoad: true,
})

const emit = defineEmits<{
  /**
   * 加载完成
   */
  load: [info: { numPages: number, title?: string }]
  /**
   * 加载失败
   */
  error: [error: Error]
  /**
   * 页码变更
   */
  pageChange: [page: number]
}>()

// 容器引用
const containerRef = ref<HTMLElement | null>(null)

// 使用 composable
const {
  isLoading,
  isRendering,
  currentPage,
  totalPages,
  scale,
  pageInfo,
  error,
  canZoomIn,
  canZoomOut,
  canGoPrev,
  canGoNext,
  hasError,
  isReady,
  loadPdf,
  goToPage,
  prevPage,
  nextPage,
  zoomIn,
  zoomOut,
  resetZoom,
  rotateClockwise,
  rotateCounterClockwise,
  download,
  print,
  destroy,
} = usePdfViewer({
  ...props.config,
  showToolbar: props.showToolbar,
  showThumbnails: props.showThumbnails,
  autoLoad: props.autoLoad,
})

// 加载 PDF
async function load(source: File | URL | string) {
  try {
    let pdfSource: File | URL | ArrayBuffer

    if (typeof source === 'string') {
      // URL 字符串
      pdfSource = new URL(source, window.location.href)
    }
    else {
      pdfSource = source
    }

    const info = await loadPdf(pdfSource)
    emit('load', { numPages: info.numPages, title: info.title })
  }
  catch (err: any) {
    ElMessage.error(err.message || '加载 PDF 失败')
    emit('error', err)
  }
}

// 键盘导航
function handleKeydown(e: KeyboardEvent) {
  if (!isReady.value)
    return

  switch (e.key) {
    case 'ArrowLeft':
    case 'PageUp':
      prevPage()
      break
    case 'ArrowRight':
    case 'PageDown':
      nextPage()
      break
    case '+':
    case '=':
      zoomIn()
      break
    case '-':
      zoomOut()
      break
    case '0':
      resetZoom()
      break
  }
}

// 监听页码变更
watch(currentPage, (page) => {
  emit('pageChange', page)
})

function handlePageChange(val: number | undefined) {
  if (typeof val === 'number')
    goToPage(val)
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

// 生命周期
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  if (containerRef.value) {
    containerRef.value.focus()
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  destroy()
})

// 暴露方法
defineExpose({
  load,
  goToPage,
  prevPage,
  nextPage,
  zoomIn,
  zoomOut,
  resetZoom,
  download,
  print,
})
</script>

<template>
  <div class="pdf-viewer" :class="{ 'is-loading': isLoading, 'is-rendering': isRendering }" tabindex="0">
    <!-- 工具栏 -->
    <div v-if="showToolbar" class="pdf-toolbar">
      <div class="toolbar-left">
        <!-- 翻页控制 -->
        <el-button-group>
          <el-button
            size="small"
            :disabled="!canGoPrev"
            @click="prevPage"
          >
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          <el-button
            size="small"
            :disabled="!canGoNext"
            @click="nextPage"
          >
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </el-button-group>

        <!-- 页码显示 -->
        <div class="page-info">
          <el-input-number
            v-model="currentPage"
            :min="1"
            :max="totalPages"
            size="small"
            controls-position="right"
            @change="handlePageChange"
          />
          <span class="page-total">/ {{ totalPages }} 页</span>
        </div>
      </div>

      <div class="toolbar-center">
        <!-- 缩放控制 -->
        <el-button-group>
          <el-button
            size="small"
            :disabled="!canZoomOut"
            @click="zoomOut"
          >
            <el-icon><ZoomOut /></el-icon>
          </el-button>
          <el-button size="small" @click="resetZoom">
            {{ Math.round(scale * 100) }}%
          </el-button>
          <el-button
            size="small"
            :disabled="!canZoomIn"
            @click="zoomIn"
          >
            <el-icon><ZoomIn /></el-icon>
          </el-button>
        </el-button-group>
      </div>

      <div class="toolbar-right">
        <!-- 旋转 -->
        <el-button
          size="small"
          @click="rotateCounterClockwise"
        >
          <el-icon><RefreshLeft /></el-icon>
        </el-button>
        <el-button
          size="small"
          @click="rotateClockwise"
        >
          <el-icon><RefreshRight /></el-icon>
        </el-button>

        <!-- 下载 -->
        <el-button
          v-if="config?.enableDownload !== false"
          size="small"
          @click="download"
        >
          <el-icon><Download /></el-icon>
        </el-button>

        <!-- 打印 -->
        <el-button
          v-if="config?.enablePrint !== false"
          size="small"
          @click="print"
        >
          <el-icon><Printer /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 主体内容 -->
    <div class="pdf-content">
      <!-- 缩略图侧边栏 -->
      <div v-if="showThumbnails" class="thumbnail-sidebar">
        <PdfThumbnail
          :total-pages="totalPages"
          :current-page="currentPage"
          @page-click="goToPage"
        />
      </div>

      <!-- PDF 画布容器 -->
      <div ref="containerRef" class="pdf-canvas-wrapper">
        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-overlay">
          <el-progress type="circle" :percentage="50" :show-text="false" />
          <p>加载 PDF 中...</p>
        </div>

        <!-- 错误状态 -->
        <el-alert
          v-if="hasError"
          type="error"
          :closable="false"
          show-icon
          class="error-alert"
        >
          {{ error?.message }}
        </el-alert>

        <!-- Canvas 容器 -->
        <div
          v-show="isReady"
          class="pdf-canvas-container"
          :style="{
            width: `${pageInfo?.scaledWidth}px`,
            height: `${pageInfo?.scaledHeight}px`,
          }"
        >
          <!-- Canvas 将由 usePdfViewer 注入 -->
        </div>

        <!-- 空状态 -->
        <el-empty
          v-if="!isLoading && !totalPages && !hasError"
          description="请选择 PDF 文件"
        />
      </div>
    </div>

    <!-- 页码快捷跳转 -->
    <div v-if="totalPages > 10" class="page-jumper">
      <el-button
        size="small"
        @click="goToPage(1)"
      >
        首页
      </el-button>
      <el-button
        size="small"
        :disabled="currentPage <= 10"
        @click="goToPage(currentPage - 10)"
      >
        前 10 页
      </el-button>
      <el-button
        size="small"
        :disabled="currentPage + 10 > totalPages"
        @click="goToPage(currentPage + 10)"
      >
        后 10 页
      </el-button>
      <el-button
        size="small"
        @click="goToPage(totalPages)"
      >
        末页
      </el-button>
    </div>
  </div>
</template>

<style scoped >
.pdf-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-fill-color-lighter);
  outline: none;

  &.is-rendering {
    cursor: wait;
  }
}

.pdf-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  flex-wrap: wrap;
  gap: 8px;

  .toolbar-left,
  .toolbar-center,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .page-info {
    display: flex;
    align-items: center;
    gap: 8px;

    .page-total {
      font-size: 12px;
      color: var(--el-text-color-secondary);
      white-space: nowrap;
    }
  }
}

.pdf-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.thumbnail-sidebar {
  width: 200px;
  border-right: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
  overflow-y: auto;
}

.pdf-canvas-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  position: relative;
  padding: 20px;

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.9);
    z-index: 10;

    p {
      margin-top: 16px;
      color: var(--el-text-color-secondary);
    }
  }

  .error-alert {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 400px;
  }

  .pdf-canvas-container {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    background: white;

    :deep(canvas) {
      display: block;
    }
  }
}

.page-jumper {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-light);
}
</style>
