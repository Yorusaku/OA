/**
 * 应用入口文件
 */
import type { VueQueryPluginOptions } from '@tanstack/vue-query'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { setupAuthDirective } from './directives/auth'
import { router } from './router'
import { setupFormCreate } from '@/plugins/form-create'
import './styles/index.css' // 🚀 1. 先引入 Tailwind 等基础样式
import 'element-plus/dist/index.css' // 🚀 2. Element Plus 全量 CSS（必须在 Tailwind 之后，利用 CSS 后发优势覆盖）

async function bootstrap() {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const { worker } = await import('./mocks/browser')
    await worker.start({
      onUnhandledRequest: 'bypass',
    })
  }

  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  })

  const vueQueryOptions: VueQueryPluginOptions = {
    queryClient,
  }

  app.use(router)
  app.use(VueQueryPlugin, vueQueryOptions)
  setupFormCreate(app) // 🚀 注入动态表单白名单与引擎
  setupAuthDirective(app)
  app.mount('#app')
}

bootstrap()
