import { describe, expect, it } from 'vitest'
import { createInitialState } from '../src/state'
import type { WorkflowDefinition } from '../src/domain'
import { submitApproval, processApproval } from '../src/services/approval-service'

/** 构建含条件分支 + 多审批节点的测试流程 */
function buildBranchWorkflow(overrides?: Partial<WorkflowDefinition>): WorkflowDefinition {
  const workflow: WorkflowDefinition = {
    id: 'wf-test-branch',
    name: '分支测试流程',
    description: '条件路由测试',
    status: 'active',
    nodes: [
      { id: 'n-start', type: 'start', name: '发起' },
      {
        id: 'n-cond',
        type: 'condition',
        name: '金额判断',
        conditions: [
          { field: 'amount', operator: 'gte', value: 5000 },
        ],
      },
      { id: 'n-manager', type: 'approval', name: '经理审批', handler: { type: 'user', mode: 'or', assignees: [{ id: 'user-001', name: 'admin' }] } },
      { id: 'n-dir', type: 'approval', name: '总监审批', handler: { type: 'user', mode: 'or', assignees: [{ id: 'user-002', name: 'manager' }] } },
      { id: 'n-end', type: 'end', name: '结束' },
    ],
    edges: [
      { id: 'e0', source: 'n-start', target: 'n-cond' },
      // condition 命中（第一条出边）→ 经理；未命中（第二条出边，默认分支）→ 总监
      { id: 'e1', source: 'n-cond', target: 'n-manager' },
      { id: 'e2', source: 'n-cond', target: 'n-dir' },
      { id: 'e3', source: 'n-manager', target: 'n-dir' },
      { id: 'e4', source: 'n-dir', target: 'n-end' },
    ],
    ...overrides,
  }
  return workflow
}

function buildStateWithWorkflow(workflow?: WorkflowDefinition) {
  const state = createInitialState()
  if (workflow)
    state.workflows.unshift(workflow)
  return state
}

/** 多节点链式流程（无 condition） */
function buildChainWorkflow(): WorkflowDefinition {
  return {
    id: 'wf-test-chain',
    name: '链式流程',
    status: 'active',
    nodes: [
      { id: 'c-start', type: 'start', name: '发起' },
      { id: 'c-a', type: 'approval', name: '一级审批', handler: { type: 'user', mode: 'or', assignees: [{ id: 'user-001', name: 'admin' }] } },
      { id: 'c-b', type: 'approval', name: '二级审批', handler: { type: 'user', mode: 'and', assignees: [{ id: 'user-001', name: 'admin' }, { id: 'user-002', name: 'manager' }] } },
      { id: 'c-end', type: 'end', name: '结束' },
    ],
    edges: [
      { id: 'ce0', source: 'c-start', target: 'c-a' },
      { id: 'ce1', source: 'c-a', target: 'c-b' },
      { id: 'ce2', source: 'c-b', target: 'c-end' },
    ],
  }
}

describe('workflow advancement engine', () => {
  it('发起时按表单数据在起始 condition 路由：金额命中走经理节点', () => {
    const state = buildStateWithWorkflow(buildBranchWorkflow())
    const record = submitApproval(state, {
      title: '大额采购', type: 'branch', applicant: '张三', formData: { amount: 8000 },
    } as any)
    expect(record.workflowInstance?.currentNodeId).toBe('n-manager')
    expect(record.currentNodeName).toBe('经理审批')
  })

  it('发起时金额未命中走默认分支（总监节点）', () => {
    const state = buildStateWithWorkflow(buildBranchWorkflow())
    const record = submitApproval(state, {
      title: '小额采购', type: 'branch', applicant: '张三', formData: { amount: 2000 },
    } as any)
    expect(record.workflowInstance?.currentNodeId).toBe('n-dir')
    expect(record.currentNodeName).toBe('总监审批')
  })

  it('审批通过后沿图推进到下一审批节点（仍 pending，不直接完结）', () => {
    const state = buildStateWithWorkflow(buildChainWorkflow())
    const record = submitApproval(state, {
      title: '链式审批', type: 'chain', applicant: '张三',
    } as any)
    expect(record.workflowInstance?.currentNodeId).toBe('c-a')

    const after = processApproval(state, {
      id: record.id, action: 'approve', operatorId: 'user-001', operatorName: 'admin',
    })
    expect(after.status).toBe('pending')
    expect(after.workflowInstance?.currentNodeId).toBe('c-b')
    expect(after.currentNodeName).toBe('二级审批')
    // 一级节点任务应已关闭（当前处理人任务为 approved）
    const firstTask = after.workflowInstance?.tasks?.find(t => t.nodeId === 'c-a')
    expect(firstTask?.status).toBe('approved')
    // 新节点应生成待办任务
    const secondTasks = after.workflowInstance?.tasks?.filter(t => t.nodeId === 'c-b')
    expect(secondTasks?.length).toBe(2)
  })

  it('多节点推进后最后节点通过才置为 approved', () => {
    const state = buildStateWithWorkflow(buildChainWorkflow())
    const record = submitApproval(state, {
      title: '链式审批', type: 'chain', applicant: '张三',
    } as any)

    processApproval(state, { id: record.id, action: 'approve', operatorId: 'user-001', operatorName: 'admin' })
    // 二级节点为 and（会签），一人通过不结束
    const afterOne = processApproval(state, { id: record.id, action: 'approve', operatorId: 'user-001', operatorName: 'admin' })
    expect(afterOne.status).toBe('pending')
    expect(afterOne.workflowInstance?.currentNodeId).toBe('c-b')

    // 第二人会签通过 → 流程完结
    const afterAll = processApproval(state, { id: record.id, action: 'approve', operatorId: 'user-002', operatorName: 'manager' })
    expect(afterAll.status).toBe('approved')
    expect(afterAll.workflowInstance?.currentNodeId).toBe('c-b')
  })

  it('驳回在任意节点立即终止', () => {
    const state = buildStateWithWorkflow(buildChainWorkflow())
    const record = submitApproval(state, {
      title: '链式审批', type: 'chain', applicant: '张三',
    } as any)
    const after = processApproval(state, { id: record.id, action: 'reject', operatorId: 'user-001', operatorName: 'admin' })
    expect(after.status).toBe('rejected')
  })

  it('无流程定义时保持旧行为（直接完结，不抛错）', () => {
    const state = buildStateWithWorkflow(undefined)
    const record = submitApproval(state, {
      title: '无定义审批', type: 'not-exist', applicant: '张三',
    } as any)
    const after = processApproval(state, { id: record.id, action: 'approve', operatorId: 'user-001', operatorName: 'admin' })
    expect(after.status).toBe('approved')
  })

  it('条件分支命中路径上经过的节点正确推进', () => {
    const state = buildStateWithWorkflow(buildBranchWorkflow())
    const record = submitApproval(state, {
      title: '大额采购', type: 'branch', applicant: '张三', formData: { amount: 8000 },
    } as any)
    expect(record.workflowInstance?.currentNodeId).toBe('n-manager')

    const after = processApproval(state, { id: record.id, action: 'approve', operatorId: 'user-001', operatorName: 'admin' })
    expect(after.status).toBe('pending')
    expect(after.workflowInstance?.currentNodeId).toBe('n-dir')

    const done = processApproval(state, { id: record.id, action: 'approve', operatorId: 'user-002', operatorName: 'manager' })
    expect(done.status).toBe('approved')
  })
})