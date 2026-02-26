<script setup lang="ts">
/**
 * WorkflowCanvas - 工作流画布组件
 * 基于 LogicFlow 2.x 实现流程编排画布
 * 核心原则：LogicFlow 实例不被 Vue 深度代理，使用普通变量存储
 */
import LogicFlow from '@logicflow/core'
import { DndPanel } from '@logicflow/extension'
import type { WorkflowDefinition, WorkflowEdge, WorkflowNode, WorkflowNodeType } from '@/types/workflow'
import { shallowRef, onMounted, onBeforeUnmount, watch } from 'vue'

// 引入 LogicFlow 样式（必须！否则画布会空白）
import '@logicflow/core/dist/index.css'

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
  /** 从外部拖拽节点到画布（新增节点） */
  nodeDrop: [type: WorkflowNode['type'], position: { x: number, y: number }]
}>()

// ==================== LogicFlow 实例 ====================
// 核心原则：使用普通变量，不被 Vue 深度代理
let lf: LogicFlow | null = null
const containerRef = shallowRef<HTMLElement | null>(null)

// 是否已初始化
let isInitialized = false

// ==================== 数据适配器 (Adapter) ====================

/**
 * 将 WorkflowDefinition 转换为 LogicFlow GraphData
 */
function toLogicFlowData(definition: WorkflowDefinition) {
  return {
    nodes: definition.nodes.map(node => ({
      id: node.id,
      type: 'rect',  // 使用标准矩形节点
      x: node.position?.x || 0,
      y: node.position?.y || 0,
      text: node.name,
      properties: { 
        ...node,
        nodeType: node.type  // 保存原始类型用于样式判断
      }
    })),
    edges: definition.edges.map(edge => ({
      id: edge.id,
      sourceNodeId: edge.source,  // ✅ 正确映射
      targetNodeId: edge.target,  // ✅ 正确映射
      type: 'polyline',           // 使用折线
      text: edge.label || '',
      properties: { ...edge }  // 保留完整业务数据
    }))
  }
}

/**
 * 将 LogicFlow GraphData 转换为 WorkflowDefinition
 * 注意：LogicFlow 导出的 text 可能是字符串或 { value: string } 对象
 */
function toWorkflowDefinition(graphData: ReturnType<typeof toLogicFlowData>): WorkflowDefinition {
  return {
    id: '',
    name: '',
    status: 'draft',
    nodes: graphData.nodes.map((node: any) => {
      // 兼容 text 可能是字符串或对象
      const textValue = typeof node.text === 'string' ? node.text : (node.text as any)?.value || ''
      const props = node.properties as WorkflowNode || {} as WorkflowNode
      return {
        ...props,
        id: node.id,
        type: (props.type || 'approval') as WorkflowNodeType,
        name: textValue,
        position: { x: node.x || 0, y: node.y || 0 }
      }
    }),
    edges: graphData.edges.map((edge: any) => {
      const textValue = typeof edge.text === 'string' ? edge.text : (edge.text as any)?.value || ''
      const props = edge.properties as WorkflowEdge || {} as WorkflowEdge
      return {
        ...props,
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        label: textValue
      }
    })
  }
}

/**
 * 根据节点类型获取样式
 */
function getNodeStyle(type: WorkflowNodeType) {
  const styleMap: Record<WorkflowNodeType, any> = {
    start: {
      fill: '#667eea',
      stroke: '#667eea',
      strokeWidth: 2,
      color: '#fff'
    },
    approval: {
      fill: '#ecf5ff',
      stroke: '#409eff',
      strokeWidth: 2,
      color: '#303133'
    },
    cc: {
      fill: '#f0f9ff',
      stroke: '#67c23a',
      strokeWidth: 2,
      color: '#303133'
    },
    condition: {
      fill: '#fdf6ec',
      stroke: '#e6a23c',
      strokeWidth: 2,
      color: '#303133'
    },
    end: {
      fill: '#f4f4f5',
      stroke: '#909399',
      strokeWidth: 2,
      color: '#303133'
    }
  }
  return styleMap[type] || styleMap.approval
}

/**
 * 应用节点样式
 */
function applyNodeStyle(nodeId: string, type: WorkflowNodeType, enabled?: boolean) {
  if (!lf) return
  
  const style = enabled === false ? getDisabledStyle() : getNodeStyle(type)
  lf.setElementStyle(nodeId, style)
}

