import type {
  ApprovalAction,
  ApprovalDelegationRule,
  ApprovalRecord,
  ApprovalStatus,
  ApprovalTask,
  ApprovalTaskStatus,
  ApprovalTrailItem,
  MessageRecord,
  MessageType,
  RuntimeState,
  WorkbenchStats,
  WorkflowDefinition,
  WorkflowNode,
} from '../domain.js'
import { nowText, parseTime, toDateRange, uid } from '../utils.js'
import { evaluateCondition } from './workflow-service.js'

const DEFAULT_SLA_HOURS = 48
const ESCALATION_ASSIGNEE_MAP: Record<string, { id: string, name: string }> = {
  'user-001': { id: 'user-002', name: 'manager' },
  'user-002': { id: 'user-001', name: 'admin' },
}

interface ApprovalNodeStrategy {
  nodeId: string
  nodeName: string
  mode: 'and' | 'or'
  assignees: Array<{ id: string, name: string }>
}

export interface ApprovalListQuery {
  page: number
  pageSize: number
  status?: string
  keyword?: string
  type?: string
  dateRange?: [Date, Date] | null
  assigneeId?: string
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

function normalizeAssignees(input?: Array<{ id: string, name?: string }>): Array<{ id: string, name: string }> {
  if (!input?.length)
    return []
  return input
    .map(item => ({ id: item.id?.trim(), name: item.name?.trim() || item.id?.trim() }))
    .filter(item => Boolean(item.id)) as Array<{ id: string, name: string }>
}

function findActiveDelegationRule(state: RuntimeState, ownerId?: string, now = new Date()): ApprovalDelegationRule | undefined {
  if (!ownerId)
    return undefined
  return state.approvalDelegations.find((rule) => {
    if (!rule.enabled || rule.ownerId !== ownerId)
      return false
    const start = parseTime(rule.startAt).getTime()
    const end = parseTime(rule.endAt).getTime()
    const current = now.getTime()
    return current >= start && current <= end
  })
}

function resolveEscalationAssignee(ownerId?: string): { id: string, name: string } | undefined {
  if (!ownerId)
    return undefined
  return ESCALATION_ASSIGNEE_MAP[ownerId]
}

function buildPendingTask(
  state: RuntimeState,
  nodeId: string,
  ownerId: string,
  ownerName: string,
  now = new Date(),
): ApprovalTask {
  const rule = findActiveDelegationRule(state, ownerId, now)
  return {
    id: uid('task'),
    nodeId,
    handlerId: rule?.delegateId || ownerId,
    handlerName: rule?.delegateName || ownerName,
    ownerId,
    ownerName,
    delegatedFromId: rule ? ownerId : undefined,
    delegatedFromName: rule ? ownerName : undefined,
    delegatedAt: rule ? nowText(now) : undefined,
    status: 'pending',
    taskStatus: 'pending',
  }
}

function resolveWorkflowByType(state: RuntimeState, type: string) {
  if (type === 'leave')
    return state.workflows.find(item => item.id === 'wf-001')
  return state.workflows.find(item => item.status === 'active')
}

function resolveApprovalNode(workflow?: RuntimeState['workflows'][number], nodeId?: string) {
  if (!workflow)
    return undefined
  if (nodeId) {
    const target = workflow.nodes.find(item => item.id === nodeId)
    if (target)
      return target
  }
  return workflow.nodes.find(item => item.type === 'approval')
}

function outgoingTargets(workflow: WorkflowDefinition, fromNodeId?: string): string[] {
  if (!fromNodeId)
    return []
  return workflow.edges
    .filter(edge => edge.source === fromNodeId)
    .map(edge => edge.target)
}

function nodeConditionsMet(node: WorkflowNode, formData?: Record<string, unknown>): boolean {
  const conditions = node.conditions || []
  if (conditions.length === 0)
    return true
  return conditions.every((condition) => {
    const fieldKey = condition.field || ''
    const fieldValue = fieldKey ? formData?.[fieldKey] : undefined
    return evaluateCondition(condition.operator, fieldValue, condition.value)
  })
}

/**
 * 从当前节点沿流程定义出边路由，穿过 condition / cc 中间节点，返回下一个审批节点。
 * condition 节点语义：命中（AND）走第一条出边；未命中走第二条出边（默认分支）；
 * 单出边时不区分命中直接通过。途经 cc 节点记录但不阻塞。
 */
function resolveNodeRoute(
  workflow: WorkflowDefinition,
  fromNodeId: string | undefined,
  formData?: Record<string, unknown>,
): { nextApprovalNodeId?: string, ccNodeIds: string[], notes: string[] } {
  const notes: string[] = []
  const ccNodeIds: string[] = []
  let cursor = fromNodeId
  for (let guard = 0; guard < 50; guard += 1) {
    const targets = outgoingTargets(workflow, cursor)
    if (targets.length === 0)
      return { ccNodeIds, notes }
    const cursorNode = workflow.nodes.find(item => item.id === cursor)
    let targetId = targets[0]
    if (cursorNode?.type === 'condition') {
      const met = nodeConditionsMet(cursorNode, formData)
      if (!met && targets.length > 1) {
        targetId = targets[1]
        notes.push(`条件未命中「${cursorNode.name}」，走默认分支`)
      }
      else {
        notes.push(`条件${met ? '命中' : '未命中（无默认分支，按主分支继续）'}「${cursorNode.name}」`)
      }
    }
    const targetNode = workflow.nodes.find(item => item.id === targetId)
    if (!targetNode)
      return { ccNodeIds, notes }
    if (targetNode.type === 'approval')
      return { nextApprovalNodeId: targetNode.id, ccNodeIds, notes }
    if (targetNode.type === 'cc') {
      ccNodeIds.push(targetNode.id)
      cursor = targetNode.id
      continue
    }
    if (targetNode.type === 'end')
      return { ccNodeIds, notes }
    cursor = targetNode.id
  }
  return { ccNodeIds, notes }
}

function resolveStartApprovalNodeId(workflow: WorkflowDefinition, formData?: Record<string, unknown>): string | undefined {
  const startNode = workflow.nodes.find(item => item.type === 'start')
  if (!startNode)
    return undefined
  return resolveNodeRoute(workflow, startNode.id, formData).nextApprovalNodeId
}

function createCcRecordForNode(state: RuntimeState, record: ApprovalRecord, ccNode: WorkflowNode, operatedAt: string): void {
  const ccUsers = normalizeAssignees(ccNode.handler?.assignees)
  for (const user of ccUsers) {
    state.ccRecords.unshift({
      id: uid('cc'),
      approvalId: record.id,
      title: record.title,
      type: record.type,
      status: record.status,
      applicant: record.applicant,
      applicantAvatar: record.applicantAvatar,
      ccTime: operatedAt,
      ccNodeName: ccNode.name,
      read: false,
      amount: record.amount,
      description: record.description,
    })
    pushMessage(state, {
      title: '审批抄送',
      content: `《${record.title}》已抄送至「${ccNode.name}」节点。`,
      type: 'cc',
      relatedId: record.id,
    })
  }
}

function advanceWorkflow(state: RuntimeState, record: ApprovalRecord, operator: { id?: string, name: string }, operatedAt: string, depth = 0): boolean {
  const workflow = resolveWorkflowByType(state, record.type)
  const instance = record.workflowInstance
  if (!workflow || !workflow.nodes?.length || !instance || depth > 50)
    return false
  const route = resolveNodeRoute(workflow, instance.currentNodeId, record.formData)
  for (const ccNodeId of route.ccNodeIds) {
    const ccNode = workflow.nodes.find(item => item.id === ccNodeId)
    if (ccNode)
      createCcRecordForNode(state, record, ccNode, operatedAt)
  }
  if (!route.nextApprovalNodeId) {
    record.status = 'approved'
    record.currentNodeName = '审批完成'
    appendTrail(record, {
      id: uid('trail'),
      action: 'advance',
      status: 'approved',
      operatorId: 'system',
      operatorName: '流程引擎',
      operatedAt,
      comment: route.notes.length ? `流程到达终点（${route.notes.join('；')}）` : '流程已到达终点',
    })
    return true
  }
  const nextNode = workflow.nodes.find(item => item.id === route.nextApprovalNodeId)
  if (!nextNode)
    return false
  const assignees = normalizeAssignees(nextNode.handler?.assignees)
  if (assignees.length === 0) {
    appendTrail(record, {
      id: uid('trail'),
      action: 'advance',
      status: record.status,
      operatorId: 'system',
      operatorName: '流程引擎',
      operatedAt,
      comment: `节点「${nextNode.name}」未配置处理人，自动跳过`,
    })
    instance.currentNodeId = nextNode.id
    return advanceWorkflow(state, record, operator, operatedAt, depth + 1)
  }
  const mode = nextNode.handler?.mode === 'and' ? 'and' : 'or'
  const tasks = assignees.map(item => buildPendingTask(state, nextNode.id, item.id, item.name))
  instance.tasks = [...tasks, ...(instance.tasks || [])]
  instance.currentNodeId = nextNode.id
  instance.currentNodeMode = mode
  instance.currentNodeAssignees = assignees
  record.currentNodeName = nextNode.name
  record.status = 'pending'
  appendTrail(record, {
    id: uid('trail'),
    action: 'advance',
    status: 'pending',
    operatorId: operator.id,
    operatorName: operator.name,
    operatedAt,
    comment: `审批通过，流转至「${nextNode.name}」${route.notes.length ? `（${route.notes.join('；')}）` : ''}`,
  })
  pushApprovalNotice(state, {
    approvalId: record.id,
    title: '审批流转提醒',
    content: `《${record.title}》已流转至「${nextNode.name}」节点，等待处理。`,
    type: 'info',
  })
  pushMessage(state, {
    title: '新待办审批',
    content: `《${record.title}》已流转至「${nextNode.name}」节点。`,
    type: 'approval',
    relatedId: record.id,
  })
  state.approvalEvents.unshift({
    id: uid('evt'),
    eventType: 'approval.advanced',
    approvalId: record.id,
    happenedAt: operatedAt,
    payload: { toNodeId: nextNode.id, toNodeName: nextNode.name },
  })
  return true
}

function resolveNodeStrategy(state: RuntimeState, record: ApprovalRecord): ApprovalNodeStrategy {
  const workflow = resolveWorkflowByType(state, record.type)
  const approvalNode = resolveApprovalNode(workflow, record.workflowInstance?.currentNodeId)
  const assigneesFromNode = normalizeAssignees(approvalNode?.handler?.assignees)
  const assigneesFromRecord = normalizeAssignees(record.workflowInstance?.currentNodeAssignees)

  const assignees = assigneesFromNode.length
    ? assigneesFromNode
    : assigneesFromRecord.length
      ? assigneesFromRecord
      : [{ id: 'user-001', name: 'admin' }]

  const mode = record.workflowInstance?.currentNodeMode === 'and' ? 'and' : (approvalNode?.handler?.mode === 'and' ? 'and' : 'or')

  return {
    nodeId: approvalNode?.id || record.workflowInstance?.currentNodeId || 'node-approval',
    nodeName: approvalNode?.name || record.currentNodeName || '审批节点',
    mode,
    assignees,
  }
}

function recalcProgress(record: ApprovalRecord): void {
  const tasks = record.workflowInstance?.tasks || []
  const nodeId = record.workflowInstance?.currentNodeId
  const currentNodeTasks = nodeId ? tasks.filter(task => task.nodeId === nodeId) : tasks
  const total = currentNodeTasks.length
  const completed = currentNodeTasks.filter(task => !isTaskPending(task)).length

  if (!record.workflowInstance)
    record.workflowInstance = {}
  record.workflowInstance.progress = { completed, total }
}

function ensureRecordDefaults(state: RuntimeState, record: ApprovalRecord): ApprovalRecord {
  const strategy = resolveNodeStrategy(state, record)
  const applyDate = parseTime(record.applyTime)
  const tasks: ApprovalTask[] = (record.workflowInstance?.tasks || []).map((task) => {
    const taskStatus = normalizeTaskStatus(task.taskStatus || task.status)
    return {
      ...task,
      nodeId: task.nodeId || strategy.nodeId,
      handlerName: task.handlerName || task.handlerId,
      ownerId: task.ownerId || task.handlerId,
      ownerName: task.ownerName || task.handlerName || task.handlerId,
      status: taskStatus,
      taskStatus,
    }
  }) as ApprovalTask[]

  if (tasks.length === 0) {
    tasks.push(
      ...strategy.assignees.map(item =>
        buildPendingTask(state, strategy.nodeId, item.id, item.name),
      ),
    )
  }

  record.currentNodeName = record.currentNodeName || strategy.nodeName
  record.deadlineAt = record.deadlineAt || nowText(new Date(applyDate.getTime() + DEFAULT_SLA_HOURS * 60 * 60 * 1000))
  record.remindCount = record.remindCount ?? 0
  if (!record.workflowInstance)
    record.workflowInstance = {}
  record.workflowInstance.currentNodeId = record.workflowInstance.currentNodeId || strategy.nodeId
  record.workflowInstance.currentNodeMode = strategy.mode
  record.workflowInstance.currentNodeAssignees = strategy.assignees
  record.workflowInstance.tasks = tasks

  if (!record.operatorTrail?.length) {
    record.operatorTrail = [{
      id: uid('trail'),
      action: 'create',
      status: 'pending',
      operatorName: record.applicant,
      operatedAt: record.applyTime,
      comment: record.description,
    }]
  }

  recalcProgress(record)
  return record
}

function pushApprovalNotice(state: RuntimeState, notice: Omit<RuntimeState['approvalNotifications'][number], 'id' | 'createdAt'>): void {
  state.approvalNotifications.unshift({
    ...notice,
    id: uid('notice'),
    createdAt: nowText(new Date()),
  })
}

function pushMessage(state: RuntimeState, payload: Omit<MessageRecord, 'id' | 'createdAt' | 'read'>): MessageRecord {
  const message: MessageRecord = {
    ...payload,
    id: uid('msg'),
    createdAt: nowText(new Date()),
    read: false,
  }
  state.messages.unshift(message)
  return message
}

function appendTrail(record: ApprovalRecord, item: ApprovalTrailItem): void {
  if (!record.operatorTrail)
    record.operatorTrail = []
  record.operatorTrail.unshift(item)
}

function runAutoEscalation(state: RuntimeState, now = new Date()): void {
  const operatedAt = nowText(now)
  for (const record of state.approvals) {
    if (record.status !== 'pending' || !record.deadlineAt || record.escalatedAt)
      continue
    if (parseTime(record.deadlineAt).getTime() > now.getTime())
      continue

    ensureRecordDefaults(state, record)
    const currentNodeId = record.workflowInstance?.currentNodeId
    const pendingTasks = (record.workflowInstance?.tasks || []).filter((task) => {
      if (!isTaskPending(task))
        return false
      if (currentNodeId && task.nodeId && task.nodeId !== currentNodeId)
        return false
      return true
    })
    if (pendingTasks.length === 0)
      continue

    const affectedOwners = new Set<string>()
    for (const task of pendingTasks) {
      const ownerId = task.ownerId || task.handlerId
      const ownerName = task.ownerName || task.handlerName || task.handlerId
      const escalationTarget = resolveEscalationAssignee(ownerId)
      if (!escalationTarget)
        continue
      affectedOwners.add(`${ownerName}->${escalationTarget.name}`)
      task.ownerId = escalationTarget.id
      task.ownerName = escalationTarget.name
      task.handlerId = escalationTarget.id
      task.handlerName = escalationTarget.name
      task.delegatedFromId = undefined
      task.delegatedFromName = undefined
      task.delegatedAt = undefined
    }

    if (affectedOwners.size === 0)
      continue

    record.escalatedAt = operatedAt
    record.currentNodeName = `SLA升级处理中（${Array.from(affectedOwners).join('；')}）`
    appendTrail(record, {
      id: uid('trail'),
      action: 'escalate',
      status: record.status,
      operatorId: 'system',
      operatorName: '系统自动治理',
      operatedAt,
      comment: `SLA超时自动升级：${Array.from(affectedOwners).join('；')}`,
    })
    pushApprovalNotice(state, {
      approvalId: record.id,
      title: '审批已超时升级',
      content: `《${record.title}》触发 SLA 自动升级，已改派处理人。`,
      type: 'error',
    })
    pushMessage(state, {
      title: '审批升级提醒',
      content: `《${record.title}》触发 SLA 自动升级。`,
      type: 'approval',
      relatedId: record.id,
      priority: 'high',
    })
    state.approvalEvents.unshift({
      id: uid('evt'),
      eventType: 'approval.escalated',
      approvalId: record.id,
      happenedAt: operatedAt,
      payload: { affected: Array.from(affectedOwners) },
    })
  }
}

function runDelegationSync(state: RuntimeState, now = new Date()): void {
  const operatedAt = nowText(now)
  for (const record of state.approvals) {
    if (record.status !== 'pending')
      continue
    ensureRecordDefaults(state, record)
    const currentNodeId = record.workflowInstance?.currentNodeId
    const changed: string[] = []
    for (const task of record.workflowInstance?.tasks || []) {
      if (!isTaskPending(task))
        continue
      if (currentNodeId && task.nodeId && task.nodeId !== currentNodeId)
        continue
      const ownerId = task.ownerId || task.handlerId
      const ownerName = task.ownerName || task.handlerName || task.handlerId
      const activeRule = findActiveDelegationRule(state, ownerId, now)
      if (activeRule) {
        if (task.handlerId !== activeRule.delegateId) {
          changed.push(`${ownerName}->${activeRule.delegateName}`)
          task.handlerId = activeRule.delegateId
          task.handlerName = activeRule.delegateName
          task.delegatedFromId = ownerId
          task.delegatedFromName = ownerName
          task.delegatedAt = operatedAt
        }
        continue
      }
      if (task.delegatedFromId && task.handlerId !== ownerId) {
        changed.push(`${task.handlerName || task.handlerId}->${ownerName}`)
        task.handlerId = ownerId
        task.handlerName = ownerName
        task.delegatedFromId = undefined
        task.delegatedFromName = undefined
        task.delegatedAt = undefined
      }
    }

    if (changed.length === 0)
      continue
    appendTrail(record, {
      id: uid('trail'),
      action: 'delegate',
      status: record.status,
      operatorId: 'system',
      operatorName: '系统自动治理',
      operatedAt,
      comment: `代理同步：${changed.join('；')}`,
    })
    state.approvalEvents.unshift({
      id: uid('evt'),
      eventType: 'approval.delegated',
      approvalId: record.id,
      happenedAt: operatedAt,
      payload: { changed },
    })
  }
}

export function runApprovalAutomation(state: RuntimeState): void {
  for (const record of state.approvals)
    ensureRecordDefaults(state, record)
  runAutoEscalation(state)
  runDelegationSync(state)
  for (const record of state.approvals)
    recalcProgress(record)
}

export function cleanupIdempotency(state: RuntimeState): void {
  const now = Date.now()
  state.idempotency = state.idempotency.filter(item => parseTime(item.expiresAt).getTime() > now)
}

export function findIdempotentResponse<T>(state: RuntimeState, path: string, key: string): T | null {
  cleanupIdempotency(state)
  const item = state.idempotency.find(entry => entry.path === path && entry.key === key)
  return item ? (item.response as T) : null
}

export function saveIdempotentResponse<T>(
  state: RuntimeState,
  path: string,
  key: string,
  response: T,
  ttlHours: number,
): void {
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)
  state.idempotency.unshift({
    key,
    path,
    response,
    expiresAt: nowText(expiresAt),
  })
}

