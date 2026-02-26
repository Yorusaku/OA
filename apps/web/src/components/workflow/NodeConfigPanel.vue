<script setup lang="ts">
/**
 * NodeConfigPanel - 节点属性配置面板
 * 使用策略模式和动态组件将配置表单拆分到独立子组件
 *
 * 交互优化：实时同步模式
 * - 去掉保存按钮
 * - 使用 watch 深度监听 + 防抖
 * - 用户修改配置后自动同步到画布
 */
import type { WorkflowNode } from '@/types/workflow'
import {
  ElButton,
  ElCard,
  ElDivider,
  ElIcon,
  ElMessage,
} from 'element-plus'
import { computed, ref, watch } from 'vue'
import { debounce } from 'lodash-es'
import { ApprovalConfig, BaseConfig, ConditionConfig } from './configs'

// ==================== Props & Emits ====================
const props = defineProps<{
  /** 选中的节点 */
  node?: WorkflowNode
  /** 可用的表单 Schema 列表 */
  formSchemas?: Array<{ id: string, name: string }>
}>()

const emit = defineEmits<{
  /** 节点配置更新（实时同步） */
  update: [node: WorkflowNode]
  /** 删除节点 */
  delete: [nodeId: string]
  /** 关闭面板 */
  close: []
}>()

// ==================== 本地状态 ====================
const localNode = ref<WorkflowNode>({
  id: '',
  type: 'approval',
  name: '',
  description: '',
  handler: {
    type: 'role',
    mode: 'or',
  },
  enabled: true,
})

// 标志位：区分外部传入 vs 内部修改
let isExternalUpdate = false

// ==================== 实时同步逻辑 ====================
/**
 * 防抖同步函数
 * 🚀 150ms 黄金微观防抖，兼顾性能与实时性
 */
const debouncedSync = debounce(() => {
  // 如果是外部传入的变化，不触发同步
  if (isExternalUpdate) {
    isExternalUpdate = false
    return
  }

  if (localNode.value.id) {
    emit('update', { ...localNode.value })
  }
}, 150) // 🚀 锁定 150ms

// 同步 node prop 到本地状态（外部传入）
watch(
  () => props.node,
  (newNode) => {
    if (newNode) {
      isExternalUpdate = true // 标记为外部传入
      localNode.value = {
        ...newNode,
        handler: newNode.handler || { type: 'role', mode: 'or' },
      }
    }
  },
  { immediate: true, deep: true },
)

// 深度监听 localNode 变化，实时同步到画布（内部修改）
watch(
  () => localNode.value,
  () => {
    // 只有当节点有 ID 时才同步（避免初始化时同步空数据）
    if (localNode.value.id) {
      debouncedSync()
    }
  },
  { deep: true }
)

// ==================== 计算属性 ====================
const isStartOrEnd = computed(() => {
  return localNode.value.type === 'start' || localNode.value.type === 'end'
})

// 动态组件映射
const configComponentMap: Record<string, any> = {
  approval: ApprovalConfig,
  cc: ApprovalConfig,
  condition: ConditionConfig,
}

const CurrentConfigComponent = computed(() => {
  return configComponentMap[localNode.value.type] || null
})

// ==================== 事件处理 ====================
/**
 * 删除节点
 */
function handleDelete() {
  if (localNode.value.id) {
    emit('delete', localNode.value.id)
  }
}

/**
 * 关闭面板
 */
function handleClose() {
  // 取消待执行的防抖同步
  debouncedSync.cancel()
  emit('close')
}

/**
 * 处理子组件的 update 事件
 */
function handleModelUpdate(updatedNode: WorkflowNode) {
  localNode.value = updatedNode
}
</script>

<template>
  <ElCard v-if="node" class="h-full flex flex-col shadow-none" shadow="never">
    <template #header>
      <div class="flex justify-between items-center">
        <span class="text-base font-semibold text-gray-800">节点配置</span>
        <div class="flex items-center gap-3">
          <span v-if="localNode.id" class="flex items-center gap-2 text-xs text-green-600" title="实时同步中">
            <span class="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
            实时同步
          </span>
          <ElButton
            v-if="!isStartOrEnd"
            link
            type="danger"
            size="small"
            @click="handleDelete"
          >
            删除节点
          </ElButton>
        </div>
      </div>
    </template>

    <!-- 基础配置（所有节点类型共有） -->
    <BaseConfig
      v-model="localNode"
      :show-type-select="!isStartOrEnd"
    />

    <!-- 业务配置（根据节点类型动态渲染） -->
    <component
      :is="CurrentConfigComponent"
      v-if="CurrentConfigComponent && !isStartOrEnd"
      v-model="localNode"
      :form-schemas="formSchemas"
      @update:model-value="handleModelUpdate"
    />

    <!-- 提示文字 -->
    <div v-if="!isStartOrEnd" class="flex items-center gap-2 mt-3 p-3 bg-gray-50 rounded text-sm text-gray-500">
      <ElIcon :size="14" color="#909399">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </ElIcon>
      <span>修改后将自动同步到画布</span>
    </div>

    <!-- 操作按钮（只保留关闭） -->
    <div class="mt-auto pt-4 border-t border-gray-200 flex justify-end gap-2">
      <ElButton @click="handleClose">
        关闭
      </ElButton>
    </div>
  </ElCard>

  <div v-else class="flex flex-col items-center justify-center h-full text-gray-500">
    <ElIcon :size="48" color="#909399">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    </ElIcon>
    <p class="mt-4 text-sm">点击节点进行配置</p>
  </div>
</template>

<style scoped>
</style>