/**
 * 获取禁用状态样式
 */
function getDisabledStyle() {
  return {
    fill: '#f5f7fa',
    stroke: '#dcdfe6',
    strokeWidth: 2,
    strokeDasharray: '3 3',
    opacity: 0.6,
    color: '#909399'
  }
}

// ==================== 对外暴露方法 ====================

/**
 * 添加节点
 */
function addNode(node: WorkflowNode) {
  if (props.readonly || !lf) return
  lf.addNode({
    id: node.id,
    type: 'rect',  // 使用标准矩形节点
    x: node.position?.x || 0,
    y: node.position?.y || 0,
    text: node.name,
    properties: { 
      ...node,
      nodeType: node.type  // 保存原始类型
    }
  })
  
  // 应用样式
  setTimeout(() => {
    applyNodeStyle(node.id, node.type, node.enabled)
  }, 0)
}

/**
 * 删除节点
 */
function deleteNode(nodeId: string) {
  if (props.readonly || !lf) return
  lf.deleteNode(nodeId)
}

/**
 * 更新节点属性
 */
function updateNode(node: WorkflowNode) {
  if (!lf) return
  
  console.log('🔄 updateNode called with:', node)
  
  // 更新节点属性
  lf.setProperties(node.id, { ...node })
  
  // 获取节点 model 并更新文本
  const model = lf.getNodeModelById(node.id)
  if (model) {
    console.log('🔄 Found model, updating text and style')
    // 更新文本
    if (model.setText) {
      model.setText(node.name)
    } else if (model.text) {
      model.text.value = node.name
    }
    
    // 应用样式（根据启用状态）
    applyNodeStyle(node.id, node.type, node.enabled)
  } else {
    console.error('❌ Model not found for node:', node.id)
  }
}

/**
 * 获取当前画布的工作流定义
 */
function getDefinition(): WorkflowDefinition {
  if (!lf) return props.definition
  const graphData = lf.getData()
  return toWorkflowDefinition(graphData)
}

/**
 * 开始拖拽（用于外部拖拽入场）
 * 注意：LogicFlow 2.x 通过 lf.dnd.startDrag 实现
 */
function startDrag(nodeConfig: { type: string, text?: string, properties?: any }) {
  console.log('🎨 WorkflowCanvas.startDrag called with:', nodeConfig)
  console.log('🎨 lf instance:', lf)
  console.log('🎨 lf.dnd:', lf?.dnd)
  
  if (!lf) {
    console.error('❌ LogicFlow instance is not initialized')
    return
  }
  
  if (!lf.dnd) {
    console.error('❌ lf.dnd is not available. Did you register DndPanel plugin?')
    return
  }
  
  // LogicFlow 2.x: 使用 lf.dnd.startDrag
  lf.dnd.startDrag({
    type: nodeConfig.type,
    text: nodeConfig.text,
    properties: nodeConfig.properties
  })
  
  console.log('✅ startDrag completed')
}

defineExpose({
  addNode,
  deleteNode,
  updateNode,
  getDefinition,
  startDrag
})

// ==================== 生命周期 ====================

