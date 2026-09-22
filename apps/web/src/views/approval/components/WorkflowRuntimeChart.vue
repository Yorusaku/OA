<script setup lang="ts">
/**
 * WorkflowRuntimeChart - 审批流程图运行态只读渲染
 * 已走绿色 / 当前蓝色 / 待到达灰色 / 驳回红色；definition 缺失时降级为轨迹时间线。
 */
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import LogicFlow, { RectNode, RectNodeModel } from '@logicflow/core'
import type { WorkflowDefinition } from '@/types/workflow'
import {
  useWorkflowRuntime,
  type RuntimeApprovalLike,
  type RuntimeNodeStatus,
} from '@/composables/useWorkflowRuntime'
import '@logicflow/core/dist/index.css'

const props = withDefaults(defineProps<{
  definition?: WorkflowDefinition | null
  approval?: RuntimeApprovalLike | null
  height?: number
}>(), {
  definition: null,
  approval: null,
  height: 320,
})

const containerRef = shallowRef<HTMLDivElement | null>(null)
const lf = shallowRef<LogicFlow | null>(null)

const definitionRef = computed(() => props.definition)
const approvalRef = computed(() => props.approval)

const {
  hasDefinition,
  nodes,
  edges,
  fallbackTrail,
} = useWorkflowRuntime(definitionRef, approvalRef)

const STATUS_FILL: Record<RuntimeNodeStatus, { stroke: string, fill: string }> = {
  completed: { stroke: '#10b981', fill: '#ecfdf5' },
  current: { stroke: '#2563eb', fill: '#eff6ff' },
  pending: { stroke: '#cbd5e1', fill: '#f8fafc' },
  rejected: { stroke: '#ef4444', fill: '#fef2f2' },
}

const NODE_STATUS_LABEL: Record<RuntimeNodeStatus, string> = {
  completed: '已通过',
  current: '当前节点',
  pending: '待处理',
  rejected: '已驳回',
}

function buildGraphData() {
  return {
    nodes: nodes.value.map(node => ({
      id: node.id,
      type: 'runtime-node',
      x: node.position.x,
      y: node.position.y,
      text: node.node.name,
      properties: {
        ...node.node,
        __runtimeStatus: node.status,
      },
    })),
    edges: edges.value.map((edge, index) => ({
      id: edge.id || `runtime-edge-${index}`,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      text: edge.label ?? '',
      properties: {
        conditionId: edge.conditionId,
        style: edge.style,
      },
    })),
  }
}

function renderGraph() {
  if (!lf.value || !hasDefinition.value)
    return
  lf.value.render(buildGraphData())
  setTimeout(() => {
    try {
      ;(lf.value as any)?.fitView?.({ padding: 40 })
    }
    catch {
      // fitView 失败不阻塞渲染
    }
  }, 60)
}

function setupEditConfig() {
  if (!lf.value)
    return
  ;(lf.value as any)?.updateEditConfig?.({
    isSilentMode: true,
    stopMoveGraph: false,
    stopMoveNode: true,
    stopZoomGraph: false,
    hideAnchors: true,
    allowRotate: false,
    allowResize: false,
    adjustEdge: false,
    adjustNodePosition: false,
  })
}

function registerRuntimeNode() {
  if (!lf.value)
    return
  if (typeof RectNode !== 'function' || typeof RectNodeModel !== 'function')
    return

  const RuntimeNodeModel = class extends RectNodeModel {
    getNodeStyle() {
      const style = super.getNodeStyle()
      const status = (this.properties?.__runtimeStatus ?? 'pending') as RuntimeNodeStatus
      const colors = STATUS_FILL[status] ?? STATUS_FILL.pending
      style.stroke = colors.stroke
      style.fill = colors.fill
      return style
    }
  }

  lf.value.register({
    type: 'runtime-node',
    view: RectNode,
    model: RuntimeNodeModel,
  })
}

onMounted(() => {
  if (!containerRef.value)
    return

  lf.value = new LogicFlow({
    container: containerRef.value,
    grid: false,
    stopScrollCanvas: false,
    stopRenderNodeShape: false,
    edgeTextDraggable: false,
    clipboard: false as any,
  })

  registerRuntimeNode()
  setupEditConfig()
  renderGraph()
})

watch(
  [hasDefinition, nodes, edges],
  () => {
    renderGraph()
  },
  { deep: true },
)

onBeforeUnmount(() => {
  ;(lf.value as any)?.destroy?.()
  lf.value = null
})
</script>

<template>
  <div class="workflow-runtime-chart">
    <div v-if="hasDefinition" class="runtime-chart-body">
      <div ref="containerRef" class="runtime-canvas" :style="{ height: `${height}px` }" />
      <div class="runtime-legend">
        <span v-for="(meta, key) in NODE_STATUS_LABEL" :key="key" class="legend-item">
          <i class="legend-dot" :class="`is-${key}`" />{{ meta }}
        </span>
      </div>
    </div>

    <div v-else class="fallback-timeline" :style="{ maxHeight: `${height}px` }">
      <el-timeline v-if="fallbackTrail.length">
        <el-timeline-item
          v-for="item in fallbackTrail"
          :key="item.id"
          :timestamp="item.operatedAt"
          placement="top"
        >
          <div class="fallback-item">
            <strong>{{ item.operatorName || '系统' }}</strong>
            <span class="fallback-action">{{ item.action }}</span>
            <p v-if="item.comment" class="fallback-comment">{{ item.comment }}</p>
          </div>
        </el-timeline-item>
      </el-timeline>
      <div v-else class="fallback-empty">暂无流程轨迹</div>
    </div>
  </div>
</template>

<style scoped>
.workflow-runtime-chart {
  width: 100%;
}

.runtime-chart-body {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
}

.runtime-canvas {
  width: 100%;
  background: #fff;
}

.runtime-legend {
  display: flex;
  gap: 16px;
  padding: 8px 12px;
  border-top: 1px solid #ebeef5;
  background: #fafafa;
  font-size: 12px;
  color: #606266;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.legend-dot.is-completed { background: #10b981; }
.legend-dot.is-current { background: #2563eb; }
.legend-dot.is-pending { background: #cbd5e1; }
.legend-dot.is-rejected { background: #ef4444; }

.fallback-timeline {
  overflow-y: auto;
  padding: 12px 4px;
}

.fallback-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
}

.fallback-action {
  color: #2563eb;
  font-size: 12px;
}

.fallback-comment {
  margin: 0;
  color: #909399;
}

.fallback-empty {
  padding: 24px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}
</style>