/**
 * @file useWorkflowRuntime.ts
 * @description 审批流程图运行态状态映射 + 自动分层布局
 * 输入流程定义与审批记录，输出每个节点的着色状态和渲染坐标。
 * - completed / current / pending / rejected 四种节点状态
 * - position 缺失时按 BFS 深度分列、同层纵向排布兜底
 * - definition 缺失时由调用方降级到时间线
 */
import { computed, type Ref } from 'vue'
import type { ApprovalTrailItem } from '@/api/types'
import type { WorkflowDefinition, WorkflowEdge, WorkflowNode } from '@/types/workflow'

export type RuntimeNodeStatus = 'completed' | 'current' | 'pending' | 'rejected'

/** 运行态图所依赖的最小审批实例结构，保持对 ApprovalRecord / ApprovalDetail 双来源兼容 */
export interface RuntimeTaskLike {
  nodeId?: string
  status?: string
}

export interface RuntimeWorkflowInstanceLike {
  currentNodeId?: string
  tasks?: RuntimeTaskLike[]
}

export interface RuntimeApprovalLike {
  status?: string
  workflowInstance?: RuntimeWorkflowInstanceLike
  operatorTrail?: ApprovalTrailItem[]
}

export interface RuntimeLayoutNode {
  id: string
  node: WorkflowNode
  status: RuntimeNodeStatus
  position: { x: number, y: number }
}

export interface WorkflowRuntime {
  hasDefinition: Ref<boolean>
  statusMap: Ref<Record<string, RuntimeNodeStatus>>
  layout: Ref<Record<string, { x: number, y: number }>>
  nodes: Ref<RuntimeLayoutNode[]>
  edges: Ref<WorkflowEdge[]>
  currentNodeId: Ref<string | undefined>
  fallbackTrail: Ref<ApprovalTrailItem[]>
}

const COMPLETED_TASK_STATUS = new Set(['approved', 'auto-closed'])
const ACTIVE_TASK_STATUS = new Set(['pending', 'processing'])

/** 已进入终态的审批实例，其可达节点视为已完成（start→可达边遍历） */
export function resolveReachableNodeIds(
  definition: WorkflowDefinition,
  approval: RuntimeApprovalLike,
): Set<string> {
  const forward = new Map<string, string[]>()
  const reverse = new Map<string, string[]>()

  for (const edge of definition.edges) {
    const fwd = forward.get(edge.source) ?? []
    fwd.push(edge.target)
    forward.set(edge.source, fwd)

    const rev = reverse.get(edge.target) ?? []
    rev.push(edge.source)
    reverse.set(edge.target, rev)
  }

  const status = approval.status
  const currentNodeId = approval.workflowInstance?.currentNodeId
  const result = new Set<string>()

  if (status === 'approved') {
    const starts = definition.nodes
      .filter(node => node.type === 'start' || (reverse.get(node.id)?.length ?? 0) === 0)
      .map(node => node.id)

    const queue = [...starts]
    while (queue.length > 0) {
      const id = queue.shift()!
      if (result.has(id))
        continue
      result.add(id)
      for (const next of forward.get(id) ?? [])
        queue.push(next)
    }
  }
  else if (currentNodeId) {
    // 运行中：从当前节点反向收集已走过的祖先路径
    const queue = [currentNodeId]
    while (queue.length > 0) {
      const id = queue.shift()!
      if (result.has(id))
        continue
      result.add(id)
      for (const source of reverse.get(id) ?? [])
        queue.push(source)
    }
  }

  return result
}

/** 流程定义缺失时返回空映射，调用方应降级为时间线 */
export function resolveNodeStatuses(
  definition: WorkflowDefinition | undefined | null,
  approval: RuntimeApprovalLike | undefined | null,
): Record<string, RuntimeNodeStatus> {
  const statusMap: Record<string, RuntimeNodeStatus> = {}
  if (!definition || !approval) {
    return statusMap
  }

  const status = approval.status
  const currentNodeId = approval.workflowInstance?.currentNodeId
  const tasks = approval.workflowInstance?.tasks ?? []

  const tasksByNode = new Map<string, RuntimeTaskLike[]>()
  for (const task of tasks) {
    if (!task.nodeId)
      continue
    const list = tasksByNode.get(task.nodeId) ?? []
    list.push(task)
    tasksByNode.set(task.nodeId, list)
  }

  const visited = resolveReachableNodeIds(definition, approval)

  for (const node of definition.nodes) {
    const nodeTasks = tasksByNode.get(node.id) ?? []
    const hasRejectedTask = nodeTasks.some(task => task.status === 'rejected')
    const hasActiveTask = nodeTasks.some(task => !!task.status && ACTIVE_TASK_STATUS.has(task.status))
    const allTasksDone = nodeTasks.length > 0
      && nodeTasks.every(task => !!task.status && COMPLETED_TASK_STATUS.has(task.status))

    const isRejected = status === 'rejected' && (currentNodeId === node.id || hasRejectedTask)

    let isCurrent = false
    if (status === 'pending') {
      const hasAnyActiveTask = tasks.some(task => !!task.status && ACTIVE_TASK_STATUS.has(task.status))
      if (hasAnyActiveTask) {
        // 有真实待处理任务时，以任务所在节点为准（避免把无任务的 condition/cc 误判为当前）
        isCurrent = hasActiveTask
      }
      else {
        isCurrent = currentNodeId === node.id
      }
    }

    if (isRejected) {
      statusMap[node.id] = 'rejected'
      continue
    }
    if (isCurrent) {
      statusMap[node.id] = 'current'
      continue
    }
    if (visited.has(node.id) || allTasksDone) {
      statusMap[node.id] = 'completed'
      continue
    }
    statusMap[node.id] = 'pending'
  }

  return statusMap
}

