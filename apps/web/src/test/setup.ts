import { beforeEach } from 'vitest'
import { config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

beforeEach(() => {
  setActivePinia(createPinia())
})

config.global.stubs = {
  ...config.global.stubs,
  ElTimeline: true,
  ElTimelineItem: true,
  ElAvatar: true,
  ElSkeleton: true,
}
