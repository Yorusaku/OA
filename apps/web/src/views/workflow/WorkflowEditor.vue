<script setup lang="ts">
import type { WorkflowDefinition, WorkflowEdge, WorkflowNode, WorkflowStatus } from '@/types/workflow'
import {
  ElAside,
  ElButton,
  ElContainer,
  ElForm,
  ElFormItem,
  ElHeader,
  ElInput,
  ElMain,
  ElMessage,
  ElOption,
  ElSelect,
} from 'element-plus'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NodeConfigPanel, WorkflowCanvas } from '@/components/workflow'
import { useFormSchemas, useSaveWorkflow, useWorkflowDetail } from '@/composables/useWorkflow'
import { createDefaultNodes, generateId, getDefaultNodeName, getDefaultPosition } from './utils'

const router = useRouter()
const route = useRoute()

// 流程 ID（从路由参数获取，'new' 表示新建）
const workflowId = computed(() => route.params.id as string)
const isNew = computed(() => workflowId.value === 'new')

// ==================== 本地状态 ====================
const workflowName = ref('')
const workflowDescription = ref('')
const workflowStatus = ref<WorkflowStatus>('draft')
const selectedNode = ref<WorkflowNode | undefined>()
const draggingType = ref<WorkflowNode['type'] | null>(null)

// 当前工作流定义
const definition = ref<WorkflowDefinition>({
  id: '',
  name: '',
  description: '',
  status: 'draft',
  nodes: [],
  edges: [],
})

// ==================== Vue Query ====================
// 获取流程详情（编辑模式）
const { data: workflowData } = useWorkflowDetail(isNew.value ? '' : workflowId.value)

// 获取表单 Schema 列表
const { data: formSchemas } = useFormSchemas()

// 保存流程
const saveMutation = useSaveWorkflow()

// 监听详情数据加载完成
watch(
  workflowData,
  (data) => {
    if (data) {
      definition.value = data
      workflowName.value = data.name || ''
      workflowDescription.value = data.description || ''
      workflowStatus.value = data.status || 'draft'
    }
  },
  { immediate: true },
)

// ==================== 事件处理 ====================
/**
 * 处理按钮点击添加节点
 */
function handleAddNode(type: WorkflowNode['type']) {
  const newNode: WorkflowNode = {
    id: generateId(type),
    type,
    name: getDefaultNodeName(type),
    description: '',
    handler: type === 'approval' || type === 'cc' ? { type: 'role', mode: 'or' } : undefined,
    position: getDefaultPosition(definition.value.nodes),
    enabled: true,
  }

  definition.value.nodes.push(newNode)
}

/**
 * 处理从工具箱拖拽开始
 */
function handleDragStart(event: DragEvent, type: WorkflowNode['type']) {
  draggingType.value = type
  event.dataTransfer?.setData('node-type', type)
  event.dataTransfer.effectAllowed = 'copy'
}

/**
 * 处理节点拖拽到画布
 */
function handleNodeDrop(type: WorkflowNode['type'], position: { x: number, y: number }) {
  if (!type) return

  draggingType.value = null

  const newNode: WorkflowNode = {
    id: generateId(type),
    type,
    name: getDefaultNodeName(type),
    description: '',
    handler: type === 'approval' || type === 'cc' ? { type: 'role', mode: 'or' } : undefined,
    position: { x: position.x, y: position.y },
    enabled: true,
  }

  definition.value.nodes.push(newNode)
}

function handleNodeChange(nodes: WorkflowNode[]) {
  definition.value.nodes = nodes
}

function handleEdgeChange(edges: WorkflowEdge[]) {
  definition.value.edges = edges
}

function handleNodeSelect(node: WorkflowNode) {
  selectedNode.value = node
}

function handleNodeDelete(nodeId: string) {
  definition.value.nodes = definition.value.nodes.filter(n => n.id !== nodeId)
  definition.value.edges = definition.value.edges.filter(
    e => e.source !== nodeId && e.target !== nodeId,
  )
  selectedNode.value = undefined
  ElMessage.success('节点已删除')
}

function handleNodeUpdate(updatedNode: WorkflowNode) {
  const index = definition.value.nodes.findIndex(n => n.id === updatedNode.id)
  if (index !== -1) {
    definition.value.nodes[index] = updatedNode
    selectedNode.value = { ...updatedNode }
    ElMessage.success('配置已保存')
  }
}

