<script setup lang="ts">
/**
 * WorkflowCanvas - 工作流画布组件
 * 基于 LogicFlow 2.x 实现流程编排画布
 * 核心原则：LogicFlow 实例不被 Vue 深度代理，使用普通变量存储
 */
import LogicFlow, { RectNode, RectNodeModel } from '@logicflow/core'
import { DndPanel, SelectionSelect, Menu, Control, MiniMap } from '@logicflow/extension'
import type { WorkflowDefinition, WorkflowEdge, WorkflowNode, WorkflowNodeType } from '@/types/workflow'
import { shallowRef, onMounted, onBeforeUnmount, watch } from 'vue'

// 引入 LogicFlow 样式（必须！否则画布会空白）
import '@logicflow/core/dist/index.css'
import '@logicflow/extension/lib/style/index.css' // 🚀 修复插件样式错乱

/**
 * 自定义工作流节点 Model
 * 重写 getNodeStyle 实现样式自动响应业务数据
 */
class CustomWorkflowNodeModel extends RectNodeModel {
  getNodeStyle() {
    const style = super.getNodeStyle()
    const properties = this.properties as any

    // 默认基础样式
    style.radius = 6
    style.strokeWidth = 2

    // 1. 根据业务类型设置颜色
    const type = properties?.type || 'approval'
    const styleMap: Record<string, any> = {
      start: { fill: '#ebf4ff', stroke: '#667eea' },
      approval: { fill: '#ecf5ff', stroke: '#409eff' },
      cc: { fill: '#f0f9eb', stroke: '#67c23a' },
      condition: { fill: '#fdf6ec', stroke: '#e6a23c' },
      end: { fill: '#f4f4f5', stroke: '#909399' }
    }
    
    const typeStyle = styleMap[type] || styleMap.approval
    style.fill = typeStyle.fill
    style.stroke = typeStyle.stroke

    // 2. 响应禁用状态
    if (properties?.enabled === false) {
      style.fill = '#f5f7fa'
      style.stroke = '#c0c4cc'
      style.strokeDasharray = '5 5'
    }

    return style
  }
}

/**
 * 自定义工作流节点 View
 */
class CustomWorkflowNode extends RectNode {}

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
      type: 'workflow-node',  // 🚀 使用自定义节点类型
      x: node.position?.x || 0,
      y: node.position?.y || 0,
      text: node.name,
      properties: { ...node }
    })) as any[],
    edges: definition.edges.map(edge => ({
      id: edge.id,
      sourceNodeId: edge.source,  // ✅ 正确映射
      targetNodeId: edge.target,  // ✅ 正确映射
      type: 'polyline',           // 使用折线
      text: edge.label || '',
      properties: { ...edge }
    })) as any[]
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

// ==================== 对外暴露方法 ====================

/**
 * 添加节点（深度克隆切断 Vue Proxy）
 */
function addNode(node: WorkflowNode) {
  if (props.readonly || !lf) return
  
  lf.addNode({
    id: node.id,
    type: 'workflow-node', // 🚀 使用自定义彩色节点类型
    x: node.position?.x || 100,
    y: node.position?.y || 100,
    text: node.name,
    // 🚀 深度克隆，彻底切断 Vue Proxy 代理，进行数据"脱水"
    properties: JSON.parse(JSON.stringify(node))
  })
  // ⚠️ 绝对不要在这里写 setTimeout 或者调用任何 applyNodeStyle 等旧函数！
}

/**
 * 删除节点
 */
function deleteNode(nodeId: string) {
  if (props.readonly || !lf) return
  lf.deleteNode(nodeId)
}

/**
 * 更新节点属性（深度克隆 + 安全隔离）
 */
function updateNode(node: WorkflowNode) {
  if (!lf) return
  
  // 1. 深度克隆，脱去 Proxy 外衣，防止破坏 LF 内部状态
  const pureNode = JSON.parse(JSON.stringify(node))
  
  // 2. 更新业务属性，LogicFlow 的 WorkflowNodeModel 会自动触发重绘颜色
  lf.setProperties(pureNode.id, pureNode)
  
  // 3. 必须使用原生专门的 API 更新文字视图
  lf.updateText(pureNode.id, pureNode.name)
}

/**
 * 获取当前画布的工作流定义
 */
function getDefinition(): WorkflowDefinition {
  if (!lf) return props.definition
  // 🚀 必须使用 getGraphData()，绝对不能用 getData()
  const graphData = lf.getGraphData() as { nodes: any[]; edges: any[] }
  return toWorkflowDefinition(graphData)
}

/**
 * 开始拖拽（用于外部拖拽入场）
 */
function startDrag(nodeConfig: { type: string, text?: string, properties?: any }) {
  if (!lf?.dnd) return
  
  // 🚀 强制使用 workflow-node 类型
  lf.dnd.startDrag({
    type: 'workflow-node',
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
    plugins: [DndPanel, SelectionSelect, Menu, Control, MiniMap]
  })

  // 🚀 注册自定义工作流节点
  lf.register({
    type: 'workflow-node',
    view: CustomWorkflowNode,
    model: CustomWorkflowNodeModel
  })

  // 设置主题样式
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

  // 🚀 根据 props 决定是否显示小地图（LogicFlow 2.x API）
  if (props.showMinimap) {
    const extensions = Object.values(lf.extension)
    const miniMap = extensions.find((ext: any) => ext?.name === 'mini-map') as any
    if (miniMap && typeof miniMap.show === 'function') {
      miniMap.show()
    }
  }

  // 绑定事件
  lf.on('node:click', ({ data }) => {
    // 🚀 深拷贝解构，防止外层右侧表单直接篡改 LF 内部内存对象
    const pureData = JSON.parse(JSON.stringify(data.properties))
    emit('nodeSelect', pureData as WorkflowNode)
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
      // 🚀 必须使用 getGraphData
      const graphData = lf.getGraphData() as { nodes: any[]; edges: any[] }
      const edges = toWorkflowDefinition(graphData).edges
      emit('edgeChange', edges)
    }
  })

  lf.on('node:add', () => {
    // 🚀 只做单向状态同步，绝不抛出 nodeDrop 造成循环调用！
    syncNodePositions()
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
  // 🚀 必须使用 getGraphData()，绝对不能用 getData()
  const graphData = lf.getGraphData() as { nodes: any[]; edges: any[] }
  const nodes = toWorkflowDefinition(graphData).nodes
  emit('nodeChange', nodes)
}

// ==================== 监听 definition 变化 ====================

watch(
  () => props.definition,
  (newDef) => {
    if (!newDef || !lf || !isInitialized) return
    if (!newDef.nodes || !newDef.edges) return

    // 只在画布为空时初始化
    const currentData = lf.getGraphData() as { nodes: any[]; edges: any[] }
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  background: #ffffff;
  padding: 4px;
}

:deep(.lf-mini-map) {
  position: absolute;
  bottom: 20px;
  right: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #ebeef5;
}

:deep(.lf-dnd) {
  position: absolute;
  z-index: 1000;
}
</style>
