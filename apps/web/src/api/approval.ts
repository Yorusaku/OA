/**
 * @file approval.ts
 * @description 审批相关 API（mock 内存实现）
 */

import type {
  ApprovalAction,
  ApprovalDelegationRule,
  ApprovalRecord,
  ApprovalStatus,
  ApprovalTask,
  ApprovalTaskStatus,
  ApprovalTrailItem,
  CCRecord,
  MessageRecord,
  MessageType,
  PageParams,
  PageResult,
  WorkbenchStats,
} from './types'
import type { ConditionExpression, WorkflowAssignee, WorkflowDefinition, WorkflowNode } from '@/types/workflow'
import { mockApprovalRecords, mockCCRecords, mockMessageRecords, mockWorkflowDefinitions } from './mock'
import {
  remoteBatchDeleteMessages,
  remoteBatchMarkAsRead,
  remoteBatchProcessApprovals,
  remoteBatchMarkCCAsRead,
  remoteDeleteMessage,
  remoteDisableApprovalDelegation,
  remoteGetApprovalDelegation,
  remoteGetApprovalDetail,
  remoteGetApprovalList,
  remoteGetApprovalNotifications,
  remoteGetCCList,
  remoteGetCCUnreadCount,
  remoteGetMessageList,
  remoteGetUnreadCount,
  remoteGetWorkbenchStats,
  remoteMarkAllAsRead,
  remoteMarkCCAsRead,
  remoteMarkMessageAsRead,
  remoteProcessApproval,
  remoteSubmitApproval,
  remoteUpsertApprovalDelegation,
} from './approval.remote'
import { useRemoteApprovalApi } from './runtime'

const DEFAULT_SLA_HOURS = 48
const LIST_DELAY_MS = 500
const DETAIL_DELAY_MS = 300
const SUBMIT_DELAY_MS = 800
const PROCESS_DELAY_MS = 500
const STATS_DELAY_MS = 400

type DateRange = [Date, Date]

type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface ApprovalNotification {
  id: string
  approvalId: string
  title: string
  content: string
  type: NotificationType
  createdAt: string
}

