'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import offlineDataManager, { useOfflineData } from '@/lib/utils/offline-data-manager'
import offlineApiInterceptor, { useOfflineApi } from '@/lib/utils/offline-api-interceptor'

interface OfflineProviderProps {
  children: React.ReactNode
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const queryClient = useQueryClient()
  const { isInitialized: dataManagerInitialized } = useOfflineData()
  const { isInitialized: apiInterceptorInitialized } = useOfflineApi()

  useEffect(() => {
    // Initialize offline functionality
    const initializeOfflineMode = async () => {
      try {
        // Initialize data manager
        if (!dataManagerInitialized) {
          await offlineDataManager.initialize(queryClient)
          console.log('✅ Offline data manager initialized')
        }

        // Initialize API interceptor
        if (!apiInterceptorInitialized) {
          offlineApiInterceptor.initialize(queryClient)
          console.log('✅ Offline API interceptor initialized')
        }

        // Cache critical data on first load if online
        if (navigator.onLine && dataManagerInitialized && apiInterceptorInitialized) {
          setTimeout(async () => {
            try {
              await offlineDataManager.cacheCriticalData()
              console.log('✅ Critical data cached for offline use')
            } catch (error) {
              console.log('⚠️ Failed to cache critical data:', error)
            }
          }, 2000) // Delay to not impact initial page load
        }

      } catch (error) {
        console.error('❌ Failed to initialize offline functionality:', error)
      }
    }

    initializeOfflineMode()
  }, [queryClient, dataManagerInitialized, apiInterceptorInitialized])

  // Set up React Query defaults for offline support
  useEffect(() => {
    queryClient.setDefaultOptions({
      queries: {
        // Extend stale time for offline scenarios
        staleTime: 5 * 60 * 1000, // 5 minutes
        // Keep data longer in cache for offline access
        gcTime: 30 * 60 * 1000, // 30 minutes (was cacheTime)
        // Retry failed queries less aggressively when offline
        retry: (failureCount, error: any) => {
          // Don't retry if offline
          if (!navigator.onLine) return false
          // Standard retry logic when online
          return failureCount < 3
        },
        // Network mode for offline handling
        networkMode: 'online',
        // Refetch on reconnect
        refetchOnReconnect: 'always'
      },
      mutations: {
        // Retry mutations when back online
        retry: (failureCount, error: any) => {
          if (!navigator.onLine) return false
          return failureCount < 2
        },
        // Network mode for mutations
        networkMode: 'online'
      }
    })
  }, [queryClient])

  // Listen for online/offline events and update React Query behavior
  useEffect(() => {
    const handleOnline = () => {
      console.log('🔄 Back online - resuming queries and processing sync queue')
      queryClient.resumePausedMutations()
      queryClient.invalidateQueries()
      
      // Process any queued offline requests
      setTimeout(() => {
        offlineDataManager.processSyncQueue?.()
      }, 1000)
    }

    const handleOffline = () => {
      console.log('📴 Gone offline - pausing queries')
      // React Query will automatically pause queries when offline
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [queryClient])

  return <>{children}</>
}

export default OfflineProvider