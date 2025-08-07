'use client'

import { QueryClient } from '@tanstack/react-query'

interface CriticalData {
  students: any[]
  faculty: any[]
  subjects: any[]
  batches: any[]
  timeSlots: any[]
  academicCalendar: any
  userPreferences: any
  lastUpdated: number
}

interface OfflineDataConfig {
  maxAge: number // in milliseconds
  syncInterval: number // in milliseconds
  retryAttempts: number
  retryDelay: number
}

class OfflineDataManager {
  private dbName = 'JLU_CMS_Offline'
  private dbVersion = 1
  private db: IDBDatabase | null = null
  private queryClient: QueryClient | null = null
  private config: OfflineDataConfig = {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    syncInterval: 5 * 60 * 1000, // 5 minutes
    retryAttempts: 3,
    retryDelay: 2000 // 2 seconds
  }

  async initialize(queryClient: QueryClient) {
    this.queryClient = queryClient
    await this.openDatabase()
    this.startPeriodicSync()
  }

  private async openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores
        if (!db.objectStoreNames.contains('criticalData')) {
          const store = db.createObjectStore('criticalData', { keyPath: 'type' })
          store.createIndex('lastUpdated', 'lastUpdated')
        }

        if (!db.objectStoreNames.contains('apiCache')) {
          const cacheStore = db.createObjectStore('apiCache', { keyPath: 'url' })
          cacheStore.createIndex('timestamp', 'timestamp')
          cacheStore.createIndex('type', 'type')
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { 
            keyPath: 'id',
            autoIncrement: true 
          })
          syncStore.createIndex('timestamp', 'timestamp')
          syncStore.createIndex('priority', 'priority')
        }
      }
    })
  }

  // Cache critical data that's needed for offline functionality
  async cacheCriticalData(): Promise<void> {
    if (!this.db || !this.queryClient) return

    console.log('[OfflineData] Caching critical data...')

    try {
      const transaction = this.db.transaction(['criticalData'], 'readwrite')
      const store = transaction.objectStore('criticalData')

      // Cache students data
      try {
        const students = await this.fetchWithFallback('/api/students?fields=minimal')
        await store.put({
          type: 'students',
          data: students,
          lastUpdated: Date.now()
        })
      } catch (error) {
        console.log('[OfflineData] Failed to cache students:', error)
      }

      // Cache faculty data
      try {
        const faculty = await this.fetchWithFallback('/api/faculty?fields=minimal')
        await store.put({
          type: 'faculty',
          data: faculty,
          lastUpdated: Date.now()
        })
      } catch (error) {
        console.log('[OfflineData] Failed to cache faculty:', error)
      }

      // Cache subjects data
      try {
        const subjects = await this.fetchWithFallback('/api/subjects?fields=minimal')
        await store.put({
          type: 'subjects',
          data: subjects,
          lastUpdated: Date.now()
        })
      } catch (error) {
        console.log('[OfflineData] Failed to cache subjects:', error)
      }

      // Cache batches data
      try {
        const batches = await this.fetchWithFallback('/api/batches?fields=minimal')
        await store.put({
          type: 'batches',
          data: batches,
          lastUpdated: Date.now()
        })
      } catch (error) {
        console.log('[OfflineData] Failed to cache batches:', error)
      }

      // Cache time slots
      try {
        const timeSlots = await this.fetchWithFallback('/api/settings/time-slots')
        await store.put({
          type: 'timeSlots',
          data: timeSlots,
          lastUpdated: Date.now()
        })
      } catch (error) {
        console.log('[OfflineData] Failed to cache time slots:', error)
      }

      // Cache current week's timetable
      try {
        const now = new Date()
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
        const endOfWeek = new Date(now.setDate(startOfWeek.getDate() + 6))
        
        const timetableUrl = `/api/timetable/entries?dateFrom=${startOfWeek.toISOString().split('T')[0]}&dateTo=${endOfWeek.toISOString().split('T')[0]}&fields=calendar`
        const timetable = await this.fetchWithFallback(timetableUrl)
        
        await store.put({
          type: 'currentWeekTimetable',
          data: timetable,
          lastUpdated: Date.now()
        })
      } catch (error) {
        console.log('[OfflineData] Failed to cache timetable:', error)
      }

      // Cache user preferences
      try {
        const preferences = await this.fetchWithFallback('/api/user/preferences')
        await store.put({
          type: 'userPreferences',
          data: preferences,
          lastUpdated: Date.now()
        })
      } catch (error) {
        console.log('[OfflineData] Failed to cache preferences:', error)
      }

      console.log('[OfflineData] Critical data cached successfully')

    } catch (error) {
      console.error('[OfflineData] Error caching critical data:', error)
    }
  }

  // Get cached data when offline
  async getCachedData(type: string): Promise<any> {
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['criticalData'], 'readonly')
      const store = transaction.objectStore('criticalData')
      const request = store.get(type)

      request.onsuccess = () => {
        const result = request.result
        if (result && this.isDataFresh(result.lastUpdated)) {
          resolve(result.data)
        } else {
          resolve(null)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  // Cache API responses for offline access
  async cacheApiResponse(url: string, data: any, type: string = 'general'): Promise<void> {
    if (!this.db) return

    try {
      const transaction = this.db.transaction(['apiCache'], 'readwrite')
      const store = transaction.objectStore('apiCache')

      await store.put({
        url,
        data,
        type,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('[OfflineData] Error caching API response:', error)
    }
  }

  // Get cached API response
  async getCachedApiResponse(url: string): Promise<any> {
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['apiCache'], 'readonly')
      const store = transaction.objectStore('apiCache')
      const request = store.get(url)

      request.onsuccess = () => {
        const result = request.result
        if (result && this.isDataFresh(result.timestamp)) {
          resolve(result.data)
        } else {
          resolve(null)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  // Add request to sync queue for when connection is restored
  async addToSyncQueue(request: any, priority: number = 1): Promise<void> {
    if (!this.db) return

    try {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite')
      const store = transaction.objectStore('syncQueue')

      await store.add({
        ...request,
        priority,
        timestamp: Date.now(),
        attempts: 0
      })
    } catch (error) {
      console.error('[OfflineData] Error adding to sync queue:', error)
    }
  }

  // Process sync queue when online
  async processSyncQueue(): Promise<void> {
    if (!this.db || !navigator.onLine) return

    console.log('[OfflineData] Processing sync queue...')

    const transaction = this.db.transaction(['syncQueue'], 'readwrite')
    const store = transaction.objectStore('syncQueue')
    const index = store.index('priority')

    const request = index.openCursor(null, 'next')

    request.onsuccess = async (event) => {
      const cursor = (event.target as IDBRequest).result

      if (cursor) {
        const item = cursor.value

        try {
          // Attempt to sync the request
          const response = await fetch(item.url, {
            method: item.method,
            headers: item.headers,
            body: item.body
          })

          if (response.ok) {
            // Success - remove from queue
            cursor.delete()
            console.log(`[OfflineData] Synced: ${item.method} ${item.url}`)
          } else {
            // Failed - increment attempts
            item.attempts++
            if (item.attempts >= this.config.retryAttempts) {
              cursor.delete() // Remove after max attempts
              console.log(`[OfflineData] Max attempts reached for: ${item.method} ${item.url}`)
            } else {
              cursor.update(item)
            }
          }
        } catch (error) {
          // Network error - increment attempts
          item.attempts++
          if (item.attempts >= this.config.retryAttempts) {
            cursor.delete()
          } else {
            cursor.update(item)
          }
          console.error(`[OfflineData] Sync failed:`, error)
        }

        cursor.continue()
      }
    }
  }

  // Clean old cached data
  async cleanOldData(): Promise<void> {
    if (!this.db) return

    const cutoffTime = Date.now() - this.config.maxAge

    try {
      // Clean old critical data
      const criticalTransaction = this.db.transaction(['criticalData'], 'readwrite')
      const criticalStore = criticalTransaction.objectStore('criticalData')
      const criticalIndex = criticalStore.index('lastUpdated')
      
      const criticalRange = IDBKeyRange.upperBound(cutoffTime)
      criticalIndex.openCursor(criticalRange).onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }

      // Clean old API cache
      const cacheTransaction = this.db.transaction(['apiCache'], 'readwrite')
      const cacheStore = cacheTransaction.objectStore('apiCache')
      const cacheIndex = cacheStore.index('timestamp')
      
      const cacheRange = IDBKeyRange.upperBound(cutoffTime)
      cacheIndex.openCursor(cacheRange).onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }

      console.log('[OfflineData] Cleaned old cached data')
    } catch (error) {
      console.error('[OfflineData] Error cleaning old data:', error)
    }
  }

  // Get cache statistics
  async getCacheStats(): Promise<{ criticalData: number; apiCache: number; syncQueue: number }> {
    if (!this.db) return { criticalData: 0, apiCache: 0, syncQueue: 0 }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['criticalData', 'apiCache', 'syncQueue'], 'readonly')
      
      const stats = { criticalData: 0, apiCache: 0, syncQueue: 0 }
      let completed = 0

      const checkComplete = () => {
        completed++
        if (completed === 3) {
          resolve(stats)
        }
      }

      // Count critical data
      const criticalRequest = transaction.objectStore('criticalData').count()
      criticalRequest.onsuccess = () => {
        stats.criticalData = criticalRequest.result
        checkComplete()
      }

      // Count API cache
      const cacheRequest = transaction.objectStore('apiCache').count()
      cacheRequest.onsuccess = () => {
        stats.apiCache = cacheRequest.result
        checkComplete()
      }

      // Count sync queue
      const syncRequest = transaction.objectStore('syncQueue').count()
      syncRequest.onsuccess = () => {
        stats.syncQueue = syncRequest.result
        checkComplete()
      }

      transaction.onerror = () => reject(transaction.error)
    })
  }

  // Clear all cached data
  async clearAllData(): Promise<void> {
    if (!this.db) return

    const transaction = this.db.transaction(['criticalData', 'apiCache', 'syncQueue'], 'readwrite')
    
    await Promise.all([
      transaction.objectStore('criticalData').clear(),
      transaction.objectStore('apiCache').clear(),
      transaction.objectStore('syncQueue').clear()
    ])

    console.log('[OfflineData] All cached data cleared')
  }

  private async fetchWithFallback(url: string): Promise<any> {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (error) {
      // Try to get from React Query cache as fallback
      if (this.queryClient) {
        const queryKey = this.urlToQueryKey(url)
        const cachedData = this.queryClient.getQueryData(queryKey)
        if (cachedData) return cachedData
      }
      throw error
    }
  }

  private urlToQueryKey(url: string): any[] {
    if (url.includes('/students')) return ['students']
    if (url.includes('/faculty')) return ['faculty']
    if (url.includes('/subjects')) return ['subjects']
    if (url.includes('/batches')) return ['batches']
    if (url.includes('/time-slots')) return ['timeSlots']
    if (url.includes('/timetable/entries')) return ['timetableEntries']
    if (url.includes('/preferences')) return ['userPreferences']
    return [url]
  }

  private isDataFresh(timestamp: number): boolean {
    return Date.now() - timestamp < this.config.maxAge
  }

  private startPeriodicSync(): void {
    setInterval(() => {
      if (navigator.onLine) {
        this.processSyncQueue()
        this.cleanOldData()
      }
    }, this.config.syncInterval)

    // Also sync when coming back online
    window.addEventListener('online', () => {
      setTimeout(() => {
        this.processSyncQueue()
        this.cacheCriticalData()
      }, 1000)
    })
  }
}

