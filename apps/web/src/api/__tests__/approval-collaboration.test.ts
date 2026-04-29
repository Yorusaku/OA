import { beforeEach, describe, expect, it } from 'vitest'
import { __resetApprovalRuntimeState, getApprovalList, processApproval } from '../approval'
import { mockApprovalRecords } from '../mock'
import type { ApprovalRecord } from '../types'

const ORIGINAL_RECORDS: ApprovalRecord[] = JSON.parse(JSON.stringify(mockApprovalRecords))

function resetMockRecords() {
  const snapshot: ApprovalRecord[] = JSON.parse(JSON.stringify(ORIGINAL_RECORDS))
  mockApprovalRecords.splice(0, mockApprovalRecords.length, ...snapshot)
}

describe('approval collaboration engine', () => {
  beforeEach(() => {
    resetMockRecords()
    __resetApprovalRuntimeState()
  })

  it('and 模式：首人通过后保持 pending 且进度递增', async () => {
    const result = await processApproval({
      id: 'APPROVE-20260228-001',
      action: 'approve',
      operatorId: 'user-001',
      operatorName: 'admin',
    })

    expect(result.status).toBe('pending')
    expect(result.workflowInstance?.currentNodeMode).toBe('and')
    expect(result.workflowInstance?.progress).toEqual({
      completed: 1,
      total: 2,
    })
  })

  it('and 模式：全员通过后完成审批', async () => {
    await processApproval({
      id: 'APPROVE-20260228-001',
      action: 'approve',
      operatorId: 'user-001',
      operatorName: 'admin',
    })
    const result = await processApproval({
      id: 'APPROVE-20260228-001',
      action: 'approve',
      operatorId: 'user-002',
      operatorName: 'manager',
    })

    expect(result.status).toBe('approved')
    expect(result.currentNodeName).toBe('审批完成')
  })

  it('and 模式：任一驳回后整体驳回', async () => {
    const result = await processApproval({
      id: 'APPROVE-20260228-001',
      action: 'reject',
      operatorId: 'user-002',
      operatorName: 'manager',
    })

    expect(result.status).toBe('rejected')
    const tasks = result.workflowInstance?.tasks || []
    expect(tasks.some(task => task.taskStatus === 'auto-closed')).toBe(true)
  })

  it('or 模式：任一通过后完成并关闭其余任务', async () => {
    const result = await processApproval({
      id: 'APPROVE-20260228-002',
      action: 'approve',
      operatorId: 'user-001',
      operatorName: 'admin',
    })

    expect(result.status).toBe('approved')
    const managerTask = result.workflowInstance?.tasks?.find(task => task.handlerId === 'user-002')
    expect(managerTask?.taskStatus).toBe('auto-closed')
  })

  it('or 模式：部分驳回保持 pending，全部驳回后结束', async () => {
    const partial = await processApproval({
      id: 'APPROVE-20260228-002',
      action: 'reject',
      operatorId: 'user-001',
      operatorName: 'admin',
    })
    expect(partial.status).toBe('pending')

    const final = await processApproval({
      id: 'APPROVE-20260228-002',
      action: 'reject',
      operatorId: 'user-002',
      operatorName: 'manager',
    })
    expect(final.status).toBe('rejected')
  })

  it('待办按 assigneeId 过滤仅返回我的 pending 任务', async () => {
    await processApproval({
      id: 'APPROVE-20260228-001',
      action: 'approve',
      operatorId: 'user-001',
      operatorName: 'admin',
    })

    const adminTodo = await getApprovalList({
      page: 1,
      pageSize: 20,
      assigneeId: 'user-001',
    })

    const managerTodo = await getApprovalList({
      page: 1,
      pageSize: 20,
      assigneeId: 'user-002',
    })

    expect(adminTodo.list.every(record =>
      (record.workflowInstance?.tasks || []).some(task =>
        task.handlerId === 'user-001' && (task.taskStatus === 'pending' || task.status === 'pending'),
      ),
    )).toBe(true)
    expect(managerTodo.list.some(record => record.id === 'APPROVE-20260228-001')).toBe(true)
    expect(adminTodo.list.some(record => record.id === 'APPROVE-20260228-001')).toBe(false)
  })
})
