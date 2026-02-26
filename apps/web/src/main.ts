/**
 * 应用入口文件
 */
import type { VueQueryPluginOptions } from '@tanstack/vue-query'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import App from './App.vue'
import { setupAuthDirective } from './directives/auth'
import { router } from './router'
import { setupFormCreate } from '@/plugins/form-create'
import './styles/index.css'
import 'element-plus/dist/index.css'

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
  app.use(ElementPlus)
  setupFormCreate(app)
  setupAuthDirective(app)
  app.mount('#app')
}

bootstrap()
