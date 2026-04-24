/**
 * 应用入口文件
 */
import type { VueQueryPluginOptions } from '@tanstack/vue-query'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { setupAuthDirective } from './directives/auth'
import { setupLazyDirective } from './directives/lazy'
import { setupElementPlus } from './plugins/element-plus'
import { setupRuntimePreload } from './plugins/runtime-preload'
import { router } from './router'
import './styles/index.css'
import 'element-plus/dist/index.css'

const FORM_CREATE_ROUTE_PREFIXES = ['/approval', '/form', '/demo']

function requiresFormCreate(path: string) {
  return FORM_CREATE_ROUTE_PREFIXES.some(prefix => path.startsWith(prefix))
}

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
  await setupElementPlus(app)

  let formCreateInstalled = false
  let formCreateInstalling: Promise<void> | null = null
  async function ensureFormCreateInstalled() {
    if (formCreateInstalled)
      return
    if (!formCreateInstalling) {
      formCreateInstalling = import('@/plugins/form-create')
        .then(({ setupFormCreate }) => {
          setupFormCreate(app)
          formCreateInstalled = true
        })
        .finally(() => {
          formCreateInstalling = null
        })
    }
    await formCreateInstalling
  }

  router.beforeEach(async (to) => {
    if (requiresFormCreate(to.path))
      await ensureFormCreateInstalled()
  })

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
  await router.isReady()
  if (requiresFormCreate(router.currentRoute.value.path))
    await ensureFormCreateInstalled()

  app.use(VueQueryPlugin, vueQueryOptions)
  setupRuntimePreload(router)
  setupAuthDirective(app)
  setupLazyDirective(app)
  app.mount('#app')

  // 注册 Service Worker（仅在生产环境）
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope)

          // 监听 Service Worker 更新
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New Service Worker available, please refresh')
                  // 可以在这里触发更新提示
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error)
        })
    })
  }
}

bootstrap()
