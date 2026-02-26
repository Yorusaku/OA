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

// 防抖定时器引用
let syncTimeout: ReturnType<typeof setTimeout> | null = null

// ==================== 实时同步逻辑 ====================
/**
 * 防抖同步函数
 * 延迟 500ms 同步，避免输入过快导致频繁刷新
 */
function debouncedSync() {
  // 清除之前的定时器
  if (syncTimeout) {
    clearTimeout(syncTimeout)
  }
  
  // 创建新的防抖定时器（500ms 延迟）
  syncTimeout = setTimeout(() => {
    if (localNode.value.id) {
      console.log('🔄 [Debounce] Syncing node config:', localNode.value.name)
      emit('update', { ...localNode.value })
    }
  }, 500)
}

// 同步 node prop 到本地状态
watch(
  () => props.node,
  (newNode) => {
    if (newNode) {
      localNode.value = {
        ...newNode,
        handler: newNode.handler || { type: 'role', mode: 'or' },
      }
    }
  },
  { immediate: true, deep: true },
)

// 深度监听 localNode 变化，实时同步到画布
watch(
  () => localNode.value,
  () => {
    // 只有当节点有 ID 时才同步（避免初始化时同步空数据）
    if (localNode.value.id) {
      console.log('🔄 [Watch] Node config changed, scheduling sync...')
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
  if (syncTimeout) {
    clearTimeout(syncTimeout)
  }
  emit('close')
}

/**
 * 处理子组件的 update 事件
 */
function handleModelUpdate(updatedNode: WorkflowNode) {
  localNode.value = updatedNode
}

/**
 * 立即同步（用于重要配置变更）
 */
function syncImmediately() {
  if (syncTimeout) {
    clearTimeout(syncTimeout)
  }
  if (localNode.value.id) {
    console.log('⚡ [Immediate] Syncing node config:', localNode.value.name)
    emit('update', { ...localNode.value })
  }
}
</script>

<template>
  <ElCard v-if="node" class="node-config-panel" shadow="never">
    <template #header>
      <div class="panel-header">
        <span class="panel-title">节点配置</span>
        <div class="header-actions">
          <span v-if="localNode.id" class="sync-indicator" title="实时同步中">
            <span class="sync-dot"></span>
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
    <div v-if="!isStartOrEnd" class="sync-hint">
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
    <div class="panel-actions">
      <ElButton @click="handleClose">
        关闭
      </ElButton>
    </div>
  </ElCard>

  <div v-else class="empty-state">
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
    <p>点击节点进行配置</p>
  </div>
</template>

<style scoped>
.node-config-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sync-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #67c23a;
}

.sync-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #67c23a;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.sync-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
  color: #909399;
}

.panel-actions {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
  text-align: center;
}

.empty-state p {
  margin-top: 16px;
  font-size: 14px;
}
</style>
