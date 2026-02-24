import type { Department } from './types'
import { mockDepartments } from './mock'

export async function getDeptTree(): Promise<Department[]> {
  await new Promise(resolve => setTimeout(resolve, 600))
  return mockDepartments
}

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