export function listApprovals(state: RuntimeState, params: ApprovalListQuery) {
  runApprovalAutomation(state)
  let filtered = [...state.approvals]

  if (params.status)
    filtered = filtered.filter(item => item.status === params.status)
  if (params.keyword?.trim()) {
    const keyword = params.keyword.trim().toLowerCase()
    filtered = filtered.filter((item) => {
      const haystack = [item.title, item.applicant, item.description, item.currentNodeName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(keyword)
    })
  }
  if (params.type)
    filtered = filtered.filter(item => item.type === params.type)
  if (params.assigneeId) {
    filtered = filtered.filter((record) => {
      const tasks = record.workflowInstance?.tasks || []
      return tasks.some(task => task.handlerId === params.assigneeId && isTaskPending(task))
    })
  }
  const dateRange = toDateRange(params.dateRange)
  if (dateRange) {
    const [start, end] = dateRange
    filtered = filtered.filter((item) => {
      const applyTime = parseTime(item.applyTime)
      return applyTime >= start && applyTime <= end
    })
  }

  filtered.sort((a, b) => parseTime(b.applyTime).getTime() - parseTime(a.applyTime).getTime())
  const page = Math.max(1, Number(params.page || 1))
  const pageSize = Math.max(1, Number(params.pageSize || 10))
  const start = (page - 1) * pageSize
  const end = start + pageSize
  return {
    list: filtered.slice(start, end),
    total: filtered.length,
    page,
    pageSize,
  }
}

export function getApprovalDetail(state: RuntimeState, id: string): ApprovalRecord | null {
  runApprovalAutomation(state)
  const record = state.approvals.find(item => item.id === id)
  if (!record)
    return null
  return record
}

function mapActionToStatus(action: ApprovalAction): ApprovalStatus {
  switch (action) {
    case 'approve': return 'approved'
    case 'reject': return 'rejected'
    case 'withdraw': return 'withdrawn'
    case 'cancel': return 'cancelled'
    case 'transfer': return 'transferred'
    default: return 'pending'
  }
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
    if (typeof objectComment.comment === 'string' && objectComment.comment.trim())
      return objectComment.comment.trim()
    return JSON.stringify(objectComment)
  }
  return String(payload.comment)
}

