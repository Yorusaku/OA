/**
 * usePermissionMutator - 权限变异引擎 Composable
 * 接收基础 Rule[] 和 permissions 对象，输出应用了权限后的最终 Rule[]
 */
import { cloneDeep } from 'lodash-es'
import type { FormFieldSchema } from '@/types/form-schema'

// ==================== 类型定义 ====================
export type PermissionType = 'hidden' | 'readonly' | 'editable' | 'required'
export type PermissionsMap = Record<string, PermissionType>

// ==================== 核心函数 ====================
/**
 * 应用权限变异到规则
 * @param baseRules - 基础规则数组
 * @param permissions - 权限映射对象
 * @returns 应用权限后的最终规则数组
 */
export function usePermissionMutator(
  baseRules: any[],
  permissions?: PermissionsMap
) {
  if (!baseRules?.length) return []

  return baseRules.map((rule: any) => {
    const permission = permissions?.[rule.field]

    // 深拷贝规则，避免修改原始数据
    const modifiedRule = cloneDeep(rule)

    // 权限：hidden
    if (permission === 'hidden') {
      modifiedRule.hidden = true
    }

    // 权限：readonly
    if (permission === 'readonly') {
      if (!modifiedRule.props) modifiedRule.props = {}
      modifiedRule.props.disabled = true
      modifiedRule.props.readonly = true
    }

    // 权限：required
    if (permission === 'required') {
      if (!modifiedRule.validate) modifiedRule.validate = []
      
      const hasRequiredRule = modifiedRule.validate.some((v: any) => v.required === true)
      if (!hasRequiredRule) {
        modifiedRule.validate.push({ required: true, message: '此项必填', trigger: 'blur' })
      }
    }

    return modifiedRule
  })
}
