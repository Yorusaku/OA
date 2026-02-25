/**
 * @file notification.ts
 * @description 通知中心状态管理
 * 管理站内消息通知的存储和状态
 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * 通知消息接口
 */
export interface Notification {
  /** 通知唯一 ID */
  id: string
  /** 通知标题 */
  title: string
  /** 通知内容 */
  content: string
  /** 通知类型 */
  type: 'info' | 'success' | 'warning' | 'error'
  /** 是否已读 */
  read: boolean
  /** 创建时间 */
  createdAt: Date
}

/**
 * 通知中心 Store
 * @returns 通知状态和方法
 * @usage const notificationStore = useNotificationStore()
 */
export const useNotificationStore = defineStore('notification', () => {
  /** 通知列表 */
  const notifications = ref<Notification[]>([])

  /** 未读消息数量 */
  const unreadCount = computed(() =>
    notifications.value.filter(n => !n.read).length,
  )

  /**
   * 添加通知
   * @param notification - 通知内容（不含 id、read、createdAt）
   */
  function addNotification(notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      read: false,
      createdAt: new Date(),
    }
    notifications.value.unshift(newNotification)
  }

  /**
   * 标记为已读
   * @param id - 通知 ID
   */
  function markAsRead(id: string) {
    const notification = notifications.value.find(n => n.id === id)
    if (notification) {
      notification.read = true
    }
  }

  /**
   * 标记全部为已读
   */
  function markAllAsRead() {
    notifications.value.forEach(n => n.read = true)
  }

  /**
   * 删除通知
   * @param id - 通知 ID
   */
  function removeNotification(id: string) {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  /**
   * 清空所有通知
   */
  function clearAll() {
    notifications.value = []
  }

  return {
    // 状态
    notifications,
    unreadCount,
    // 方法
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  }
})
