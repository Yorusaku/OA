/**
 * @file queryKeys.ts
 * @description Vue Query Key 统一管理
 */

export const queryKeys = {
  approval: {
    list: (params?: any) => ['approval', 'list', params],
    detail: (id: string) => ['approval', 'detail', id],
    stats: ['approval', 'stats'],
    notifications: (limit?: number) => ['approval', 'notifications', limit],
    delegation: (ownerId: string) => ['approval', 'delegation', ownerId],
  },
  dept: {
    tree: ['dept', 'tree'],
    list: ['dept', 'list'],
  },
  dict: {
    byType: (dictType: string) => ['dict', 'byType', dictType],
    all: ['dict', 'all'],
  },
  workflow: {
    list: (params?: any) => ['workflow', 'list', params],
    detail: (id: string) => ['workflow', 'detail', id],
    versions: (id: string) => ['workflow', 'versions', id],
    formSchemas: ['workflow', 'formSchemas'],
  },
  message: {
    list: (params?: any) => ['message', 'list', params],
    unreadCount: ['message', 'unreadCount'],
  },
  loginLog: {
    list: (params?: any) => ['loginLog', 'list', params],
  },
  operationLog: {
    list: (params?: any) => ['operationLog', 'list', params],
    detail: (id: string) => ['operationLog', 'detail', id],
  },
  auditLog: {
    list: (params?: any) => ['auditLog', 'list', params],
    detail: (id: string) => ['auditLog', 'detail', id],
  },
  cc: {
    list: (params?: any) => ['cc', 'list', params],
    unreadCount: ['cc', 'unreadCount'],
  },
  application: {
    list: (params?: any) => ['application', 'list', params],
    detail: (id: string) => ['application', 'detail', id],
    stats: (id: string) => ['application', 'stats', id],
    versions: (id: string) => ['application', 'versions', id],
  },
  template: {
    list: (params?: any) => ['template', 'list', params],
    detail: (id: string) => ['template', 'detail', id],
    reviews: (templateId: string, page?: number, pageSize?: number) => ['template', 'reviews', templateId, page, pageSize],
    myTemplates: (page?: number, pageSize?: number) => ['template', 'myTemplates', page, pageSize],
    installRecords: (page?: number, pageSize?: number) => ['template', 'installRecords', page, pageSize],
    popularTags: () => ['template', 'popularTags'],
  },
}
