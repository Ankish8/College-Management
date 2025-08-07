'use client'

import { QueryClient } from '@tanstack/react-query'
import offlineDataManager from './offline-data-manager'

interface OfflineApiConfig {
  enableOfflineMode: boolean
  offlineFirst: string[] // URLs that should always try offline first
  criticalEndpoints: string[] // URLs that should be cached for offline use
}

class OfflineApiInterceptor {
  private queryClient: QueryClient | null = null
  private config: OfflineApiConfig = {
    enableOfflineMode: true,
    offlineFirst: [
      '/api/students',
      '/api/faculty', 
      '/api/subjects',
      '/api/batches',
      '/api/settings/time-slots'
    ],
    criticalEndpoints: [
      '/api/students',
      '/api/faculty',
      '/api/subjects', 
      '/api/batches',
      '/api/settings/time-slots',
      '/api/timetable/entries',
      '/api/user/preferences'
    ]
  }

  initialize(queryClient: QueryClient) {
    this.queryClient = queryClient
    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Intercept fetch requests
    const originalFetch = window.fetch
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString()
      const method = init?.method || 'GET'

      // Skip interception for non-API requests
      if (!url.startsWith('/api/')) {
        return originalFetch(input, init)
      }

      console.log(`[OfflineAPI] Intercepting ${method} ${url}`)

      // Handle GET requests with offline support
      if (method === 'GET') {
        return this.handleGetRequest(url, originalFetch, input, init)
      }

      // Handle POST/PUT/DELETE requests
      if (['POST', 'PUT', 'DELETE'].includes(method)) {
        return this.handleMutationRequest(url, method, originalFetch, input, init)
      }

      // Default to normal fetch
      return originalFetch(input, init)
    }
  }

  private async handleGetRequest(
    url: string, 
    originalFetch: typeof fetch,
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const shouldTryOfflineFirst = this.config.offlineFirst.some(endpoint => 
      url.startsWith(endpoint)
    )

    // If offline or configured to try offline first
    if (!navigator.onLine || shouldTryOfflineFirst) {
      const cachedData = await offlineDataManager.getCachedApiResponse(url)
      
      if (cachedData) {
        console.log(`[OfflineAPI] Serving from cache: ${url}`)
        return new Response(JSON.stringify(cachedData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // If offline and no cache, try critical data store
      if (!navigator.onLine) {
        const criticalData = await this.getCriticalDataForUrl(url)
        if (criticalData) {
          console.log(`[OfflineAPI] Serving critical data: ${url}`)
          return new Response(JSON.stringify(criticalData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      }
    }

    // Try network request
    try {
      const response = await originalFetch(input, init)
      
      // Cache successful responses for critical endpoints
      if (response.ok && this.config.criticalEndpoints.some(endpoint => url.startsWith(endpoint))) {
        const data = await response.clone().json()
        await offlineDataManager.cacheApiResponse(url, data, this.getDataType(url))
      }

      return response
    } catch (error) {
      console.log(`[OfflineAPI] Network failed for ${url}, trying cache...`)
      
      // Network failed, try cache again
      const cachedData = await offlineDataManager.getCachedApiResponse(url)
      if (cachedData) {
        console.log(`[OfflineAPI] Fallback to cache: ${url}`)
        return new Response(JSON.stringify(cachedData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Try critical data as last resort
      const criticalData = await this.getCriticalDataForUrl(url)
      if (criticalData) {
        console.log(`[OfflineAPI] Fallback to critical data: ${url}`)
        return new Response(JSON.stringify(criticalData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // No fallback available
      throw error
    }
  }

  private async handleMutationRequest(
    url: string,
    method: string,
    originalFetch: typeof fetch,
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    if (!navigator.onLine) {
      console.log(`[OfflineAPI] Queueing offline mutation: ${method} ${url}`)
      
      // Queue the request for later sync
      await offlineDataManager.addToSyncQueue({
        url,
        method,
        headers: Object.fromEntries(new Headers(init?.headers).entries()),
        body: init?.body,
        timestamp: Date.now()
      }, this.getMutationPriority(method, url))

      // Return a successful response indicating it's queued
      return new Response(JSON.stringify({ 
        success: true, 
        queued: true,
        message: 'Request queued for sync when connection is restored'
      }), {
        status: 202, // Accepted
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Online - make the request normally
    try {
      const response = await originalFetch(input, init)

      // If mutation was successful, invalidate related cache
      if (response.ok) {
        await this.invalidateRelatedCache(url, method)
      }

      return response
    } catch (error) {
      // Network failed - queue for later
      console.log(`[OfflineAPI] Mutation failed, queueing: ${method} ${url}`)
      
      await offlineDataManager.addToSyncQueue({
        url,
        method,
        headers: Object.fromEntries(new Headers(init?.headers).entries()),
        body: init?.body,
        timestamp: Date.now()
      }, this.getMutationPriority(method, url))

      return new Response(JSON.stringify({ 
        success: false, 
        queued: true,
        error: 'Network error - request queued for retry'
      }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  private async getCriticalDataForUrl(url: string): Promise<any> {
    if (url.includes('/students')) {
      return await offlineDataManager.getCachedData('students')
    }
    if (url.includes('/faculty')) {
      return await offlineDataManager.getCachedData('faculty')
    }
    if (url.includes('/subjects')) {
      return await offlineDataManager.getCachedData('subjects')
    }
    if (url.includes('/batches')) {
      return await offlineDataManager.getCachedData('batches')
    }
    if (url.includes('/time-slots')) {
      return await offlineDataManager.getCachedData('timeSlots')
    }
    if (url.includes('/timetable/entries')) {
      return await offlineDataManager.getCachedData('currentWeekTimetable')
    }
    if (url.includes('/preferences')) {
      return await offlineDataManager.getCachedData('userPreferences')
    }
    return null
  }

  private getDataType(url: string): string {
    if (url.includes('/students')) return 'students'
    if (url.includes('/faculty')) return 'faculty'
    if (url.includes('/subjects')) return 'subjects'
    if (url.includes('/batches')) return 'batches'
    if (url.includes('/time-slots')) return 'timeSlots'
    if (url.includes('/timetable')) return 'timetable'
    if (url.includes('/preferences')) return 'preferences'
    return 'general'
  }

  private getMutationPriority(method: string, url: string): number {
    // Higher priority for more critical operations
    if (method === 'DELETE') return 3
    if (url.includes('/attendance')) return 3
    if (url.includes('/timetable')) return 2
    if (url.includes('/preferences')) return 1
    return 1
  }

  private async invalidateRelatedCache(url: string, method: string): Promise<void> {
    if (!this.queryClient) return

    // Invalidate related queries based on the URL and method
    if (url.includes('/students')) {
      this.queryClient.invalidateQueries({ queryKey: ['students'] })
    }
    if (url.includes('/faculty')) {
      this.queryClient.invalidateQueries({ queryKey: ['faculty'] })
    }
    if (url.includes('/subjects')) {
      this.queryClient.invalidateQueries({ queryKey: ['subjects'] })
    }
    if (url.includes('/batches')) {
      this.queryClient.invalidateQueries({ queryKey: ['batches'] })
    }
    if (url.includes('/timetable')) {
      this.queryClient.invalidateQueries({ queryKey: ['timetableEntries'] })
    }
    if (url.includes('/preferences')) {
      this.queryClient.invalidateQueries({ queryKey: ['userPreferences'] })
    }

    // Also refresh critical data cache
    setTimeout(() => {
      if (navigator.onLine) {
        offlineDataManager.cacheCriticalData()
      }
    }, 1000)
  }

  // Method to check if a request should use offline-first strategy
  shouldUseOfflineFirst(url: string): boolean {
    return this.config.offlineFirst.some(endpoint => url.startsWith(endpoint))
  }

  // Method to check if an endpoint is critical
  isCriticalEndpoint(url: string): boolean {
    return this.config.criticalEndpoints.some(endpoint => url.startsWith(endpoint))
  }

  // Update configuration
  updateConfig(config: Partial<OfflineApiConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

// Singleton instance
const offlineApiInterceptor = new OfflineApiInterceptor()

export default offlineApiInterceptor

// React hook for offline API management
export function useOfflineApi() {
  const [isInitialized, setIsInitialized] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isInitialized && queryClient) {
      offlineApiInterceptor.initialize(queryClient)
      setIsInitialized(true)
      console.log('[OfflineAPI] Interceptor initialized')
    }
  }, [queryClient, isInitialized])

  const updateConfig = useCallback((config: Partial<OfflineApiConfig>) => {
    offlineApiInterceptor.updateConfig(config)
  }, [])

  return {
    isInitialized,
    updateConfig,
    shouldUseOfflineFirst: offlineApiInterceptor.shouldUseOfflineFirst.bind(offlineApiInterceptor),
    isCriticalEndpoint: offlineApiInterceptor.isCriticalEndpoint.bind(offlineApiInterceptor)
  }
}

import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'