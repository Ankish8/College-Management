'use client'

import { useState, useEffect, useCallback } from 'react'

interface SyncMessage {
  type: 'sync-success' | 'sync-failed' | 'cache-updated'
  data: any
}

interface ServiceWorkerAPI {
  register: () => Promise<ServiceWorkerRegistration | null>
  unregister: () => Promise<boolean>
  getCacheSize: () => Promise<number>
  clearCache: () => Promise<void>
  forceSync: () => Promise<void>
  onMessage: (callback: (message: SyncMessage) => void) => void
  formatCacheSize: (bytes: number) => string
  isSupported: boolean
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private messageCallbacks: ((message: SyncMessage) => void)[] = []

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupMessageListener()
    }
  }

  get isSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator
  }

  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported) {
      console.log('Service workers not supported')
      return null
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      this.registration = registration

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        
        if (newWorker) {
          console.log('New service worker installing...')
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New service worker installed, refresh recommended')
              
              // Show update notification
              this.notifyCallbacks({
                type: 'cache-updated',
                data: { needsRefresh: true }
              })
            }
          })
        }
      })

      // Register for background sync
      if ('sync' in registration) {
        try {
          await (registration as any).sync.register('jlu-background-sync')
          console.log('Background sync registered')
        } catch (error) {
          console.error('Failed to register background sync:', error)
        }
      }

      console.log('Service worker registered successfully')
      return registration
      
    } catch (error) {
      console.error('Service worker registration failed:', error)
      return null
    }
  }

  async unregister(): Promise<boolean> {
    if (!this.registration) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        this.registration = registration
      }
    }

    if (this.registration) {
      try {
        const result = await this.registration.unregister()
        console.log('Service worker unregistered:', result)
        return result
      } catch (error) {
        console.error('Failed to unregister service worker:', error)
        return false
      }
    }

    return false
  }

  async getCacheSize(): Promise<number> {
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel()
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.cacheSize || 0)
      }

      navigator.serviceWorker.controller?.postMessage(
        { type: 'GET_CACHE_SIZE' },
        [messageChannel.port2]
      )
    })
  }

  async clearCache(): Promise<void> {
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel()
      
      messageChannel.port1.onmessage = () => {
        resolve()
      }

      navigator.serviceWorker.controller?.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      )
    })
  }

  async forceSync(): Promise<void> {
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel()
      
      messageChannel.port1.onmessage = () => {
        resolve()
      }

      navigator.serviceWorker.controller?.postMessage(
        { type: 'FORCE_SYNC' },
        [messageChannel.port2]
      )
    })
  }

  onMessage(callback: (message: SyncMessage) => void): void {
    this.messageCallbacks.push(callback)
  }

  private setupMessageListener(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.notifyCallbacks(event.data)
      })
    }
  }

  private notifyCallbacks(message: SyncMessage): void {
    this.messageCallbacks.forEach(callback => {
      try {
        callback(message)
      } catch (error) {
        console.error('Error in service worker message callback:', error)
      }
    })
  }

  // Utility methods
  async skipWaiting(): Promise<void> {
    navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' })
  }

  async isOnline(): Promise<boolean> {
    if (!navigator.onLine) {
      return false
    }

    // Try to fetch a small resource to verify connectivity
    try {
      const response = await fetch('/favicon.ico', { 
        cache: 'no-cache',
        mode: 'no-cors' 
      })
      return true
    } catch {
      return false
    }
  }

  // Format cache size for display
  formatCacheSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// Singleton instance
const serviceWorker: ServiceWorkerAPI = new ServiceWorkerManager()

export default serviceWorker

// React hook for service worker functionality
export function useServiceWorker() {
  const [isRegistered, setIsRegistered] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [cacheSize, setCacheSize] = useState(0)
  const [needsRefresh, setNeedsRefresh] = useState(false)

  useEffect(() => {
    let mounted = true

    // Register service worker
    serviceWorker.register().then((registration) => {
      if (mounted && registration) {
        setIsRegistered(true)
      }
    })

    // Setup online/offline detection
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Setup service worker messages
    serviceWorker.onMessage((message) => {
      if (!mounted) return
      
      switch (message.type) {
        case 'sync-success':
          console.log('Background sync completed:', message.data)
          break
          
        case 'cache-updated':
          if (message.data.needsRefresh) {
            setNeedsRefresh(true)
          }
          break
      }
    })

    // Get initial cache size
    serviceWorker.getCacheSize().then((size) => {
      if (mounted) {
        setCacheSize(size)
      }
    })

    return () => {
      mounted = false
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const refreshCacheSize = useCallback(async () => {
    const size = await serviceWorker.getCacheSize()
    setCacheSize(size)
  }, [])

  const clearCache = useCallback(async () => {
    await serviceWorker.clearCache()
    setCacheSize(0)
  }, [])

  const forceRefresh = useCallback(() => {
    window.location.reload()
  }, [])

  return {
    isSupported: serviceWorker.isSupported,
    isRegistered,
    isOnline,
    cacheSize,
    needsRefresh,
    refreshCacheSize,
    clearCache,
    forceRefresh,
    formatCacheSize: serviceWorker.formatCacheSize
  }
}