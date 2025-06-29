// PWA Service Worker
// 版本号，用于缓存更新
const CACHE_VERSION = 'v1.0.0'
const CACHE_NAME = `pms-pda-${CACHE_VERSION}`
const DATA_CACHE_NAME = `pms-pda-data-${CACHE_VERSION}`

// 需要缓存的静态资源
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo.png',
  '/beep.mp3',
  // 这些路径会在构建时自动生成
  // '/assets/index.js',
  // '/assets/index.css'
]

// 需要缓存的API路径模式
const API_CACHE_PATTERNS = [
  /\/api\/tasks/,
  /\/api\/products/,
  /\/api\/user/
]

// 不需要缓存的路径
const EXCLUDE_PATTERNS = [
  /\/api\/sync/,
  /\/api\/upload/,
  /\/api\/auth\/login/
]

// Service Worker 安装事件
self.addEventListener('install', (event) => {
  console.log('[SW] 安装中...', CACHE_VERSION)
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 缓存静态资源')
        return cache.addAll(STATIC_CACHE_URLS)
      })
      .then(() => {
        // 强制激活新的 Service Worker
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('[SW] 安装失败:', error)
      })
  )
})

// Service Worker 激活事件
self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中...', CACHE_VERSION)
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 删除旧版本的缓存
            if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
              console.log('[SW] 删除旧缓存:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        // 立即控制所有客户端
        return self.clients.claim()
      })
      .catch((error) => {
        console.error('[SW] 激活失败:', error)
      })
  )
})

// 网络请求拦截
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // 只处理同源请求
  if (url.origin !== location.origin) {
    return
  }
  
  // 检查是否需要排除
  if (EXCLUDE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return
  }
  
  // 处理 API 请求
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }
  
  // 处理静态资源请求
  event.respondWith(handleStaticRequest(request))
})

// 处理 API 请求
async function handleApiRequest(request) {
  const url = new URL(request.url)
  
  try {
    // 尝试网络请求
    const networkResponse = await fetch(request)
    
    // 如果是 GET 请求且成功，缓存响应
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(DATA_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] 网络请求失败，尝试缓存:', url.pathname)
    
    // 网络失败，尝试从缓存获取
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request)
      if (cachedResponse) {
        console.log('[SW] 返回缓存响应:', url.pathname)
        return cachedResponse
      }
    }
    
    // 返回离线页面或错误响应
    return createOfflineResponse(request)
  }
}

// 处理静态资源请求
async function handleStaticRequest(request) {
  try {
    // 先尝试缓存
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // 缓存未命中，尝试网络请求
    const networkResponse = await fetch(request)
    
    // 缓存成功的响应
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] 静态资源请求失败:', request.url)
    
    // 如果是页面请求，返回缓存的 index.html
    if (request.destination === 'document') {
      const cachedIndex = await caches.match('/index.html')
      if (cachedIndex) {
        return cachedIndex
      }
    }
    
    // 返回网络错误
    return new Response('网络错误', {
      status: 503,
      statusText: 'Service Unavailable'
    })
  }
}

// 创建离线响应
function createOfflineResponse(request) {
  const url = new URL(request.url)
  
  // 根据不同的 API 返回不同的离线响应
  if (url.pathname.includes('/tasks')) {
    return new Response(JSON.stringify({
      success: false,
      error: 'OFFLINE',
      message: '当前离线，请稍后重试'
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
  
  return new Response('服务不可用', {
    status: 503,
    statusText: 'Service Unavailable'
  })
}

// 后台同步事件
self.addEventListener('sync', (event) => {
  console.log('[SW] 后台同步事件:', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

// 执行后台同步
async function doBackgroundSync() {
  try {
    console.log('[SW] 开始后台同步')
    
    // 通知主线程执行同步
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        action: 'START_SYNC'
      })
    })
    
    // 这里可以添加具体的同步逻辑
    // 例如：上传待同步的数据
    
  } catch (error) {
    console.error('[SW] 后台同步失败:', error)
  }
}

// 推送通知事件
self.addEventListener('push', (event) => {
  console.log('[SW] 收到推送消息')
  
  let notificationData = {
    title: 'PMS-PDA',
    body: '您有新的分拣任务',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'pms-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: '查看任务'
      },
      {
        action: 'dismiss',
        title: '忽略'
      }
    ]
  }
  
  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = { ...notificationData, ...data }
    } catch (error) {
      console.error('[SW] 解析推送数据失败:', error)
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  )
})

// 通知点击事件
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 通知被点击:', event.action)
  
  event.notification.close()
  
  if (event.action === 'view') {
    // 打开应用
    event.waitUntil(
      clients.openWindow('/tasks')
    )
  }
})

// 消息事件（与主线程通信）
self.addEventListener('message', (event) => {
  console.log('[SW] 收到消息:', event.data)
  
  const { type, action, data } = event.data
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
      
    case 'CACHE_UPDATE':
      if (action === 'CLEAR') {
        clearCache()
      } else if (action === 'UPDATE') {
        updateCache(data)
      }
      break
      
    case 'SYNC_REQUEST':
      // 注册后台同步
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        self.registration.sync.register('background-sync')
      }
      break
      
    default:
      console.log('[SW] 未知消息类型:', type)
  }
})

// 清理缓存
async function clearCache() {
  try {
    const cacheNames = await caches.keys()
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    )
    console.log('[SW] 缓存已清理')
  } catch (error) {
    console.error('[SW] 清理缓存失败:', error)
  }
}

// 更新缓存
async function updateCache(urls) {
  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.addAll(urls)
    console.log('[SW] 缓存已更新')
  } catch (error) {
    console.error('[SW] 更新缓存失败:', error)
  }
}

// 错误处理
self.addEventListener('error', (event) => {
  console.error('[SW] Service Worker 错误:', event.error)
})

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] 未处理的 Promise 拒绝:', event.reason)
})

// 定期清理过期缓存
setInterval(async () => {
  try {
    const cache = await caches.open(DATA_CACHE_NAME)
    const requests = await cache.keys()
    
    for (const request of requests) {
      const response = await cache.match(request)
      if (response) {
        const dateHeader = response.headers.get('date')
        if (dateHeader) {
          const responseDate = new Date(dateHeader)
          const now = new Date()
          const daysDiff = (now.getTime() - responseDate.getTime()) / (1000 * 60 * 60 * 24)
          
          // 删除超过7天的缓存
          if (daysDiff > 7) {
            await cache.delete(request)
            console.log('[SW] 删除过期缓存:', request.url)
          }
        }
      }
    }
  } catch (error) {
    console.error('[SW] 清理过期缓存失败:', error)
  }
}, 24 * 60 * 60 * 1000) // 每24小时执行一次

console.log('[SW] Service Worker 已加载:', CACHE_VERSION)