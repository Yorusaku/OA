/**
 * @file dict.ts
 * @description 字典相关 API 接口
 * 提供字典数据查询
 */

import type { DictionaryItem } from './types'
import { mockDictItems } from './mock'

/**
 * 根据类型获取字典数据
 * @param dictType - 字典类型（如 'gender', 'status' 等）
 * @returns 字典项列表
 */
export async function getDictByType(dictType: string): Promise<DictionaryItem[]> {
  await new Promise(resolve => setTimeout(resolve, 300))
  return mockDictItems[dictType] || []
}

/**
 * 获取所有字典数据
 * @returns 所有字典数据（按类型分组）
 */
export async function getAllDict(): Promise<Record<string, DictionaryItem[]>> {
  await new Promise(resolve => setTimeout(resolve, 500))
  return mockDictItems
}
