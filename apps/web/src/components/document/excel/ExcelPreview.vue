<script setup lang="ts">
import type { TabPaneName } from 'element-plus'
import type { ColumnDefinition } from '@/types/document'
/**
 * Excel 数据预览组件
 * 展示解析后的 Excel 数据，支持分页和搜索
 */
import { computed, ref } from 'vue'

interface Props {
  /**
   * 解析结果
   */
  data?: Record<string, any[]>
  /**
   * 列定义
   */
  columns?: ColumnDefinition[]
  /**
   * 工作表名称
   */
  sheets?: string[]
  /**
   * 每页条数
   */
  pageSize?: number
  /**
   * 最大高度
   */
  maxHeight?: number
  /**
   * 是否可搜索
   */
  searchable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  data: () => ({}),
  pageSize: 20,
  maxHeight: 500,
  searchable: true,
})

const emit = defineEmits<{
  /**
   * 工作表切换
   */
  sheetChange: [sheetName: string]
}>()

// 当前工作表
const currentSheet = ref(props.sheets?.[0] || Object.keys(props.data || {})[0])

// 搜索词
const searchQuery = ref('')

// 分页
const currentPage = ref(1)

// 当前工作表数据
const currentData = computed(() => {
  if (!props.data || !currentSheet.value) {
    return []
  }
  return props.data[currentSheet.value] || []
})

// 过滤后的数据
const filteredData = computed(() => {
  if (!searchQuery.value) {
    return currentData.value
  }

  const query = searchQuery.value.toLowerCase()
  return currentData.value.filter((row: any) => {
    return Object.values(row).some((value: any) => {
      return String(value).toLowerCase().includes(query)
    })
  })
})

// 分页后的数据
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * props.pageSize
  const end = start + props.pageSize
  return filteredData.value.slice(start, end)
})

// 总页数
const totalPages = computed(() => {
  return Math.ceil(filteredData.value.length / props.pageSize)
})

// 列定义
const displayColumns = computed(() => {
  if (props.columns && props.columns.length > 0) {
    return props.columns
  }

  // 从数据推断列
  const firstRow = currentData.value[0]
  if (!firstRow) {
    return []
  }

  return Object.keys(firstRow).map(key => ({
    key,
    label: key,
    type: 'string' as const,
  }))
})

// 方法
function handleSheetChange(sheet: TabPaneName) {
  const sheetName = String(sheet)
  currentSheet.value = sheetName
  currentPage.value = 1
  searchQuery.value = ''
  emit('sheetChange', sheetName)
}

function handleSearch() {
  currentPage.value = 1
}

function handleSizeChange(size: number) {
  currentPage.value = 1
}
</script>

<template>
  <div class="excel-preview">
    <!-- 工作表切换 -->
    <div v-if="sheets && sheets.length > 1" class="sheet-tabs">
      <el-tabs v-model="currentSheet" @tab-change="handleSheetChange">
        <el-tab-pane
          v-for="sheet in sheets"
          :key="sheet"
          :label="sheet"
          :name="sheet"
        />
      </el-tabs>
    </div>

    <!-- 搜索栏 -->
    <div v-if="searchable" class="search-bar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索数据..."
        clearable
        @input="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <div class="result-count">
        共 {{ filteredData.length }} 条结果
      </div>
    </div>

    <!-- 数据表格 -->
    <el-table
      :data="paginatedData"
      :max-height="maxHeight"
      border
      stripe
      size="small"
      empty-text="暂无数据"
    >
      <el-table-column
        v-for="col in displayColumns"
        :key="col.key"
        :label="col.label"
        :prop="col.key"
        :min-width="120"
        show-overflow-tooltip
      />
    </el-table>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="filteredData.length"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
      />
    </div>
  </div>
</template>

<style scoped >
.excel-preview {
  width: 100%;
}

.sheet-tabs {
  margin-bottom: 16px;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;

  .el-input {
    flex: 1;
    max-width: 400px;
  }

  .result-count {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
