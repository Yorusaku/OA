import type { MaybeRef } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { computed, unref } from 'vue'
import { getAllDict, getDictByType } from '@/api/dict'
import { queryKeys } from '@/api/queryKeys'

/**
 * 根据类型获取字典数据
 * 优化：staleTime 设为 10 分钟，字典数据变化不频繁
 */
export function useDictByType(dictType: MaybeRef<string>) {
  return useQuery({
    queryKey: computed(() => queryKeys.dict.byType(unref(dictType))),
    queryFn: () => getDictByType(unref(dictType)),
    enabled: computed(() => !!unref(dictType)),
    staleTime: 10 * 60 * 1000, // 10 分钟
    refetchOnWindowFocus: false,
  })
}

/**
 * 获取所有字典数据
 * 优化：staleTime 设为 10 分钟
 */
export function useAllDict() {
  return useQuery({
    queryKey: queryKeys.dict.all,
    queryFn: getAllDict,
    staleTime: 10 * 60 * 1000, // 10 分钟
    refetchOnWindowFocus: false,
  })
}
