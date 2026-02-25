/**
 * @file dept.ts
 * @description 部门相关 API 接口
 * 提供部门树和部门列表查询
 */

import type { Department } from './types'
import { mockDepartments } from './mock'

/**
 * 获取部门树
 * @returns 部门树形结构
 */
export async function getDeptTree(): Promise<Department[]> {
  await new Promise(resolve => setTimeout(resolve, 600))
  return mockDepartments
}

/**
 * 获取部门列表（扁平化）
 * @returns 扁平化部门列表
 * @description 将树形结构展平为一维数组，适用于下拉选择等场景
 */
export async function getDeptList(): Promise<Department[]> {
  await new Promise(resolve => setTimeout(resolve, 400))

  const flatten = (depts: Department[]): Department[] => {
    return depts.reduce((acc, dept) => {
      const { children, ...rest } = dept
      return [...acc, rest, ...(children ? flatten(children) : [])]
    }, [] as Department[])
  }

  return flatten(mockDepartments)
}
