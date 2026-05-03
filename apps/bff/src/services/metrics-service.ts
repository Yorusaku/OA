import type { ApprovalMetricSnapshot } from '@oa/contracts'
import type { RuntimeState } from '../domain'
import { parseTime } from '../utils'

function percentile(values: number[], p: number): number {
  if (!values.length)
    return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[index]
}

export function buildApprovalMetricSnapshot(state: RuntimeState): ApprovalMetricSnapshot {
  const approvals = state.approvals
  const completed = approvals.filter(item => item.status === 'approved' || item.status === 'rejected')
  const rejected = approvals.filter(item => item.status === 'rejected')
  const escalated = approvals.filter(item => !!item.escalatedAt)
  const delegatedEvents = state.approvalEvents.filter(item => item.eventType === 'approval.delegated')

  const durations = completed.map((item) => {
    const end = item.operatorTrail?.[0]?.operatedAt || item.applyTime
    return Math.max(0, parseTime(end).getTime() - parseTime(item.applyTime).getTime())
  })

  const slaHitRate = approvals.length === 0
    ? 1
    : approvals.filter(item => !item.escalatedAt).length / approvals.length
  const rejectRate = completed.length === 0 ? 0 : rejected.length / completed.length
  const delegationTakeoverRate = approvals.length === 0 ? 0 : delegatedEvents.length / approvals.length

  const alerts: ApprovalMetricSnapshot['alerts'] = []
  if (slaHitRate < 0.9) {
    alerts.push({
      id: `alert-sla-${Date.now()}`,
      level: slaHitRate < 0.8 ? 'critical' : 'warning',
      metric: 'slaHitRate',
      threshold: 0.9,
      current: Number(slaHitRate.toFixed(4)),
      message: `SLA命中率偏低：${(slaHitRate * 100).toFixed(2)}%`,
      createdAt: new Date().toISOString(),
    })
  }
  if (rejectRate > 0.3) {
    alerts.push({
      id: `alert-reject-${Date.now()}`,
      level: rejectRate > 0.4 ? 'critical' : 'warning',
      metric: 'rejectRate',
      threshold: 0.3,
      current: Number(rejectRate.toFixed(4)),
      message: `审批驳回率偏高：${(rejectRate * 100).toFixed(2)}%`,
      createdAt: new Date().toISOString(),
    })
  }

  return {
    generatedAt: new Date().toISOString(),
    slaHitRate: Number(slaHitRate.toFixed(4)),
    nodeDurationP50: Math.round(percentile(durations, 50)),
    nodeDurationP95: Math.round(percentile(durations, 95)),
    rejectRate: Number(rejectRate.toFixed(4)),
    delegationTakeoverRate: Number(delegationTakeoverRate.toFixed(4)),
    totals: {
      approvals: approvals.length,
      completed: completed.length,
      rejected: rejected.length,
      escalated: escalated.length,
      delegated: delegatedEvents.length,
    },
    alerts,
  }
}
