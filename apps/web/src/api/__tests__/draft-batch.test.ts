import { beforeEach, describe, expect, it } from 'vitest'
import { __resetApprovalRuntimeState, batchProcessApprovals } from '../approval'
import { createDraft, listDrafts, removeDraft } from '../draft'
import { mockApprovalRecords } from '../mock'
import type { ApprovalRecord } from '../types'

const ORIGINAL_RECORDS: ApprovalRecord[] = JSON.parse(JSON.stringify(mockApprovalRecords))

function resetMockRecords() {
  const snapshot: ApprovalRecord[] = JSON.parse(JSON.stringify(ORIGINAL_RECORDS))
  mockApprovalRecords.splice(0, mockApprovalRecords.length, ...snapshot)
}

describe('batchProcessApprovals（mock 模式）', () => {
  beforeEach(() => {
    resetMockRecords()
    __resetApprovalRuntimeState()
  })

  it('批量通过：逐条成功并汇总计数', async () => {
    const result = await batchProcessApprovals({
      ids: ['APPROVE-20260228-001', 'APPROVE-20260228-002'],
      action: 'approve',
      operatorId: 'user-001',
      operatorName: 'admin',
    })

    expect(result.succeeded).toBe(2)
    expect(result.failed).toBe(0)
    expect(result.results).toHaveLength(2)
    // and 会签首人通过 → 保持 pending；or 任一通过 → approved
    const andItem = result.results.find(item => item.id === 'APPROVE-20260228-001')
    const orItem = result.results.find(item => item.id === 'APPROVE-20260228-002')
    expect(andItem?.success).toBe(true)
    expect(andItem?.status).toBe('pending')
    expect(orItem?.success).toBe(true)
    expect(orItem?.status).toBe('approved')
  })

  it('批量含不存在 id：该条失败、其余成功，计数正确', async () => {
    const result = await batchProcessApprovals({
      ids: ['APPROVE-20260228-001', 'APPROVE-NOT-EXIST'],
      action: 'approve',
      operatorId: 'user-001',
      operatorName: 'admin',
    })

    expect(result.succeeded).toBe(1)
    expect(result.failed).toBe(1)
    const failedItem = result.results.find(item => item.id === 'APPROVE-NOT-EXIST')
    expect(failedItem?.success).toBe(false)
    expect(failedItem?.error).toBeTruthy()
  })

  it('批量驳回：and 模式任一驳回即整体驳回', async () => {
    const result = await batchProcessApprovals({
      ids: ['APPROVE-20260228-001'],
      action: 'reject',
      operatorId: 'user-002',
      operatorName: 'manager',
    })

    expect(result.succeeded).toBe(1)
    const record = mockApprovalRecords.find(item => item.id === 'APPROVE-20260228-001')
    expect(record?.status).toBe('rejected')
  })
})

describe('draft CRUD（mock 模式）', () => {
  it('保存草稿后可在列表查询，字段正确', async () => {
    const draft = await createDraft({
      workflowId: 'wf-001',
      workflowType: 'leave',
      title: '请假草稿',
      applicant: '张三',
      formData: { days: 3, reason: '事假' },
      isUrgent: false,
    })

    expect(draft.id).toBeTruthy()
    expect(draft.title).toBe('请假草稿')

    const list = await listDrafts()
    expect(list.some(item => item.id === draft.id)).toBe(true)
    expect(list[0]?.formData?.reason).toBe('事假')
  })

  it('列表支持关键词过滤', async () => {
    await createDraft({ title: '采购草稿', workflowType: 'purchase', applicant: '李四' })
    await createDraft({ title: '年假草稿', workflowType: 'leave', applicant: '张三' })

    const filtered = await listDrafts('年假')
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.title).toBe('年假草稿')
  })

  it('删除草稿后列表不再包含', async () => {
    const draft = await createDraft({ title: '待删除草稿', workflowType: 'leave', applicant: '张三' })
    await removeDraft(draft.id)
    const list = await listDrafts()
    expect(list.some(item => item.id === draft.id)).toBe(false)
  })
})