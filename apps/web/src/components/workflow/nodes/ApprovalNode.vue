<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { ApprovalMode, WorkflowNode } from '@/types/workflow'
/**
 * ApprovalNode - 审批节点组件
 * 需要审批人处理的任务节点
 */
import { Handle, Position } from '@vue-flow/core'

const props = defineProps<NodeProps<WorkflowNode>>()

const data = props.data as WorkflowNode

// 获取审批模式显示文本
function getModeText(mode?: ApprovalMode): string {
  switch (mode) {
    case 'or': return '或签'
    case 'and': return '会签'
    case 'sequential': return '依次审批'
    default: return '或签'
  }
}

// 获取处理人显示文本
function getHandlerText(): string {
  if (!data.handler)
    return '未配置处理人'
  const typeMap: Record<string, string> = {
    role: '角色',
    dept: '部门',
    user: '指定人员',
    deptManager: '部门负责人',
    initiator: '发起人自己',
    continuous: '连续多级',
  }
  const typeText = typeMap[data.handler.type] || '未知'
  const modeText = getModeText(data.handler.mode)
  return `${typeText} · ${modeText}`
}
</script>

<template>
  <div class="workflow-node approval-node">
    <!-- 输入连接点 -->
    <Handle
      type="target"
      :position="Position.Top"
      class="node-handle"
    />

    <div class="node-header">
      <div class="node-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      </div>
      <span class="node-title">{{ data.name || '审批节点' }}</span>
    </div>

    <div class="node-content">
      <p class="node-handler">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        {{ getHandlerText() }}
      </p>
      <p v-if="data.formSchemaId" class="node-form">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
        已绑定表单
      </p>
      <p v-if="data.timeout" class="node-timeout">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {{ data.timeout }}小时{{ data.autoPassOnTimeout ? '自动通过' : '超时提醒' }}
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
  border: 2px solid #409eff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.2);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #ecf5ff;
  border-radius: 6px 6px 0 0;
}

.node-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #409eff;
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

.node-handler,
.node-form,
.node-timeout {
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
  background: #409eff;
  border: 2px solid white;
  border-radius: 50%;
}
</style>
