import { beforeEach, describe, expect, it } from 'vitest'
import {
  __resetApprovalRuntimeState,
  getApprovalDetail,
  submitApproval,
  upsertApprovalDelegation,
} from '../approval'
import { mockApprovalRecords } from '../mock'
import type { ApprovalRecord } from '../types'

const ORIGINAL_RECORDS: ApprovalRecord[] = JSON.parse(JSON.stringify(mockApprovalRecords))

function resetMockRecords() {
  const snapshot: ApprovalRecord[] = JSON.parse(JSON.stringify(ORIGINAL_RECORDS))
  mockApprovalRecords.splice(0, mockApprovalRecords.length, ...snapshot)
}

function getActiveRange(): { startAt: string, endAt: string } {
  return {
    startAt: '2026-01-01 00:00:00',
    endAt: '2026-12-31 23:59:59',
  }
}

describe('approval automation engine', () => {
  beforeEach(() => {
    resetMockRecords()
    __resetApprovalRuntimeState()
  })

  it('超时单据自动升级并改派处理人', async () => {
    const detail = await getApprovalDetail('APPROVE-20260115-ESC001')
    expect(detail?.escalatedAt).toBeTruthy()
    expect(detail?.workflowInstance?.tasks?.[0]?.ownerId).toBe('user-002')
    expect(detail?.workflowInstance?.tasks?.[0]?.handlerId).toBe('user-002')
    expect(detail?.operatorTrail?.some(item => item.action === 'escalate')).toBe(true)
  })

  it('自动升级幂等：重复读取不会重复追加升级轨迹', async () => {
    const first = await getApprovalDetail('APPROVE-20260115-ESC001')
    const second = await getApprovalDetail('APPROVE-20260115-ESC001')
    const firstCount = first?.operatorTrail?.filter(item => item.action === 'escalate').length || 0
    const secondCount = second?.operatorTrail?.filter(item => item.action === 'escalate').length || 0
    expect(firstCount).toBe(1)
    expect(secondCount).toBe(1)
  })

  it('代理生效后存量 pending 任务迁移给代理人', async () => {
    const range = getActiveRange()
    await upsertApprovalDelegation({
      ownerId: 'user-001',
      ownerName: 'admin',
      delegateId: 'user-002',
      delegateName: 'manager',
      enabled: true,
      ...range,
    })

    const detail = await getApprovalDetail('APPROVE-20260228-001')
    const ownerTask = detail?.workflowInstance?.tasks?.find(task => task.ownerId === 'user-001')
    expect(ownerTask?.handlerId).toBe('user-002')
    expect(ownerTask?.delegatedFromId).toBe('user-001')
  })

  it('代理生效后新建审批任务直接归代理人处理', async () => {
    const range = getActiveRange()
    await upsertApprovalDelegation({
      ownerId: 'user-001',
      ownerName: 'admin',
      delegateId: 'user-002',
      delegateName: 'manager',
      enabled: true,
      ...range,
    })

    const record = await submitApproval({
      title: '自动代理测试单',
      type: 'leave',
      applicant: 'admin',
      description: 'test',
      currentNodeName: '部门经理审批',
      formData: {},
    })

    const ownerTask = record.workflowInstance?.tasks?.find(task => task.ownerId === 'user-001')
    expect(ownerTask?.handlerId).toBe('user-002')
  })

  it('代理过期后未处理任务自动回归原处理人', async () => {
    await upsertApprovalDelegation({
      ownerId: 'user-001',
      ownerName: 'admin',
      delegateId: 'user-002',
      delegateName: 'manager',
      enabled: true,
      startAt: '2026-01-01 00:00:00',
      endAt: '2026-12-31 23:59:59',
    })

    await upsertApprovalDelegation({
      ownerId: 'user-001',
      ownerName: 'admin',
      delegateId: 'user-002',
      delegateName: 'manager',
      enabled: true,
      startAt: '2025-01-01 00:00:00',
      endAt: '2025-01-02 00:00:00',
    })

    const detail = await getApprovalDetail('APPROVE-20260228-001')
    const ownerTask = detail?.workflowInstance?.tasks?.find(task => task.ownerId === 'user-001')
    expect(ownerTask?.handlerId).toBe('user-001')
    expect(ownerTask?.delegatedFromId).toBeFalsy()
  })

  it('升级与代理叠加时，按先升级后代理执行', async () => {
    const range = getActiveRange()
    await upsertApprovalDelegation({
      ownerId: 'user-002',
      ownerName: 'manager',
      delegateId: 'user-001',
      delegateName: 'admin',
      enabled: true,
      ...range,
    })

    const detail = await getApprovalDetail('APPROVE-20260115-ESC001')
    const firstTask = detail?.workflowInstance?.tasks?.[0]
    expect(detail?.escalatedAt).toBeTruthy()
    expect(firstTask?.ownerId).toBe('user-002')
    expect(firstTask?.handlerId).toBe('user-001')
    expect(firstTask?.delegatedFromId).toBe('user-002')
  })
})
