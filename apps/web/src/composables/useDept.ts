/**
 * @file useDept.ts
 * @description 部门相关 Vue Query Hooks
 * 封装部门树和部门列表的数据获取
 */

import { useQuery } from '@tanstack/vue-query'
import { getDeptList, getDeptTree } from '@/api/dept'
import { queryKeys } from '@/api/queryKeys'

/**
 * 获取部门树
 * @returns useQuery 返回值
 * @description 用于组织架构树形展示
 * @usage const { data: deptTree } = useDeptTree()
 */
export function useDeptTree() {
  return useQuery({
    queryKey: queryKeys.dept.tree,
    queryFn: getDeptTree,
    staleTime: 5 * 60 * 1000, // 5 分钟缓存，部门结构变化不频繁
    refetchOnWindowFocus: false, // 窗口聚焦时不自动刷新
  })
}

/**
 * 获取部门列表
 * @returns useQuery 返回值
 * @description 用于部门下拉选择等场景
 * @usage const { data: deptList } = useDeptList()
 */
export function useDeptList() {
  return useQuery({
    queryKey: queryKeys.dept.list,
    queryFn: getDeptList,
    staleTime: 5 * 60 * 1000, // 5 分钟缓存
    refetchOnWindowFocus: false,
  })
}
