/**
 * @file draft.ts
 * @description 审批草稿 API（mock / real 双模式）
 */

import type { ApprovalDraft } from './types'
import { remoteCreateDraft, remoteListDrafts, remoteRemoveDraft, type RemoteDraftPayload } from './draft.remote'
import { useRemoteApprovalApi } from './runtime'

const mockDrafts: ApprovalDraft[] = []

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

function toTimestampId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function listDrafts(keyword?: string): Promise<ApprovalDraft[]> {
  if (useRemoteApprovalApi())
    return remoteListDrafts(keyword)

  return sleep(200).then(() => {
    const list = [...mockDrafts]
    if (keyword?.trim()) {
      const needle = keyword.trim().toLowerCase()
      return list.filter(item => item.title.toLowerCase().includes(needle))
    }
    return list
  })
}

export function createDraft(payload: RemoteDraftPayload): Promise<ApprovalDraft> {
  if (useRemoteApprovalApi())
    return remoteCreateDraft(payload)

  return sleep(200).then(() => {
    const now = new Date().toISOString()
    const draft: ApprovalDraft = {
      id: toTimestampId('draft'),
      workflowId: payload.workflowId,
      workflowType: payload.workflowType,
      title: payload.title?.trim() || '未命名草稿',
      applicant: payload.applicant?.trim() || '当前用户',
      applicantAvatar: payload.applicantAvatar,
      formData: payload.formData,
      description: payload.description,
      amount: payload.amount,
      isUrgent: payload.isUrgent,
      createdAt: now,
      updatedAt: now,
    }
    mockDrafts.unshift(draft)
    return draft
  })
}

export function removeDraft(id: string): Promise<{ success: boolean }> {
  if (useRemoteApprovalApi())
    return remoteRemoveDraft(id)

  return sleep(150).then(() => {
    const index = mockDrafts.findIndex(item => item.id === id)
    if (index !== -1)
      mockDrafts.splice(index, 1)
    return { success: true }
  })
}