async function handleSave() {
  if (!workflowName.value.trim()) {
    ElMessage.warning('请输入流程名称')
    return
  }

  // 检查是否有起始节点
  const hasStart = definition.value.nodes.some(n => n.type === 'start')
  if (!hasStart) {
    ElMessage.warning('流程必须包含一个发起节点')
    return
  }

  try {
    const data: WorkflowDefinition = {
      ...definition.value,
      id: isNew.value ? '' : workflowId.value,
      name: workflowName.value,
      description: workflowDescription.value,
      status: workflowStatus.value,
    }

    await saveMutation.save(data)
    ElMessage.success('保存成功')

    // 新建成功后跳转到编辑页
    if (isNew.value && data.id) {
      router.push(`/workflow/editor/${data.id}`)
    }
  }
  catch {
    ElMessage.error('保存失败')
  }
}

function handleBack() {
  router.push('/workflow/list')
}

// 初始化
watch(
  () => isNew.value,
  (val) => {
    if (val && definition.value.nodes.length === 0) {
      definition.value.nodes = createDefaultNodes()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="workflow-editor">
    <!-- 顶部工具栏 -->
    <ElHeader class="editor-header">
      <div class="header-left">
        <ElButton @click="handleBack">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回
        </ElButton>
        <div class="workflow-info">
          <ElInput
            v-model="workflowName"
            placeholder="请输入流程名称"
            class="workflow-name-input"
          />
          <ElSelect v-model="workflowStatus" style="width: 120px">
            <ElOption label="草稿" value="draft" />
            <ElOption label="启用" value="active" />
            <ElOption label="停用" value="inactive" />
          </ElSelect>
        </div>
      </div>
      <div class="header-right">
        <ElButton :loading="Boolean(saveMutation.isPending.value)" @click="handleSave">
          保存
        </ElButton>
      </div>
    </ElHeader>

    <ElContainer class="editor-body">
      <!-- 左侧工具栏 -->
      <ElAside width="200px" class="toolbar-aside">
        <div class="toolbar-section">
          <h4>节点工具箱</h4>
          <ElButton
            class="toolbar-btn start-btn"
            block
            draggable="true"
            @dragstart="handleDragStart($event, 'start')"
            @click="handleAddNode('start')"
          >
            <span class="btn-icon">🚀</span> 发起节点
          </ElButton>
          <ElButton
            class="toolbar-btn approval-btn"
            block
            draggable="true"
            @dragstart="handleDragStart($event, 'approval')"
            @click="handleAddNode('approval')"
          >
            <span class="btn-icon">📋</span> 审批节点
          </ElButton>
          <ElButton
            class="toolbar-btn cc-btn"
            block
            draggable="true"
            @dragstart="handleDragStart($event, 'cc')"
            @click="handleAddNode('cc')"
          >
            <span class="btn-icon">📧</span> 抄送节点
          </ElButton>
          <ElButton
            class="toolbar-btn condition-btn"
            block
            draggable="true"
            @dragstart="handleDragStart($event, 'condition')"
            @click="handleAddNode('condition')"
          >
            <span class="btn-icon">🔀</span> 条件分支
          </ElButton>
          <ElButton
            class="toolbar-btn end-btn"
            block
            draggable="true"
            @dragstart="handleDragStart($event, 'end')"
            @click="handleAddNode('end')"
          >
            <span class="btn-icon">✅</span> 结束节点
          </ElButton>
        </div>

        <div class="toolbar-section">
          <h4>流程信息</h4>
          <ElForm label-width="60px" size="small">
            <ElFormItem label="描述">
              <ElInput
                v-model="workflowDescription"
                type="textarea"
                :rows="3"
                placeholder="流程描述"
              />
            </ElFormItem>
          </ElForm>
        </div>
      </ElAside>

      <!-- 中间画布 -->
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

      <!-- 右侧配置面板 -->
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

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid #ebeef5;
  height: 60px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.workflow-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.workflow-name-input {
  width: 300px;
}

.editor-body {
  flex: 1;
  overflow: hidden;
}

.toolbar-aside {
  background: #f5f7fa;
  border-right: 1px solid #ebeef5;
  padding: 16px;
  overflow-y: auto;
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

.toolbar-btn {
  margin-bottom: 8px;
  justify-content: flex-start;
  cursor: grab;
  user-select: none;
}

.toolbar-btn:active {
  cursor: grabbing;
}

.toolbar-btn[draggable="true"]:active {
  opacity: 0.7;
  transform: scale(0.98);
}

.btn-icon {
  margin-right: 8px;
}

.start-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.approval-btn {
  background: #ecf5ff;
  color: #409eff;
  border-color: #409eff;
}

.cc-btn {
  background: #f0f9eb;
  color: #67c23a;
  border-color: #67c23a;
}

.condition-btn {
  background: #fdf6ec;
  color: #e6a23c;
  border-color: #e6a23c;
}

.end-btn {
  background: #f4f4f5;
  color: #909399;
  border-color: #909399;
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
