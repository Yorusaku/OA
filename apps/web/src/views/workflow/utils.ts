import type { WorkflowNode } from '@/types/workflow'
import { nanoid } from 'nanoid'

/**
 * 生成唯一 ID
 */
export function generateId(prefix: string): string {
  return `${prefix}-${nanoid(8)}`
}

/**
 * 获取默认节点名称
 */
export function getDefaultNodeName(type: WorkflowNode['type']): string {
  const names: Record<WorkflowNode['type'], string> = {
    start: '发起节点',
    approval: '审批节点',
    cc: '抄送节点',
    condition: '条件分支',
    end: '结束节点',
  }
  return names[type] || '节点'
}

/**
 * 获取默认节点位置
 */
export function getDefaultPosition(nodes: WorkflowNode[]): { x: number, y: number } {
  const baseY = 100
  const spacing = 200
  const nextIndex = nodes.filter(n => n.type !== 'start').length

  return {
    x: 400,
    y: baseY + nextIndex * spacing,
  }
}

/**
 * 创建默认工作流节点
 */
export function createDefaultNodes() {
  const startNode: WorkflowNode = {
    id: generateId('start'),
    type: 'start',
    name: '发起节点',
    description: '流程发起人',
    position: { x: 400, y: 100 },
    enabled: true,
  }

  const endNode: WorkflowNode = {
    id: generateId('end'),
    type: 'end',
    name: '结束节点',
    description: '流程结束',
    position: { x: 400, y: 500 },
    enabled: true,
  }

  return [startNode, endNode]
}
