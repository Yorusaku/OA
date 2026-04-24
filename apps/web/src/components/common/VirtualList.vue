<script setup lang="ts" generic="T = any">
/**
 * VirtualList - 虚拟滚动列表组件
 * 用于优化大数据量列表的渲染性能
 * 只渲染可视区域内的元素，大幅减少 DOM 节点数量
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

interface Props {
  items: T[]
  itemHeight: number
  bufferSize?: number
  height?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  bufferSize: 5,
  height: '100%'
})

const emit = defineEmits<{
  (e: 'scroll', scrollTop: number): void
}>()

// 容器引用
const containerRef = ref<HTMLElement>()
const scrollTop = ref(0)

// 容器高度（像素）
const containerHeight = computed(() => {
  if (typeof props.height === 'number') {
    return props.height
  }
  return parseInt(props.height) || 600
})

// 总高度
const totalHeight = computed(() => props.items.length * props.itemHeight)

// 可见区域可容纳的元素数量
const visibleCount = computed(() => Math.ceil(containerHeight.value / props.itemHeight))

// 开始索引（包含缓冲区）
const startIndex = computed(() => {
  const index = Math.floor(scrollTop.value / props.itemHeight)
  return Math.max(0, index - props.bufferSize)
})

// 结束索引（包含缓冲区）
const endIndex = computed(() => {
  const index = startIndex.value + visibleCount.value + props.bufferSize * 2
  return Math.min(props.items.length, index)
})

// 可见元素列表
const visibleItems = computed(() => {
  return props.items.slice(startIndex.value, endIndex.value).map((item, index) => ({
    data: item,
    index: startIndex.value + index
  }))
})

// 偏移量
const offsetY = computed(() => startIndex.value * props.itemHeight)

// 滚动事件处理
function handleScroll(event: Event) {
  const target = event.target as HTMLElement
  scrollTop.value = target.scrollTop
  emit('scroll', scrollTop.value)
}

// 滚动到指定索引
function scrollToIndex(index: number) {
  if (!containerRef.value) return
  const targetScrollTop = index * props.itemHeight
  containerRef.value.scrollTop = targetScrollTop
}

// 滚动到顶部
function scrollToTop() {
  scrollToIndex(0)
}

// 滚动到底部
function scrollToBottom() {
  scrollToIndex(props.items.length - 1)
}

// 监听 items 变化，重置滚动位置
watch(() => props.items.length, () => {
  scrollTop.value = 0
})

defineExpose({
  scrollToIndex,
  scrollToTop,
  scrollToBottom
})
</script>

<template>
  <div
    ref="containerRef"
    class="virtual-list-container"
    :style="{ height: typeof height === 'number' ? `${height}px` : height }"
    @scroll="handleScroll"
  >
    <div class="virtual-list-phantom" :style="{ height: `${totalHeight}px` }">
      <div class="virtual-list-content" :style="{ transform: `translateY(${offsetY}px)` }">
        <div
          v-for="{ data, index } in visibleItems"
          :key="index"
          class="virtual-list-item"
          :style="{ height: `${itemHeight}px` }"
        >
          <slot :item="data" :index="index" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.virtual-list-container {
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.virtual-list-phantom {
  position: relative;
}

.virtual-list-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.virtual-list-item {
  overflow: hidden;
}
</style>
