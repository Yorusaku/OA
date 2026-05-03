/**
 * useNodePermissions.ts - 节点表单权限配置 Composable（重构阶段 · 极致优化）
 *
 * 设计理念：
 * - 纯函数分离（extractFieldsFromSchema, mergePermissions）
 * - 响应式状态管理（permissions Ref）
 * - 防御性交互（disabled 状态、空值保护）
 * - 150ms 防抖同步（lodash-es debounce）- 优化 watch 策略
 * - 移除 deep: true 性能隐患
 *
 * 当前状态：🟣 重构阶段（极致优化，测试依然 100% PASS）
 */

import { ref, computed, watch, onUnmounted } from 'vue'
import { debounce } from 'lodash-es'
import type { Ref, ComputedRef } from 'vue'
import type { FormFieldSchema, FormSchema, PermissionsMap, NodePermissionType, FieldType } from '@/types/form-schema'

// ==================== 类型定义 ====================

/**
 * Props 接口
 */
export interface UseNodePermissionsProps {
  /** 绑定的表单 Schema（从外部传入） */
  formSchema?: Ref<FormSchema | null>
  /** 节点的当前权限配置（从 node.formPermissions 传入） */
  currentPermissions?: Ref<PermissionsMap | undefined>
  /** 是否禁用编辑 */
  disabled?: boolean
}

/**
 * 返回值接口
 */
export interface UseNodePermissionsReturn {
  /** 字段列表（从 Schema 提取） */
  fields: ComputedRef<Array<{ key: string, label: string, type: FieldType }>>

  /** 权限配置（响应式 Map） */
  permissions: Ref<PermissionsMap>

  /** 权限选项 */
  permissionOptions: ComputedRef<{ label: string; value: NodePermissionType }[]>

  /** 方法 */
  setPermission: (fieldKey: string, permission: NodePermissionType) => void
  clearPermission: (fieldKey: string) => void
  resetAllPermissions: () => void
  exportPermissions: () => string
  importPermissions (json: string): boolean
  /** 手动触发同步（对外暴露，用于外部事件驱动） */
  triggerSync: () => void
}

// ==================== 纯函数 ====================

/**
 * 从 FormSchema 中提取字段列表
 * @param schema - 表单 Schema
 * @returns 字段数组（仅保留 key, label, type）
 */
export function extractFieldsFromSchema(schema: FormSchema): Array<{ key: string, label: string, type: FieldType }> {
  // 卫语句：空 Schema 处理
  if (!schema?.fields?.length) {
    return []
  }

  return schema.fields.map(field => ({
    key: field.key || field.id || '',
    label: field.label,
    type: field.type,
  })).filter(field => !!field.key)
}

/**
 * 合并默认权限和用户配置
 * @param fields - 字段列表
 * @param userPermissions - 用户配置的权限
 * @returns 完整的权限 Map（所有字段都有默认值）
 */
export function mergePermissions(
  fields: Array<{ key: string }>,
  userPermissions?: PermissionsMap
): PermissionsMap {
  // 卫语句：空字段列表处理
  if (!fields?.length) {
    return {}
  }

  // 初始化默认权限为 editable
  const defaults: PermissionsMap = {}
  fields.forEach(field => {
    defaults[field.key] = 'editable'
  })

  // 合并用户配置（用户配置优先级更高）
  if (userPermissions && Object.keys(userPermissions).length > 0) {
    return { ...defaults, ...userPermissions }
  }

  return defaults
}

/**
 * 获取权限类型选项
 */
export function getPermissionOptions(): Array<{ label: string; value: NodePermissionType }> {
  return [
    { label: '隐藏', value: 'hidden' },
    { label: '只读', value: 'readonly' },
    { label: '可编辑', value: 'editable' },
    { label: '必填', value: 'required' },
  ]
}

// ==================== 核心 Hook ====================

/**
 * 权限配置 Hook
 * @param props - 使用参数
 * @returns 权限配置响应式对象
 */
export function useNodePermissions(props: UseNodePermissionsProps): UseNodePermissionsReturn {
  // ==================== 状态 ====================
  // 字段列表（从 Schema 提取）
  const fields = computed(() => {
    const schema = props.formSchema?.value
    if (!schema) return []
    return extractFieldsFromSchema(schema)
  })

  // 权限选项
  const permissionOptions = computed(() => getPermissionOptions())

  // 初始化权限配置
  const initializationPermissions = (): PermissionsMap => {
    const currentPermissions = props.currentPermissions?.value
    return mergePermissions(fields.value, currentPermissions)
  }

  // 权限配置（响应式）
  const permissions = ref<PermissionsMap>(initializationPermissions())

  // ==================== 防抖同步（提纯逻辑） ====================
  // 🚀 优化：将 syncPermissions 提纯为独立的防抖函数，便于被多个地方调用
  let cleanup: (() => void) | undefined

  const doSyncPermissions = (): void => {
    // 这里可以触发回调，例如 emit('update:permissions', permissions.value)
    console.log('[useNodePermissions] 权限配置已同步:', permissions.value)
  }
  
  // 150ms 黄金微观防抖 - 定义在方法之前，确保方法可访问
  const syncPermissions = debounce(doSyncPermissions, 150)

  // ==================== 方法 ====================

  /**
   * 设置单个字段的权限
   */
  const setPermission = (fieldKey: string, permission: NodePermissionType): void => {
    // 卫语句：空权限处理
    if (!permissions.value) {
      permissions.value = {}
    }
    permissions.value[fieldKey] = permission

    // 🚀 优化：仅在 setPermission 时触发同步，移除 deep: true 性能隐患
    syncPermissions()
  }

  /**
   * 清除单个字段的权限（恢复默认 editable）
   */
  const clearPermission = (fieldKey: string): void => {
    if (permissions.value) {
      permissions.value[fieldKey] = 'editable'

      // 🚀 优化：仅在 clearPermission 时触发同步
      syncPermissions()
    }
  }

  /**
   * 重置所有权限为默认值（editable）
   */
  const resetAllPermissions = (): void => {
    permissions.value = mergePermissions(fields.value)

    // 🚀 优化：仅在 resetAllPermissions 时触发同步
    syncPermissions()
  }

  /**
   * 导出权限配置为 JSON 字符串
   */
  const exportPermissions = (): string => {
    return JSON.stringify(permissions.value, null, 2)
  }

  /**
   * 从 JSON 字符串导入权限配置
   */
  const importPermissions = (json: string): boolean => {
    try {
      const parsed = JSON.parse(json)
      if (parsed && typeof parsed === 'object') {
        permissions.value = parsed as PermissionsMap

        // 🚀 优化：仅在 importPermissions 时触发同步
        syncPermissions()
        return true
      }
      return false
    } catch (e) {
      console.error('[useNodePermissions] 导入权限配置失败:', e)
      return false
    }
  }

  /**
   * 手动触发同步（对外暴露，用于外部事件驱动）
   */
  const triggerSync = (): void => {
    syncPermissions()
  }

  // 监听 Schema 变化，重置权限
  if (props.formSchema) {
    watch(props.formSchema, () => {
      resetAllPermissions()
    })
  }

  // 组件卸载时清理防抖
  onUnmounted(() => {
    syncPermissions.cancel()
    if (cleanup) {
      cleanup()
    }
  })

  // ==================== 返回 ====================
  return {
    fields,
    permissions,
    permissionOptions,
    setPermission,
    clearPermission,
    resetAllPermissions,
    exportPermissions,
    importPermissions,
    triggerSync,
  }
}
