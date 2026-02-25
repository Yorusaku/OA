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
  <div class="workflow-editor">
    <EditorHeader
      :workflow-name="workflowName"
      :workflow-status="workflowStatus"
      :is-saving="Boolean(saveMutation.isPending.value)"
      @update:workflow-name="workflowName = $event"
      @update:workflow-status="workflowStatus = $event"
      @save="handleSave"
      @back="handleBack"
    />

    <ElContainer class="editor-body">
      <ToolbarAside
        :workflow-description="workflowDescription"
        @update:workflow-description="workflowDescription = $event"
        @add-node="handleAddNode"
        @drag-start="handleDragStart"
      />

      <ElMain class="canvas-main">
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

      <ElAside width="320px" class="config-aside">
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
.workflow-editor {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-body {
  flex: 1;
  overflow: hidden;
}

.canvas-main {
  padding: 0;
  overflow: hidden;
  background: #f5f7fa;
}

.config-aside {
  background: white;
  border-left: 1px solid #ebeef5;
  padding: 16px;
  overflow-y: auto;
}
</style>
