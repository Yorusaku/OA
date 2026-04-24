/**
 * Service Worker - Offline-First PWA Strategy
 * 缓存策略：
 * - 静态资源（HTML/CSS/JS/字体）：Cache First
 * - API 请求：Network First with Cache Fallback
 * - 图片资源：Stale While Revalidate
 */

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `static-${CACHE_VERSION}`
const API_CACHE = `api-${CACHE_VERSION}`
const IMAGE_CACHE = `images-${CACHE_VERSION}`

// 需要预缓存的静态资源
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
]

// ==================== Install Event ====================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...')

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Precaching static resources')
      return cache.addAll(PRECACHE_URLS)
    }).then(() => {
      // 强制激活新的 Service Worker
      return self.skipWaiting()
    })
  )
})

// ==================== Activate Event ====================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...')

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 删除旧版本缓存
          if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE && cacheName !== IMAGE_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      // 立即接管所有页面
      return self.clients.claim()
    })
  )
})

// ==================== Fetch Event ====================
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 跳过非 HTTP(S) 请求
  if (!url.protocol.startsWith('http')) {
    return
  }

  // API 请求：Network First with Cache Fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE))
    return
  }

  // 图片资源：Stale While Revalidate
  if (request.destination === 'image') {
    event.respondWith(staleWhileRevalidateStrategy(request, IMAGE_CACHE))
    return
  }

  // 静态资源（HTML/CSS/JS/字体）：Cache First
  if (
    request.destination === 'document' ||
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font'
  ) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE))
    return
  }

  // 其他请求：Network First
  event.respondWith(networkFirstStrategy(request, STATIC_CACHE))
})

// ==================== Caching Strategies ====================

/**
 * Cache First Strategy
 * 优先从缓存读取，缓存未命中时从网络获取并缓存
 */
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)

  if (cachedResponse) {
    console.log('[SW] Cache hit:', request.url)
    return cachedResponse
  }

  console.log('[SW] Cache miss, fetching:', request.url)
  try {
    const networkResponse = await fetch(request)

    // 只缓存成功的响应
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.error('[SW] Fetch failed:', error)

    // 如果是导航请求且网络失败，返回离线页面
    if (request.mode === 'navigate') {
      return cache.match('/index.html')
    }

    throw error
  }
}

/**
 * Network First Strategy
 * 优先从网络获取，网络失败时从缓存读取
 */
async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName)

  try {
    const networkResponse = await fetch(request)

    // 只缓存成功的响应
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    throw error
  }
}

/**
 * Stale While Revalidate Strategy
 * 立即返回缓存，同时在后台更新缓存
 */
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)

  // 后台更新缓存
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  }).catch((error) => {
    console.error('[SW] Background fetch failed:', error)
  })

  // 如果有缓存，立即返回；否则等待网络响应
  return cachedResponse || fetchPromise
}

// ==================== Message Event ====================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        )
      })
    )
  }
})
