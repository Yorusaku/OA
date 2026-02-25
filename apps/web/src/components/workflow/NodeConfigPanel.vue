<script setup lang="ts">
/**
 * NodeConfigPanel - 节点属性配置面板
 * 使用策略模式和动态组件将配置表单拆分到独立子组件
 */
import type { WorkflowNode } from '@/types/workflow'
import {
  ElButton,
  ElCard,
  ElDivider,
  ElIcon,
} from 'element-plus'
import { computed, ref } from 'vue'
import { ApprovalConfig, BaseConfig, ConditionConfig } from './configs'

// ==================== Props & Emits ====================
const props = defineProps<{
  /** 选中的节点 */
  node?: WorkflowNode
  /** 可用的表单 Schema 列表 */
  formSchemas?: Array<{ id: string, name: string }>
}>()

const emit = defineEmits<{
  /** 节点配置更新 */
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
 * 保存配置
 */
function handleSave() {
  emit('update', { ...localNode.value })
}

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
  <ElCard v-if="node" class="node-config-panel" shadow="never">
    <template #header>
      <div class="panel-header">
        <span class="panel-title">节点配置</span>
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

    <ElDivider v-if="!isStartOrEnd" />

    <!-- 操作按钮 -->
    <div class="panel-actions">
      <ElButton @click="handleClose">
        取消
      </ElButton>
      <ElButton type="primary" @click="handleSave">
        保存
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

.panel-actions {
  margin-top: 16px;
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
