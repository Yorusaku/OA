import { ref, onMounted, onUnmounted } from 'vue'

/**
 * useLazyImage - 图片懒加载 Composable
 * 使用 Intersection Observer API 实现图片懒加载
 */
export function useLazyImage() {
  const observer = ref<IntersectionObserver | null>(null)

  onMounted(() => {
    // 创建 Intersection Observer
    observer.value = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            const src = img.dataset.src

            if (src) {
              // 加载图片
              img.src = src
              img.removeAttribute('data-src')

              // 停止观察已加载的图片
              observer.value?.unobserve(img)
            }
          }
        })
      },
      {
        rootMargin: '50px', // 提前 50px 开始加载
        threshold: 0.01,
      }
    )
  })

  onUnmounted(() => {
    observer.value?.disconnect()
  })

  /**
   * 观察图片元素
   */
  function observe(el: HTMLElement) {
    if (observer.value) {
      observer.value.observe(el)
    }
  }

  /**
   * 停止观察图片元素
   */
  function unobserve(el: HTMLElement) {
    if (observer.value) {
      observer.value.unobserve(el)
    }
  }

  return {
    observe,
    unobserve,
  }
}
