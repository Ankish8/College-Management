// Service Worker for JLU College Management System
// Implements offline-first strategy with educational app optimizations

const CACHE_NAME = 'jlu-cms-v1.0.0'
const STATIC_CACHE = 'jlu-cms-static-v1.0.0'
const DYNAMIC_CACHE = 'jlu-cms-dynamic-v1.0.0'
const API_CACHE = 'jlu-cms-api-v1.0.0'

// Cache configurations for different content types
const CACHE_CONFIG = {
  // Critical assets cached for 30 days
  static: {
    duration: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 100
  },
  // API responses cached for 5 minutes
  api: {
    duration: 5 * 60 * 1000, // 5 minutes
    maxEntries: 50
  },
  // Dynamic content cached for 1 hour
  dynamic: {
    duration: 60 * 60 * 1000, // 1 hour
    maxEntries: 30
  }
}

// Critical assets for offline functionality
const CRITICAL_ASSETS = [
  '/',
  '/dashboard',
  '/timetable',
  '/attendance',
  '/manifest.json',
  '/globals.css',
  // Add critical icons and fonts
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// Educational app specific routes that should work offline
const OFFLINE_PAGES = [
  '/dashboard',
  '/timetable',
  '/attendance',
  '/my-attendance',
  '/students',
  '/subjects'
]

// API endpoints that support offline functionality
const CACHEABLE_API_PATTERNS = [
  /^\/api\/batches/,
  /^\/api\/subjects/,
  /^\/api\/timetable\/entries/,
  /^\/api\/students/,
  /^\/api\/faculty/,
  /^\/api\/timeslots/
]

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  console.log('📱 JLU CMS Service Worker installing...')
  
  event.waitUntil(
    Promise.all([
      // Cache critical static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('📦 Caching critical assets')
        return cache.addAll(CRITICAL_ASSETS)
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 JLU CMS Service Worker activating...')
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      cleanupOldCaches(),
      
      // Claim all clients immediately
      self.clients.claim(),
      
      // Notify clients that SW is ready
      notifyClients({ type: 'OFFLINE_READY' })
    ])
  )
})

// Fetch event - implement offline-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return
  }
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
  } else if (url.pathname.startsWith('/_next/')) {
    event.respondWith(handleStaticAsset(request))
  } else if (OFFLINE_PAGES.some(page => url.pathname.startsWith(page))) {
    event.respondWith(handlePageRequest(request))
  } else {
    event.respondWith(handleDefaultRequest(request))
  }
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag)
  
  if (event.tag === 'attendance-sync') {
    event.waitUntil(syncAttendanceData())
  } else if (event.tag === 'timetable-sync') {
    event.waitUntil(syncTimetableData())
  } else if (event.tag === 'student-data-sync') {
    event.waitUntil(syncStudentData())
  }
})

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received')
  
  if (!event.data) return
  
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/attendance-96x96.png',
    vibrate: [100, 50, 100],
    data: data.data,
    actions: data.actions || [
      {
        action: 'view',
        title: 'View Details',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: data.urgent || false,
    tag: data.tag || 'jlu-cms-notification'
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Notification clicked:', event.action)
  
  event.notification.close()
  
  if (event.action === 'view') {
    const urlToOpen = event.notification.data?.url || '/dashboard'
    event.waitUntil(
      clients.openWindow(urlToOpen)
    )
  } else if (event.action === 'mark-attendance') {
    event.waitUntil(
      clients.openWindow('/attendance?action=mark')
    )
  }
})

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
      
    case 'CACHE_ATTENDANCE_DATA':
      event.waitUntil(cacheAttendanceData(payload))
      break
      
    case 'CACHE_TIMETABLE_DATA':
      event.waitUntil(cacheTimetableData(payload))
      break
      
    case 'GET_CACHE_STATUS':
      event.waitUntil(sendCacheStatus(event.source))
      break
  }
})

