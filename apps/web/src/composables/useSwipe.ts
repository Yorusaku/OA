import type { Ref } from 'vue'
import { ref } from 'vue'

export interface SwipeAction {
  key: string
  label: string
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  handler: () => void
}

export interface UseSwipeOptions {
  threshold?: number
  maxDistance?: number
  onOpen?: () => void
  onClose?: () => void
}

export function useSwipe(
  _target: Ref<HTMLElement | null>,
  options: UseSwipeOptions = {},
) {
  const threshold = options.threshold ?? 50
  const maxDistance = ref(Math.max(0, options.maxDistance ?? 160))
  const translateX = ref(0)
  const isOpen = ref(false)

  let startX = 0
  let deltaX = 0
  let swiping = false

  function open() {
    isOpen.value = true
    translateX.value = -maxDistance.value
    options.onOpen?.()
  }

  function close() {
    if (!isOpen.value && translateX.value === 0)
      return

    isOpen.value = false
    translateX.value = 0
    options.onClose?.()
  }

  function handleTouchStart(event: TouchEvent) {
    if (event.touches.length === 0)
      return

    startX = event.touches[0].clientX
    deltaX = 0
    swiping = true
  }

  function handleTouchMove(event: TouchEvent) {
    if (!swiping || event.touches.length === 0)
      return

    const currentX = event.touches[0].clientX
    deltaX = currentX - startX

    if (isOpen.value) {
      if (deltaX > 0) {
        event.preventDefault()
        translateX.value = Math.max(-maxDistance.value, -maxDistance.value + deltaX)
      }
      else {
        event.preventDefault()
        translateX.value = -maxDistance.value
      }
      return
    }

    if (deltaX < 0) {
      event.preventDefault()
      translateX.value = Math.max(-maxDistance.value, deltaX)
    }
    else {
      translateX.value = 0
    }
  }

  function handleTouchEnd() {
    if (!swiping)
      return

    swiping = false

    if (isOpen.value) {
      if (deltaX > threshold)
        close()
      else
        open()
    }
    else if (deltaX < -threshold) {
      open()
    }
    else {
      close()
    }

    deltaX = 0
  }

  function setMaxDistance(distance: number) {
    maxDistance.value = Math.max(0, distance)
    if (isOpen.value)
      translateX.value = -maxDistance.value
  }

  return {
    translateX,
    isOpen,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    open,
    close,
    setMaxDistance,
  }
}

export function useSwipeActions(target: Ref<HTMLElement | null>) {
  const actionsWidth = ref(140)
  const swipeState = useSwipe(target, { maxDistance: actionsWidth.value })

  function setActionsWidth(width: number) {
    actionsWidth.value = Math.max(0, width)
    swipeState.setMaxDistance(actionsWidth.value)
  }

  return {
    translateX: swipeState.translateX,
    isOpen: swipeState.isOpen,
    open: swipeState.open,
    close: swipeState.close,
    setActionsWidth,
  }
}
