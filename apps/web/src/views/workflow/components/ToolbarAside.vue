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
  'addNode': [type: WorkflowNode['type']]
  'dragStart': [event: MouseEvent, type: WorkflowNode['type']]
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
  <div class="bg-white border-r border-gray-200 flex flex-col w-60 z-10 overflow-y-auto h-full p-4">
    <div class="border-b border-gray-100 pb-4 mb-4">
      <h4 class="text-sm font-semibold text-gray-700 mb-3">节点工具箱</h4>
      <div class="flex flex-col gap-3">
        <div
          v-for="node in nodeTypes"
          :key="node.type"
          :class="[
            'flex items-center justify-center h-10 border border-dashed rounded cursor-grab select-none transition-colors text-sm hover:shadow-sm',
            node.type === 'start' ? 'border-blue-300 bg-blue-50 text-blue-600 hover:border-blue-400' : '',
            node.type === 'approval' ? 'border-orange-300 bg-orange-50 text-orange-600 hover:border-orange-400' : '',
            node.type === 'cc' ? 'border-green-300 bg-green-50 text-green-600 hover:border-green-400' : '',
            node.type === 'condition' ? 'border-green-300 bg-green-50 text-green-600 hover:border-green-400' : '',
            node.type === 'end' ? 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400' : ''
          ]"
          @mousedown.prevent="$emit('dragStart', $event, node.type)"
          @click="$emit('addNode', node.type)"
        >
          <span class="mr-2">{{ node.icon }}</span> {{ node.label }}
        </div>
      </div>
    </div>

    <div class="border-b border-gray-100 pb-4 mb-4 flex-1">
      <h4 class="text-sm font-semibold text-gray-700 mb-3">流程信息</h4>
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
</style>
