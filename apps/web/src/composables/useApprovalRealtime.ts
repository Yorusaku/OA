import { useQueryClient } from '@tanstack/vue-query'
import { onBeforeUnmount, ref, watch } from 'vue'
import { queryKeys } from '@/api/queryKeys'
import { useRemoteApprovalApi, useRealtimeStream } from '@/api/runtime'
import { useUserStore } from '@/stores/user'

interface StreamEventPayload {
  eventId?: string
  topic?: string
}

const EVENT_ID_TTL_MS = 60 * 1000
const FALLBACK_POLLING_MS = 20 * 1000

export function useApprovalRealtime() {
  const queryClient = useQueryClient()
  const userStore = useUserStore()
  const connected = ref(false)
  const reconnecting = ref(false)
  const disabled = !useRemoteApprovalApi() || !useRealtimeStream()

  let eventSource: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let fallbackTimer: ReturnType<typeof setInterval> | null = null
  let retryCount = 0
  const consumedEventMap = new Map<string, number>()

  function cleanupEventMap() {
    const now = Date.now()
    for (const [eventId, timestamp] of consumedEventMap.entries()) {
      if (now - timestamp > EVENT_ID_TTL_MS)
        consumedEventMap.delete(eventId)
    }
  }

  function invalidateApprovalQueries() {
    queryClient.invalidateQueries({ queryKey: queryKeys.approval.list() })
    queryClient.invalidateQueries({ queryKey: queryKeys.approval.stats })
    queryClient.invalidateQueries({ queryKey: queryKeys.approval.notifications() })
  }

  function invalidateMessageQueries() {
    queryClient.invalidateQueries({ queryKey: ['messageList'] })
    queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
  }

  function startFallbackPolling() {
    if (fallbackTimer)
      return
    fallbackTimer = setInterval(() => {
      invalidateApprovalQueries()
      invalidateMessageQueries()
    }, FALLBACK_POLLING_MS)
  }

  function stopFallbackPolling() {
    if (fallbackTimer) {
      clearInterval(fallbackTimer)
      fallbackTimer = null
    }
  }

  function onStreamEvent(payload: StreamEventPayload) {
    cleanupEventMap()
    if (payload.eventId && consumedEventMap.has(payload.eventId))
      return
    if (payload.eventId)
      consumedEventMap.set(payload.eventId, Date.now())

    switch (payload.topic) {
      case 'approval.created':
      case 'approval.updated':
      case 'approval.todo.changed':
        invalidateApprovalQueries()
        break
      case 'message.new':
        invalidateMessageQueries()
        break
      default:
        invalidateApprovalQueries()
        invalidateMessageQueries()
        break
    }
  }

  function disconnect() {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    connected.value = false
    reconnecting.value = false
  }

  function scheduleReconnect() {
    if (disabled)
      return
    if (reconnectTimer)
      return
    reconnecting.value = true
    const delay = Math.min(15000, 1000 * 2 ** retryCount)
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      retryCount += 1
      connect()
    }, delay)
  }

  function connect() {
    if (disabled)
      return
    if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
      startFallbackPolling()
      return
    }
    if (eventSource)
      return
    const streamUrl = import.meta.env.VITE_REALTIME_STREAM_URL || '/api/v1/stream/notifications'
    try {
      eventSource = new EventSource(streamUrl)
    }
    catch {
      startFallbackPolling()
      scheduleReconnect()
      return
    }

    eventSource.onopen = () => {
      connected.value = true
      reconnecting.value = false
      retryCount = 0
      stopFallbackPolling()
    }
    eventSource.onerror = () => {
      disconnect()
      startFallbackPolling()
      scheduleReconnect()
    }
    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as StreamEventPayload
        onStreamEvent(parsed)
      }
      catch {
        // noop
      }
    }
  }

  watch(
    () => userStore.token,
    (token) => {
      if (!token) {
        disconnect()
        stopFallbackPolling()
        return
      }
      connect()
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    disconnect()
    stopFallbackPolling()
    if (reconnectTimer)
      clearTimeout(reconnectTimer)
  })

  return {
    connected,
    reconnecting,
    disabled,
  }
}
