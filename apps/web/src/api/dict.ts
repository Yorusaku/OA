import type { DictionaryItem } from './types'
import { mockDictItems } from './mock'

export async function getDictByType(dictType: string): Promise<DictionaryItem[]> {
  await new Promise(resolve => setTimeout(resolve, 300))
  return mockDictItems[dictType] || []
}

export async function getAllDict(): Promise<Record<string, DictionaryItem[]>> {
  await new Promise(resolve => setTimeout(resolve, 500))
  return mockDictItems
}
