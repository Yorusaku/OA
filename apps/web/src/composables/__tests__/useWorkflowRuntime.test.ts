import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import type { WorkflowDefinition } from '@/types/workflow'
import {
  buildLayeredLayout,
  resolveNodeLayout,
  resolveNodeStatuses,
  resolveReachableNodeIds,
  useWorkflowRuntime,
  type RuntimeApprovalLike,
} from '../useWorkflowRuntime'

function createBranchDefinition(): WorkflowDefinition {
  return {
    id: 'wf-branch',
    name: '分支流程',
    status: 'active',
    nodes: [
      { id: 'start', type: 'start', name: '发起' },
      { id: 'cond', type: 'condition', name: '金额判断' },
      { id: 'nodeA', type: 'approval', name: '经理审批' },
      { id: 'nodeB', type: 'approval', name: '总监审批' },
      { id: 'end', type: 'end', name: '结束' },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'cond' },
      { id: 'e2', source: 'cond', target: 'nodeA', label: '低金额' },
      { id: 'e3', source: 'cond', target: 'nodeB', label: '高金额' },
      { id: 'e4', source: 'nodeA', target: 'end' },
      { id: 'e5', source: 'nodeB', target: 'end' },
    ],
  }
}

function approval(overrides: Partial<RuntimeApprovalLike> = {}): RuntimeApprovalLike {
  return {
    status: 'pending',
    workflowInstance: {
      currentNodeId: 'nodeA',
      tasks: [
        { nodeId: 'nodeA', status: 'pending' },
      ],
    },
    operatorTrail: [],
    ...overrides,
  }
}

describe('resolveReachableNodeIds', () => {
  it('运行中：从当前节点反向收集祖先路径', () => {
    const def = createBranchDefinition()
    const visited = resolveReachableNodeIds(def, approval())
    expect(visited.has('nodeA')).toBe(true)
    expect(visited.has('cond')).toBe(true)
    expect(visited.has('start')).toBe(true)
    expect(visited.has('nodeB')).toBe(false)
    expect(visited.has('end')).toBe(false)
  })

  it('已通过：从 start 出发覆盖全可达节点', () => {
    const def = createBranchDefinition()
    const visited = resolveReachableNodeIds(def, approval({ status: 'approved' }))
    expect(visited.has('start')).toBe(true)
    expect(visited.has('cond')).toBe(true)
    expect(visited.has('nodeA')).toBe(true)
    expect(visited.has('nodeB')).toBe(true)
    expect(visited.has('end')).toBe(true)
  })
})

describe('resolveNodeStatuses', () => {
  it('definition 或 approval 缺失时返回空映射', () => {
    expect(resolveNodeStatuses(undefined, approval())).toEqual({})
    expect(resolveNodeStatuses(createBranchDefinition(), null)).toEqual({})
  })

  it('运行中：当前节点高亮、祖先已完成、旁支待处理', () => {
    const def = createBranchDefinition()
    const map = resolveNodeStatuses(def, approval())
    expect(map.start).toBe('completed')
    expect(map.cond).toBe('completed')
    expect(map.nodeA).toBe('current')
    expect(map.nodeB).toBe('pending')
    expect(map.end).toBe('pending')
  })

  it('已通过：可达节点全部置为 completed', () => {
    const def = createBranchDefinition()
    const map = resolveNodeStatuses(def, approval({ status: 'approved' }))
    expect(map.start).toBe('completed')
    expect(map.cond).toBe('completed')
    expect(map.nodeA).toBe('completed')
    expect(map.nodeB).toBe('completed')
    expect(map.end).toBe('completed')
  })

  it('已驳回：当前节点红色、祖先绿色、其余待处理', () => {
    const def = createBranchDefinition()
    const map = resolveNodeStatuses(def, approval({
      status: 'rejected',
      workflowInstance: { currentNodeId: 'nodeB', tasks: [{ nodeId: 'nodeB', status: 'rejected' }] },
    }))
    expect(map.start).toBe('completed')
    expect(map.cond).toBe('completed')
    expect(map.nodeA).toBe('pending')
    expect(map.nodeB).toBe('rejected')
    expect(map.end).toBe('pending')
  })

  it('会签节点：存在 pending 任务时即使非 currentNodeId 也视为当前节点', () => {
    const def = createBranchDefinition()
    const map = resolveNodeStatuses(def, approval({
      workflowInstance: {
        currentNodeId: 'cond',
        tasks: [
          { nodeId: 'nodeA', status: 'approved' },
          { nodeId: 'nodeA', status: 'pending' },
        ],
      },
    }))
    expect(map.nodeA).toBe('current')
    expect(map.cond).toBe('completed')
  })

  it('节点任务全部完成时即使不在祖先路径也视为 completed', () => {
    const def = createBranchDefinition()
    const map = resolveNodeStatuses(def, approval({
      workflowInstance: {
        currentNodeId: 'nodeA',
        tasks: [
          { nodeId: 'nodeA', status: 'approved' },
          { nodeId: 'nodeA', status: 'auto-closed' },
        ],
      },
    }))
    expect(map.nodeA).toBe('current')
    // 无 currentNodeId 场景：当前节点通过任务推断
    const map2 = resolveNodeStatuses(def, approval({
      workflowInstance: {
        currentNodeId: undefined,
        tasks: [{ nodeId: 'nodeA', status: 'approved' }],
      },
    }))
    expect(map2.nodeA).toBe('completed')
  })
})

