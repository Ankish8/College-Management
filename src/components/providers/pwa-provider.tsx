"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useServiceWorker, usePWA, usePushNotifications, useOfflineData } from '@/lib/pwa'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Wifi, 
  WifiOff, 
  Download, 
  Bell, 
  BellOff,
  Smartphone,
  RefreshCw,
  X
} from 'lucide-react'

interface PWAContextType {
  isInstalled: boolean
  isInstallable: boolean
  isOnline: boolean
  installApp: () => Promise<boolean>
  showInstallPrompt: () => void
  notifications: {
    isSupported: boolean
    isSubscribed: boolean
    subscribe: () => Promise<PushSubscription | null>
    unsubscribe: () => Promise<boolean>
  }
  serviceWorker: {
    registration: ServiceWorkerRegistration | null
    isUpdateAvailable: boolean
    updateServiceWorker: () => Promise<void>
  }
  offline: {
    isOffline: boolean
    pendingSyncCount: number
    queueOfflineAction: (action: any) => void
  }
}

const PWAContext = createContext<PWAContextType | null>(null)

export function usePWAContext() {
  const context = useContext(PWAContext)
  if (!context) {
    throw new Error('usePWAContext must be used within PWAProvider')
  }
  return context
}

interface PWAProviderProps {
  children: React.ReactNode
}

export function PWAProvider({ children }: PWAProviderProps) {
  const { data: session } = useSession()
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [showOfflineToast, setShowOfflineToast] = useState(false)
  
  // PWA hooks
  const { 
    registration, 
    isUpdateAvailable, 
    updateServiceWorker 
  } = useServiceWorker()
  
  const { 
    isInstallable, 
    isInstalled, 
    isOnline, 
    installApp, 
    showInstallPrompt 
  } = usePWA()
  
  const { 
    isSupported: notificationsSupported, 
    subscription, 
    subscribe: subscribeToNotifications, 
    unsubscribe: unsubscribeFromNotifications 
  } = usePushNotifications()
  
  const { 
    isOffline, 
    queueOfflineAction 
  } = useOfflineData()

  // Show install banner for mobile users after 30 seconds
  useEffect(() => {
    if (isInstallable && !isInstalled && session?.user) {
      const timer = setTimeout(() => {
        setShowInstallBanner(true)
      }, 30000) // 30 seconds
      
      return () => clearTimeout(timer)
    }
  }, [isInstallable, isInstalled, session])

  // Show offline status
  useEffect(() => {
    if (isOffline && !showOfflineToast) {
      setShowOfflineToast(true)
      toast.error('You are offline', {
        description: 'Some features may not be available. Data will sync when you reconnect.',
        duration: 5000,
        action: {
          label: 'Dismiss',
          onClick: () => setShowOfflineToast(false)
        }
      })
    } else if (isOnline && showOfflineToast) {
      setShowOfflineToast(false)
      toast.success('You are back online', {
        description: 'All features are now available.',
        duration: 3000
      })
    }
  }, [isOffline, isOnline, showOfflineToast])

  // Show update notification
  useEffect(() => {
    if (isUpdateAvailable) {
      toast.info('App Update Available', {
        description: 'A new version of the app is ready to install.',
        duration: 10000,
        action: {
          label: 'Update Now',
          onClick: updateServiceWorker
        }
      })
    }
  }, [isUpdateAvailable, updateServiceWorker])

  // Auto-enable push notifications for educational users
  useEffect(() => {
    if (session?.user && notificationsSupported && !subscription) {
      // Only show notification prompt for faculty and admin users
      const userRole = (session.user as any)?.role
      if (userRole === 'FACULTY' || userRole === 'ADMIN') {
        setTimeout(() => {
          toast.info('Enable Notifications', {
            description: 'Stay updated with attendance reminders and important announcements.',
            duration: 15000,
            action: {
              label: 'Enable',
              onClick: subscribeToNotifications
            }
          })
        }, 5000) // 5 seconds after login
      }
    }
  }, [session, notificationsSupported, subscription, subscribeToNotifications])

  const contextValue: PWAContextType = {
    isInstalled,
    isInstallable,
    isOnline,
    installApp,
    showInstallPrompt,
    notifications: {
      isSupported: notificationsSupported,
      isSubscribed: !!subscription,
      subscribe: subscribeToNotifications,
      unsubscribe: unsubscribeFromNotifications
    },
    serviceWorker: {
      registration,
      isUpdateAvailable,
      updateServiceWorker
    },
    offline: {
      isOffline,
      pendingSyncCount: 0, // TODO: Implement pending sync counter
      queueOfflineAction
    }
  }

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
      
      {/* Install Banner for Mobile */}
      {showInstallBanner && isInstallable && !isInstalled && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-primary to-blue-600 text-white p-4 shadow-lg border-t">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Smartphone className="h-6 w-6" />
              <div>
                <p className="font-medium text-sm">Install JLU CMS</p>
                <p className="text-xs opacity-90">Get the full app experience</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const success = await installApp()
                  if (success) {
                    setShowInstallBanner(false)
                  }
                }}
                className="text-primary"
              >
                <Download className="h-4 w-4 mr-1" />
                Install
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowInstallBanner(false)}
                className="text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-orange-500 text-white px-4 py-2 text-center text-sm">
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span>Offline Mode - Limited functionality available</span>
          </div>
        </div>
      )}

      {/* Connection Status Indicator */}
      <div className="fixed bottom-4 right-4 z-30">
        <div className="flex flex-col gap-2">
          {/* Online/Offline Badge */}
          <Badge 
            variant={isOnline ? "secondary" : "destructive"}
            className="flex items-center gap-1 text-xs"
          >
            {isOnline ? (
              <>
                <Wifi className="h-3 w-3" />
                Online
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                Offline
              </>
            )}
          </Badge>

          {/* PWA Status Badge */}
          {isInstalled && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <Smartphone className="h-3 w-3" />
              PWA
            </Badge>
          )}

          {/* Notifications Status Badge */}
          {notificationsSupported && (
            <Badge 
              variant={subscription ? "secondary" : "outline"}
              className="flex items-center gap-1 text-xs cursor-pointer"
              onClick={subscription ? unsubscribeFromNotifications : subscribeToNotifications}
            >
              {subscription ? (
                <>
                  <Bell className="h-3 w-3" />
                  Notifications On
                </>
              ) : (
                <>
                  <BellOff className="h-3 w-3" />
                  Notifications Off
                </>
              )}
            </Badge>
          )}

          {/* Update Available Badge */}
          {isUpdateAvailable && (
            <Badge 
              variant="default"
              className="flex items-center gap-1 text-xs cursor-pointer animate-pulse"
              onClick={updateServiceWorker}
            >
              <RefreshCw className="h-3 w-3" />
              Update Available
            </Badge>
          )}
        </div>
      </div>
    </PWAContext.Provider>
  )
}