const LAYOUT = {
  nodeWidth: 168,
  nodeHeight: 64,
  gapX: 76,
  gapY: 34,
  marginX: 48,
  marginY: 48,
} as const

/** BFS 深度分层：start / 无入边节点为第 0 层，同层纵向排布并居中 */
export function buildLayeredLayout(definition: WorkflowDefinition): Record<string, { x: number, y: number }> {
  const forward = new Map<string, string[]>()
  const reverse = new Map<string, string[]>()

  for (const edge of definition.edges) {
    const fwd = forward.get(edge.source) ?? []
    fwd.push(edge.target)
    forward.set(edge.source, fwd)

    const rev = reverse.get(edge.target) ?? []
    rev.push(edge.source)
    reverse.set(edge.target, rev)
  }

  const layer = new Map<string, number>()
  const queue: string[] = definition.nodes
    .filter(node => node.type === 'start' || (reverse.get(node.id)?.length ?? 0) === 0)
    .map(node => node.id)

  for (const id of queue)
    layer.set(id, 0)

  while (queue.length > 0) {
    const id = queue.shift()!
    const current = layer.get(id) ?? 0
    for (const next of forward.get(id) ?? []) {
      if (layer.has(next))
        continue
      layer.set(next, current + 1)
      queue.push(next)
    }
  }

  // 未被图遍历覆盖的孤立节点，统一放到第 0 层兜底
  for (const node of definition.nodes) {
    if (!layer.has(node.id)) {
      layer.set(node.id, 0)
    }
  }

  const nodesByLayer = new Map<number, string[]>()
  for (const [id, depth] of layer) {
    const list = nodesByLayer.get(depth) ?? []
    list.push(id)
    nodesByLayer.set(depth, list)
  }

  const maxInLayer = Math.max(1, ...Array.from(nodesByLayer.values()).map(list => list.length))
  const columnHeight = LAYOUT.nodeHeight + LAYOUT.gapY

  const result: Record<string, { x: number, y: number }> = {}
  for (const [depth, ids] of nodesByLayer) {
    const offsetY = ((maxInLayer - ids.length) * columnHeight) / 2
    ids.forEach((id, index) => {
      result[id] = {
        x: LAYOUT.marginX + depth * (LAYOUT.nodeWidth + LAYOUT.gapX) + LAYOUT.nodeWidth / 2,
        y: LAYOUT.marginY + offsetY + index * columnHeight + LAYOUT.nodeHeight / 2,
      }
    })
  }

  return result
}

/** 节点坐标：definition 全部带 position 时沿用设计器坐标，否则自动分层 */
export function resolveNodeLayout(definition: WorkflowDefinition): Record<string, { x: number, y: number }> {
  const hasAllPositions = definition.nodes.length > 0
    && definition.nodes.every(node => !!node.position)

  if (hasAllPositions) {
    const result: Record<string, { x: number, y: number }> = {}
    for (const node of definition.nodes) {
      result[node.id] = {
        x: node.position!.x,
        y: node.position!.y,
      }
    }
    return result
  }

  return buildLayeredLayout(definition)
}

export function useWorkflowRuntime(
  definition: Ref<WorkflowDefinition | undefined | null>,
  approval: Ref<RuntimeApprovalLike | undefined | null>,
): WorkflowRuntime {
  const hasDefinition = computed(() => !!definition.value && definition.value.nodes.length > 0)

  const statusMap = computed<Record<string, RuntimeNodeStatus>>(() => {
    if (!hasDefinition.value)
      return {}
    return resolveNodeStatuses(definition.value, approval.value)
  })

  const layout = computed<Record<string, { x: number, y: number }>>(() => {
    if (!hasDefinition.value)
      return {}
    const def = definition.value as WorkflowDefinition
    return resolveNodeLayout(def)
  })

  const nodes = computed<RuntimeLayoutNode[]>(() => {
    if (!hasDefinition.value)
      return []
    const def = definition.value as WorkflowDefinition
    return def.nodes.map(node => ({
      id: node.id,
      node,
      status: statusMap.value[node.id] ?? 'pending',
      position: layout.value[node.id] ?? { x: 0, y: 0 },
    }))
  })

  const edges = computed<WorkflowEdge[]>(() => {
    if (!hasDefinition.value)
      return []
    return (definition.value as WorkflowDefinition).edges
  })

  const currentNodeId = computed(() => approval.value?.workflowInstance?.currentNodeId)
  const fallbackTrail = computed(() => approval.value?.operatorTrail ?? [])

  return {
    hasDefinition,
    statusMap,
    layout,
    nodes,
    edges,
    currentNodeId,
    fallbackTrail,
  }
}