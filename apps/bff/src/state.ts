import type { RuntimeState, WorkflowDefinition } from './domain'
import { nowText, uid } from './utils'

export function createInitialState(): RuntimeState {
  const now = new Date()
  const nowString = nowText(now)
  const deadline = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const workflow: WorkflowDefinition = {
    id: 'wf-001',
    name: '请假审批流程',
    description: '演示用请假审批',
    status: 'active' as const,
    formSchemaId: 'leave-form',
    version: 1,
    createdAt: nowString,
    updatedAt: nowString,
    nodes: [
      {
        id: 'node-start',
        type: 'start' as const,
        name: '发起',
      },
      {
        id: 'node-hr-approval',
        type: 'approval' as const,
        name: 'HR审批',
        handler: {
          type: 'user' as const,
          mode: 'or' as const,
          assignees: [
            { id: 'user-001', name: 'admin' },
            { id: 'user-002', name: 'manager' },
          ],
        },
        formPermissions: {
          reason: 'required',
          days: 'required',
          hr_comment: 'editable',
        } as const,
      },
      {
        id: 'node-end',
        type: 'end' as const,
        name: '结束',
      },
    ],
    edges: [
      { id: 'edge-start-hr', source: 'node-start', target: 'node-hr-approval' },
      { id: 'edge-hr-end', source: 'node-hr-approval', target: 'node-end' },
    ],
  }

  return {
    users: [
      { id: 'user-001', username: 'admin', password: 'admin123', name: 'admin' },
      { id: 'user-002', username: 'manager', password: 'manager123', name: 'manager' },
    ],
    approvals: [
      {
        id: 'APPROVE-SEED-001',
        title: '张三请假申请',
        type: 'leave',
        status: 'pending',
        applicant: '张三',
        applyTime: nowString,
        currentNodeName: 'HR审批',
        deadlineAt: nowText(deadline),
        remindCount: 0,
        workflowInstance: {
          workflowId: workflow.id,
          workflowVersionId: 'wf-001-v1',
          currentNodeId: 'node-hr-approval',
          currentNodeMode: 'or',
          currentNodeAssignees: [
            { id: 'user-001', name: 'admin' },
            { id: 'user-002', name: 'manager' },
          ],
          progress: { completed: 0, total: 2 },
          tasks: [
            {
              id: 'task-seed-1',
              nodeId: 'node-hr-approval',
              handlerId: 'user-001',
              handlerName: 'admin',
              ownerId: 'user-001',
              ownerName: 'admin',
              status: 'pending',
              taskStatus: 'pending',
            },
            {
              id: 'task-seed-2',
              nodeId: 'node-hr-approval',
              handlerId: 'user-002',
              handlerName: 'manager',
              ownerId: 'user-002',
              ownerName: 'manager',
              status: 'pending',
              taskStatus: 'pending',
            },
          ],
        },
        operatorTrail: [
          {
            id: uid('trail'),
            action: 'create',
            status: 'pending',
            operatorName: '张三',
            operatedAt: nowString,
            comment: '请假申请已发起',
          },
        ],
      },
    ],
    approvalNotifications: [],
    messages: [],
    ccRecords: [],
    approvalDelegations: [],
    workflows: [workflow],
    workflowVersions: [
      {
        id: 'wf-001-v1',
        workflowId: workflow.id,
        workflowName: workflow.name,
        status: 'published',
        snapshot: workflow,
        createdAt: nowString,
        createdBy: 'system',
      },
    ],
    approvalEvents: [],
    idempotency: [],
  }
}
