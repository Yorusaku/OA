<script setup lang="ts">
import type { ExcelParseOptions, ExcelValidationRule } from '@/types/document'
import { ElMessage, ElMessageBox } from 'element-plus'
/**
 * Excel 导入组件
 * 支持拖拽上传、解析、预览和验证
 */
import { computed, ref, watch } from 'vue'
import { useExcelImport } from '@/composables/useExcelImport'

interface Props {
  /**
   * 验证规则
   */
  validationRules?: ExcelValidationRule[]
  /**
   * 解析选项
   */
  parseOptions?: ExcelParseOptions
  /**
   * 是否自动验证
   */
  autoValidate?: boolean
  /**
   * 接受的文件类型
   */
  accept?: string
  /**
   * 最大文件大小 (MB)
   */
  maxFileSize?: number
  /**
   * 是否显示预览
   */
  showPreview?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  accept: '.xlsx,.xls',
  maxFileSize: 50,
  showPreview: true,
  autoValidate: false,
})

const emit = defineEmits<{
  /**
   * 导入完成
   */
  complete: [data: any[]]
  /**
   * 导入失败
   */
  error: [error: Error]
  /**
   * 文件选择
   */
  change: [file: File]
}>()

// 拖拽状态
const isDragging = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// 使用 composable
const {
  isParsing,
  progress,
  result,
  validationResult,
  error,
  parseFile,
  validateData,
  getSheetData,
  getAllData,
  downloadErrorReport,
} = useExcelImport({
  validationRules: props.validationRules,
  autoValidate: props.autoValidate,
  ...props.parseOptions,
})

// 计算属性
const currentSheetData = computed(() => {
  if (!result.value)
    return []
  return getSheetData()
})

// 方法
async function handleFileSelect(file: File) {
  // 验证文件大小
  const maxSizeBytes = props.maxFileSize * 1024 * 1024
  if (file.size > maxSizeBytes) {
    ElMessage.error(`文件大小超过限制 (${props.maxFileSize}MB)`)
    emit('error', new Error('文件过大'))
    return
  }

  emit('change', file)

  try {
    await parseFile(file)

    if (result.value) {
      ElMessage.success(`解析成功，共 ${result.value.stats.totalRows} 行数据`)

      // 如果有验证错误
      if (validationResult.value?.errors.length) {
        ElMessageBox.alert(
          `发现 ${validationResult.value.errors.length} 行数据存在错误，请修正后重新导入`,
          '验证警告',
          {
            confirmButtonText: '下载错误报告',
            callback: () => downloadErrorReport(),
          },
        )
      }

      // 发送完成事件
      const allData = getAllData()
      emit('complete', allData)
    }
  }
  catch (err: any) {
    ElMessage.error(err.message || '解析失败')
    emit('error', err)
  }
}

async function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false

  const file = e.dataTransfer?.files[0]
  if (file && isValidFileType(file)) {
    await handleFileSelect(file)
  }
  else {
    ElMessage.error('请上传 Excel 文件')
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
  const file = input.files?.[0]
  if (file) {
    handleFileSelect(file)
  }
}

function triggerFileSelect() {
  fileInputRef.value?.click()
}

function isValidFileType(file: File): boolean {
  const validTypes = ['.xlsx', '.xls']
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  return validTypes.includes(ext)
}

async function handleValidate() {
  if (props.validationRules) {
    await validateData(props.validationRules)
  }
}

// 监听验证结果
watch(validationResult, (newResult) => {
  if (newResult?.valid) {
    ElMessage.success('数据验证通过')
  }
})
</script>

<template>
  <div class="excel-importer">
    <!-- 上传区域 -->
    <div
      class="upload-area"
      :class="{ 'is-dragging': isDragging, 'is-parsing': isParsing }"
      @drop="onDrop"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @click="triggerFileSelect"
    >
      <input
        ref="fileInputRef"
        type="file"
        :accept="accept"
        class="file-input"
        @change="onFileInputChange"
      >

      <div class="upload-content">
        <el-icon class="upload-icon" :size="48">
          <Upload />
        </el-icon>
        <p class="upload-text">
          将 Excel 文件拖到此处，或<em>点击上传</em>
        </p>
        <p class="upload-hint">
          支持 .xlsx、.xls 格式，最大 {{ maxFileSize }}MB
        </p>
      </div>

      <!-- 解析进度 -->
      <div v-if="isParsing" class="progress-overlay">
        <el-progress
          :percentage="progress.percentage"
          :status="progress.stage === 'complete' ? 'success' : undefined"
        >
          {{ progress.message }}
        </el-progress>
      </div>
    </div>

    <!-- 错误提示 -->
    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      class="error-alert"
    >
      {{ error.message }}
    </el-alert>

    <!-- 验证结果 -->
    <el-alert
      v-if="validationResult && !validationResult.valid"
      type="warning"
      :closable="false"
      show-icon
      class="warning-alert"
    >
      <template #title>
        发现 {{ validationResult.errors.length }} 行数据存在错误
        <el-button type="primary" link @click="() => downloadErrorReport()">
          下载错误报告
        </el-button>
      </template>
    </el-alert>

    <!-- 数据预览 -->
    <div v-if="showPreview && currentSheetData.length" class="preview-section">
      <div class="preview-header">
        <h4>数据预览</h4>
        <div class="preview-actions">
          <el-button
            v-if="validationRules"
            @click="handleValidate"
          >
            验证数据
          </el-button>
          <el-tag size="small">
            共 {{ result?.stats.totalRows }} 行
          </el-tag>
          <el-tag size="small" type="success">
            有效 {{ result?.stats.validRows }} 行
          </el-tag>
          <el-tag v-if="result?.stats.errorRows" size="small" type="danger">
            错误 {{ result?.stats.errorRows }} 行
          </el-tag>
        </div>
      </div>

      <el-table
        :data="currentSheetData.slice(0, 10)"
        max-height="400"
        border
        stripe
        size="small"
      >
        <el-table-column
          v-for="(col, index) in result?.columns || []"
          :key="col.key"
          :label="col.label"
          :prop="col.key"
          :min-width="120"
        />
      </el-table>

      <p v-if="currentSheetData.length > 10" class="preview-hint">
        仅显示前 10 条，共 {{ currentSheetData.length }} 条数据
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.excel-importer {
  width: 100%;
}

.upload-area {
  position: relative;
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  background-color: var(--el-fill-color-light);
  cursor: pointer;
  transition: all 0.3s;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover,
  &.is-dragging {
    border-color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
  }

  &.is-parsing {
    pointer-events: none;
  }

  .file-input {
    display: none;
  }

  .upload-content {
    text-align: center;
    padding: 40px;

    .upload-icon {
      color: var(--el-color-primary);
      margin-bottom: 16px;
    }

    .upload-text {
      font-size: 14px;
      color: var(--el-text-color-regular);
      margin: 8px 0;

      em {
        color: var(--el-color-primary);
        font-style: normal;
        text-decoration: underline;
      }
    }

    .upload-hint {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }

  .progress-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.9);
    padding: 20px;
  }
}

.error-alert,
.warning-alert {
  margin-top: 16px;
}

.preview-section {
  margin-top: 24px;

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }

    .preview-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .preview-hint {
    margin-top: 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-align: center;
  }
}
</style>
