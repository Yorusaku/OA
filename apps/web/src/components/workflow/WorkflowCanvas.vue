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

const emits = defineEmits<{
  nodeChange: [nodes: WorkflowNode[]]
  edgeChange: [edges: WorkflowEdge[]]
  nodeSelect: [nodeId: string]
  nodeDelete: [nodeId: string]
  nodeDrop: [nodeType: WorkflowNodeType, x: number, y: number]
}>()

// ==================== LogicFlow 实例 ====================
const containerRef = shallowRef<HTMLDivElement>()
const lf = shallowRef<LogicFlow | null>(null)

// ==================== 初始化 LogicFlow ====================
onMounted(() => {
  if (!containerRef.value) return

  lf.value = new LogicFlow({
    container: containerRef.value,
    grid: {
      size: 20,
      type: 'dot',
      color: '#e6a23c',
    },
    stopScrollCanvas: true,
    stopRenderNodeShape: false,
    edgeTextDraggable: true,
    clipboard: {
      enabled: true,
    },
  })

  // 注册自定义节点
  lf.value.registerNodeShape('rect', 'custom-workflow-node', {
    model: CustomWorkflowNodeModel,
    view: CustomWorkflowNode,
  })

  // 启用插件
  lf.value.use(DndPanel)
  lf.value.use(SelectionSelect)
  lf.value.use(Menu)
  lf.value.use(Control)
  if (props.showMinimap) {
    lf.value.use(MiniMap)
  }

  // 监听事件
  lf.value.on('node:mouseup', ({ data }) => {
    emits('nodeChange', lf.value?.getNodes() || [])
  })

  lf.value.on('edge:update', ({ data }) => {
    emits('edgeChange', lf.value?.getEdges() || [])
  })

  lf.value.on('node:click', ({ nodeId }) => {
    emits('nodeSelect', nodeId)
  })

  lf.value.on('graph:click', () => {
    emits('nodeSelect', '')
  })

  lf.value.on('node:delete', ({ nodeId }) => {
    emits('nodeDelete', nodeId)
  })

  // 加载数据
  lf.value.render(props.definition)
})

// ==================== 销毁 LogicFlow ====================
onBeforeUnmount(() => {
  lf.value?.destroy()
})

// ==================== 监听 props 变化 ====================
watch(
  () => props.definition,
  (newDefinition) => {
    if (!lf.value) return
    lf.value.render(newDefinition)
  },
)

watch(
  () => props.readonly,
  (readonly) => {
    if (!lf.value) return
    // LogicFlow 没有直接的只读模式，需要禁用交互
    lf.value.updateConfiguration({
      stopMoveGraph: readonly,
      allowRotation: false,
    })
  },
)
</script>

<template>
  <div ref="containerRef" class="workflow-canvas" style="width: 100%; height: 800px; background: #fafafa;"></div>
</template>

<style scoped>
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
