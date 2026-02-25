<script setup lang="ts">
import { ElMessage } from 'element-plus'
/**
 * 文档上传组件
 * 支持拖拽上传和点击选择
 */
import { ref } from 'vue'

interface Props {
  /**
   * 接受的文件类型
   */
  accept?: string
  /**
   * 最大文件大小 (MB)
   */
  maxFileSize?: number
  /**
   * 是否支持多文件
   */
  multiple?: boolean
  /**
   * 提示文本
   */
  hintText?: string
}

const props = withDefaults(defineProps<Props>(), {
  accept: '.pdf,.xlsx,.xls',
  maxFileSize: 50,
  multiple: false,
  hintText: '将文件拖到此处，或点击上传',
})

const emit = defineEmits<{
  /**
   * 文件选择
   */
  upload: [files: File[]]
  /**
   * 文件变更
   */
  change: [files: File[]]
}>()

const isDragging = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

function handleFileSelect(files: FileList | null) {
  if (!files)
    return

  const selectedFiles = Array.from(files)

  // 验证文件大小
  const maxSizeBytes = props.maxFileSize * 1024 * 1024
  const invalidFiles = selectedFiles.filter(f => f.size > maxSizeBytes)

  if (invalidFiles.length > 0) {
    ElMessage.error(`以下文件超过大小限制 (${props.maxFileSize}MB)：\n${invalidFiles.map(f => f.name).join(', ')}`)
    return
  }

  emit('upload', selectedFiles)
  emit('change', selectedFiles)
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false

  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    handleFileSelect(files)
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onFileInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  handleFileSelect(input.files)
}

function triggerFileSelect() {
  fileInputRef.value?.click()
}
</script>

<template>
  <div
    class="document-uploader"
    :class="{ 'is-dragging': isDragging }"
    @drop="onDrop"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @click="triggerFileSelect"
  >
    <input
      ref="fileInputRef"
      type="file"
      :accept="accept"
      :multiple="multiple"
      class="file-input"
      @change="onFileInputChange"
    >

    <div class="uploader-content">
      <el-icon class="uploader-icon" :size="48">
        <Upload />
      </el-icon>
      <p class="uploader-text">
        {{ hintText }}
      </p>
      <p class="uploader-hint">
        支持 {{ accept.replace(/\./g, '').replace(/,/g, '、') }} 格式，最大 {{ maxFileSize }}MB
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.document-uploader {
  position: relative;
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  background-color: var(--el-fill-color-light);
  cursor: pointer;
  transition: all 0.3s;
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover,
  &.is-dragging {
    border-color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
  }

  .file-input {
    display: none;
  }

  .uploader-content {
    text-align: center;
    padding: 20px;

    .uploader-icon {
      color: var(--el-color-primary);
      margin-bottom: 12px;
    }

    .uploader-text {
      font-size: 14px;
      color: var(--el-text-color-regular);
      margin: 8px 0;
    }

    .uploader-hint {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }
}
</style>
