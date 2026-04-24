import type { Directive } from 'vue'

/**
 * v-lazy 指令 - 图片懒加载
 * 使用 Intersection Observer API 实现
 *
 * 用法：
 * <img v-lazy="imageUrl" alt="description" />
 */

const lazyImageObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement
        const src = img.dataset.src

        if (src) {
          // 创建新的 Image 对象预加载
          const tempImg = new Image()
          tempImg.onload = () => {
            img.src = src
            img.classList.remove('lazy-loading')
            img.classList.add('lazy-loaded')
          }
          tempImg.onerror = () => {
            img.classList.remove('lazy-loading')
            img.classList.add('lazy-error')
          }
          tempImg.src = src

          img.removeAttribute('data-src')
          lazyImageObserver.unobserve(img)
        }
      }
    })
  },
  {
    rootMargin: '50px',
    threshold: 0.01,
  }
)

export const vLazy: Directive<HTMLImageElement, string> = {
  mounted(el, binding) {
    // 设置占位符
    el.classList.add('lazy-loading')

    // 保存真实图片地址到 data-src
    el.dataset.src = binding.value

    // 设置占位图（可选）
    if (!el.src) {
      el.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="%23999"%3ELoading...%3C/text%3E%3C/svg%3E'
    }

    // 开始观察
    lazyImageObserver.observe(el)
  },

  updated(el, binding) {
    // 如果图片地址变化，重新加载
    if (binding.value !== binding.oldValue) {
      el.dataset.src = binding.value
      el.classList.remove('lazy-loaded', 'lazy-error')
      el.classList.add('lazy-loading')
      lazyImageObserver.observe(el)
    }
  },

  unmounted(el) {
    // 停止观察
    lazyImageObserver.unobserve(el)
  },
}

/**
 * 注册懒加载指令
 */
export function setupLazyDirective(app: any) {
  app.directive('lazy', vLazy)
}
