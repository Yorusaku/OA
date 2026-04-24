import { useScroll } from '@vueuse/core'
import type { Ref } from 'vue'
import { computed, ref, watch } from 'vue'

/**
 * 下拉刷新 Composable
 * 用于实现下拉刷新功能
 */

export interface UsePullRefreshOptions {
  /** 触发刷新的下拉距离阈值（px） */
  threshold?: number
  /** 刷新回调函数 */
  onRefresh: () => Promise<void>
}

export function usePullRefresh(
  target: Ref<HTMLElement | null>,
  options: UsePullRefreshOptions,
) {
  const { threshold = 60, onRefresh } = options

  const { y, arrivedState } = useScroll(target)
  const pullDistance = ref(0)
  const isRefreshing = ref(false)
  const isPulling = ref(false)

  let startY = 0
  let startScrollTop = 0

  const status = computed(() => {
    if (isRefreshing.value)
      return 'refreshing'
    if (pullDistance.value >= threshold)
      return 'ready'
    if (isPulling.value)
      return 'pulling'
    return 'idle'
  })

  const statusText = computed(() => {
    switch (status.value) {
      case 'pulling':
        return '下拉刷新'
      case 'ready':
        return '释放刷新'
      case 'refreshing':
        return '刷新中...'
      default:
        return ''
    }
  })

  function handleTouchStart(e: TouchEvent) {
    if (!arrivedState.top || isRefreshing.value)
      return

    startY = e.touches[0].clientY
    startScrollTop = target.value?.scrollTop || 0
    isPulling.value = true
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isPulling.value || !arrivedState.top)
      return

    const currentY = e.touches[0].clientY
    const distance = currentY - startY

    if (distance > 0 && startScrollTop === 0) {
      // 阻止默认滚动行为
      e.preventDefault()
      // 计算下拉距离，添加阻尼效果
      pullDistance.value = Math.min(distance * 0.5, threshold * 1.5)
    }
  }

  async function handleTouchEnd() {
    if (!isPulling.value)
      return

    isPulling.value = false

    if (pullDistance.value >= threshold && !isRefreshing.value) {
      isRefreshing.value = true
      try {
        await onRefresh()
      }
      finally {
        isRefreshing.value = false
        pullDistance.value = 0
      }
    }
    else {
      pullDistance.value = 0
    }
  }

  // 监听滚动位置，如果不在顶部则重置状态
  watch(
    () => arrivedState.top,
    (atTop) => {
      if (!atTop) {
        isPulling.value = false
        pullDistance.value = 0
      }
    },
  )

  return {
    pullDistance,
    isRefreshing,
    status,
    statusText,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  }
}
