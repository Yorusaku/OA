import { useQuery } from '@tanstack/vue-query'
import { getDeptList, getDeptTree } from '@/api/dept'
import { queryKeys } from '@/api/queryKeys'

/**
 * 获取部门树
 * 优化：staleTime 设为 5 分钟，部门结构变化不频繁
 */
export function useDeptTree() {
  return useQuery({
    queryKey: queryKeys.dept.tree,
    queryFn: getDeptTree,
    staleTime: 5 * 60 * 1000, // 5 分钟
    refetchOnWindowFocus: false,
  })
}

/**
 * 获取部门列表
 * 优化：staleTime 设为 5 分钟
 */
export function useDeptList() {
  return useQuery({
    queryKey: queryKeys.dept.list,
    queryFn: getDeptList,
    staleTime: 5 * 60 * 1000, // 5 分钟
    refetchOnWindowFocus: false,
  })
}
