import { userHandlers } from './user'
import { approvalHandlers } from './approval'
import { workflowHandlers } from './workflow'
import { orgHandlers } from './org'
import { dictHandlers } from './dict'

export const handlers = [
  ...userHandlers,
  ...approvalHandlers,
  ...workflowHandlers,
  ...orgHandlers,
  ...dictHandlers,
]
