/**
 * Query Key 管理
 * 用于统一管理所有 Vue Query 的 queryKey
 */
export const queryKeys = {
  approval: {
    list: (params?: any) => ['approval', 'list', params],
    detail: (id: string) => ['approval', 'detail', id],
    stats: ['approval', 'stats'],
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
    formSchemas: ['workflow', 'formSchemas'],
  },
}