// API request handler - network first with cache fallback
async function handleApiRequest(request) {
  const url = new URL(request.url)
  const isCacheable = CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname))
  
  if (!isCacheable) {
    return fetch(request).catch(() => new Response(
      JSON.stringify({ error: 'Offline', offline: true }),
      { headers: { 'Content-Type': 'application/json' } }
    ))
  }
  
  try {
    // Try network first for fresh data
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE)
      cache.put(request, networkResponse.clone())
      
      // Clean old entries
      await cleanupCache(cache, CACHE_CONFIG.api)
    }
    
    return networkResponse
  } catch (error) {
    console.log('📱 Network failed for API, trying cache:', url.pathname)
    
    // Fallback to cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      // Add offline indicator to cached response
      const data = await cachedResponse.json()
      return new Response(
        JSON.stringify({ ...data, _offline: true }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Return offline error if no cache
    return new Response(
      JSON.stringify({ 
        error: 'No offline data available',
        offline: true,
        message: 'This content is not available offline'
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Static asset handler - cache first
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    // Return cached version and update in background
    fetchAndCache(request, STATIC_CACHE)
    return cachedResponse
  }
  
  // Fetch and cache new assets
  return fetchAndCache(request, STATIC_CACHE)
}

// Page request handler - cache first with fallback
async function handlePageRequest(request) {
  try {
    // Try network first for dynamic content
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
      await cleanupCache(cache, CACHE_CONFIG.dynamic)
    }
    
    return networkResponse
  } catch (error) {
    // Fallback to cached version
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page if no cache
    return caches.match('/') || new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>JLU CMS - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline { color: #666; }
          </style>
        </head>
        <body>
          <h1>You're Offline</h1>
          <p class="offline">Please check your internet connection to access this page.</p>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}

// Default request handler
async function handleDefaultRequest(request) {
  try {
    return await fetch(request)
  } catch (error) {
    const cachedResponse = await caches.match(request)
    return cachedResponse || new Response('Offline', { status: 503 })
  }
}

// Utility functions
async function fetchAndCache(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const cachedResponse = await caches.match(request)
    return cachedResponse || new Response('Network Error', { status: 503 })
  }
}

async function cleanupOldCaches() {
  const cacheNames = await caches.keys()
  const oldCaches = cacheNames.filter(name => 
    name.startsWith('jlu-cms-') && 
    !name.includes('v1.0.0')
  )
  
  return Promise.all(
    oldCaches.map(cacheName => caches.delete(cacheName))
  )
}

async function cleanupCache(cache, config) {
  const keys = await cache.keys()
  if (keys.length <= config.maxEntries) return
  
  // Remove oldest entries
  const entriesToDelete = keys.slice(0, keys.length - config.maxEntries)
  return Promise.all(
    entriesToDelete.map(key => cache.delete(key))
  )
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll()
  clients.forEach(client => client.postMessage(message))
}

// Background sync functions for educational data
async function syncAttendanceData() {
  try {
    const storedData = await getStoredSyncData('attendance-sync')
    if (!storedData) return
    
    const response = await fetch('/api/attendance/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(storedData)
    })
    
    if (response.ok) {
      await clearStoredSyncData('attendance-sync')
      await notifyClients({ type: 'SYNC_COMPLETED', tag: 'attendance-sync' })
    }
  } catch (error) {
    console.error('Attendance sync failed:', error)
  }
}

async function syncTimetableData() {
  try {
    const storedData = await getStoredSyncData('timetable-sync')
    if (!storedData) return
    
    const response = await fetch('/api/timetable/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(storedData)
    })
    
    if (response.ok) {
      await clearStoredSyncData('timetable-sync')
      await notifyClients({ type: 'SYNC_COMPLETED', tag: 'timetable-sync' })
    }
  } catch (error) {
    console.error('Timetable sync failed:', error)
  }
}

async function syncStudentData() {
  try {
    const storedData = await getStoredSyncData('student-data-sync')
    if (!storedData) return
    
    const response = await fetch('/api/students/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(storedData)
    })
    
    if (response.ok) {
      await clearStoredSyncData('student-data-sync')
      await notifyClients({ type: 'SYNC_COMPLETED', tag: 'student-data-sync' })
    }
  } catch (error) {
    console.error('Student data sync failed:', error)
  }
}

// IndexedDB utilities for offline storage
async function getStoredSyncData(tag) {
  // Implementation would use IndexedDB to retrieve stored sync data
  // For now, using localStorage fallback
  const data = localStorage.getItem(`sync-${tag}`)
  return data ? JSON.parse(data) : null
}

async function clearStoredSyncData(tag) {
  localStorage.removeItem(`sync-${tag}`)
}

async function cacheAttendanceData(data) {
  const cache = await caches.open(API_CACHE)
  const response = new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
  await cache.put('/api/attendance/current', response)
}

async function cacheTimetableData(data) {
  const cache = await caches.open(API_CACHE)
  const response = new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
  await cache.put('/api/timetable/current', response)
}

async function sendCacheStatus(client) {
  const cacheNames = await caches.keys()
  const status = {
    caches: cacheNames,
    ready: cacheNames.length > 0
  }
  client.postMessage({ type: 'CACHE_STATUS', payload: status })
}

console.log('📱 JLU CMS Service Worker loaded successfully')