<script setup lang="ts">
import type { Connection, Edge, Node } from '@vue-flow/core'
/**
 * WorkflowCanvas - 工作流画布组件
 * 基于 @vue-flow/core 实现流程编排画布
 */
import type { WorkflowDefinition, WorkflowEdge, WorkflowNode } from '@/types/workflow'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import {
  ConnectionMode,
  useVueFlow,
  VueFlow,
} from '@vue-flow/core'
import { MiniMap } from '@vue-flow/minimap'

import ApprovalNode from './nodes/ApprovalNode.vue'
import CcNode from './nodes/CcNode.vue'
import ConditionNode from './nodes/ConditionNode.vue'
import EndNode from './nodes/EndNode.vue'
// 导入节点组件
import StartNode from './nodes/StartNode.vue'

// ==================== Props & Emits ====================
const props = withDefaults(defineProps<{
  /** 工作流定义 */
  definition?: WorkflowDefinition
  /** 是否只读 */
  readonly?: boolean
  /** 是否显示小地图 */
  showMinimap?: boolean
  /** 是否显示背景网格 */
  showGrid?: boolean
}>(), {
  definition: () => ({
    id: '',
    name: '',
    status: 'draft',
    nodes: [],
    edges: [],
  }),
  readonly: false,
  showMinimap: true,
  showGrid: true,
})

const emit = defineEmits<{
  /** 节点变化 */
  'node-change': [nodes: WorkflowNode[]]
  /** 边变化 */
  'edge-change': [edges: WorkflowEdge[]]
  /** 节点选中 */
  'node-select': [node: WorkflowNode]
  /** 节点删除 */
  'node-delete': [nodeId: string]
}>()

// ==================== 自定义节点类型注册 ====================
const nodeTypes = {
  start: StartNode,
  approval: ApprovalNode,
  cc: CcNode,
  condition: ConditionNode,
  end: EndNode,
}

// ==================== Vue Flow 初始化 ====================
const {
  addNodes,
  removeNodes,
  addEdges,
  removeEdges,
  setElements,
  onConnect,
  onNodeClick,
  onNodeDragStop,
} = useVueFlow()

// ==================== 数据转换 ====================
/**
 * 将 WorkflowNode 转换为 Vue Flow Node
 */
function toVueFlowNode(node: WorkflowNode): Node {
  return {
    id: node.id,
    type: node.type,
    position: node.position || { x: 0, y: 0 },
    data: node,
    draggable: !props.readonly,
    selectable: true,
    deletable: !props.readonly,
  }
}

/**
 * 将 WorkflowEdge 转换为 Vue Flow Edge
 */
function toVueFlowEdge(edge: WorkflowEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    data: edge,
    deletable: !props.readonly,
  }
}

/**
 * 将 Vue Flow Node 转换回 WorkflowNode
 */
function toWorkflowNode(node: Node): WorkflowNode {
  return {
    ...(node.data as WorkflowNode),
    position: { ...node.position },
  }
}

// ==================== 初始化元素 ====================
const elements = ref<Array<Node | Edge>>([])

// 监听 definition 变化，更新画布
watch(
  () => props.definition,
  (newDef) => {
    if (newDef?.nodes?.length || newDef?.edges?.length) {
      const nodes = newDef.nodes.map(toVueFlowNode)
      const edges = newDef.edges.map(toVueFlowEdge)
      setElements([...nodes, ...edges])
    }
  },
  { immediate: true, deep: true },
)

// ==================== 事件处理 ====================
/**
 * 处理节点连接
 */
onConnect((connection: Connection) => {
  if (props.readonly)
    return

  const newEdge: WorkflowEdge = {
    id: `edge-${Date.now()}`,
    source: connection.source || '',
    target: connection.target || '',
    label: '',
  }

  addEdges(toVueFlowEdge(newEdge))
  emit('edge-change', [newEdge])
})

/**
 * 处理节点点击
 */
onNodeClick((event) => {
  const nodeData = event.node.data as WorkflowNode
  emit('node-select', nodeData)
})

/**
 * 处理节点拖拽结束
 */
onNodeDragStop((event) => {
  const updatedNodes = event.nodes.map(toWorkflowNode)
  emit('node-change', updatedNodes)
})

// ==================== 对外暴露方法 ====================
/**
 * 添加新节点
 */
function addNode(node: WorkflowNode) {
  if (props.readonly)
    return
  addNodes(toVueFlowNode(node))
  emit('node-change', [node])
}

/**
 * 删除节点
 */
function deleteNode(nodeId: string) {
  if (props.readonly)
    return
  removeNodes([nodeId])
  emit('node-delete', nodeId)
}

/**
 * 获取当前画布的工作流定义
 */
function getDefinition(): WorkflowDefinition {
  // 这里需要从 Vue Flow 获取最新状态
  // 简化实现，实际应该从 store 获取
  return props.definition
}

defineExpose({
  addNode,
  deleteNode,
  getDefinition,
})
</script>

<template>
  <div class="workflow-canvas">
    <VueFlow
      v-model="elements"
      :connection-mode="ConnectionMode.Loose"
      :fit-view-on-init="true"
      :snap-to-grid="true"
      :snap-grid="[15, 15]"
      :delete-key-code="['Backspace', 'Delete']"
      :nodes-connectable="!readonly"
      :nodes-draggable="!readonly"
      @nodes-change="(changes) => {
        const nodes = changes
          .filter((c): c is any => c.type === 'position' && c.position != null)
          .map(c => ({ id: (c as any).id, position: c.position as any }))
          .map(toWorkflowNode)
        emit('node-change', nodes)
      }"
      @edges-change="(changes) => {
        const edges = changes
          .filter(c => c.type !== 'remove')
          .map(c => (c as any).item)
          .filter((e: Edge) => e?.data)
          .map((e: Edge) => e.data as WorkflowEdge)
        emit('edge-change', edges)
      }"
    >
      <template #node-start="props">
        <StartNode v-bind="props" />
      </template>
      <template #node-approval="props">
        <ApprovalNode v-bind="props" />
      </template>
      <template #node-cc="props">
        <CcNode v-bind="props" />
      </template>
      <template #node-condition="props">
        <ConditionNode v-bind="props" />
      </template>
      <template #node-end="props">
        <EndNode v-bind="props" />
      </template>

      <Background v-if="showGrid" :gap="20" :size="1" />
      <Controls v-if="!readonly" />
      <MiniMap
        v-if="showMinimap"
        :node-color="(node) => {
          const type = (node.data as WorkflowNode)?.type
          switch (type) {
          case 'start': return '#667eea'
          case 'approval': return '#409eff'
          case 'cc': return '#67c23a'
          case 'condition': return '#e6a23c'
          case 'end': return '#909399'
          default: return '#409eff'
          }
        }"
      />
    </VueFlow>
  </div>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';
</style>

<style scoped>
.workflow-canvas {
  width: 100%;
  height: 100%;
  min-height: 500px;
  background: #f5f7fa;
  border-radius: 8px;
  overflow: hidden;
}

:deep(.vue-flow__node) {
  cursor: pointer;
}

:deep(.vue-flow__node:hover) {
  filter: brightness(0.95);
}

:deep(.vue-flow__edge-path) {
  stroke: #409eff;
  stroke-width: 2;
}

:deep(.vue-flow__controls) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

:deep(.vue-flow__minimap) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}
</style>
