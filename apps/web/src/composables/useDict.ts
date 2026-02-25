/**
 * @file useDict.ts
 * @description 字典相关 Vue Query Hooks
 * 封装字典数据的数据获取
 */

import type { MaybeRef } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { computed, unref } from 'vue'
import { getAllDict, getDictByType } from '@/api/dict'
import { queryKeys } from '@/api/queryKeys'

/**
 * 根据类型获取字典数据
 * @param dictType - 字典类型（如 'gender', 'status' 等）
 * @returns useQuery 返回值
 * @usage const { data: genderDict } = useDictByType('gender')
 */
export function useDictByType(dictType: MaybeRef<string>) {
  return useQuery({
    queryKey: computed(() => queryKeys.dict.byType(unref(dictType))),
    queryFn: () => getDictByType(unref(dictType)),
    enabled: computed(() => !!unref(dictType)), // 有类型时才启用查询
    staleTime: 10 * 60 * 1000, // 10 分钟缓存，字典数据变化不频繁
    refetchOnWindowFocus: false,
  })
}

/**
 * 获取所有字典数据
 * @returns useQuery 返回值
 * @description 一次性获取所有字典数据，适用于初始化场景
 * @usage const { data: allDict } = useAllDict()
 */
export function useAllDict() {
  return useQuery({
    queryKey: queryKeys.dict.all,
    queryFn: getAllDict,
    staleTime: 10 * 60 * 1000, // 10 分钟缓存
    refetchOnWindowFocus: false,
  })
}
