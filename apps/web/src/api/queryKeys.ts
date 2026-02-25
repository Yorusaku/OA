/**
 * @file queryKeys.ts
 * @description Vue Query Key 统一管理
 * 用于定义所有 API 查询的 queryKey，确保缓存一致性
 * @see https://tanstack.com/query/latest/docs/react/guides/query-keys
 */

/**
 * Query Key 对象
 * 按模块组织，便于管理和失效缓存
 */
export const queryKeys = {
  /** 审批相关 Query Keys */
  approval: {
    /** 审批列表 */
    list: (params?: any) => ['approval', 'list', params],
    /** 审批详情 */
    detail: (id: string) => ['approval', 'detail', id],
    /** 审批统计 */
    stats: ['approval', 'stats'],
  },
  /** 部门相关 Query Keys */
  dept: {
    /** 部门树 */
    tree: ['dept', 'tree'],
    /** 部门列表 */
    list: ['dept', 'list'],
  },
  /** 字典相关 Query Keys */
  dict: {
    /** 按类型查询字典 */
    byType: (dictType: string) => ['dict', 'byType', dictType],
    /** 所有字典 */
    all: ['dict', 'all'],
  },
  /** 工作流相关 Query Keys */
  workflow: {
    /** 流程列表 */
    list: (params?: any) => ['workflow', 'list', params],
    /** 流程详情 */
    detail: (id: string) => ['workflow', 'detail', id],
    /** 表单 Schema 列表 */
    formSchemas: ['workflow', 'formSchemas'],
  },
}
