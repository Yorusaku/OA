<script setup lang="ts">
/**
 * PDF 工具栏组件
 * 可独立使用或嵌入 PdfViewer
 */
import type { PdfViewerConfig } from '@/types/document'

interface Props {
  /**
   * 当前页码
   */
  currentPage?: number
  /**
   * 总页数
   */
  totalPages?: number
  /**
   * 当前缩放比例
   */
  scale?: number
  /**
   * 配置
   */
  config?: PdfViewerConfig
}

const props = withDefaults(defineProps<Props>(), {
  currentPage: 1,
  totalPages: 0,
  scale: 1,
})

const emit = defineEmits<{
  /**
   * 上一页
   */
  prev: []
  /**
   * 下一页
   */
  next: []
  /**
   * 跳转页码
   */
  goToPage: [page: number]
  /**
   * 放大
   */
  zoomIn: []
  /**
   * 缩小
   */
  zoomOut: []
  /**
   * 重置缩放
   */
  resetZoom: []
  /**
   * 顺时针旋转
   */
  rotateClockwise: []
  /**
   * 逆时针旋转
   */
  rotateCounterClockwise: []
  /**
   * 下载
   */
  download: []
  /**
   * 打印
   */
  print: []
}>()

const canGoPrev = computed(() => props.currentPage > 1)
const canGoNext = computed(() => props.currentPage < props.totalPages)
const canZoomIn = computed(() => props.scale < (props.config?.maxScale || 3))
const canZoomOut = computed(() => props.scale > (props.config?.minScale || 0.5))
</script>

<template>
  <div class="pdf-toolbar">
    <div class="toolbar-section">
      <!-- 翻页 -->
      <el-button-group>
        <el-button
          size="small"
          :disabled="!canGoPrev"
          @click="emit('prev')"
        >
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <el-button
          size="small"
          :disabled="!canGoNext"
          @click="emit('next')"
        >
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </el-button-group>

      <div class="page-input">
        <el-input-number
          :model-value="currentPage"
          :min="1"
          :max="totalPages"
          size="small"
          controls-position="right"
          @update:model-value="(val) => val && emit('goToPage', val)"
        />
        <span class="page-total">/ {{ totalPages }}</span>
      </div>
    </div>

    <div class="toolbar-section">
      <!-- 缩放 -->
      <el-button-group>
        <el-button
          size="small"
          :disabled="!canZoomOut"
          @click="emit('zoomOut')"
        >
          <el-icon><ZoomOut /></el-icon>
        </el-button>
        <el-button size="small" @click="emit('resetZoom')">
          {{ Math.round(scale * 100) }}%
        </el-button>
        <el-button
          size="small"
          :disabled="!canZoomIn"
          @click="emit('zoomIn')"
        >
          <el-icon><ZoomIn /></el-icon>
        </el-button>
      </el-button-group>
    </div>

    <div class="toolbar-section">
      <!-- 旋转 -->
      <el-tooltip content="逆时针旋转">
        <el-button
          size="small"
          @click="emit('rotateCounterClockwise')"
        >
          <el-icon><RefreshLeft /></el-icon>
        </el-button>
      </el-tooltip>

      <el-tooltip content="顺时针旋转">
        <el-button
          size="small"
          @click="emit('rotateClockwise')"
        >
          <el-icon><RefreshRight /></el-icon>
        </el-button>
      </el-tooltip>

      <!-- 下载 -->
      <el-tooltip v-if="config?.enableDownload !== false" content="下载">
        <el-button size="small" @click="emit('download')">
          <el-icon><Download /></el-icon>
        </el-button>
      </el-tooltip>

      <!-- 打印 -->
      <el-tooltip v-if="config?.enablePrint !== false" content="打印">
        <el-button size="small" @click="emit('print')">
          <el-icon><Printer /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<style scoped lang="scss">
.pdf-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-input {
  display: flex;
  align-items: center;
  gap: 8px;

  .page-total {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }
}
</style>
