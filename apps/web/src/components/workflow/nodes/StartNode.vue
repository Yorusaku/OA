<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { WorkflowNode } from '@/types/workflow'
/**
 * StartNode - 发起节点组件
 * 流程的起点，通常是发起人填写表单
 */
import { Handle, Position } from '@vue-flow/core'

const props = defineProps<NodeProps<WorkflowNode>>()

const data = props.data as WorkflowNode
</script>

<template>
  <div class="workflow-node start-node">
    <div class="node-header">
      <div class="node-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </div>
      <span class="node-title">{{ data.name || '发起节点' }}</span>
    </div>
    <div class="node-content">
      <p class="node-desc">
        {{ data.description || '流程发起人' }}
      </p>
    </div>
    <!-- 输出连接点 -->
    <Handle
      type="source"
      :position="Position.Bottom"
      class="node-handle"
    />
  </div>
</template>

<style scoped>
.workflow-node {
  min-width: 180px;
  max-width: 240px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.node-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.node-title {
  font-size: 13px;
  font-weight: 600;
}

.node-content {
  padding: 10px 12px;
}

.node-desc {
  font-size: 11px;
  opacity: 0.9;
  margin: 0;
}

.node-handle {
  width: 10px;
  height: 10px;
  background: #667eea;
  border: 2px solid white;
  border-radius: 50%;
}
</style>
