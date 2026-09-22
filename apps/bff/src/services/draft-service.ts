import type { ApprovalDraft, RuntimeState } from '../domain.js'
import { nowText, uid } from '../utils.js'

export interface ApprovalDraftPayload {
  workflowId?: string
  workflowType?: string
  title?: string
  applicant?: string
  applicantAvatar?: string
  formData?: Record<string, unknown>
  description?: string
  amount?: number
  isUrgent?: boolean
}

export function listDrafts(state: RuntimeState, keyword?: string): ApprovalDraft[] {
  const drafts = [...state.drafts]
  if (keyword?.trim()) {
    const needle = keyword.trim().toLowerCase()
    return drafts.filter(item => item.title.toLowerCase().includes(needle))
  }
  return drafts
}

export function createDraft(state: RuntimeState, payload: ApprovalDraftPayload, applicant: { id?: string, name?: string }): ApprovalDraft {
  const now = nowText(new Date())
  const draft: ApprovalDraft = {
    id: uid('draft'),
    workflowId: payload.workflowId,
    workflowType: payload.workflowType,
    title: payload.title?.trim() || '未命名草稿',
    applicant: payload.applicant?.trim() || applicant.name || '当前用户',
    applicantAvatar: payload.applicantAvatar,
    formData: payload.formData,
    description: payload.description,
    amount: payload.amount,
    isUrgent: payload.isUrgent,
    createdAt: now,
    updatedAt: now,
  }
  state.drafts.unshift(draft)
  return draft
}

export function removeDraft(state: RuntimeState, id: string): void {
  const index = state.drafts.findIndex(item => item.id === id)
  if (index < 0)
    throw new Error('draft-not-found')
  state.drafts.splice(index, 1)
}
