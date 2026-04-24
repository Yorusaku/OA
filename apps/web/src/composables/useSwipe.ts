import { useSwipe } from '@vueuse/core'
import type { Ref } from 'vue'
import { ref } from 'vue'

/**
 * 列表项滑动操作 Composable
 * 用于实现左滑显示操作按钮的功能
 */

export interface SwipeAction {
  key: string
  label: string
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  handler: () => void
}

export function useSwipeActions(target: Ref<HTMLElement | null>) {
  const translateX = ref(0)
  const isOpen = ref(false)
  const actionsWidth = ref(0)

  const { direction, lengthX } = useSwipe(target, {
    threshold: 10,
    onSwipe() {
      if (direction.value === 'left' && lengthX.value > 50) {
        // 左滑超过 50px，打开操作按钮
        open()
      }
      else if (direction.value === 'right' && isOpen.value) {
        // 右滑且已打开，关闭操作按钮
        close()
      }
    },
    onSwipeEnd() {
      // 滑动结束，根据滑动距离决定是否打开
      if (direction.value === 'left' && lengthX.value > actionsWidth.value / 2) {
        open()
      }
      else {
        close()
      }
    },
  })

  function open() {
    isOpen.value = true
    translateX.value = -actionsWidth.value
  }

  function close() {
    isOpen.value = false
    translateX.value = 0
  }

  function setActionsWidth(width: number) {
    actionsWidth.value = width
  }

  return {
    translateX,
    isOpen,
    open,
    close,
    setActionsWidth,
  }
}
