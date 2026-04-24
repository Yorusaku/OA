/**
 * @file useMessage.ts
 * @description 消息中心相关 Composables
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRef } from 'vue'
import { unref } from 'vue'
import type { MessageRecord, MessageType, PageParams, PageResult } from '@/api/types'
import {
  batchDeleteMessages,
  batchMarkAsRead,
  deleteMessage,
  getMessageList,
  getUnreadCount,
  markAllAsRead,
  markMessageAsRead,
} from '@/api/approval'

/**
 * 消息列表查询参数
 */
export interface MessageListParams extends PageParams {
  type?: MessageType | 'all'
  read?: boolean
}

/**
 * 获取消息列表
 */
export function useMessageList(params: MaybeRef<MessageListParams>) {
  return useQuery({
    queryKey: ['messageList', params],
    queryFn: () => getMessageList(unref(params)),
  })
}

/**
 * 获取未读消息数
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: ['unreadCount'],
    queryFn: () => getUnreadCount(),
    refetchInterval: 30000, // 每30秒自动刷新
  })
}

/**
 * 标记消息已读
 */
export function useMarkMessageAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => markMessageAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageList'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
    },
  })
}

/**
 * 批量标记已读
 */
export function useBatchMarkAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: string[]) => batchMarkAsRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageList'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
    },
  })
}

/**
 * 全部标记已读
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageList'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
    },
  })
}

/**
 * 删除消息
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageList'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
    },
  })
}

/**
 * 批量删除消息
 */
export function useBatchDeleteMessages() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: string[]) => batchDeleteMessages(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageList'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
    },
  })
}
