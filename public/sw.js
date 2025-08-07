// Service Worker for Background Sync and Caching
const CACHE_NAME = 'jlu-college-management-v1'
const API_CACHE = 'jlu-api-cache-v1'
const STATIC_CACHE = 'jlu-static-cache-v1'

// Critical routes and API endpoints to cache
const CRITICAL_ROUTES = [
  '/',
  '/dashboard',
  '/students',
  '/faculty', 
  '/subjects',
  '/timetable',
  '/attendance',
  '/settings'
]

const CRITICAL_API_ENDPOINTS = [
  '/api/auth/session',
  '/api/students?fields=minimal',
  '/api/faculty?fields=minimal', 
  '/api/subjects?fields=minimal',
  '/api/batches?fields=minimal',
  '/api/timetable/entries?fields=calendar',
  '/api/timeslots',
  '/api/settings/academic-calendar',
  '/api/user/preferences'
]

// Priority levels for different types of data
const CACHE_PRIORITIES = {
  CRITICAL: 1,    // Essential for offline functionality
  IMPORTANT: 2,   // Frequently accessed data
  STANDARD: 3     // Normal caching
}

const STATIC_ASSETS = [
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png'
]

// Background sync queue for failed requests
const SYNC_QUEUE_NAME = 'jlu-background-sync'
let syncQueue = []

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then(cache => {
        return cache.addAll(STATIC_ASSETS)
      }),
      
      // Pre-cache critical routes (HTML pages)
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(CRITICAL_ROUTES.map(route => 
          new Request(route, { 
            headers: { 'Accept': 'text/html' }
          })
        ))
      })
    ]).then(() => {
      console.log('[SW] Installation complete')
      self.skipWaiting()
    })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== API_CACHE && 
                cacheName !== STATIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      
      // Claim all clients
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Activation complete')
    })
  )
})

// Fetch event - handle requests with caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-http requests
  if (!request.url.startsWith('http')) return
  
  // Skip if not same origin (except for fonts/images)
  if (url.origin !== self.location.origin && 
      !request.url.includes('fonts') && 
      !request.url.includes('images')) {
    return
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }
  
  // Handle static assets
  if (request.destination === 'image' || 
      request.destination === 'font' ||
      url.pathname.includes('/static/') ||
      url.pathname.includes('/_next/')) {
    event.respondWith(handleStaticAssets(request))
    return
  }
  
  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate' || 
      (request.method === 'GET' && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(handleNavigation(request))
    return
  }
  
  // Default: network first
  event.respondWith(fetch(request))
})

// API Request Handler - Enhanced for offline data management
async function handleApiRequest(request) {
  const url = new URL(request.url)
  const cache = await caches.open(API_CACHE)
  const isCriticalEndpoint = CRITICAL_API_ENDPOINTS.some(endpoint => 
    url.pathname.includes(endpoint.split('?')[0])
  )
  
  try {
    // Try network first
    const networkResponse = await fetch(request.clone())
    
    // Cache successful GET requests with priority handling
    if (request.method === 'GET' && networkResponse.ok) {
      const cacheHeaders = new Headers(networkResponse.headers)
      
      // Add cache metadata
      if (isCriticalEndpoint) {
        cacheHeaders.set('x-cache-priority', CACHE_PRIORITIES.CRITICAL.toString())
        cacheHeaders.set('x-cache-type', 'critical')
      } else {
        cacheHeaders.set('x-cache-priority', CACHE_PRIORITIES.STANDARD.toString())
        cacheHeaders.set('x-cache-type', 'standard')
      }
      
      cacheHeaders.set('x-cache-timestamp', Date.now().toString())
      
      const responseToCache = new Response(await networkResponse.clone().text(), {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: cacheHeaders
      })
      
      cache.put(request, responseToCache)
    }
    
    return networkResponse
    
  } catch (error) {
    console.log('[SW] Network failed for API request:', url.pathname)
    
    // For GET requests, try cache with fallback strategies
    if (request.method === 'GET') {
      const cachedResponse = await cache.match(request)
      if (cachedResponse) {
        console.log('[SW] Serving API from cache:', url.pathname)
        
        // Add offline indicator header
        const offlineHeaders = new Headers(cachedResponse.headers)
        offlineHeaders.set('x-served-by', 'service-worker-cache')
        offlineHeaders.set('x-offline-mode', 'true')
        
        const offlineResponse = new Response(await cachedResponse.text(), {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers: offlineHeaders
        })
        
        return offlineResponse
      }

      // Try to construct fallback response for critical endpoints
      if (isCriticalEndpoint) {
        const fallbackData = await getFallbackData(url.pathname)
        if (fallbackData) {
          console.log('[SW] Serving fallback data:', url.pathname)
          return new Response(JSON.stringify(fallbackData), {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              'x-served-by': 'service-worker-fallback',
              'x-offline-mode': 'true'
            }
          })
        }
      }
    } else {
      // For POST/PUT/DELETE, add to sync queue with priority
      const priority = isCriticalEndpoint ? CACHE_PRIORITIES.CRITICAL : CACHE_PRIORITIES.STANDARD
      await addToSyncQueue(request, priority)
      
      return new Response(
        JSON.stringify({ 
          error: 'Offline - queued for sync',
          queued: true,
          priority: priority
        }), 
        { 
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    throw error
  }
}

// Get fallback data for critical endpoints when offline
async function getFallbackData(pathname) {
  // Basic fallback data structures for critical endpoints
  if (pathname.includes('/students')) {
    return { students: [], total: 0, offline: true }
  }
  if (pathname.includes('/faculty')) {
    return { faculty: [], total: 0, offline: true }
  }
  if (pathname.includes('/subjects')) {
    return { subjects: [], total: 0, offline: true }
  }
  if (pathname.includes('/batches')) {
    return { batches: [], total: 0, offline: true }
  }
  if (pathname.includes('/timetable/entries')) {
    return { entries: [], total: 0, offline: true }
  }
  if (pathname.includes('/time-slots')) {
    return { timeSlots: [], offline: true }
  }
  if (pathname.includes('/preferences')) {
    return { preferences: {}, offline: true }
  }
  
  return null
}

// Static Assets Handler - Cache first
async function handleStaticAssets(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    // Serve from cache and update in background
    fetch(request).then(networkResponse => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse)
      }
    }).catch(() => {})
    
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch {
    // Return a fallback for images
    if (request.destination === 'image') {
      return new Response('', { status: 404 })
    }
    throw error
  }
}

