<script setup lang="ts">
import type { WorkflowNode } from '@/types/workflow'
import {
  ElForm,
  ElFormItem,
  ElInput,
} from 'element-plus'

defineProps<{
  workflowDescription: string
}>()

defineEmits<{
  'update:workflowDescription': [value: string]
  addNode: [type: WorkflowNode['type']]
  dragStart: [event: DragEvent, type: WorkflowNode['type']]
}>()

const nodeTypes: Array<{ type: WorkflowNode['type'], label: string, icon: string }> = [
  { type: 'start', label: '发起节点', icon: '🚀' },
  { type: 'approval', label: '审批节点', icon: '📋' },
  { type: 'cc', label: '抄送节点', icon: '📧' },
  { type: 'condition', label: '条件分支', icon: '🔀' },
  { type: 'end', label: '结束节点', icon: '✅' },
]
</script>

<template>
  <div class="toolbar-aside">
    <div class="toolbar-section">
      <h4>节点工具箱</h4>
      <div class="dnd-node-list">
        <div
          v-for="node in nodeTypes"
          :key="node.type"
          :class="['dnd-node', `is-${node.type}`]"
          draggable="true"
          @dragstart="$emit('dragStart', $event, node.type)"
          @click="$emit('addNode', node.type)"
        >
          <span class="icon">{{ node.icon }}</span> {{ node.label }}
        </div>
      </div>
    </div>

    <div class="toolbar-section">
      <h4>流程信息</h4>
      <ElForm label-width="60px" size="small">
        <ElFormItem label="描述">
          <ElInput
            :model-value="workflowDescription"
            type="textarea"
            :rows="3"
            placeholder="流程描述"
            @update:model-value="$emit('update:workflowDescription', $event)"
          />
        </ElFormItem>
      </ElForm>
    </div>
  </div>
</template>

<style scoped>
.toolbar-aside {
  background: #f5f7fa;
  border-right: 1px solid #ebeef5;
  padding: 16px;
  overflow-y: auto;
  height: 100%;
}

.toolbar-section {
  margin-bottom: 24px;
}

.toolbar-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #303133;
  font-weight: 600;
}

.dnd-node-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dnd-node {
  padding: 10px 16px;
  background: white;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  font-size: 14px;
  color: #303133;
  cursor: grab;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
  user-select: none;
}

.dnd-node:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.dnd-node:active {
  cursor: grabbing;
}

.dnd-node .icon {
  margin-right: 8px;
  font-size: 16px;
}

.dnd-node.is-start { border-left: 4px solid #667eea; }
.dnd-node.is-approval { border-left: 4px solid #409eff; }
.dnd-node.is-cc { border-left: 4px solid #67c23a; }
.dnd-node.is-condition { border-left: 4px solid #e6a23c; }
.dnd-node.is-end { border-left: 4px solid #909399; }
</style>
