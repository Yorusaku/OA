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
  onConnect,
  onNodeClick,
  onEdgeClick,
  onNodeDragStop,
  project,
  useVueFlow,
  VueFlow,
} from '@vue-flow/core'
import { MiniMap } from '@vue-flow/minimap'
import { onMounted, watch } from 'vue'

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
  nodeChange: [nodes: WorkflowNode[]]
  /** 边变化 */
  edgeChange: [edges: WorkflowEdge[]]
  /** 节点选中 */
  nodeSelect: [node: WorkflowNode]
  /** 节点删除 */
  nodeDelete: [nodeId: string]
  /** 从外部拖拽节点到画布 */
  nodeDrop: [type: WorkflowNode['type'], position: { x: number, y: number }]
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
  findNode,
  getNodes,
  getEdges,
  onConnect,
  onNodeClick,
  onEdgeClick,
  onNodeDragStop,
  project,
} = useVueFlow()

// 2. 修复：添加节点
function addNode(node: WorkflowNode) {
  if (props.readonly) return
  // 使用 Vue Flow 官方 API 注入节点
  addNodes([toVueFlowNode(node)])
}

// 3. 修复：删除节点
function deleteNode(nodeId: string) {
  if (props.readonly) return
  // 使用 Vue Flow 官方 API 移除节点
  removeNodes([nodeId])
  // 注意：这里不要再 emit('nodeDelete')，避免和 Editor 形成无限循环
}

// 4. 新增：更新节点 (用于响应禁用状态等属性变化)
function updateNode(node: WorkflowNode) {
  const currentElements = [...getNodes.value, ...getEdges.value]
  
  const newElements = currentElements.map(el => {
    if (el.id === node.id) {
      return {
        ...el,
        data: { ...el.data, ...node }
      }
    }
    return el
  })
  
  setElements(newElements)
}

// ==================== 数据转换 ====================
/**
 * 将 WorkflowNode 转换为 Vue Flow Node
 */
function toVueFlowNode(node: WorkflowNode): Node {
  return {
    id: node.id,
    type: node.type,
    position: node.position || { x: 0, y: 0 },
    data: { ...node },
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
    label: edge.label || '',
    data: { ...edge },
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

// ==================== 监听 definition 变化，同步到画布 ====================
// 1. 画布全量初始化 (只在初次加载时执行一次，防止覆盖现有画布)
watch(
  () => props.definition,
  (newDef) => {
    if (!newDef) return
    if (!newDef.nodes || !newDef.edges) return
    if (getNodes.value.length === 0 && (newDef?.nodes?.length || newDef?.edges?.length)) {
      const nodes = newDef.nodes.map(toVueFlowNode)
      const edges = newDef.edges.map(toVueFlowEdge)
      setElements([...nodes, ...edges])
    }
  },
  { immediate: true },
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
  emit('edgeChange', [newEdge])
})

/**
 * 处理节点点击
 */
onNodeClick((event) => {
  const nodeData = event.node.data as WorkflowNode
  emit('nodeSelect', nodeData)
})

/**
 * 处理节点拖拽结束
 */
onNodeDragStop((event) => {
  const updatedNodes = event.nodes.map(toWorkflowNode)
  emit('nodeChange', updatedNodes)
})

// ==================== 拖拽相关处理 ====================
/**
 * 处理拖拽悬停
 */
function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}

/**
 * 处理节点放置
 */
function onDrop(event: DragEvent) {
  event.preventDefault()
  
  let type = event.dataTransfer?.getData('application/vueflow') as WorkflowNode['type']
  if (!type) {
    type = event.dataTransfer?.getData('node-type') as WorkflowNode['type']
  }
  
  if (!type) {
    console.error('❌ Drop 失败: 浏览器拦截了 dataTransfer 数据')
    return
  }
  
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const position = project({ 
    x: event.clientX - bounds.left, 
    y: event.clientY - bounds.top, 
  })
  
  emit('nodeDrop', type, position)
}

// ==================== 对外暴露方法 ====================

/**
 * 获取当前画布的工作流定义
 */
function getDefinition(): WorkflowDefinition {
  return props.definition
}

defineExpose({
  addNode,
  deleteNode,
  updateNode, // <--- 必须暴露出来给 Editor 调用
  getDefinition,
})
</script>

<template>
  <div class="workflow-canvas">
    <VueFlow
      :connection-mode="ConnectionMode.Loose"
      :fit-view-on-init="true"
      :snap-to-grid="true"
      :snap-grid="[15, 15]"
      :delete-key-code="['Backspace', 'Delete']"
      :nodes-connectable="!readonly"
      :nodes-draggable="!readonly"
      :zoom-on-scroll="true"
      :zoom-on-pinch="true"
      :pan-on-drag="true"
      :min-zoom="0.1"
      :max-zoom="2"
      @dragover.prevent="onDragOver"
      @drop.prevent="onDrop"
      @nodes-change="(changes) => {
        const nodes = changes
          .filter((c): c is any => c.type === 'position' && c.position != null)
          .map(c => ({ id: (c as any).id, position: c.position as any }))
          .map(toWorkflowNode)
        emit('nodeChange', nodes)
      }"
      @edges-change="(changes) => {
        const edges = changes
          .filter(c => c.type !== 'remove')
          .map(c => (c as any).item)
          .filter((e: Edge) => e?.data)
          .map((e: Edge) => e.data as WorkflowEdge)
        emit('edgeChange', edges)
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
  position: relative;
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
