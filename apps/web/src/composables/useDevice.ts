import { useBreakpoints, useMediaQuery } from '@vueuse/core'
import { computed } from 'vue'

/**
 * 设备检测 Composable
 * 基于 Tailwind CSS 默认断点进行响应式设备类型检测
 */

// Tailwind CSS 默认断点
const breakpoints = useBreakpoints({
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
})

export function useDevice() {
  // 移动端：< 768px
  const isMobile = breakpoints.smaller('md')

  // 平板端：768px - 1023px
  const isTablet = breakpoints.between('md', 'lg')

  // 桌面端：>= 1024px
  const isDesktop = breakpoints.greaterOrEqual('lg')

  // 触摸设备检测
  const isTouchDevice = useMediaQuery('(hover: none) and (pointer: coarse)')

  // 屏幕方向
  const isPortrait = useMediaQuery('(orientation: portrait)')
  const isLandscape = useMediaQuery('(orientation: landscape)')

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    isPortrait,
    isLandscape,
  }
}
