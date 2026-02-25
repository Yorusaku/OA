<script setup lang="ts">
import type { ColumnDefinition } from '@/types/document'
import { ElMessage } from 'element-plus'
/**
 * Excel 字段映射组件
 * 将 Excel 列映射到目标 Schema 字段
 */
import { computed, ref } from 'vue'

interface TargetField {
  /** 字段名 */
  key: string
  /** 字段标签 */
  label: string
  /** 是否必填 */
  required?: boolean
  /** 字段类型 */
  type?: string
}

interface Props {
  /**
   * Excel 列定义
   */
  columns?: ColumnDefinition[]
  /**
   * 目标字段 Schema
   */
  targetSchema?: TargetField[]
  /**
   * 是否自动匹配
   */
  autoMatch?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoMatch: true,
})

const emit = defineEmits<{
  /**
   * 映射完成
   */
  mapped: [mapping: Record<string, string>]
  /**
   * 映射变更
   */
  change: [mapping: Record<string, string>]
}>()

// 映射关系：targetKey -> sourceKey
const mapping = ref<Record<string, string>>({})

// 未匹配的源列
const unmappedColumns = computed(() => {
  const mappedSourceKeys = Object.values(mapping.value)
  return props.columns?.filter(
    col => !mappedSourceKeys.includes(col.key),
  )
})

// 未匹配的目标字段
const unmappedTargets = computed(() => {
  const mappedTargetKeys = Object.keys(mapping.value)
  return props.targetSchema?.filter(
    field => !mappedTargetKeys.includes(field.key),
  )
})

// 匹配进度
const matchProgress = computed(() => {
  if (!props.targetSchema?.length)
    return 0
  const matched = Object.keys(mapping.value).length
  return Math.round((matched / props.targetSchema.length) * 100)
})

// 初始化映射
function initMapping() {
  if (!props.autoMatch || !props.columns || !props.targetSchema) {
    return
  }

  // 自动匹配：精确匹配
  for (const target of props.targetSchema) {
    // 尝试精确匹配 key
    const exactMatch = props.columns?.find(col => col.key === target.key)
    if (exactMatch) {
      mapping.value[target.key] = exactMatch.key
      continue
    }

    // 尝试模糊匹配 label
    const labelMatch = props.columns?.find(
      col =>
        col.label.toLowerCase().includes(target.label.toLowerCase())
        || target.label.toLowerCase().includes(col.label.toLowerCase()),
    )
    if (labelMatch) {
      mapping.value[target.key] = labelMatch.key
    }
  }

  emitChange()
}

// 设置映射
function setMapping(targetKey: string, sourceKey: string) {
  if (!sourceKey) {
    delete mapping.value[targetKey]
  }
  else {
    mapping.value[targetKey] = sourceKey
  }
  emitChange()
}

// 清除映射
function clearMapping() {
  mapping.value = {}
  emitChange()
}

// 自动映射
function autoMap() {
  initMapping()
  ElMessage.success('自动映射完成')
}

// 发送变更事件
function emitChange() {
  emit('change', { ...mapping.value })
  emit('mapped', { ...mapping.value })
}

// 验证映射
function validateMapping() {
  if (!props.targetSchema)
    return true

  const missingRequired = props.targetSchema.filter(
    field => field.required && !mapping.value[field.key],
  )

  if (missingRequired.length > 0) {
    ElMessage.warning(
      `以下必填字段未映射：${missingRequired.map(f => f.label).join(', ')}`,
    )
    return false
  }

  return true
}

// 暴露方法
defineExpose({
  getMapping: () => ({ ...mapping.value }),
  validateMapping,
})

// 生命周期
if (props.autoMatch) {
  initMapping()
}
</script>

<template>
  <div class="excel-field-mapper">
    <!-- 映射进度 -->
    <div class="mapper-header">
      <div class="progress-info">
        <span>映射进度：{{ matchProgress }}%</span>
        <span class="mapping-count">
          已映射 {{ Object.keys(mapping).length }} / {{ targetSchema?.length || 0 }}
        </span>
      </div>

      <div class="mapper-actions">
        <el-button size="small" @click="autoMap">
          自动匹配
        </el-button>
        <el-button size="small" @click="clearMapping">
          清除映射
        </el-button>
      </div>
    </div>

    <!-- 映射列表 -->
    <div class="mapper-body">
      <div
        v-for="target in targetSchema"
        :key="target.key"
        class="mapping-item"
        :class="{ 'is-required': target.required, 'is-mapped': mapping[target.key] }"
      >
        <!-- 目标字段 -->
        <div class="target-field">
          <span class="field-label">
            {{ target.label }}
            <el-tag v-if="target.required" size="small" type="danger">必填</el-tag>
          </span>
          <span class="field-key">{{ target.key }}</span>
        </div>

        <!-- 映射箭头 -->
        <el-icon class="mapping-arrow">
          <Right />
        </el-icon>

        <!-- 源字段选择 -->
        <el-select
          v-model="mapping[target.key]"
          placeholder="选择 Excel 列"
          clearable
          filterable
          @change="(val: string) => setMapping(target.key, val)"
        >
          <el-option
            v-for="col in columns"
            :key="col.key"
            :label="col.label"
            :value="col.key"
          >
            <span>{{ col.label }}</span>
            <span class="option-type">{{ col.type }}</span>
          </el-option>
        </el-select>
      </div>
    </div>

    <!-- 未映射的源列提示 -->
    <el-alert
      v-if="unmappedColumns?.length"
      type="info"
      :closable="false"
      show-icon
      class="unmapped-hint"
    >
      <template #title>
        以下 Excel 列未被使用：
        <el-tag
          v-for="col in unmappedColumns"
          :key="col.key"
          size="small"
          style="margin-left: 4px"
        >
          {{ col.label }}
        </el-tag>
      </template>
    </el-alert>
  </div>
</template>

<style scoped lang="scss">
.excel-field-mapper {
  width: 100%;
}

.mapper-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  margin-bottom: 16px;

  .progress-info {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 14px;

    .mapping-count {
      color: var(--el-text-color-secondary);
    }
  }
}

.mapper-body {
  .mapping-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--el-border-color);
    border-radius: 4px;
    margin-bottom: 8px;
    transition: all 0.3s;

    &:hover {
      border-color: var(--el-color-primary-light-5);
    }

    &.is-required {
      border-left: 3px solid var(--el-color-danger);
    }

    &.is-mapped {
      background-color: var(--el-color-success-light-9);
      border-color: var(--el-color-success-light-5);
    }

    .target-field {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;

      .field-label {
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .field-key {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        font-family: monospace;
      }
    }

    .mapping-arrow {
      color: var(--el-text-color-secondary);
    }

    .el-select {
      flex: 1;
      max-width: 300px;
    }
  }
}

.unmapped-hint {
  margin-top: 16px;

  :deep(.el-tag) {
    margin-left: 4px;
  }
}

.option-type {
  float: right;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
