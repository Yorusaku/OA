import { beforeEach, describe, expect, it } from 'vitest'
import { __resetApprovalRuntimeState, processApproval, submitApproval } from '../approval'
import { mockApprovalRecords } from '../mock'
import type { ApprovalRecord } from '../types'

const ORIGINAL_RECORDS: ApprovalRecord[] = JSON.parse(JSON.stringify(mockApprovalRecords))

function resetMockRecords() {
  const snapshot: ApprovalRecord[] = JSON.parse(JSON.stringify(ORIGINAL_RECORDS))
  mockApprovalRecords.splice(0, mockApprovalRecords.length, ...snapshot)
}

describe('mock 引擎：条件起始路由 + 多节点推进', () => {
  beforeEach(() => {
    resetMockRecords()
    __resetApprovalRuntimeState()
  })

  it('条件起始路由：预算 < 10000 命中默认出边 -> 财务审批', async () => {
    const record = await submitApproval({
      type: 'purchase',
      title: '采购-小金额',
      applicant: 'admin',
      formData: { budget: 5000 },
    })

    expect(record.workflowId).toBe('wf-003')
    expect(record.workflowInstance?.currentNodeId).toBe('approval-005')
    expect(record.currentNodeName).toBe('财务审批')
  })

  it('条件起始路由：预算 >= 10000 命中条件出边 -> 总监审批', async () => {
    const record = await submitApproval({
      type: 'purchase',
      title: '采购-大金额',
      applicant: 'admin',
      formData: { budget: 15000 },
    })

    expect(record.workflowInstance?.currentNodeId).toBe('approval-004')
    expect(record.currentNodeName).toBe('总监审批')
  })

  it('财务 or 节点通过后无下一审批节点 -> 直接完结 approved', async () => {
    const record = await submitApproval({
      type: 'purchase',
      title: '采购-财务链路',
      applicant: 'admin',
      formData: { budget: 5000 },
    })

    const processed = await processApproval({
      id: record.id,
      action: 'approve',
      operatorId: 'user-001',
      operatorName: 'admin',
    })

    expect(processed.status).toBe('approved')
    expect(processed.currentNodeName).toBe('审批完成')
  })

  it('wf-001 多节点：and 会签全部通过后推进到 HR 节点，HR 通过后完结', async () => {
    const record = await submitApproval({
      type: 'leave',
      title: '请假-多节点',
      applicant: 'admin',
      formData: { days: 3, reason: '事假' },
    })

    expect(record.workflowId).toBe('wf-001')
    expect(record.workflowInstance?.currentNodeId).toBe('approval-001')

    // 会签 1/2：admin 通过，仍 pending
    const r1 = await processApproval({ id: record.id, action: 'approve', operatorId: 'user-001', operatorName: 'admin' })
    expect(r1.status).toBe('pending')
    expect(r1.workflowInstance?.currentNodeId).toBe('approval-001')

    // 会签 2/2：manager 通过 -> 推进到 HR 节点
    const r2 = await processApproval({ id: record.id, action: 'approve', operatorId: 'user-002', operatorName: 'manager' })
    expect(r2.status).toBe('pending')
    expect(r2.workflowInstance?.currentNodeId).toBe('approval-002')
    expect(r2.currentNodeName).toBe('HR 审批')

    // HR or 节点：admin 通过 -> 完结
    const r3 = await processApproval({ id: record.id, action: 'approve', operatorId: 'user-001', operatorName: 'admin' })
    expect(r3.status).toBe('approved')
  })

  it('wf-002 单审批节点：无下一节点时保持完结语义（向后兼容）', async () => {
    const record = await submitApproval({
      type: 'expense',
      title: '报销-单节点',
      applicant: 'admin',
      formData: { amount: 1200 },
    })

    expect(record.workflowId).toBe('wf-002')
    const processed = await processApproval({
      id: record.id,
      action: 'approve',
      operatorId: 'user-001',
      operatorName: 'admin',
    })
    expect(processed.status).toBe('approved')
    expect(processed.currentNodeName).toBe('审批完成')
  })
})