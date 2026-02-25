import { approvalHandlers } from './approval'
import { dictHandlers } from './dict'
import { orgHandlers } from './org'
import { userHandlers } from './user'
import { workflowHandlers } from './workflow'

export const handlers = [
  ...userHandlers,
  ...approvalHandlers,
  ...workflowHandlers,
  ...orgHandlers,
  ...dictHandlers,
]
