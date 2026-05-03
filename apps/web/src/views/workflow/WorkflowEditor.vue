<script setup lang="ts">
import type { WorkflowDefinition } from '@/types/workflow'
import {
  ElAside,
  ElButton,
  ElCard,
  ElContainer,
  ElInput,
  ElMain,
} from 'element-plus'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { debugWorkflowRuleTrace } from '@/api/workflow'
import { NodeConfigPanel, WorkflowCanvas } from '@/components/workflow'
import { useUserStore } from '@/stores/user'
import { useWorkflowEditor } from './composables/useWorkflowEditor'
import { EditorHeader, ToolbarAside } from './components'

const route = useRoute()
const workflowId = route.params.id as string
const userStore = useUserStore()
const canDebugRuleTrace = computed(() => userStore.userInfo?.name === 'admin')
const ruleTraceNodeId = ref('')
const ruleTraceFormData = ref('{\n  "reason": "调休",\n  "days": 2\n}')
const ruleTraceLoading = ref(false)
const ruleTraceError = ref('')
const ruleTraceResult = ref<null | {
  summary: string
  fields: Array<{
    fieldKey: string
    visible: boolean
    readonly: boolean
    required: boolean
    source: string[]
    hitConditions: string[]
  }>
}>(null)

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

async function handleRuleTraceDebug() {
  if (!workflowId || workflowId === 'new')
    return

  ruleTraceLoading.value = true
  ruleTraceError.value = ''
  try {
    const formData = JSON.parse(ruleTraceFormData.value || '{}') as Record<string, unknown>
    const result = await debugWorkflowRuleTrace(workflowId, {
      nodeId: ruleTraceNodeId.value.trim() || undefined,
      formData,
    })
    ruleTraceResult.value = result
  }
  catch (error) {
    ruleTraceError.value = error instanceof Error ? error.message : '规则调试失败'
  }
  finally {
    ruleTraceLoading.value = false
  }
}
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden bg-gray-50" data-testid="workflow-editor-page">
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

      <ElMain class="p-0 overflow-hidden bg-gray-50 relative" data-testid="workflow-editor-main">
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

      <ElAside width="320px" class="bg-white border-l border-gray-200 p-4 overflow-y-auto shadow-sm z-10 space-y-4">
        <NodeConfigPanel
          :node="selectedNode"
          :form-schemas="formSchemas || []"
          @update="handleNodeUpdate"
          @delete="handleNodeDelete"
          @close="selectedNode = undefined"
        />

        <ElCard v-if="canDebugRuleTrace" shadow="never" class="border border-slate-200">
          <template #header>
            <div class="text-sm font-semibold">规则调试器（管理员）</div>
          </template>

          <div class="space-y-3">
            <ElInput
              v-model="ruleTraceNodeId"
              size="small"
              placeholder="节点 ID（可空，默认当前审批节点）"
            />
            <ElInput
              v-model="ruleTraceFormData"
              size="small"
              type="textarea"
              :rows="6"
              placeholder="输入 JSON 表单样例"
            />
            <ElButton
              type="primary"
              size="small"
              :loading="ruleTraceLoading"
              @click="handleRuleTraceDebug"
            >
              运行规则调试
            </ElButton>

            <div v-if="ruleTraceError" class="text-xs text-red-500">
              {{ ruleTraceError }}
            </div>

            <div v-if="ruleTraceResult" class="space-y-2">
              <div class="text-xs text-slate-600">
                {{ ruleTraceResult.summary }}
              </div>
              <div
                v-for="field in ruleTraceResult.fields"
                :key="field.fieldKey"
                class="border rounded px-2 py-1 text-xs"
              >
                <div class="font-medium text-slate-700">{{ field.fieldKey }}</div>
                <div class="text-slate-500">
                  visible={{ field.visible }} readonly={{ field.readonly }} required={{ field.required }}
                </div>
                <div class="text-slate-400 truncate">
                  source: {{ field.source.join(', ') || '-' }}
                </div>
              </div>
            </div>
          </div>
        </ElCard>
      </ElAside>
    </ElContainer>
  </div>
</template>

<style scoped>
</style>
