<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { WorkflowNode } from '@/types/workflow'
/**
 * CcNode - 抄送节点组件
 * 只需知晓无需审批的节点
 */
import { Handle, Position } from '@vue-flow/core'

const props = defineProps<NodeProps<WorkflowNode>>()

const data = props.data as WorkflowNode

function getHandlerText(): string {
  if (!data.handler)
    return '未配置抄送人'
  const typeMap: Record<string, string> = {
    role: '角色',
    dept: '部门',
    user: '指定人员',
    deptManager: '部门负责人',
  }
  return typeMap[data.handler.type] || '未知'
}
</script>

<template>
  <div class="workflow-node cc-node">
    <!-- 输入连接点 -->
    <Handle
      type="target"
      :position="Position.Top"
      class="node-handle"
    />

    <div class="node-header">
      <div class="node-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      </div>
      <span class="node-title">{{ data.name || '抄送节点' }}</span>
    </div>

    <div class="node-content">
      <p class="node-handler">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        {{ getHandlerText() }}
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
  background: white;
  border: 2px solid #67c23a;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(103, 194, 58, 0.2);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f0f9eb;
  border-radius: 6px 6px 0 0;
}

.node-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #67c23a;
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

.node-handler {
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
  background: #67c23a;
  border: 2px solid white;
  border-radius: 50%;
}
</style>
