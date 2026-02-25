<script setup lang="ts">
import type { ExportColumnConfig } from '@/types/document'
import { ElMessage } from 'element-plus'
/**
 * Excel 导出组件
 * 支持配置列、格式化数据和下载
 */
import { ref } from 'vue'
import { useExcelExport } from '@/composables/useExcelExport'

interface Props {
  /**
   * 导出数据
   */
  data?: any[]
  /**
   * 列配置
   */
  columns?: ExportColumnConfig[]
  /**
   * 默认文件名
   */
  filename?: string
  /**
   * 工作表名称
   */
  sheetName?: string
  /**
   * 是否显示按钮
   */
  showButton?: boolean
  /**
   * 按钮类型
   */
  buttonType?: 'primary' | 'success' | 'warning' | 'danger'
  /**
   * 按钮文本
   */
  buttonText?: string
  /**
   * 导出前回调
   */
  beforeExport?: (data: any[]) => Promise<any[]> | any[]
  /**
   * 导出后回调
   */
  afterExport?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  showButton: true,
  buttonType: 'primary',
  buttonText: '导出 Excel',
})

const emit = defineEmits<{
  /**
   * 导出开始
   */
  start: []
  /**
   * 导出完成
   */
  complete: [blob: Blob]
  /**
   * 导出失败
   */
  error: [error: Error]
}>()

// 使用 composable
const {
  isExporting,
  progress,
  error,
  downloadExcel,
} = useExcelExport({
  defaultFilename: props.filename,
  defaultColumns: props.columns,
  beforeExport: props.beforeExport,
  afterExport: props.afterExport,
})

// 本地状态
const isCustomizing = ref(false)
const customColumns = ref<ExportColumnConfig[]>([])

// 方法
async function handleExport() {
  if (!props.data.length) {
    ElMessage.warning('没有可导出的数据')
    return
  }

  emit('start')

  try {
    await downloadExcel(
      props.data,
      props.filename,
      {
        sheetName: props.sheetName,
        columns: customColumns.value.length ? customColumns.value : props.columns,
      },
    )

    ElMessage.success('导出成功')
    emit('complete', new Blob())
  }
  catch (err: any) {
    ElMessage.error(err.message || '导出失败')
    emit('error', err)
  }
}

function handleCustomizeColumns() {
  if (props.columns) {
    customColumns.value = [...props.columns]
  }
  isCustomizing.value = true
}

function handleColumnVisibilityChange(col: ExportColumnConfig, visible: boolean) {
  const index = customColumns.value.findIndex(c => c.key === col.key)
  if (index !== -1) {
    customColumns.value.splice(index, 1)
  }
  else {
    customColumns.value.push(col)
  }
}
</script>

<template>
  <div class="excel-exporter">
    <!-- 导出按钮 -->
    <div v-if="showButton" class="export-actions">
      <el-button
        :type="buttonType"
        :loading="isExporting"
        :disabled="!data.length"
        @click="handleExport"
      >
        {{ buttonText }}
      </el-button>

      <!-- 列选择 -->
      <el-dropdown v-if="columns" trigger="click">
        <el-button :disabled="isExporting">
          选择列
          <el-icon><arrow-down /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="col in columns"
              :key="col.key"
              @click="handleColumnVisibilityChange(col, true)"
            >
              <el-checkbox
                :model-value="customColumns.some(c => c.key === col.key)"
                @click.stop
              >
                {{ col.label }}
              </el-checkbox>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 导出进度 -->
    <div v-if="isExporting" class="export-progress">
      <el-progress
        :percentage="progress.percentage"
        :status="progress.stage === 'complete' ? 'success' : undefined"
      >
        {{ progress.message }}
      </el-progress>
    </div>

    <!-- 错误提示 -->
    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
    >
      {{ error.message }}
    </el-alert>

    <!-- 数据预览 -->
    <div v-if="data.length" class="preview-section">
      <div class="preview-header">
        <h4>导出预览</h4>
        <el-tag size="small">
          共 {{ data.length }} 条数据
        </el-tag>
      </div>

      <el-table
        :data="data.slice(0, 5)"
        max-height="200"
        border
        stripe
        size="small"
      >
        <el-table-column
          v-for="col in (columns || Object.keys(data[0] || {}).map(k => ({ key: k, label: k })))"
          :key="col.key"
          :label="col.label"
          :prop="col.key"
          :min-width="100"
        />
      </el-table>

      <p class="preview-hint">
        仅显示前 5 条，实际导出 {{ data.length }} 条数据
      </p>
    </div>

    <!-- 列配置对话框 -->
    <el-dialog
      v-model="isCustomizing"
      title="选择导出列"
      width="400px"
    >
      <el-checkbox-group v-model="customColumns">
        <div
          v-for="col in columns"
          :key="col.key"
          class="column-item"
        >
          <el-checkbox :label="col.key">
            {{ col.label }}
          </el-checkbox>
        </div>
      </el-checkbox-group>

      <template #footer>
        <el-button @click="isCustomizing = false">
          取消
        </el-button>
        <el-button type="primary" @click="isCustomizing = false">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.excel-exporter {
  width: 100%;
}

.export-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.export-progress {
  margin-bottom: 16px;
}

.preview-section {
  margin-top: 16px;

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
  }

  .preview-hint {
    margin-top: 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-align: center;
  }
}

.column-item {
  padding: 8px 0;
}
</style>
