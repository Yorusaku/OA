/**
 * @file draft.remote.ts
 * @description 审批草稿 API（真实 BFF 实现）
 */

import type { ApprovalDraft } from './types'
import { del, get, post } from './http'
import { nanoid } from 'nanoid'

export interface RemoteDraftPayload {
  workflowId?: string
  workflowType?: string
  title?: string
  applicant?: string
  applicantAvatar?: string
  formData?: Record<string, any>
  description?: string
  amount?: number
  isUrgent?: boolean
}

function idempotencyHeaders() {
  return {
    'Idempotency-Key': `oa-draft-${Date.now()}-${nanoid(8)}`,
  }
}

export function remoteListDrafts(keyword?: string): Promise<ApprovalDraft[]> {
  return get('/v1/drafts', { params: keyword?.trim() ? { keyword } : undefined })
}

export function remoteCreateDraft(payload: RemoteDraftPayload): Promise<ApprovalDraft> {
  return post('/v1/drafts', payload, { headers: idempotencyHeaders() })
}

export function remoteRemoveDraft(id: string): Promise<{ success: boolean }> {
  return del(`/v1/drafts/${id}`)
}