// Helper component for PWA-specific UI elements
export function PWAStatusIndicator() {
  const { isOnline, isInstalled, notifications, serviceWorker } = usePWAContext()
  
  return (
    <div className="flex items-center gap-2">
      {/* Connection Status */}
      {isOnline ? (
        <Wifi className="h-4 w-4 text-green-500" title="Online" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-500" title="Offline" />
      )}
      
      {/* PWA Installation Status */}
      {isInstalled && (
        <Smartphone className="h-4 w-4 text-blue-500" title="Installed as PWA" />
      )}
      
      {/* Notification Status */}
      {notifications.isSupported && (
        notifications.isSubscribed ? (
          <Bell className="h-4 w-4 text-green-500" title="Notifications enabled" />
        ) : (
          <BellOff className="h-4 w-4 text-gray-400" title="Notifications disabled" />
        )
      )}
      
      {/* Update Available */}
      {serviceWorker.isUpdateAvailable && (
        <RefreshCw className="h-4 w-4 text-orange-500 animate-pulse" title="Update available" />
      )}
    </div>
  )
}

// Hook for components that need PWA functionality
export function usePWAInstall() {
  const { isInstallable, isInstalled, installApp, showInstallPrompt } = usePWAContext()
  
  return {
    canInstall: isInstallable && !isInstalled,
    isInstalled,
    install: installApp,
    showPrompt: showInstallPrompt
  }
}

// Hook for offline functionality
export function usePWAOffline() {
  const { offline } = usePWAContext()
  
  return {
    isOffline: offline.isOffline,
    pendingSyncCount: offline.pendingSyncCount,
    queueAction: offline.queueOfflineAction
  }
}

// Hook for push notifications
export function usePWANotifications() {
  const { notifications } = usePWAContext()
  
  return {
    isSupported: notifications.isSupported,
    isSubscribed: notifications.isSubscribed,
    subscribe: notifications.subscribe,
    unsubscribe: notifications.unsubscribe
  }
}