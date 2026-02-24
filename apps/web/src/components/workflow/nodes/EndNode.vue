<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { WorkflowNode } from '@/types/workflow'
/**
 * EndNode - 结束节点组件
 * 流程的终点
 */
import { Handle, Position } from '@vue-flow/core'

const props = defineProps<NodeProps<WorkflowNode>>()

const data = props.data as WorkflowNode
</script>

<template>
  <div class="workflow-node end-node">
    <!-- 输入连接点 -->
    <Handle
      type="target"
      :position="Position.Top"
      class="node-handle"
    />

    <div class="node-header">
      <div class="node-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <span class="node-title">{{ data.name || '结束节点' }}</span>
    </div>

    <div class="node-content">
      <p class="node-desc">
        流程结束
      </p>
    </div>
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