onMounted(async () => {
  if (!containerRef.value) return

  // 动态导入 LogicFlow
  const { default: LogicFlowConstructor } = await import('@logicflow/core')

  // 初始化 LogicFlow 实例
  lf = new LogicFlowConstructor({
    container: containerRef.value,
    grid: {
      visible: props.showGrid,
      type: 'dot',
      size: 20
    },
    style: {
      rect: {
        rx: 8,
        ry: 8
      }
    },
    stopScrollZoom: false,
    stopMoveGraph: false,
    allowRotation: false,
    multipleSelectKey: 'shift',
    snapline: true,
    keyboard: {
      enabled: true
    },
    plugins: [DndPanel]
  })

  // 设置主题样式（根据节点类型）
  lf.setTheme({
    rect: {
      rx: 8,
      ry: 8,
      strokeWidth: 2
    },
    text: {
      color: '#303133',
      fontSize: 12
    }
  })

  // 渲染初始数据
  const graphData = toLogicFlowData(props.definition)
  lf.render(graphData)

  // 应用节点样式（渲染完成后）
  graphData.nodes.forEach(node => {
    const properties = node.properties as WorkflowNode
    if (properties?.type) {
      applyNodeStyle(node.id, properties.type, properties.enabled)
    }
  })

  // 绑定事件
  lf.on('node:click', ({ data, e }) => {
    console.log('🖱️ node:click event fired', data)
    const nodeData = data.properties as WorkflowNode
    console.log('🖱️ Emitting nodeSelect with:', nodeData)
    emit('nodeSelect', nodeData)
  })

  lf.on('edge:click', ({ data }) => {
    const edgeData = data.properties as WorkflowEdge
    if (edgeData) {
      emit('edgeChange', [edgeData])
    }
  })

  lf.on('node:dragend', () => {
    syncNodePositions()
  })

  lf.on('node:delete', ({ data }) => {
    emit('nodeDelete', data.id)
  })

  lf.on('edge:add', ({ data }) => {
    const edge: WorkflowEdge = {
      id: data.id,
      source: data.sourceNodeId,
      target: data.targetNodeId,
      label: typeof data.text === 'string' ? data.text : (data.text as any)?.value || ''
    }
    emit('edgeChange', [edge])
  })

  lf.on('edge:delete', () => {
    // 边删除时，通知父组件刷新数据
    if (lf) {
      const graphData = lf.getData()
      const edges = toWorkflowDefinition(graphData).edges
      emit('edgeChange', edges)
    }
  })

  lf.on('node:add', ({ data }) => {
    // 当通过 startDrag 添加节点时，通知父组件更新数据
    const properties = data.properties as WorkflowNode || {} as WorkflowNode
    const textValue = typeof data.text === 'string' ? data.text : (data.text as any)?.value || ''
    const node: WorkflowNode = {
      ...properties,
      id: data.id,
      type: (properties.type || 'approval') as WorkflowNodeType,
      name: textValue,
      position: { x: data.x || 0, y: data.y || 0 },
      enabled: true
    }
    emit('nodeDrop', node.type, node.position!)
  })

  isInitialized = true
})

onBeforeUnmount(() => {
  if (lf) {
    lf.destroy()
    lf = null
  }
})

// ==================== 同步节点位置 ====================

/**
 * 同步节点位置到父组件
 */
function syncNodePositions() {
  if (!lf) return
  const graphData = lf.getData()
  const nodes = graphData.nodes.map((node: any) => {
    const textValue = typeof node.text === 'string' ? node.text : (node.text as any)?.value || ''
    const props = node.properties as WorkflowNode || {} as WorkflowNode
    return {
      ...props,
      id: node.id,
      type: (props.type || 'approval') as WorkflowNodeType,
      name: textValue,
      position: { x: node.x || 0, y: node.y || 0 }
    }
  })
  emit('nodeChange', nodes)
}

// ==================== 监听 definition 变化 ====================

watch(
  () => props.definition,
  (newDef) => {
    if (!newDef || !lf || !isInitialized) return
    if (!newDef.nodes || !newDef.edges) return

    // 只在画布为空时初始化
    const currentData = lf.getData()
    if (currentData.nodes.length === 0 && currentData.edges.length === 0) {
      const graphData = toLogicFlowData(newDef)
      lf.render(graphData)
      // 样式由 WorkflowNodeModel 自动处理，无需手动设置
    }
  },
  { immediate: true }
)

// ==================== 只读模式 ====================

watch(
  () => props.readonly,
  (readonly) => {
    if (!lf) return
    // LogicFlow 没有直接的只读模式，需要禁用交互
    lf.updateConfiguration({
      stopMoveGraph: readonly,
      allowRotation: false
    })
  }
)
</script>

<template>
  <div ref="containerRef" class="workflow-canvas" style="width: 100%; height: 800px; background: #fafafa;"></div>
</template>

<style scoped>
.workflow-canvas {
  width: 100%;
  height: 100%;
  min-height: 600px;
  background: #f5f7fa;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

:deep(.lf-container) {
  background: transparent;
}

:deep(.lf-node) {
  cursor: pointer;
  transition: filter 0.3s ease;
}

:deep(.lf-node:hover) {
  filter: brightness(0.95);
}

:deep(.lf-edge) {
  cursor: pointer;
}

:deep(.lf-edge-text) {
  font-size: 12px;
  fill: #606266;
}

:deep(.lf-control) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

:deep(.lf-dnd) {
  position: absolute;
  z-index: 1000;
}
</style>
