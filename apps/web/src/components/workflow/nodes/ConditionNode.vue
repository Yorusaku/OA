<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { WorkflowNode } from '@/types/workflow'
/**
 * ConditionNode - 条件分支节点组件
 * 根据表单数据条件进行分支
 */
import { Handle, Position } from '@vue-flow/core'

const props = defineProps<NodeProps<WorkflowNode>>()

const data = props.data as WorkflowNode

const conditionCount = data.conditions?.length || 0
</script>

<template>
  <div class="workflow-node condition-node">
    <!-- 输入连接点 -->
    <Handle
      type="target"
      :position="Position.Top"
      class="node-handle"
    />

    <div class="node-header">
      <div class="node-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
        </svg>
      </div>
      <span class="node-title">{{ data.name || '条件分支' }}</span>
    </div>

    <div class="node-content">
      <p class="node-condition">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
        {{ conditionCount }} 个条件分支
      </p>
    </div>

    <!-- 输出连接点（条件节点通常有多个输出） -->
    <Handle
      :id="`${data.id}-a`"
      type="source"
      :position="Position.Bottom"
      :style="{ left: '30%' }"
      class="node-handle"
    />
    <Handle
      :id="`${data.id}-b`"
      type="source"
      :position="Position.Bottom"
      :style="{ left: '70%' }"
      class="node-handle"
    />
  </div>
</template>

<style scoped>
.workflow-node {
  min-width: 180px;
  max-width: 240px;
  background: white;
  border: 2px solid #e6a23c;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(230, 162, 60, 0.2);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fdf6ec;
  border-radius: 6px 6px 0 0;
}

.node-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #e6a23c;
  color: white;
  border-radius: 4px;
}

.node-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.node-content {
  padding: 10px 12px;
}

.node-condition {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #606266;
  margin: 4px 0;
}

.node-handle {
  width: 10px;
  height: 10px;
  background: #e6a23c;
  border: 2px solid white;
  border-radius: 50%;
}
</style>
