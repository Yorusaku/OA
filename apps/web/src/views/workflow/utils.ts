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
 * 获取默认节点位置（固定在视口左上角附近，防止越界）
 */
export function getDefaultPosition(_nodes: WorkflowNode[]): { x: number, y: number } {
  // 🚀 固定在左上角 (100, 100) 附近随机偏移，确保节点永远落在可视区域
  return {
    x: 100 + Math.floor(Math.random() * 50),
    y: 100 + Math.floor(Math.random() * 50),
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