function findPendingTaskForOperator(record: ApprovalRecord, operatorId?: string, operatorName?: string): ApprovalTask | undefined {
  const pending = (record.workflowInstance?.tasks || []).filter(isTaskPending)
  if (pending.length === 0)
    return undefined
  if (operatorId) {
    const byId = pending.find(task => task.handlerId === operatorId)
    if (byId)
      return byId
  }
  if (operatorName) {
    const byName = pending.find(task => task.handlerName === operatorName)
    if (byName)
      return byName
  }
  return pending[0]
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

function closeOtherPendingTasks(record: ApprovalRecord, keepTaskId: string, operatedAt: string, operator: { id: string, name: string }): void {
  const tasks = record.workflowInstance?.tasks || []
  const currentNodeId = record.workflowInstance?.currentNodeId
  for (const task of tasks) {
    if (task.id === keepTaskId)
      continue
    if (currentNodeId && task.nodeId && task.nodeId !== currentNodeId)
      continue
    if (!isTaskPending(task))
      continue
    markTaskAs(task, 'auto-closed', operatedAt, '节点已完成，自动关闭剩余任务', operator)
  }
}

export function submitApproval(
  state: RuntimeState,
  data: Omit<ApprovalRecord, 'id' | 'status' | 'applyTime'>,
  actor?: { id?: string, name?: string },
): ApprovalRecord {
  runApprovalAutomation(state)
  const now = new Date()
  const applyTime = nowText(now)
  const startWorkflow = resolveWorkflowByType(state, data.type || 'other')
  const startNodeId = startWorkflow
    ? resolveStartApprovalNodeId(startWorkflow, data.formData)
    : undefined
  const seedRecord: ApprovalRecord = {
    ...data,
    id: '',
    status: 'pending',
    applyTime,
    title: data.title || '通用审批申请',
    type: data.type || 'other',
    applicant: data.applicant || actor?.name || '当前用户',
    ...(startNodeId ? { workflowInstance: { currentNodeId: startNodeId } } : {}),
  }
  const strategy = resolveNodeStrategy(state, seedRecord)
  const tasks = strategy.assignees.map(item => buildPendingTask(state, strategy.nodeId, item.id, item.name, now))

  const record: ApprovalRecord = ensureRecordDefaults(state, {
    ...seedRecord,
    id: uid('APPROVE'),
    deadlineAt: data.deadlineAt || nowText(new Date(now.getTime() + DEFAULT_SLA_HOURS * 60 * 60 * 1000)),
    currentNodeName: strategy.nodeName,
    workflowInstance: {
      workflowId: resolveWorkflowByType(state, data.type || 'other')?.id,
      workflowVersionId: state.workflowVersions.find(item => item.workflowId === resolveWorkflowByType(state, data.type || 'other')?.id && item.status === 'published')?.id,
      currentNodeId: strategy.nodeId,
      currentNodeMode: strategy.mode,
      currentNodeAssignees: strategy.assignees,
      progress: { completed: 0, total: tasks.length },
      tasks,
    },
    operatorTrail: [{
      id: uid('trail'),
      action: 'create',
      status: 'pending',
      operatorId: actor?.id,
      operatorName: actor?.name || data.applicant || '当前用户',
      operatedAt: applyTime,
      comment: data.description,
      attachments: data.latestAttachments,
    }],
  })

  state.approvals.unshift(record)
  pushApprovalNotice(state, {
    approvalId: record.id,
    title: '新审批待处理',
    content: `《${record.title}》已发起，当前节点为${strategy.mode === 'and' ? '会签' : '或签'}（0/${tasks.length}）。`,
    type: 'info',
  })
  pushMessage(state, {
    title: '新待办审批',
    content: `《${record.title}》已进入审批队列。`,
    type: 'approval',
    relatedId: record.id,
    priority: 'normal',
  })
  state.approvalEvents.unshift({
    id: uid('evt'),
    eventType: 'approval.created',
    approvalId: record.id,
    happenedAt: applyTime,
  })
  return record
}

export function processApproval(state: RuntimeState, payload: ProcessApprovalPayload): ApprovalRecord {
  runApprovalAutomation(state)
  const record = state.approvals.find(item => item.id === payload.id)
  if (!record)
    throw new Error('approval-not-found')
  ensureRecordDefaults(state, record)

  const comment = resolveCommentText(payload)
  const operatedAt = nowText(new Date())
  const operatorName = payload.operatorName?.trim() || '当前用户'
  const operatorId = payload.operatorId?.trim() || operatorName
  const operator = { id: operatorId, name: operatorName }
  const currentMode = record.workflowInstance?.currentNodeMode || 'or'

  record.latestComment = comment
  record.latestAttachments = payload.attachments?.filter(Boolean)

  if (payload.action === 'approve' || payload.action === 'reject') {
    const processingTask = findPendingTaskForOperator(record, payload.operatorId, payload.operatorName)
    if (!processingTask)
      throw new Error('approval-task-not-found')
    const nextStatus: ApprovalTaskStatus = payload.action === 'approve' ? 'approved' : 'rejected'
    markTaskAs(processingTask, nextStatus, operatedAt, comment, operator)
    recalcProgress(record)

    const currentNodeTasks = (record.workflowInstance?.tasks || []).filter(task => {
      const nodeId = record.workflowInstance?.currentNodeId
      if (!nodeId)
        return true
      return task.nodeId === nodeId
    })

    if (payload.action === 'approve') {
      const nodeCompleted = currentMode === 'or'
        || currentNodeTasks.every(task => normalizeTaskStatus(task.taskStatus || task.status) === 'approved')
      if (nodeCompleted) {
        closeOtherPendingTasks(record, processingTask.id, operatedAt, operator)
        // 流程引擎推进：有下一审批节点则流转并保持 pending，无下一节点（或引擎异常）按原行为完结
        const advanced = advanceWorkflow(state, record, operator, operatedAt)
        if (!advanced) {
          record.status = 'approved'
          record.currentNodeName = '审批完成'
        }
      }
      else {
        record.status = 'pending'
        record.currentNodeName = `会签进行中（${record.workflowInstance?.progress?.completed || 0}/${record.workflowInstance?.progress?.total || 0}）`
      }
    }
    else {
      if (currentMode === 'and') {
        closeOtherPendingTasks(record, processingTask.id, operatedAt, operator)
        record.status = 'rejected'
        record.currentNodeName = '已驳回'
      }
      else {
        const allRejected = currentNodeTasks.every(task => normalizeTaskStatus(task.taskStatus || task.status) === 'rejected')
        if (allRejected) {
          record.status = 'rejected'
          record.currentNodeName = '已驳回'
        }
        else {
          record.status = 'pending'
          record.currentNodeName = `或签待处理（${record.workflowInstance?.progress?.completed || 0}/${record.workflowInstance?.progress?.total || 0}）`
        }
      }
    }
  }

  if (payload.action === 'transfer') {
    const targetUserId = payload.targetUserId || payload.targetUserName
    const targetUserName = payload.targetUserName || payload.targetUserId
    if (!targetUserId || !targetUserName)
      throw new Error('approval-target-user-required')
    const processingTask = findPendingTaskForOperator(record, payload.operatorId, payload.operatorName)
    if (processingTask)
      markTaskAs(processingTask, 'transferred', operatedAt, comment, operator)
    record.status = 'transferred'
    record.currentNodeName = `已转交（${targetUserName}）`
    if (!record.workflowInstance)
      record.workflowInstance = {}
    if (!record.workflowInstance.tasks)
      record.workflowInstance.tasks = []
    record.workflowInstance.tasks.unshift(buildPendingTask(state, record.workflowInstance.currentNodeId || 'node-approval', targetUserId, targetUserName))
  }

  if (payload.action === 'addSign') {
    const targetUserId = payload.targetUserId || payload.targetUserName
    const targetUserName = payload.targetUserName || payload.targetUserId
    if (!targetUserId || !targetUserName)
      throw new Error('approval-target-user-required')
    record.status = 'pending'
    record.currentNodeName = `加签中（${targetUserName}）`
    if (!record.workflowInstance)
      record.workflowInstance = {}
    if (!record.workflowInstance.tasks)
      record.workflowInstance.tasks = []
    record.workflowInstance.tasks.unshift(buildPendingTask(state, record.workflowInstance.currentNodeId || 'node-approval', targetUserId, targetUserName))
  }

  if (payload.action === 'remind') {
    record.status = 'pending'
    record.currentNodeName = '已催办'
    record.remindCount = (record.remindCount || 0) + 1
    record.lastRemindAt = operatedAt
  }

  if (payload.action === 'withdraw' || payload.action === 'cancel') {
    record.status = mapActionToStatus(payload.action)
    record.currentNodeName = payload.action === 'withdraw' ? '已撤回' : '已取消'
    for (const task of record.workflowInstance?.tasks || []) {
      if (isTaskPending(task))
        markTaskAs(task, 'cancelled', operatedAt, comment, operator)
    }
  }

  recalcProgress(record)
  appendTrail(record, {
    id: uid('trail'),
    action: payload.action,
    status: record.status,
    operatorId,
    operatorName,
    operatedAt,
    comment,
    attachments: payload.attachments,
    targetUserId: payload.targetUserId,
    targetUserName: payload.targetUserName,
  })

  pushApprovalNotice(state, {
    approvalId: record.id,
    title: '审批状态更新',
    content: `《${record.title}》状态更新为 ${record.status}。`,
    type: record.status === 'approved' ? 'success' : record.status === 'rejected' ? 'error' : 'warning',
  })
  pushMessage(state, {
    title: '审批状态变更',
    content: `《${record.title}》已执行 ${payload.action} 操作。`,
    type: 'approval',
    relatedId: record.id,
    priority: record.status === 'rejected' ? 'high' : 'normal',
  })
  state.approvalEvents.unshift({
    id: uid('evt'),
    eventType: 'approval.updated',
    approvalId: record.id,
    happenedAt: operatedAt,
    payload: {
      action: payload.action,
      status: record.status,
    },
  })
  return record
}

export function getWorkbenchStats(state: RuntimeState): WorkbenchStats {
  runApprovalAutomation(state)
  const overdueCount = state.approvals.filter(item => item.status === 'pending' && item.deadlineAt && parseTime(item.deadlineAt).getTime() < Date.now()).length
  const escalatedCount = state.approvals.filter(item => !!item.escalatedAt).length
  const remindedCount = state.approvals.reduce((sum, item) => sum + (item.remindCount || 0), 0)

  return {
    pendingCount: state.approvals.filter(item => item.status === 'pending').length,
    myApplicationCount: state.approvals.length,
    approvedCount: state.approvals.filter(item => item.status === 'approved').length,
    rejectedCount: state.approvals.filter(item => item.status === 'rejected').length,
    overdueCount,
    escalatedCount,
    remindedCount,
  }
}

export function getApprovalNotifications(state: RuntimeState, limit = 20) {
  runApprovalAutomation(state)
  return state.approvalNotifications.slice(0, limit)
}

export function getApprovalDelegation(state: RuntimeState, ownerId: string): ApprovalDelegationRule | null {
  const normalizedOwnerId = ownerId.trim()
  if (!normalizedOwnerId)
    return null
  return state.approvalDelegations.find(item => item.ownerId === normalizedOwnerId) || null
}

export function upsertApprovalDelegation(state: RuntimeState, rule: ApprovalDelegationRule): ApprovalDelegationRule {
  const nextRule: ApprovalDelegationRule = {
    ...rule,
    ownerId: rule.ownerId.trim(),
    ownerName: rule.ownerName.trim() || rule.ownerId.trim(),
    delegateId: rule.delegateId.trim(),
    delegateName: rule.delegateName.trim() || rule.delegateId.trim(),
    updatedAt: nowText(new Date()),
  }
  const idx = state.approvalDelegations.findIndex(item => item.ownerId === nextRule.ownerId)
  if (idx >= 0)
    state.approvalDelegations[idx] = nextRule
  else
    state.approvalDelegations.unshift(nextRule)
  runApprovalAutomation(state)
  return nextRule
}

export function disableApprovalDelegation(state: RuntimeState, ownerId: string): void {
  const normalizedOwnerId = ownerId.trim()
  const found = state.approvalDelegations.find(item => item.ownerId === normalizedOwnerId)
  if (!found)
    return
  found.enabled = false
  found.updatedAt = nowText(new Date())
  runApprovalAutomation(state)
}

export interface MessageListParams {
  page: number
  pageSize: number
  type?: MessageType | 'all'
  read?: boolean
}

export function getMessageList(state: RuntimeState, params: MessageListParams) {
  let filtered = [...state.messages]
  if (params.type && params.type !== 'all')
    filtered = filtered.filter(item => item.type === params.type)
  if (params.read !== undefined)
    filtered = filtered.filter(item => item.read === params.read)
  filtered.sort((a, b) => parseTime(b.createdAt).getTime() - parseTime(a.createdAt).getTime())
  const page = Math.max(1, Number(params.page || 1))
  const pageSize = Math.max(1, Number(params.pageSize || 10))
  const start = (page - 1) * pageSize
  const end = start + pageSize
  return {
    list: filtered.slice(start, end),
    total: filtered.length,
    page,
    pageSize,
  }
}

export function markMessageAsRead(state: RuntimeState, id: string): void {
  const message = state.messages.find(item => item.id === id)
  if (message && !message.read) {
    message.read = true
    message.readTime = nowText(new Date())
  }
}

export function batchMarkAsRead(state: RuntimeState, ids: string[]): void {
  const now = nowText(new Date())
  for (const id of ids) {
    const message = state.messages.find(item => item.id === id)
    if (message && !message.read) {
      message.read = true
      message.readTime = now
    }
  }
}

export function markAllAsRead(state: RuntimeState): void {
  const now = nowText(new Date())
  for (const message of state.messages) {
    if (!message.read) {
      message.read = true
      message.readTime = now
    }
  }
}

export function deleteMessage(state: RuntimeState, id: string): void {
  const index = state.messages.findIndex(item => item.id === id)
  if (index >= 0)
    state.messages.splice(index, 1)
}

export function batchDeleteMessages(state: RuntimeState, ids: string[]): void {
  for (const id of ids) {
    const index = state.messages.findIndex(item => item.id === id)
    if (index >= 0)
      state.messages.splice(index, 1)
  }
}

export function getUnreadCount(state: RuntimeState): number {
  return state.messages.filter(item => !item.read).length
}

export function getCCList(state: RuntimeState, params: {
  page: number
  pageSize: number
  keyword?: string
  status?: ApprovalStatus
  read?: boolean
  dateRange?: [Date, Date] | null
}) {
  let filtered = [...state.ccRecords]
  if (params.keyword) {
    const keyword = params.keyword.toLowerCase()
    filtered = filtered.filter(item => item.title.toLowerCase().includes(keyword) || item.applicant.toLowerCase().includes(keyword))
  }
  if (params.status)
    filtered = filtered.filter(item => item.status === params.status)
  if (params.read !== undefined)
    filtered = filtered.filter(item => item.read === params.read)
  if (params.dateRange && params.dateRange.length === 2) {
    const [start, end] = params.dateRange
    filtered = filtered.filter((item) => {
      const ccTime = parseTime(item.ccTime)
      return ccTime >= start && ccTime <= end
    })
  }
  filtered.sort((a, b) => parseTime(b.ccTime).getTime() - parseTime(a.ccTime).getTime())
  const page = Math.max(1, Number(params.page || 1))
  const pageSize = Math.max(1, Number(params.pageSize || 10))
  const start = (page - 1) * pageSize
  const end = start + pageSize
  return {
    list: filtered.slice(start, end),
    total: filtered.length,
    page,
    pageSize,
  }
}

export function markCCAsRead(state: RuntimeState, id: string): void {
  const record = state.ccRecords.find(item => item.id === id)
  if (record && !record.read) {
    record.read = true
    record.readTime = nowText(new Date())
  }
}

export function batchMarkCCAsRead(state: RuntimeState, ids: string[]): void {
  const now = nowText(new Date())
  for (const id of ids) {
    const record = state.ccRecords.find(item => item.id === id)
    if (record && !record.read) {
      record.read = true
      record.readTime = now
    }
  }
}

export function getCCUnreadCount(state: RuntimeState): number {
  return state.ccRecords.filter(item => !item.read).length
}
/** 批量审批：逐条独立执行，单条失败不影响其余，返回逐条结果。 */
export function batchProcessApprovals(
  state: RuntimeState,
  payload: { ids: string[], action: ApprovalAction, commentText?: string, operatorId?: string, operatorName?: string },
): {
  results: Array<{ id: string, success: boolean, title?: string, status?: string, error?: string }>,
  succeeded: number,
  failed: number,
} {
  const results = payload.ids.map((id) => {
    try {
      const record = processApproval(state, {
        id,
        action: payload.action,
        commentText: payload.commentText,
        operatorId: payload.operatorId,
        operatorName: payload.operatorName,
      })
      return { id, success: true, title: record.title, status: record.status }
    }
    catch (error) {
      return { id, success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
  return {
    results,
    succeeded: results.filter(item => item.success).length,
    failed: results.filter(item => !item.success).length,
  }
}
