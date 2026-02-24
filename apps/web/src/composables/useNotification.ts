import { useNotificationStore, type Notification } from '@/stores/notification'

export function useNotification() {
  const store = useNotificationStore()

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

  function notifySuccess(title: string, content: string) {
    notify(title, content, 'success')
  }

  function notifyWarning(title: string, content: string) {
    notify(title, content, 'warning')
  }

  function notifyError(title: string, content: string) {
    notify(title, content, 'error')
  }

  function notifyInfo(title: string, content: string) {
    notify(title, content, 'info')
  }

  return {
    notifications: store.notifications,
    unreadCount: store.unreadCount,
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
