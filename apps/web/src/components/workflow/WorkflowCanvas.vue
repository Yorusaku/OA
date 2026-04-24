<script setup lang="ts">
import type { WorkflowDefinition, WorkflowEdge, WorkflowNode, WorkflowNodeType } from '@/types/workflow'
import LogicFlow from '@logicflow/core'
import { Control, DndPanel, Menu, MiniMap, SelectionSelect } from '@logicflow/extension'
import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'

import '@logicflow/core/dist/index.css'
import '@logicflow/extension/lib/style/index.css'

type GraphNode = {
  id: string
  type: string
  x: number
  y: number
  text?: any
  properties?: Record<string, any>
}

type GraphEdge = {
  id?: string
  sourceNodeId: string
  targetNodeId: string
  text?: any
  properties?: Record<string, any>
}

const props = withDefaults(defineProps<{
  definition?: WorkflowDefinition
  readonly?: boolean
  showMinimap?: boolean
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

const emits = defineEmits<{
  nodeChange: [nodes: WorkflowNode[]]
  edgeChange: [edges: WorkflowEdge[]]
  nodeSelect: [nodeId: string]
  nodeDelete: [nodeId: string]
  nodeDrop: [nodeType: WorkflowNodeType, x: number, y: number]
}>()

const containerRef = shallowRef<HTMLDivElement>()
const lf = shallowRef<LogicFlow | null>(null)

function normalizeNodeType(type: any): WorkflowNodeType {
  if (type === 'start' || type === 'approval' || type === 'cc' || type === 'condition' || type === 'end')
    return type
  return 'approval'
}

function getTextValue(text: any): string {
  if (typeof text === 'string')
    return text
  if (text && typeof text.value === 'string')
    return text.value
  return ''
}

function toGraphData(definition: WorkflowDefinition) {
  const nodes: GraphNode[] = definition.nodes.map(node => ({
    id: node.id,
    type: 'rect',
    x: node.position?.x ?? 100,
    y: node.position?.y ?? 100,
    text: node.name,
    properties: {
      ...node,
      type: node.type,
    },
  }))

  const edges: GraphEdge[] = definition.edges.map(edge => ({
    id: edge.id,
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
    text: edge.label ?? '',
    properties: {
      conditionId: edge.conditionId,
      style: edge.style,
    },
  }))

  return { nodes, edges }
}

function toWorkflowDefinition(graphData: any): WorkflowDefinition {
  const nodes: WorkflowNode[] = (graphData?.nodes ?? []).map((node: any) => {
    const properties = (node.properties ?? {}) as Partial<WorkflowNode> & { type?: WorkflowNodeType }
    return {
      id: node.id,
      type: normalizeNodeType(properties.type),
      name: properties.name ?? (getTextValue(node.text) || '节点'),
      description: properties.description,
      handler: properties.handler,
      formSchemaId: properties.formSchemaId,
      conditions: properties.conditions,
      position: { x: Number(node.x) || 0, y: Number(node.y) || 0 },
      className: properties.className,
      enabled: properties.enabled ?? true,
      timeout: properties.timeout,
      autoPassOnTimeout: properties.autoPassOnTimeout,
      formPermissions: properties.formPermissions,
    }
  })

  const edges: WorkflowEdge[] = (graphData?.edges ?? []).map((edge: any, index: number) => ({
    id: edge.id || `edge-${index}`,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    label: getTextValue(edge.text) || undefined,
    conditionId: edge.properties?.conditionId,
    style: edge.properties?.style,
  }))

  return {
    id: props.definition.id,
    name: props.definition.name,
    description: props.definition.description,
    status: props.definition.status,
    nodes,
    edges,
    formSchemaId: props.definition.formSchemaId,
    createdBy: props.definition.createdBy,
    createdAt: props.definition.createdAt,
    updatedBy: props.definition.updatedBy,
    updatedAt: props.definition.updatedAt,
    version: props.definition.version,
  }
}

function emitGraphChange() {
  const graphData = (lf.value as any)?.getGraphData?.()
  const definition = toWorkflowDefinition(graphData)
  emits('nodeChange', definition.nodes)
  emits('edgeChange', definition.edges)
}

function renderDefinition(definition: WorkflowDefinition) {
  if (!lf.value)
    return
  ;(lf.value as any).render(toGraphData(definition))
}

function addNode(node: WorkflowNode) {
  if (!lf.value)
    return
  ;(lf.value as any).addNode({
    id: node.id,
    type: 'rect',
    x: node.position?.x ?? 100,
    y: node.position?.y ?? 100,
    text: node.name,
    properties: {
      ...node,
      type: node.type,
    },
  })
  emitGraphChange()
}

function startDrag(nodeConfig: Record<string, any>) {
  const dnd = (lf.value as any)?.dnd
  dnd?.startDrag?.(nodeConfig)
}

function getDefinition(): WorkflowDefinition {
  const graphData = (lf.value as any)?.getGraphData?.() ?? { nodes: [], edges: [] }
  return toWorkflowDefinition(graphData)
}

function deleteNode(nodeId: string) {
  ;(lf.value as any)?.deleteNode?.(nodeId)
  emitGraphChange()
}

function updateNode(node: WorkflowNode) {
  if (!lf.value)
    return
  ;(lf.value as any).updateText?.(node.id, node.name)
  ;(lf.value as any).setProperties?.(node.id, {
    ...node,
    type: node.type,
  })
  if (node.position) {
    ;(lf.value as any).moveNode?.(node.id, node.position.x, node.position.y)
  }
  emitGraphChange()
}

onMounted(() => {
  if (!containerRef.value)
    return

  lf.value = new LogicFlow({
    container: containerRef.value,
    grid: props.showGrid ? { size: 20, type: 'dot' } : false,
    stopScrollCanvas: true,
    stopRenderNodeShape: false,
    edgeTextDraggable: true,
    clipboard: {
      enabled: true,
    },
  })

  ;(lf.value as any).use(DndPanel)
  ;(lf.value as any).use(SelectionSelect)
  ;(lf.value as any).use(Menu)
  ;(lf.value as any).use(Control)
  if (props.showMinimap) {
    ;(lf.value as any).use(MiniMap)
  }

  ;(lf.value as any).on('node:mouseup', () => {
    emitGraphChange()
  })

  ;(lf.value as any).on('edge:add', () => {
    emitGraphChange()
  })

  ;(lf.value as any).on('edge:delete', () => {
    emitGraphChange()
  })

  ;(lf.value as any).on('node:click', ({ data }: any) => {
    emits('nodeSelect', data?.id ?? '')
  })

  ;(lf.value as any).on('graph:click', () => {
    emits('nodeSelect', '')
  })

  ;(lf.value as any).on('node:delete', ({ data }: any) => {
    emits('nodeDelete', data?.id ?? '')
    emitGraphChange()
  })

  ;(lf.value as any).on('node:dnd-add', ({ data }: any) => {
    const nodeType = normalizeNodeType(data?.properties?.type)
    emits('nodeDrop', nodeType, Number(data?.x) || 0, Number(data?.y) || 0)
    emitGraphChange()
  })

  renderDefinition(props.definition)
})

watch(
  () => props.definition,
  (newDefinition) => {
    renderDefinition(newDefinition)
  },
  { deep: true },
)

watch(
  () => props.readonly,
  (readonly) => {
    ;(lf.value as any)?.updateEditConfig?.({
      isSilentMode: readonly,
      stopMoveGraph: readonly,
      stopMoveNode: readonly,
      stopZoomGraph: false,
      adjustEdge: !readonly,
      adjustNodePosition: !readonly,
      hideAnchors: readonly,
      allowRotate: false,
      allowResize: false,
    })
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  ;(lf.value as any)?.destroy?.()
})

defineExpose({
  addNode,
  startDrag,
  getDefinition,
  deleteNode,
  updateNode,
})
</script>

<template>
  <div ref="containerRef" class="workflow-canvas" style="width: 100%; height: 800px; background: #fafafa;" />
</template>

<style scoped>
:deep(.lf-container) {
  background: transparent;
}
</style>
