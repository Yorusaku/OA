<script setup lang="ts">
import type { WorkflowDefinition } from '@/types/workflow'
import {
  ElAside,
  ElContainer,
  ElMain,
} from 'element-plus'
import { useRoute } from 'vue-router'
import { NodeConfigPanel, WorkflowCanvas } from '@/components/workflow'
import { useWorkflowEditor } from './composables/useWorkflowEditor'
import { EditorHeader, ToolbarAside } from './components'

const route = useRoute()
const workflowId = route.params.id as string

const {
  canvasRef,
  workflowName,
  workflowDescription,
  workflowStatus,
  selectedNode,
  definition,
  formSchemas,
  saveMutation,
  handleAddNode,
  handleDragStart,
  handleNodeDrop,
  handleNodeChange,
  handleEdgeChange,
  handleNodeSelect,
  handleNodeDelete,
  handleNodeUpdate,
  handleSave,
  handleBack,
} = useWorkflowEditor(workflowId)
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden bg-gray-50">
    <EditorHeader
      :workflow-name="workflowName"
      :workflow-status="workflowStatus"
      :is-saving="Boolean(saveMutation.isPending.value)"
      @update:workflow-name="workflowName = $event"
      @update:workflow-status="workflowStatus = $event"
      @save="handleSave"
      @back="handleBack"
    />

    <ElContainer class="flex-1 overflow-hidden">
      <ToolbarAside
        :workflow-description="workflowDescription"
        @update:workflow-description="workflowDescription = $event"
        @add-node="handleAddNode"
        @drag-start="handleDragStart"
      />

      <ElMain class="p-0 overflow-hidden bg-gray-50 relative">
        <WorkflowCanvas
          ref="canvasRef"
          :definition="definition"
          :readonly="false"
          :show-minimap="true"
          :show-grid="true"
          @nodeChange="handleNodeChange"
          @edgeChange="handleEdgeChange"
          @nodeSelect="handleNodeSelect"
          @nodeDelete="handleNodeDelete"
          @nodeDrop="handleNodeDrop"
        />
      </ElMain>

      <ElAside width="320px" class="bg-white border-l border-gray-200 p-4 overflow-y-auto shadow-sm z-10">
        <NodeConfigPanel
          :node="selectedNode"
          :form-schemas="formSchemas || []"
          @update="handleNodeUpdate"
          @delete="handleNodeDelete"
          @close="selectedNode = undefined"
        />
      </ElAside>
    </ElContainer>
  </div>
</template>

<style scoped>
</style>