// Navigation Handler - Network first with cache fallback
async function handleNavigation(request) {
  const cache = await caches.open(CACHE_NAME)
  
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch {
    console.log('[SW] Network failed for navigation:', request.url)
    
    // Try cache
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Fallback to index.html for SPA routes
    const indexResponse = await cache.match('/')
    if (indexResponse) {
      return indexResponse
    }
    
    // Final fallback
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head><title>Offline</title></head>
      <body>
        <h1>You're offline</h1>
        <p>Please check your internet connection.</p>
      </body>
      </html>`, 
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}

// Background Sync - Add failed request to queue
async function addToSyncQueue(request) {
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.method !== 'GET' ? await request.text() : null,
    timestamp: Date.now()
  }
  
  syncQueue.push(requestData)
  
  // Store in IndexedDB for persistence
  if ('indexedDB' in self) {
    try {
      const db = await openIndexedDB()
      const transaction = db.transaction(['syncQueue'], 'readwrite')
      const store = transaction.objectStore('syncQueue')
      await store.add({ ...requestData, id: Date.now() })
    } catch (error) {
      console.error('[SW] Failed to store sync queue item:', error)
    }
  }
  
  console.log('[SW] Added to sync queue:', request.url)
}

// Background Sync Event
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_QUEUE_NAME) {
    console.log('[SW] Background sync triggered')
    event.waitUntil(processSyncQueue())
  }
})

// Process sync queue
async function processSyncQueue() {
  console.log('[SW] Processing sync queue...')
  
  // Load queue from IndexedDB
  if ('indexedDB' in self) {
    try {
      const db = await openIndexedDB()
      const transaction = db.transaction(['syncQueue'], 'readonly')
      const store = transaction.objectStore('syncQueue')
      const items = await store.getAll()
      syncQueue = items.map(item => item)
    } catch (error) {
      console.error('[SW] Failed to load sync queue:', error)
    }
  }
  
  const failedItems = []
  
  for (const item of syncQueue) {
    try {
      const request = new Request(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body
      })
      
      const response = await fetch(request)
      
      if (response.ok) {
        console.log('[SW] Sync successful:', item.url)
        
        // Remove from IndexedDB
        if ('indexedDB' in self) {
          const db = await openIndexedDB()
          const transaction = db.transaction(['syncQueue'], 'readwrite')
          const store = transaction.objectStore('syncQueue')
          await store.delete(item.id)
        }
        
        // Notify client about successful sync
        notifyClients('sync-success', { url: item.url, method: item.method })
      } else {
        failedItems.push(item)
      }
    } catch (error) {
      console.error('[SW] Sync failed:', item.url, error)
      failedItems.push(item)
    }
  }
  
  syncQueue = failedItems
  console.log('[SW] Sync queue processing complete. Failed items:', failedItems.length)
}

// IndexedDB helpers
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('JLU_SW_DB', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp')
      }
    }
  })
}

// Notify clients
function notifyClients(type, data) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type, data })
    })
  })
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
      
    case 'GET_CACHE_SIZE':
      getCacheSize().then(size => {
        event.ports[0].postMessage({ cacheSize: size })
      })
      break
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true })
      })
      break
      
    case 'FORCE_SYNC':
      processSyncQueue().then(() => {
        event.ports[0].postMessage({ success: true })
      })
      break
  }
})

// Get cache size
async function getCacheSize() {
  const cacheNames = await caches.keys()
  let totalSize = 0
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName)
    const requests = await cache.keys()
    
    for (const request of requests) {
      const response = await cache.match(request)
      if (response) {
        const blob = await response.blob()
        totalSize += blob.size
      }
    }
  }
  
  return totalSize
}

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys()
  await Promise.all(cacheNames.map(name => caches.delete(name)))
  
  // Clear IndexedDB
  if ('indexedDB' in self) {
    const db = await openIndexedDB()
    const transaction = db.transaction(['syncQueue'], 'readwrite')
    const store = transaction.objectStore('syncQueue')
    await store.clear()
  }
  
  console.log('[SW] All caches cleared')
}

console.log('[SW] Service worker script loaded')