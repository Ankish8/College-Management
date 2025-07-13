'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'

// PWA installation interface
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

interface PWAState {
  isInstallable: boolean
  isInstalled: boolean
  isStandalone: boolean
  isOnline: boolean
  installEvent: BeforeInstallPromptEvent | null
}

// Service Worker registration and management
export function useServiceWorker() {
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      registerServiceWorker()
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      setSwRegistration(registration)

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setIsUpdateAvailable(true)
              showUpdateNotification()
            }
          })
        }
      })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)

      console.log('Service Worker registered successfully')
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }

  const showUpdateNotification = () => {
    toast.info('App Update Available', {
      description: 'A new version is available. Refresh to update.',
      duration: 10000,
      action: {
        label: 'Update',
        onClick: () => updateServiceWorker()
      }
    })
  }

  const updateServiceWorker = async () => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  const handleServiceWorkerMessage = (event: MessageEvent) => {
    const { type, payload } = event.data

    switch (type) {
      case 'CACHE_UPDATED':
        toast.success('App updated successfully')
        break
      case 'OFFLINE_READY':
        toast.info('App is ready for offline use')
        break
      case 'SYNC_COMPLETED':
        toast.success('Data synchronized successfully')
        break
      default:
        break
    }
  }

  return {
    registration: swRegistration,
    isUpdateAvailable,
    updateServiceWorker
  }
}

// PWA installation and state management
export function usePWA() {
  const [pwaState, setPwaState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isStandalone: false,
    isOnline: navigator.onLine,
    installEvent: null
  })

  useEffect(() => {
    // Check if app is running as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://')

    // Check if app is already installed
    const isInstalled = isStandalone || localStorage.getItem('pwa-installed') === 'true'

    setPwaState(prev => ({
      ...prev,
      isStandalone,
      isInstalled
    }))

    // Listen for installation prompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setPwaState(prev => ({
        ...prev,
        isInstallable: true,
        installEvent: e
      }))
    }

    // Listen for successful installation
    const handleAppInstalled = () => {
      setPwaState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        installEvent: null
      }))
      localStorage.setItem('pwa-installed', 'true')
      toast.success('App installed successfully!')
    }

    // Listen for online/offline status
    const handleOnline = () => setPwaState(prev => ({ ...prev, isOnline: true }))
    const handleOffline = () => setPwaState(prev => ({ ...prev, isOnline: false }))

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const installApp = useCallback(async () => {
    if (!pwaState.installEvent) return false

    try {
      await pwaState.installEvent.prompt()
      const choiceResult = await pwaState.installEvent.userChoice

      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt')
        return true
      } else {
        console.log('User dismissed the install prompt')
        return false
      }
    } catch (error) {
      console.error('Error during app installation:', error)
      return false
    }
  }, [pwaState.installEvent])

  const showInstallPrompt = useCallback(() => {
    if (pwaState.isInstallable) {
      toast.info('Install JLU CMS', {
        description: 'Install the app for a better experience',
        duration: 10000,
        action: {
          label: 'Install',
          onClick: installApp
        }
      })
    }
  }, [pwaState.isInstallable, installApp])

  return {
    ...pwaState,
    installApp,
    showInstallPrompt
  }
}

// Background sync for offline data
export function useBackgroundSync() {
  const [pendingSync, setPendingSync] = useState<string[]>([])

  useEffect(() => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        // Listen for sync events
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'SYNC_REGISTERED') {
            setPendingSync(prev => [...prev, event.data.tag])
          } else if (event.data.type === 'SYNC_COMPLETED') {
            setPendingSync(prev => prev.filter(tag => tag !== event.data.tag))
          }
        })
      })
    }
  }, [])

  const registerBackgroundSync = useCallback(async (tag: string, data?: any) => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready
        
        // Store data for sync if provided
        if (data) {
          localStorage.setItem(`sync-${tag}`, JSON.stringify(data))
        }
        
        await registration.sync.register(tag)
        toast.info('Queued for sync when online')
        
        return true
      } catch (error) {
        console.error('Background sync registration failed:', error)
        return false
      }
    }
    return false
  }, [])

  return {
    pendingSync,
    registerBackgroundSync
  }
}

// Push notifications for PWA
export function usePushNotifications() {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window
    setIsSupported(supported)

    if (supported) {
      checkExistingSubscription()
    }
  }, [])

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const existingSubscription = await registration.pushManager.getSubscription()
      setSubscription(existingSubscription)
    } catch (error) {
      console.error('Error checking push subscription:', error)
    }
  }

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) return false

    try {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }

  const subscribe = async (): Promise<PushSubscription | null> => {
    if (!isSupported) return null

    try {
      const hasPermission = await requestPermission()
      if (!hasPermission) return null

      const registration = await navigator.serviceWorker.ready
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      })

      setSubscription(newSubscription)

      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSubscription)
      })

      toast.success('Push notifications enabled')
      return newSubscription
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      toast.error('Failed to enable push notifications')
      return null
    }
  }

  const unsubscribe = async (): Promise<boolean> => {
    if (!subscription) return false

    try {
      await subscription.unsubscribe()
      setSubscription(null)

      // Notify server
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      })

      toast.success('Push notifications disabled')
      return true
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      return false
    }
  }

  return {
    isSupported,
    subscription,
    requestPermission,
    subscribe,
    unsubscribe
  }
}

// Offline data management
export function useOfflineData() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [offlineQueue, setOfflineQueue] = useState<any[]>([])

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      processOfflineQueue()
    }
    
    const handleOffline = () => {
      setIsOffline(true)
      toast.warning('You are offline', {
        description: 'Some features may not be available'
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const queueOfflineAction = useCallback((action: any) => {
    setOfflineQueue(prev => [...prev, { ...action, timestamp: Date.now() }])
    localStorage.setItem('offline-queue', JSON.stringify(offlineQueue))
  }, [offlineQueue])

  const processOfflineQueue = useCallback(async () => {
    if (offlineQueue.length === 0) return

    toast.info('Syncing offline data...')

    for (const action of offlineQueue) {
      try {
        // Process queued action
        await fetch(action.url, action.options)
      } catch (error) {
        console.error('Error processing offline action:', error)
      }
    }

    setOfflineQueue([])
    localStorage.removeItem('offline-queue')
    toast.success('Offline data synced successfully')
  }, [offlineQueue])

  return {
    isOffline,
    queueOfflineAction,
    processOfflineQueue
  }
}