describe('布局', () => {
  it('无 position 时按 BFS 分层：层间 x 递增、同层 y 纵向排布', () => {
    const def = createBranchDefinition()
    const layout = buildLayeredLayout(def)
    // 第 2 层（nodeA/nodeB）同 x
    expect(layout.nodeA.x).toBe(layout.nodeB.x)
    // 同层纵向：y 不等
    expect(layout.nodeA.y).not.toBe(layout.nodeB.y)
    // 层间 x 递增
    expect(layout.start.x).toBeLessThan(layout.cond.x)
    expect(layout.cond.x).toBeLessThan(layout.nodeA.x)
    expect(layout.nodeA.x).toBeLessThan(layout.end.x)
    // 起点/终点 x 具体值
    expect(layout.start.x).toBeCloseTo(132, 0)
    expect(layout.end.x).toBeCloseTo(864, 0)
  })

  it('resolveNodeLayout：全部带 position 时沿用设计器坐标', () => {
    const def = createBranchDefinition()
    def.nodes.forEach((node, index) => {
      node.position = { x: 100 + index * 10, y: 200 }
    })
    const layout = resolveNodeLayout(def)
    expect(layout.start.x).toBe(100)
    expect(layout.end.x).toBe(140)
  })

  it('resolveNodeLayout：position 缺失时回退分层布局', () => {
    const layout = resolveNodeLayout(createBranchDefinition())
    expect(layout.start.x).toBeCloseTo(132, 0)
  })
})

describe('useWorkflowRuntime', () => {
  it('definition 缺失时 hasDefinition=false 且 nodes 为空、fallbackTrail 保留轨迹', () => {
    const runtime = useWorkflowRuntime(
      ref(undefined),
      ref<RuntimeApprovalLike>(approval({ operatorTrail: [{ id: 't1', action: 'create', status: 'pending', operatorName: '张三', operatedAt: '2026-01-01' }] })),
    )
    expect(runtime.hasDefinition.value).toBe(false)
    expect(runtime.nodes.value).toEqual([])
    expect(runtime.edges.value).toEqual([])
    expect(runtime.fallbackTrail.value.length).toBe(1)
  })

  it('definition 就绪时输出节点状态与坐标', () => {
    const runtime = useWorkflowRuntime(ref(createBranchDefinition()), ref(approval()))
    expect(runtime.hasDefinition.value).toBe(true)
    expect(runtime.currentNodeId.value).toBe('nodeA')
    expect(runtime.nodes.value).toHaveLength(5)
    const nodeA = runtime.nodes.value.find(node => node.id === 'nodeA')
    expect(nodeA?.status).toBe('current')
    const nodeB = runtime.nodes.value.find(node => node.id === 'nodeB')
    expect(nodeB?.status).toBe('pending')
    expect(nodeA?.position.x).toBeGreaterThan(0)
    expect(runtime.edges.value).toHaveLength(5)
  })
})