// Singleton instance
const offlineDataManager = new OfflineDataManager()

export default offlineDataManager

// React hook for offline data management
export function useOfflineData() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [cacheStats, setCacheStats] = useState({ criticalData: 0, apiCache: 0, syncQueue: 0 })
  const queryClient = useQueryClient()

  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      try {
        await offlineDataManager.initialize(queryClient)
        
        if (mounted) {
          setIsInitialized(true)
          
          // Cache critical data on initialization
          if (navigator.onLine) {
            await offlineDataManager.cacheCriticalData()
          }
          
          // Update stats
          const stats = await offlineDataManager.getCacheStats()
          setCacheStats(stats)
        }
      } catch (error) {
        console.error('[OfflineData] Initialization failed:', error)
      }
    }

    initialize()

    return () => {
      mounted = false
    }
  }, [queryClient])

  const refreshCacheStats = useCallback(async () => {
    const stats = await offlineDataManager.getCacheStats()
    setCacheStats(stats)
  }, [])

  const cacheCriticalData = useCallback(async () => {
    await offlineDataManager.cacheCriticalData()
    await refreshCacheStats()
  }, [refreshCacheStats])

  const clearAllData = useCallback(async () => {
    await offlineDataManager.clearAllData()
    setCacheStats({ criticalData: 0, apiCache: 0, syncQueue: 0 })
  }, [])

  return {
    isInitialized,
    cacheStats,
    refreshCacheStats,
    cacheCriticalData,
    clearAllData,
    offlineDataManager
  }
}

import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'