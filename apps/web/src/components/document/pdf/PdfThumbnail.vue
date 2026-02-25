<script setup lang="ts">
/**
 * PDF 缩略图组件
 * 显示所有页面的缩略图，支持点击跳转
 */
import { ref, watch } from 'vue'

interface Props {
  /**
   * 总页数
   */
  totalPages?: number
  /**
   * 当前页码
   */
  currentPage?: number
  /**
   * 缩略图宽度
   */
  thumbnailWidth?: number
  /**
   * PDF 源（用于生成缩略图）
   */
  source?: File | URL | ArrayBuffer | null
}

const props = withDefaults(defineProps<Props>(), {
  totalPages: 0,
  currentPage: 1,
  thumbnailWidth: 120,
})

const emit = defineEmits<{
  /**
   * 页码点击
   */
  pageClick: [page: number]
}>()

// 缩略图缓存
const thumbnails = ref<Map<number, string>>(new Map())

// 是否正在生成缩略图
const isGenerating = ref(false)

// 生成缩略图（简化版本，实际应该使用 pdfService.renderThumbnails）
async function generateThumbnails() {
  if (!props.source || isGenerating.value) {
    return
  }

  isGenerating.value = true

  // 这里应该调用 pdfService.renderThumbnails
  // 为了简化，我们只生成占位符
  // 实际使用时需要传入已渲染的缩略图数据

  isGenerating.value = false
}

// 监听 totalPages 变化
watch(
  () => props.totalPages,
  () => {
    thumbnails.value.clear()
  },
)

// 滚动到当前页
function scrollToCurrentPage(container: HTMLElement) {
  const pageElement = container.querySelector(`.thumbnail-item[data-page="${props.currentPage}"]`)
  if (pageElement) {
    pageElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
}

// 暴露方法
defineExpose({
  scrollToCurrentPage,
})
</script>

<template>
  <div class="pdf-thumbnail">
    <!-- 加载中 -->
    <div v-if="isGenerating" class="generating-hint">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      <span>生成缩略图...</span>
    </div>

    <!-- 缩略图列表 -->
    <div v-else-if="totalPages > 0" class="thumbnail-list">
      <div
        v-for="page in totalPages"
        :key="page"
        class="thumbnail-item"
        :class="{ 'is-active': page === currentPage }"
        :data-page="page"
        @click="emit('pageClick', page)"
      >
        <div class="thumbnail-preview">
          <!-- 实际使用时这里显示渲染的缩略图 -->
          <div class="thumbnail-placeholder">
            <span>{{ page }}</span>
          </div>
        </div>
        <span class="thumbnail-page">{{ page }}</span>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty v-else description="无预览" :image-size="60" />
  </div>
</template>

<style scoped lang="scss">
.pdf-thumbnail {
  height: 100%;
  overflow-y: auto;
  background: var(--el-fill-color-lighter);
}

.generating-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.thumbnail-list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.thumbnail-item {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: var(--el-fill-color);
  }

  &.is-active {
    background: var(--el-color-primary-light-9);
    border: 1px solid var(--el-color-primary);

    .thumbnail-preview {
      border-color: var(--el-color-primary);
    }
  }

  .thumbnail-preview {
    width: v-bind('`${thumbnailWidth}px`');
    height: calc(v-bind('`${thumbnailWidth}px`') * 1.414);
    border: 1px solid var(--el-border-color);
    border-radius: 2px;
    overflow: hidden;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;

    .thumbnail-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--el-fill-color-light);
      color: var(--el-text-color-placeholder);
      font-size: 24px;
      font-weight: 600;
    }

    :deep(img) {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  .thumbnail-page {
    font-size: 12px;
    color: var(--el-text-color-regular);
  }
}
</style>
