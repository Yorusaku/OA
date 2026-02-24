/**
 * 权限指令
 * 用于根据用户权限控制元素显示/隐藏
 */
import type { App, DirectiveBinding, ObjectDirective } from 'vue'
import { useUserStore } from '@/stores/user'

/**
 * 权限指令绑定值类型
 */
type AuthBindingValue = string | string[]

/**
 * 权限指令
 */
const auth: ObjectDirective<HTMLElement, AuthBindingValue> = {
  /**
   * 元素挂载时检查权限
   */
  mounted(el: HTMLElement, binding: DirectiveBinding<AuthBindingValue>) {
    const userStore = useUserStore()
    const required = binding.value

    if (!required)
      return

    const has = (code: string) => userStore.hasPermission(code)

    // 检查是否有权限
    const allowed = Array.isArray(required) ? required.some(code => has(code)) : has(required)

    // 无权限则移除元素
    if (!allowed) {
      if (el.parentNode) {
        el.parentNode.removeChild(el)
      }
    }
  },
}

/**
 * 注册权限指令
 */
export function setupAuthDirective(app: App) {
  app.directive('auth', auth)
}
