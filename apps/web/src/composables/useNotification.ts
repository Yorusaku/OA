/**
 * @file useNotification.ts
 * @description 通知中心组合式函数
 * 封装消息通知的发送和管理操作
 */

import type { Notification } from '@/stores/notification'
import { useNotificationStore } from '@/stores/notification'

/**
 * 通知中心 Hook
 * @returns 通知相关方法和状态
 * @usage
 * ```ts
 * const { notifySuccess, notifyError, unreadCount } = useNotification()
 * ```
 */
export function useNotification() {
  const store = useNotificationStore()

  /**
   * 发送通知
   * @param title - 通知标题
   * @param content - 通知内容
   * @param type - 通知类型
   */
  function notify(
    title: string,
    content: string,
    type: Notification['type'] = 'info',
  ) {
    store.addNotification({
      title,
      content,
      type,
    })
  }

  /**
   * 发送成功通知
   * @param title - 通知标题
   * @param content - 通知内容
   */
  function notifySuccess(title: string, content: string) {
    notify(title, content, 'success')
  }

  /**
   * 发送警告通知
   * @param title - 通知标题
   * @param content - 通知内容
   */
  function notifyWarning(title: string, content: string) {
    notify(title, content, 'warning')
  }

  /**
   * 发送错误通知
   * @param title - 通知标题
   * @param content - 通知内容
   */
  function notifyError(title: string, content: string) {
    notify(title, content, 'error')
  }

  /**
   * 发送信息通知
   * @param title - 通知标题
   * @param content - 通知内容
   */
  function notifyInfo(title: string, content: string) {
    notify(title, content, 'info')
  }

  return {
    // 状态
    notifications: store.notifications,
    unreadCount: store.unreadCount,
    // 方法
    notify,
    notifySuccess,
    notifyWarning,
    notifyError,
    notifyInfo,
    markAsRead: store.markAsRead,
    markAllAsRead: store.markAllAsRead,
    removeNotification: store.removeNotification,
    clearAll: store.clearAll,
  }
}