const approvalNotifications: ApprovalNotification[] = []
const approvalDelegationRules: ApprovalDelegationRule[] = []
const ESCALATION_ASSIGNEE_MAP: Record<string, { id: string, name: string }> = {
  'user-001': { id: 'user-002', name: 'manager' },
  'user-002': { id: 'user-001', name: 'admin' },
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

function toTimestampId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatDateTime(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  const second = `${date.getSeconds()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function parseDateTime(value?: string): Date {
  if (!value)
    return new Date()

  const parsed = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime()))
    return new Date()
  return parsed
}

function plusHours(date: Date, hours: number): Date {
  const copy = new Date(date)
  copy.setHours(copy.getHours() + hours)
  return copy
}

function isOverdue(deadlineAt?: string): boolean {
  if (!deadlineAt)
    return false
  return parseDateTime(deadlineAt).getTime() < Date.now()
}

function isDelegationRuleActive(rule: ApprovalDelegationRule, now: Date): boolean {
  if (!rule.enabled)
    return false
  const start = parseDateTime(rule.startAt).getTime()
  const end = parseDateTime(rule.endAt).getTime()
  const current = now.getTime()
  return current >= start && current <= end
}

function findActiveDelegationRule(ownerId?: string, now = new Date()): ApprovalDelegationRule | undefined {
  if (!ownerId)
    return undefined
  return approvalDelegationRules.find(rule => rule.ownerId === ownerId && isDelegationRuleActive(rule, now))
}

function resolveEscalationAssignee(ownerId?: string): { id: string, name: string } | undefined {
  if (!ownerId)
    return undefined
  return ESCALATION_ASSIGNEE_MAP[ownerId]
}

function normalizeAttachments(input?: string[]): string[] | undefined {
  if (!input?.length)
    return undefined
  const list = input.map(item => item.trim()).filter(Boolean)
  return list.length ? list : undefined
}

function resolveCommentText(payload: ProcessApprovalPayload): string | undefined {
  if (payload.commentText?.trim())
    return payload.commentText.trim()

  if (!payload.comment)
    return undefined

  if (typeof payload.comment === 'string')
    return payload.comment

  if (typeof payload.comment === 'object') {
    const objectComment = payload.comment as Record<string, unknown>
    const directComment = objectComment.comment
    if (typeof directComment === 'string' && directComment.trim())
      return directComment.trim()

    const reason = objectComment.reason
    if (typeof reason === 'string' && reason.trim())
      return reason.trim()

    return JSON.stringify(objectComment)
  }

  return String(payload.comment)
}

type NodeMode = 'and' | 'or'

interface ApprovalNodeStrategy {
  nodeId: string
  nodeName: string
  mode: NodeMode
  assignees: WorkflowAssignee[]
}

const DEFAULT_ASSIGNEE: WorkflowAssignee = { id: 'user-001', name: 'admin' }

function normalizeTaskStatus(status?: string): ApprovalTaskStatus {
  if (
    status === 'pending'
    || status === 'processing'
    || status === 'approved'
    || status === 'rejected'
    || status === 'transferred'
    || status === 'cancelled'
    || status === 'auto-closed'
  ) {
    return status
  }
  return 'pending'
}

function isTaskPending(task: ApprovalTask): boolean {
  const status = normalizeTaskStatus(task.taskStatus || task.status)
  return status === 'pending' || status === 'processing'
}

function isTaskCompleted(task: ApprovalTask): boolean {
  return !isTaskPending(task)
}

function normalizeAssignees(assignees?: WorkflowAssignee[]): WorkflowAssignee[] {
  if (!assignees?.length)
    return []

  return assignees
    .map(item => ({
      id: item.id?.trim(),
      name: item.name?.trim() || item.id?.trim(),
    }))
    .filter(item => Boolean(item.id)) as WorkflowAssignee[]
}

function buildPendingTask(
  nodeId: string,
  ownerId: string,
  ownerName: string,
  now = new Date(),
): ApprovalTask {
  const rule = findActiveDelegationRule(ownerId, now)
  const delegated = Boolean(rule)

  return {
    id: toTimestampId('task'),
    nodeId,
    handlerId: rule?.delegateId || ownerId,
    handlerName: rule?.delegateName || ownerName,
    ownerId,
    ownerName,
    delegatedFromId: delegated ? ownerId : undefined,
    delegatedFromName: delegated ? ownerName : undefined,
    delegatedAt: delegated ? formatDateTime(now) : undefined,
    status: 'pending',
    taskStatus: 'pending',
  }
}

function createTasksForAssignees(nodeId: string, assignees: WorkflowAssignee[]): ApprovalTask[] {
  return assignees.map(assignee =>
    buildPendingTask(nodeId, assignee.id, assignee.name, new Date()),
  )
}

function resolveWorkflowByType(type: string): WorkflowDefinition | undefined {
  if (type === 'leave')
    return mockWorkflowDefinitions.find(item => item.id === 'wf-001')
  if (type === 'expense')
    return mockWorkflowDefinitions.find(item => item.id === 'wf-002')
  if (type === 'purchase')
    return mockWorkflowDefinitions.find(item => item.id === 'wf-003')

  return mockWorkflowDefinitions.find(item => item.status === 'active')
}

/** 审批类型 → 流程定义 id 映射（mock / real 双模式保持一致） */
function resolveWorkflowIdByType(type?: string): string | undefined {
  if (type === 'leave')
    return 'wf-001'
  if (type === 'expense')
    return 'wf-002'
  if (type === 'purchase')
    return 'wf-003'
  return undefined
}

function resolveWorkflowById(workflowId?: string): WorkflowDefinition | undefined {
  if (!workflowId)
    return undefined
  return mockWorkflowDefinitions.find(item => item.id === workflowId)
}

function looseEqual(a: unknown, b: unknown): boolean {
  if (a === b)
    return true
  if (a == null || b == null)
    return false
  return String(a) === String(b)
}

/**
 * 条件表达式求值（与 BFF workflow-service.evaluateCondition 语义一致）
 * 支持 eq/ne/gt/gte/lt/lte/in/contains/includes 与符号简写
 */
function evaluateMockCondition(
  operator?: ConditionExpression['operator'],
  fieldValue?: unknown,
  expectValue?: unknown,
): boolean {
  switch (operator) {
    case 'eq':
      return looseEqual(fieldValue, expectValue)
    case 'ne':
      return !looseEqual(fieldValue, expectValue)
    case 'gt':
    case '>':
      return Number(fieldValue) > Number(expectValue)
    case 'gte':
    case '>=':
      return Number(fieldValue) >= Number(expectValue)
    case 'lt':
    case '<':
      return Number(fieldValue) < Number(expectValue)
    case 'lte':
    case '<=':
      return Number(fieldValue) <= Number(expectValue)
    case 'in':
      return Array.isArray(expectValue)
        ? expectValue.includes(fieldValue)
        : String(fieldValue ?? '').includes(String(expectValue))
    case 'contains':
    case 'includes':
      return String(fieldValue ?? '').includes(String(expectValue))
    default:
      return false
  }
}

/** condition 节点 conditions 全命中（AND 语义）；无 conditions 视为命中 */
function evaluateNodeConditions(node: WorkflowNode, formData?: Record<string, any>): boolean {
  const conditions = node.conditions ?? []
  if (conditions.length === 0)
    return true
  return conditions.every((condition) => {
    const field = condition.fieldKey || condition.field
    const actual = field ? formData?.[field] : undefined
    return evaluateMockCondition(condition.operator, actual, condition.value)
  })
}

/**
 * 沿流程定义 edges 推进到下一个审批节点：
 * - condition 命中走第一条出边、未命中走第二条出边（与 BFF resolveNodeRoute 一致）
 * - cc 节点不产生任务，自动跳过
 * - start/end 不产生任务；无下一节点返回 undefined
 */
function resolveNextApprovalNodeId(
  workflow: WorkflowDefinition,
  fromNodeId?: string,
  formData?: Record<string, any>,
): string | undefined {
  if (!workflow || !fromNodeId)
    return undefined

  // 从 fromNodeId 的出边继续（fromNodeId 本身不作为候选结果），
  // 语义与 BFF resolveNodeRoute 一致：返回下一个 approval 节点，无则 undefined。
  const follow = (nodeId: string): string | undefined => {
    const node = workflow.nodes.find(item => item.id === nodeId)
    if (!node || node.type === 'end')
      return undefined

    const edges = workflow.edges.filter(edge => edge.source === nodeId)
    if (edges.length === 0)
      return undefined

    let targetId = edges[0].target
    if (node.type === 'condition') {
      const hit = evaluateNodeConditions(node, formData)
      targetId = hit ? edges[0].target : (edges[1] ?? edges[0]).target
    }

    const targetNode = workflow.nodes.find(item => item.id === targetId)
    if (!targetNode)
      return undefined
    if (targetNode.type === 'approval')
      return targetNode.id
    if (targetNode.type === 'end')
      return undefined
    // start / cc / condition 中间节点继续
    return follow(targetNode.id)
  }

  return follow(fromNodeId)
}

/** 发起时条件起始路由：从 start 节点沿流程定义定位第一个审批节点 */
function resolveStartApprovalNodeId(
  workflow?: WorkflowDefinition,
  formData?: Record<string, any>,
): string | undefined {
  if (!workflow)
    return undefined
  const startNode = workflow.nodes.find(item => item.type === 'start')
  if (!startNode)
    return undefined
  return resolveNextApprovalNodeId(workflow, startNode.id, formData)
}

/**
 * 多节点推进：当前节点完成（and 全员 / or 任一通过）后，沿流程定义推进到下一审批节点。
 * 仅对带 workflowId 的审批生效；无 workflowId 或下一节点不存在时返回 false（调用方保持完结语义）。
 */
function advanceWorkflow(
  record: ApprovalRecord,
  operator: { id: string, name: string },
  operatedAt: string,
): boolean {
  const workflow = resolveWorkflowById(record.workflowId)
  if (!workflow)
    return false

  const currentNodeId = record.workflowInstance?.currentNodeId
  const formData = record.formData ?? {}
  const nextNodeId = resolveNextApprovalNodeId(workflow, currentNodeId, formData)
  if (!nextNodeId)
    return false

  const nextNode = workflow.nodes.find(item => item.id === nextNodeId)
  const assignees = normalizeAssignees(nextNode?.handler?.assignees)
  const nextTasks = createTasksForAssignees(nextNodeId, assignees)
  const nextMode = resolveNodeMode(nextNode?.handler?.mode)

  record.workflowInstance = {
    ...record.workflowInstance,
    currentNodeId: nextNodeId,
    currentNodeMode: nextMode,
    currentNodeAssignees: assignees,
    tasks: nextTasks,
    progress: {
      completed: 0,
      total: nextTasks.length,
    },
  }
  record.currentNodeName = nextNode?.name || '审批节点'
  recalcProgress(record)

  appendTrail(record, {
    id: toTimestampId('trail'),
    action: 'advance',
    status: 'pending',
    operatorId: operator.id,
    operatorName: operator.name,
    operatedAt,
    comment: `当前节点完成，流程推进至「${record.currentNodeName}」`,
  })
  pushNotification({
    approvalId: record.id,
    title: '流程推进',
    content: `《${record.title}》已进入「${record.currentNodeName}」节点。`,
    type: 'info',
  })
  return true
}

function resolveApprovalNode(workflow?: WorkflowDefinition, nodeId?: string): WorkflowNode | undefined {
  if (!workflow)
    return undefined

  if (nodeId) {
    const byId = workflow.nodes.find(item => item.id === nodeId)
    if (byId)
      return byId
  }

  return workflow.nodes.find(item => item.type === 'approval')
}

function resolveNodeMode(mode?: string): NodeMode {
  return mode === 'and' ? 'and' : 'or'
}

function resolveNodeStrategy(record: ApprovalRecord): ApprovalNodeStrategy {
  const workflow = resolveWorkflowByType(record.type)
  const approvalNode = resolveApprovalNode(workflow, record.workflowInstance?.currentNodeId)
  const assigneesFromNode = normalizeAssignees(approvalNode?.handler?.assignees)
  const assigneesFromRecord = normalizeAssignees(record.workflowInstance?.currentNodeAssignees)
  const assigneesFromTask = (record.workflowInstance?.tasks || [])
    .map(task => ({
      id: task.handlerId,
      name: task.handlerName || task.handlerId,
    }))
    .filter(item => Boolean(item.id))

  const assignees = assigneesFromNode.length
    ? assigneesFromNode
    : assigneesFromRecord.length
      ? assigneesFromRecord
      : assigneesFromTask.length
        ? assigneesFromTask
        : [DEFAULT_ASSIGNEE]

  return {
    nodeId: approvalNode?.id || record.workflowInstance?.currentNodeId || 'node-default-approval',
    nodeName: approvalNode?.name || record.currentNodeName || '审批节点',
    mode: resolveNodeMode(record.workflowInstance?.currentNodeMode || approvalNode?.handler?.mode),
    assignees,
  }
}

function normalizeTask(task: ApprovalTask, defaultNodeId: string): ApprovalTask {
  const taskStatus = normalizeTaskStatus(task.taskStatus || task.status)
  const ownerId = task.ownerId || task.handlerId
  const ownerName = task.ownerName || task.handlerName || task.handlerId
  return {
    ...task,
    nodeId: task.nodeId || defaultNodeId,
    handlerName: task.handlerName || task.handlerId,
    ownerId,
    ownerName,
    status: taskStatus,
    taskStatus,
  }
}

function recalcProgress(record: ApprovalRecord): void {
  const tasks = record.workflowInstance?.tasks || []
  const nodeId = record.workflowInstance?.currentNodeId
  const currentNodeTasks = nodeId
    ? tasks.filter(task => task.nodeId === nodeId)
    : tasks

  const total = currentNodeTasks.length
  const completed = currentNodeTasks.filter(isTaskCompleted).length

  if (!record.workflowInstance)
    record.workflowInstance = {}
  record.workflowInstance.progress = { completed, total }
}

function ensureRecordDefaults(record: ApprovalRecord): ApprovalRecord {
  const applyDate = parseDateTime(record.applyTime)
  const strategy = resolveNodeStrategy(record)
  const rawTasks = record.workflowInstance?.tasks || []
  const normalizedTasks = rawTasks
    .map(task => normalizeTask(task, strategy.nodeId))

  const tasks = normalizedTasks.length
    ? normalizedTasks
    : createTasksForAssignees(strategy.nodeId, strategy.assignees)

  const normalized: ApprovalRecord = {
    ...record,
    currentNodeName: record.currentNodeName || strategy.nodeName,
    deadlineAt: record.deadlineAt || formatDateTime(plusHours(applyDate, DEFAULT_SLA_HOURS)),
    remindCount: record.remindCount ?? 0,
    workflowInstance: {
      currentNodeId: record.workflowInstance?.currentNodeId || strategy.nodeId,
      currentNodeMode: strategy.mode,
      currentNodeAssignees: strategy.assignees,
      tasks,
      progress: record.workflowInstance?.progress,
    },
    operatorTrail: record.operatorTrail?.map(item => ({
      ...item,
      attachments: normalizeAttachments(item.attachments),
    })),
  }

  if (!normalized.operatorTrail?.length) {
    normalized.operatorTrail = [
      {
        id: toTimestampId('trail'),
        action: 'create',
        status: 'pending',
        operatorName: normalized.applicant,
        operatedAt: normalized.applyTime,
        comment: normalized.description,
      },
    ]
  }

  Object.assign(record, normalized)
  recalcProgress(record)
  return record
}

function ensureAllRecordsDefaults(): void {
  mockApprovalRecords.forEach(ensureRecordDefaults)
}

function pushNotification(notification: Omit<ApprovalNotification, 'id' | 'createdAt'>): void {
  approvalNotifications.unshift({
    ...notification,
    id: toTimestampId('notice'),
    createdAt: formatDateTime(new Date()),
  })
}

function runAutoEscalation(now: Date): void {
  const operatedAt = formatDateTime(now)
  mockApprovalRecords.forEach((record) => {
    if (record.status !== 'pending' || !isOverdue(record.deadlineAt) || record.escalatedAt)
      return

    const tasks = record.workflowInstance?.tasks || []
    const currentNodeId = record.workflowInstance?.currentNodeId
    const pendingTasks = tasks.filter((task) => {
      if (!isTaskPending(task))
        return false
      if (currentNodeId && task.nodeId && task.nodeId !== currentNodeId)
        return false
      return true
    })
    if (pendingTasks.length === 0)
      return

    const affectedOwners = new Set<string>()
    pendingTasks.forEach((task) => {
      const ownerId = task.ownerId || task.handlerId
      const ownerName = task.ownerName || task.handlerName || task.handlerId
      const escalationTarget = resolveEscalationAssignee(ownerId)
      if (!escalationTarget)
        return

      affectedOwners.add(`${ownerName}->${escalationTarget.name}`)
      task.ownerId = escalationTarget.id
      task.ownerName = escalationTarget.name
      task.handlerId = escalationTarget.id
      task.handlerName = escalationTarget.name
      task.delegatedFromId = undefined
      task.delegatedFromName = undefined
      task.delegatedAt = undefined
    })

    if (affectedOwners.size === 0)
      return

    record.escalatedAt = operatedAt
    record.currentNodeName = `SLA升级处理中（${Array.from(affectedOwners).join('；')}）`

    appendTrail(record, {
      id: toTimestampId('trail'),
      action: 'escalate',
      status: record.status,
      operatorId: 'system',
      operatorName: '系统自动治理',
      operatedAt,
      comment: `SLA超时自动升级：${Array.from(affectedOwners).join('；')}`,
    })

    pushNotification({
      approvalId: record.id,
      title: '审批已超时升级',
      content: `《${record.title}》触发 SLA 自动升级，已改派处理人。`,
      type: 'error',
    })
  })
}

function runDelegationSync(now: Date): void {
  const operatedAt = formatDateTime(now)
  mockApprovalRecords.forEach((record) => {
    if (record.status !== 'pending')
      return

    const tasks = record.workflowInstance?.tasks || []
    const currentNodeId = record.workflowInstance?.currentNodeId
    const changedTasks: string[] = []

    tasks.forEach((task) => {
      if (!isTaskPending(task))
        return
      if (currentNodeId && task.nodeId && task.nodeId !== currentNodeId)
        return

      const ownerId = task.ownerId || task.handlerId
      const ownerName = task.ownerName || task.handlerName || task.handlerId
      task.ownerId = ownerId
      task.ownerName = ownerName

      const activeRule = findActiveDelegationRule(ownerId, now)
      if (activeRule) {
        if (task.handlerId !== activeRule.delegateId) {
          changedTasks.push(`${ownerName}->${activeRule.delegateName}`)
          task.handlerId = activeRule.delegateId
          task.handlerName = activeRule.delegateName
          task.delegatedFromId = ownerId
          task.delegatedFromName = ownerName
          task.delegatedAt = operatedAt
        }
        return
      }

      if (task.delegatedFromId && task.handlerId !== ownerId) {
        changedTasks.push(`${task.handlerName || task.handlerId}->${ownerName}`)
        task.handlerId = ownerId
        task.handlerName = ownerName
        task.delegatedFromId = undefined
        task.delegatedFromName = undefined
        task.delegatedAt = undefined
      }
    })

    if (changedTasks.length === 0)
      return

    appendTrail(record, {
      id: toTimestampId('trail'),
      action: 'delegate',
      status: record.status,
      operatorId: 'system',
      operatorName: '系统自动治理',
      operatedAt,
      comment: `代理同步：${changedTasks.join('；')}`,
    })

    pushNotification({
      approvalId: record.id,
      title: '代理审批已接管',
      content: `《${record.title}》任务处理人已根据代理规则自动同步。`,
      type: 'info',
    })
  })
}

function runApprovalAutomation(): void {
  const now = new Date()
  runAutoEscalation(now)
  runDelegationSync(now)

  mockApprovalRecords.forEach(recalcProgress)
}

function mapActionToStatus(action: ApprovalAction): ApprovalStatus {
  switch (action) {
    case 'approve':
      return 'approved'
    case 'reject':
      return 'rejected'
    case 'withdraw':
      return 'withdrawn'
    case 'cancel':
      return 'cancelled'
    case 'transfer':
      return 'transferred'
    case 'addSign':
    case 'remind':
    default:
      return 'pending'
  }
}

function toDateRange(range?: DateRange | null): [Date, Date] | null {
  if (!range?.[0] || !range?.[1])
    return null

  const start = new Date(range[0])
  const end = new Date(range[1])
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  return [start, end]
}

function appendTrail(record: ApprovalRecord, item: ApprovalTrailItem): void {
  if (!record.operatorTrail)
    record.operatorTrail = []
  record.operatorTrail.unshift(item)
}

function markTaskAs(
  task: ApprovalTask,
  status: ApprovalTaskStatus,
  operatedAt: string,
  comment?: string,
  handledBy?: { id: string, name: string },
): void {
  task.status = status
  task.taskStatus = status
  task.handledAt = operatedAt
  task.comment = comment
  if (handledBy)
    task.handledBy = handledBy
}

function findPendingTaskForOperator(record: ApprovalRecord, operatorId?: string, operatorName?: string): ApprovalTask | undefined {
  const pendingTasks = (record.workflowInstance?.tasks || []).filter(isTaskPending)
  if (pendingTasks.length === 0)
    return undefined

  if (operatorId) {
    const byId = pendingTasks.find(task => task.handlerId === operatorId)
    if (byId)
      return byId
  }

  if (operatorName) {
    const byName = pendingTasks.find(task => task.handlerName === operatorName)
    if (byName)
      return byName
  }

  return pendingTasks[0]
}

function closeOtherPendingTasks(record: ApprovalRecord, keepTaskId: string, operatedAt: string, operator: { id: string, name: string }): void {
  const tasks = record.workflowInstance?.tasks || []
  const currentNodeId = record.workflowInstance?.currentNodeId
  tasks.forEach((task) => {
    if (task.id === keepTaskId)
      return
    if (currentNodeId && task.nodeId && task.nodeId !== currentNodeId)
      return
    if (!isTaskPending(task))
      return
    markTaskAs(task, 'auto-closed', operatedAt, '节点已完成，自动关闭剩余任务', operator)
  })
}

function hasPendingTaskForAssignee(record: ApprovalRecord, assigneeId?: string): boolean {
  if (!assigneeId)
    return true

  const tasks = record.workflowInstance?.tasks || []
  return tasks.some(task => task.handlerId === assigneeId && isTaskPending(task))
}

function getCurrentNodeTasks(record: ApprovalRecord): ApprovalTask[] {
  const tasks = record.workflowInstance?.tasks || []
  const nodeId = record.workflowInstance?.currentNodeId
  if (!nodeId)
    return tasks
  return tasks.filter(task => task.nodeId === nodeId)
}

function getCurrentProgressText(record: ApprovalRecord): string {
  const completed = record.workflowInstance?.progress?.completed ?? 0
  const total = record.workflowInstance?.progress?.total ?? 0
  return `${completed}/${total}`
}

function getRemainingApproverNames(record: ApprovalRecord): string[] {
  return getCurrentNodeTasks(record)
    .filter(isTaskPending)
    .map(task => task.handlerName || task.handlerId)
}

/**
 * 获取审批列表
 */
export async function getApprovalList(
  params: PageParams & {
    status?: string
    keyword?: string
    type?: string
    dateRange?: DateRange | null
    assigneeId?: string
  },
): Promise<PageResult<ApprovalRecord>> {
  if (useRemoteApprovalApi())
    return remoteGetApprovalList(params)

  await sleep(LIST_DELAY_MS)
  ensureAllRecordsDefaults()
  runApprovalAutomation()

  let filteredList = [...mockApprovalRecords]

  if (params.status) {
    filteredList = filteredList.filter(item => item.status === params.status)
  }

  if (params.keyword?.trim()) {
    const keyword = params.keyword.trim().toLowerCase()
    filteredList = filteredList.filter((item) => {
      const haystack = [item.title, item.applicant, item.description, item.currentNodeName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(keyword)
    })
  }

  if (params.type) {
    filteredList = filteredList.filter(item => item.type === params.type)
  }

  if (params.assigneeId) {
    filteredList = filteredList.filter((item) => {
      if (item.status !== 'pending')
        return false
      return hasPendingTaskForAssignee(item, params.assigneeId)
    })
  }

  const normalizedRange = toDateRange(params.dateRange)
  if (normalizedRange) {
    const [start, end] = normalizedRange
    filteredList = filteredList.filter((item) => {
      const applyDate = parseDateTime(item.applyTime)
      return applyDate >= start && applyDate <= end
    })
  }

  const start = (params.page - 1) * params.pageSize
  const end = start + params.pageSize

  return {
    list: filteredList.slice(start, end),
    total: filteredList.length,
    page: params.page,
    pageSize: params.pageSize,
  }
}

/**
 * 获取审批详情
 */
export async function getApprovalDetail(id: string): Promise<ApprovalRecord | null> {
  if (useRemoteApprovalApi())
    return remoteGetApprovalDetail(id)

  await sleep(DETAIL_DELAY_MS)
  ensureAllRecordsDefaults()
  runApprovalAutomation()

  const record = mockApprovalRecords.find(item => item.id === id)
  if (!record)
    return null

  return ensureRecordDefaults(record)
}

/**
 * 提交审批申请（创建）
 */
export async function submitApproval(
  data: Omit<ApprovalRecord, 'id' | 'status' | 'applyTime'>,
): Promise<ApprovalRecord> {
  if (useRemoteApprovalApi())
    return remoteSubmitApproval(data)

  await sleep(SUBMIT_DELAY_MS)

  const now = new Date()
  const applyTime = formatDateTime(now)
  const initialStrategy = resolveNodeStrategy({
    ...data,
    id: '',
    status: 'pending',
    applyTime,
    applicant: data.applicant || '当前用户',
    title: data.title || '通用审批申请',
    type: data.type || 'other',
  } as ApprovalRecord)

  // 条件起始路由：带流程定义时按表单数据定位第一个审批节点
  const workflowId = data.workflowId || resolveWorkflowIdByType(data.type)
  const startWorkflow = resolveWorkflowById(workflowId)
  const startApprovalNodeId = startWorkflow
    ? resolveStartApprovalNodeId(startWorkflow, data.formData)
    : undefined

  let nodeId = initialStrategy.nodeId
  let nodeName = initialStrategy.nodeName
  let nodeMode = initialStrategy.mode
  let nodeAssignees = initialStrategy.assignees

  if (startWorkflow && startApprovalNodeId) {
    const startNode = startWorkflow.nodes.find(item => item.id === startApprovalNodeId)
    const startAssignees = normalizeAssignees(startNode?.handler?.assignees)
    nodeId = startApprovalNodeId
    nodeName = startNode?.name || initialStrategy.nodeName
    nodeMode = resolveNodeMode(startNode?.handler?.mode)
    if (startAssignees.length > 0)
      nodeAssignees = startAssignees
  }

  const initialTasks = createTasksForAssignees(nodeId, nodeAssignees)
  const modeText = nodeMode === 'and' ? '会签' : '或签'

  const newRecord: ApprovalRecord = ensureRecordDefaults({
    ...data,
    id: toTimestampId('APPROVE'),
    status: 'pending',
    applyTime,
    title: data.title || '通用审批申请',
    type: data.type || 'other',
    applicant: data.applicant || '当前用户',
    workflowId,
    currentNodeName: nodeName,
    deadlineAt: data.deadlineAt || formatDateTime(plusHours(now, DEFAULT_SLA_HOURS)),
    latestComment: data.latestComment,
    latestAttachments: normalizeAttachments(data.latestAttachments),
    workflowInstance: {
      currentNodeId: nodeId,
      currentNodeMode: nodeMode,
      currentNodeAssignees: nodeAssignees,
      progress: {
        completed: 0,
        total: initialTasks.length,
      },
      tasks: initialTasks,
    },
    operatorTrail: [
      {
        id: toTimestampId('trail'),
        action: 'create',
        status: 'pending',
        operatorName: data.applicant || '当前用户',
        operatedAt: applyTime,
        comment: data.description,
        attachments: normalizeAttachments(data.latestAttachments),
      },
    ],
  })

  mockApprovalRecords.unshift(newRecord)

  pushNotification({
    approvalId: newRecord.id,
    title: '新审批待处理',
    content: `《${newRecord.title}》已发起，当前节点为${modeText}（${newRecord.workflowInstance?.progress?.completed || 0}/${newRecord.workflowInstance?.progress?.total || 0}）。`,
    type: 'info',
  })

  return newRecord
}

export interface ProcessApprovalPayload {
  id: string
  action: ApprovalAction
  comment?: unknown
  commentText?: string
  attachments?: string[]
  targetUserId?: string
  targetUserName?: string
  operatorId?: string
  operatorName?: string
}

/**
 * 处理审批动作（审批闭环增强）
 */
export async function processApproval(
  payload: ProcessApprovalPayload,
): Promise<ApprovalRecord> {
  if (useRemoteApprovalApi())
    return remoteProcessApproval(payload)

  await sleep(PROCESS_DELAY_MS)
  ensureAllRecordsDefaults()
  runApprovalAutomation()

  const record = mockApprovalRecords.find(item => item.id === payload.id)
  if (!record)
    throw new Error('approval-not-found')

  ensureRecordDefaults(record)

  const comment = resolveCommentText(payload)
  const attachments = normalizeAttachments(payload.attachments)
  const operatedAt = formatDateTime(new Date())
  const operatorName = payload.operatorName?.trim() || '当前用户'
  const operatorId = payload.operatorId?.trim() || operatorName
  const operator = { id: operatorId, name: operatorName }
  const currentMode = record.workflowInstance?.currentNodeMode || 'or'
  let decisionSummary: string | undefined

  record.latestComment = comment
  record.latestAttachments = attachments

  if (payload.action === 'approve' || payload.action === 'reject') {
    const processingTask = findPendingTaskForOperator(record, payload.operatorId, payload.operatorName)
    if (!processingTask)
      throw new Error('approval-task-not-found')

    const currentNodeTasks = getCurrentNodeTasks(record)
    const nextTaskStatus: ApprovalTaskStatus = payload.action === 'approve' ? 'approved' : 'rejected'
    markTaskAs(processingTask, nextTaskStatus, operatedAt, comment, operator)
    recalcProgress(record)

    if (payload.action === 'approve') {
      if (currentMode === 'or') {
        closeOtherPendingTasks(record, processingTask.id, operatedAt, operator)
        const advanced = advanceWorkflow(record, operator, operatedAt)
        if (!advanced) {
          record.status = 'approved'
          record.currentNodeName = '审批完成'
        }
        recalcProgress(record)
        decisionSummary = advanced
          ? `或签通过，${operator.name} 处理后流程推进至「${record.currentNodeName}」（进度 ${getCurrentProgressText(record)}）`
          : `或签通过，${operator.name} 处理后自动关闭其余任务（进度 ${getCurrentProgressText(record)}）`
        pushNotification({
          approvalId: record.id,
          title: advanced ? '流程推进' : '审批已通过',
          content: advanced
            ? `《${record.title}》当前节点已完成，已推进至「${record.currentNodeName}」。`
            : `《${record.title}》已通过或签策略完成审批（${getCurrentProgressText(record)}）。`,
          type: advanced ? 'info' : 'success',
        })
      }
      else {
        const allApproved = currentNodeTasks.every(
          task => normalizeTaskStatus(task.taskStatus || task.status) === 'approved',
        )
        if (allApproved) {
          const advanced = advanceWorkflow(record, operator, operatedAt)
          if (!advanced) {
            record.status = 'approved'
            record.currentNodeName = '审批完成'
          }
          decisionSummary = advanced
            ? `会签全部通过，流程推进至「${record.currentNodeName}」（进度 ${getCurrentProgressText(record)}）`
            : `会签全部通过，节点完成（进度 ${getCurrentProgressText(record)}）`
          pushNotification({
            approvalId: record.id,
            title: advanced ? '流程推进' : '审批已通过',
            content: advanced
              ? `《${record.title}》会签已全部通过，已推进至「${record.currentNodeName}」。`
              : `《${record.title}》会签已全部通过。`,
            type: advanced ? 'info' : 'success',
          })
        }
        else {
          record.status = 'pending'
          record.currentNodeName = `会签进行中（${getCurrentProgressText(record)}）`
          const pendingNames = getRemainingApproverNames(record)
          decisionSummary = `会签待处理，剩余处理人：${pendingNames.join('、') || '-'}（进度 ${getCurrentProgressText(record)}）`
          pushNotification({
            approvalId: record.id,
            title: '会签进度更新',
            content: `《${record.title}》会签进度 ${getCurrentProgressText(record)}，待 ${pendingNames.join('、')} 处理。`,
            type: 'info',
          })
        }
      }
    }

    if (payload.action === 'reject') {
      if (currentMode === 'and') {
        closeOtherPendingTasks(record, processingTask.id, operatedAt, operator)
        record.status = 'rejected'
        record.currentNodeName = '已驳回'
        recalcProgress(record)
        decisionSummary = `会签任一驳回即结束，${operator.name} 已驳回`
        pushNotification({
          approvalId: record.id,
          title: '审批被驳回',
          content: `《${record.title}》会签中出现驳回，流程结束。`,
          type: 'error',
        })
      }
      else {
        const allRejected = currentNodeTasks.every(
          task => normalizeTaskStatus(task.taskStatus || task.status) === 'rejected',
        )
        if (allRejected) {
          record.status = 'rejected'
          record.currentNodeName = '已驳回'
          decisionSummary = `或签全部驳回，流程结束`
          pushNotification({
            approvalId: record.id,
            title: '审批被驳回',
            content: `《${record.title}》或签结果为全部驳回。`,
            type: 'error',
          })
        }
        else {
          record.status = 'pending'
          record.currentNodeName = `或签待处理（${getCurrentProgressText(record)}）`
          const pendingNames = getRemainingApproverNames(record)
          decisionSummary = `或签仍待处理，剩余处理人：${pendingNames.join('、') || '-'}（进度 ${getCurrentProgressText(record)}）`
          pushNotification({
            approvalId: record.id,
            title: '或签进度更新',
            content: `《${record.title}》仍在或签处理中，待 ${pendingNames.join('、')} 处理。`,
            type: 'warning',
          })
        }
      }
    }
  }

  if (payload.action === 'transfer') {
    const targetUserId = payload.targetUserId || 'unassigned-user'
    const targetUserName = payload.targetUserName || targetUserId
    const processingTask = findPendingTaskForOperator(record, payload.operatorId, payload.operatorName)
    if (processingTask)
      markTaskAs(processingTask, 'transferred', operatedAt, comment, operator)

    record.status = mapActionToStatus(payload.action)
    record.currentNodeName = `已转交（${targetUserName}）`
    record.workflowInstance?.tasks?.unshift(
      buildPendingTask(record.workflowInstance?.currentNodeId || 'node-default-approval', targetUserId, targetUserName),
    )
    if (record.workflowInstance) {
      record.workflowInstance.currentNodeAssignees = normalizeAssignees([
        ...(record.workflowInstance.currentNodeAssignees || []),
        { id: targetUserId, name: targetUserName },
      ])
    }
    recalcProgress(record)

    pushNotification({
      approvalId: record.id,
      title: '审批已转交',
      content: `《${record.title}》已转交给 ${targetUserName}。`,
      type: 'warning',
    })
  }

  if (payload.action === 'addSign') {
    const targetUserId = payload.targetUserId || 'cosign-user'
    const targetUserName = payload.targetUserName || targetUserId

    record.status = 'pending'
    record.currentNodeName = `加签中（${targetUserName}）`
    if (!record.workflowInstance)
      record.workflowInstance = {}
    if (!record.workflowInstance.tasks)
      record.workflowInstance.tasks = []
    record.workflowInstance.tasks.unshift(
      buildPendingTask(record.workflowInstance.currentNodeId || 'node-default-approval', targetUserId, targetUserName),
    )
    const nextAssignees = normalizeAssignees([
      ...(record.workflowInstance.currentNodeAssignees || []),
      { id: targetUserId, name: targetUserName },
    ])
    record.workflowInstance.currentNodeAssignees = nextAssignees
    recalcProgress(record)

    pushNotification({
      approvalId: record.id,
      title: '审批已加签',
      content: `《${record.title}》已发起加签，处理人：${targetUserName}。`,
      type: 'info',
    })
  }

  if (payload.action === 'remind') {
    record.status = 'pending'
    record.currentNodeName = '已催办'
    record.remindCount = (record.remindCount || 0) + 1
    record.lastRemindAt = operatedAt

    pushNotification({
      approvalId: record.id,
      title: '审批催办提醒',
      content: `《${record.title}》已催办 ${record.remindCount} 次。`,
      type: 'warning',
    })
  }

  if (payload.action === 'withdraw' || payload.action === 'cancel') {
    const nextStatus = mapActionToStatus(payload.action)
    record.status = nextStatus
    record.currentNodeName = payload.action === 'withdraw' ? '已撤回' : '已取消'
    record.workflowInstance?.tasks?.forEach((task) => {
      if (isTaskPending(task))
        markTaskAs(task, 'cancelled', operatedAt, comment, operator)
    })
    recalcProgress(record)

    pushNotification({
      approvalId: record.id,
      title: payload.action === 'withdraw' ? '审批已撤回' : '审批已取消',
      content: payload.action === 'withdraw'
        ? `《${record.title}》已由发起人撤回。`
        : `《${record.title}》已取消。`,
      type: 'info',
    })
  }

  appendTrail(record, {
    id: toTimestampId('trail'),
    action: payload.action,
    status: record.status,
    operatorId,
    operatorName,
    operatedAt,
    comment: decisionSummary ? [comment, decisionSummary].filter(Boolean).join(' | ') : comment,
    attachments,
    targetUserId: payload.targetUserId,
    targetUserName: payload.targetUserName,
  })

  return record
}

/**
 * 获取工作台统计（含审批超时与催办联动）
 */
export interface BatchProcessApprovalPayload {
  ids: string[]
  action: 'approve' | 'reject'
  commentText?: string
  operatorId?: string
  operatorName?: string
}

export interface BatchProcessApprovalResultItem {
  id: string
  success: boolean
  title?: string
  status?: string
  error?: string
}

export interface BatchProcessApprovalResult {
  results: BatchProcessApprovalResultItem[]
  succeeded: number
  failed: number
}

/**
 * 批量审批：real 走 BFF 批量端点，mock 本地逐条处理（复用单条逻辑）。
 */
export async function batchProcessApprovals(payload: BatchProcessApprovalPayload): Promise<BatchProcessApprovalResult> {
  if (useRemoteApprovalApi())
    return remoteBatchProcessApprovals(payload)

  await sleep(PROCESS_DELAY_MS)
  const results: BatchProcessApprovalResultItem[] = []
  for (const id of payload.ids) {
    try {
      const record = await processApproval({
        id,
        action: payload.action,
        commentText: payload.commentText,
        operatorId: payload.operatorId,
        operatorName: payload.operatorName,
      })
      results.push({ id, success: true, title: record.title, status: record.status })
    }
    catch (error) {
      results.push({ id, success: false, error: error instanceof Error ? error.message : String(error) })
    }
  }
  return {
    results,
    succeeded: results.filter(item => item.success).length,
    failed: results.filter(item => !item.success).length,
  }
}
export async function getWorkbenchStats(): Promise<WorkbenchStats> {
  if (useRemoteApprovalApi())
    return remoteGetWorkbenchStats()

  await sleep(STATS_DELAY_MS)
  ensureAllRecordsDefaults()
  runApprovalAutomation()

  const overdueCount = mockApprovalRecords.filter(item => item.status === 'pending' && isOverdue(item.deadlineAt)).length
  const escalatedCount = mockApprovalRecords.filter(item => !!item.escalatedAt).length
  const remindedCount = mockApprovalRecords.reduce((sum, item) => sum + (item.remindCount || 0), 0)

  return {
    pendingCount: mockApprovalRecords.filter(item => item.status === 'pending').length,
    myApplicationCount: mockApprovalRecords.length,
    approvedCount: mockApprovalRecords.filter(item => item.status === 'approved').length,
    rejectedCount: mockApprovalRecords.filter(item => item.status === 'rejected').length,
    overdueCount,
    escalatedCount,
    remindedCount,
  }
}

/**
 * 获取审批通知列表（用于工作台联动展示）
 */
export async function getApprovalNotifications(limit = 20): Promise<ApprovalNotification[]> {
  if (useRemoteApprovalApi())
    return remoteGetApprovalNotifications(limit)

  await sleep(120)
  ensureAllRecordsDefaults()
  runApprovalAutomation()
  return approvalNotifications.slice(0, limit)
}

/**
 * 获取当前用户的审批代理规则
 */
export async function getApprovalDelegation(ownerId: string): Promise<ApprovalDelegationRule | null> {
  if (useRemoteApprovalApi())
    return remoteGetApprovalDelegation(ownerId)

  await sleep(120)
  const normalizedOwnerId = ownerId.trim()
  if (!normalizedOwnerId)
    return null

  const found = approvalDelegationRules.find(rule => rule.ownerId === normalizedOwnerId)
  return found ? { ...found } : null
}

/**
 * 创建或更新审批代理规则
 */
export async function upsertApprovalDelegation(rule: ApprovalDelegationRule): Promise<ApprovalDelegationRule> {
  if (useRemoteApprovalApi())
    return remoteUpsertApprovalDelegation(rule)

  await sleep(180)

  const ownerId = rule.ownerId.trim()
  const ownerName = rule.ownerName.trim() || ownerId
  const delegateId = rule.delegateId.trim()
  const delegateName = rule.delegateName.trim() || delegateId
  const nextRule: ApprovalDelegationRule = {
    ownerId,
    ownerName,
    delegateId,
    delegateName,
    startAt: rule.startAt,
    endAt: rule.endAt,
    enabled: rule.enabled,
    updatedAt: formatDateTime(new Date()),
  }

  const index = approvalDelegationRules.findIndex(item => item.ownerId === ownerId)
  if (index >= 0)
    approvalDelegationRules[index] = nextRule
  else
    approvalDelegationRules.unshift(nextRule)

  ensureAllRecordsDefaults()
  runApprovalAutomation()
  return { ...nextRule }
}

/**
 * 禁用审批代理规则
 */
export async function disableApprovalDelegation(ownerId: string): Promise<void> {
  if (useRemoteApprovalApi())
    return remoteDisableApprovalDelegation(ownerId)

  await sleep(120)
  const normalizedOwnerId = ownerId.trim()
  const found = approvalDelegationRules.find(rule => rule.ownerId === normalizedOwnerId)
  if (!found)
    return

  found.enabled = false
  found.updatedAt = formatDateTime(new Date())

  ensureAllRecordsDefaults()
  runApprovalAutomation()
}

/**
 * 仅供测试：重置审批运行时缓存
 */
export function __resetApprovalRuntimeState(): void {
  approvalNotifications.splice(0, approvalNotifications.length)
  approvalDelegationRules.splice(0, approvalDelegationRules.length)
}

/**
 * 获取消息列表（分页）
 */
export async function getMessageList(params: PageParams & {
  type?: MessageType | 'all'
  read?: boolean
}): Promise<PageResult<MessageRecord>> {
  if (useRemoteApprovalApi())
    return remoteGetMessageList(params)

  await sleep(LIST_DELAY_MS)

  let filtered = [...mockMessageRecords]

  // 按类型筛选
  if (params.type && params.type !== 'all') {
    filtered = filtered.filter(item => item.type === params.type)
  }

  // 按已读/未读筛选
  if (params.read !== undefined) {
    filtered = filtered.filter(item => item.read === params.read)
  }

  // 按创建时间倒序排序
  filtered.sort((a, b) => parseDateTime(b.createdAt).getTime() - parseDateTime(a.createdAt).getTime())

  const total = filtered.length
  const start = (params.page - 1) * params.pageSize
  const end = start + params.pageSize
  const list = filtered.slice(start, end)

  return {
    list,
    total,
    page: params.page,
    pageSize: params.pageSize,
  }
}

/**
 * 标记消息已读
 */
export async function markMessageAsRead(id: string): Promise<void> {
  if (useRemoteApprovalApi())
    return remoteMarkMessageAsRead(id)

  await sleep(200)
  const message = mockMessageRecords.find(item => item.id === id)
  if (message && !message.read) {
    message.read = true
    message.readTime = formatDateTime(new Date())
  }
}

/**
 * 批量标记消息已读
 */
export async function batchMarkAsRead(ids: string[]): Promise<void> {
  if (useRemoteApprovalApi())
    return remoteBatchMarkAsRead(ids)

  await sleep(300)
  const now = formatDateTime(new Date())
  ids.forEach((id) => {
    const message = mockMessageRecords.find(item => item.id === id)
    if (message && !message.read) {
      message.read = true
      message.readTime = now
    }
  })
}

/**
 * 全部标记已读
 */
export async function markAllAsRead(): Promise<void> {
  if (useRemoteApprovalApi())
    return remoteMarkAllAsRead()

  await sleep(400)
  const now = formatDateTime(new Date())
  mockMessageRecords.forEach((message) => {
    if (!message.read) {
      message.read = true
      message.readTime = now
    }
  })
}

/**
 * 删除消息
 */
export async function deleteMessage(id: string): Promise<void> {
  if (useRemoteApprovalApi())
    return remoteDeleteMessage(id)

  await sleep(200)
  const index = mockMessageRecords.findIndex(item => item.id === id)
  if (index !== -1) {
    mockMessageRecords.splice(index, 1)
  }
}

/**
 * 批量删除消息
 */
export async function batchDeleteMessages(ids: string[]): Promise<void> {
  if (useRemoteApprovalApi())
    return remoteBatchDeleteMessages(ids)

  await sleep(300)
  ids.forEach((id) => {
    const index = mockMessageRecords.findIndex(item => item.id === id)
    if (index !== -1) {
      mockMessageRecords.splice(index, 1)
    }
  })
}

/**
 * 获取未读消息数
 */
export async function getUnreadCount(): Promise<number> {
  if (useRemoteApprovalApi())
    return remoteGetUnreadCount()

  await sleep(100)
  return mockMessageRecords.filter(item => !item.read).length
}

// ==================== 抄送相关 API ====================

/**
 * 获取抄送列表
 */
export async function getCCList(params: PageParams & {
  keyword?: string
  status?: ApprovalStatus
  read?: boolean
  dateRange?: DateRange | null
}): Promise<PageResult<CCRecord>> {
  if (useRemoteApprovalApi())
    return remoteGetCCList(params)

  await sleep(LIST_DELAY_MS)

  let filtered = [...mockCCRecords]

  // 按关键词筛选（标题、申请人）
  if (params.keyword) {
    const keyword = params.keyword.toLowerCase()
    filtered = filtered.filter(
      item =>
        item.title.toLowerCase().includes(keyword)
        || item.applicant.toLowerCase().includes(keyword),
    )
  }

  // 按状态筛选
  if (params.status) {
    filtered = filtered.filter(item => item.status === params.status)
  }

  // 按已读/未读筛选
  if (params.read !== undefined) {
    filtered = filtered.filter(item => item.read === params.read)
  }

  // 按日期范围筛选
  if (params.dateRange && params.dateRange.length === 2) {
    const [start, end] = params.dateRange
    filtered = filtered.filter((item) => {
      const ccTime = parseDateTime(item.ccTime)
      return ccTime >= start && ccTime <= end
    })
  }

  // 按抄送时间倒序排序
  filtered.sort((a, b) => parseDateTime(b.ccTime).getTime() - parseDateTime(a.ccTime).getTime())

  const total = filtered.length
  const start = (params.page - 1) * params.pageSize
  const end = start + params.pageSize
  const list = filtered.slice(start, end)

  return {
    list,
    total,
    page: params.page,
    pageSize: params.pageSize,
  }
}

/**
 * 标记抄送为已读
 */
export async function markCCAsRead(id: string): Promise<void> {
  if (useRemoteApprovalApi())
    return remoteMarkCCAsRead(id)

  await sleep(200)
  const record = mockCCRecords.find(item => item.id === id)
  if (record && !record.read) {
    record.read = true
    record.readTime = formatDateTime(new Date())
  }
}

/**
 * 批量标记抄送为已读
 */
export async function batchMarkCCAsRead(ids: string[]): Promise<void> {
  if (useRemoteApprovalApi())
    return remoteBatchMarkCCAsRead(ids)

  await sleep(300)
  const now = formatDateTime(new Date())
  ids.forEach((id) => {
    const record = mockCCRecords.find(item => item.id === id)
    if (record && !record.read) {
      record.read = true
      record.readTime = now
    }
  })
}

/**
 * 获取抄送未读数量
 */
export async function getCCUnreadCount(): Promise<number> {
  if (useRemoteApprovalApi())
    return remoteGetCCUnreadCount()

  await sleep(100)
  return mockCCRecords.filter(item => !item.read).length
}
