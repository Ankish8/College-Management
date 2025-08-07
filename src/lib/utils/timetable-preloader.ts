"use client"

import { QueryClient } from "@tanstack/react-query"

interface TimetablePreloadOptions {
  batchId?: string
  facultyId?: string
  dateFrom?: string
  dateTo?: string
  fields?: 'minimal' | 'calendar' | 'full'
}

class TimetablePreloader {
  private queryClient: QueryClient

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient
  }

  // Preload timetable entries for the current week
  async preloadCurrentWeek(options: TimetablePreloadOptions = {}) {
    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    const endOfWeek = new Date(now.setDate(startOfWeek.getDate() + 6))

    const queryKey = ['timetableEntries', {
      ...options,
      dateFrom: startOfWeek.toISOString().split('T')[0],
      dateTo: endOfWeek.toISOString().split('T')[0],
      fields: options.fields || 'calendar'
    }]

    // Check if data already exists in cache
    const existing = this.queryClient.getQueryData(queryKey)
    if (existing) {
      if (process.env.DEBUG_PRELOADER === 'true') {
        console.log('⚡ Timetable data already cached for current week')
      }
      return existing
    }

    if (process.env.DEBUG_PRELOADER === 'true') {
      console.log('🔄 Preloading timetable data for current week...')
    }
    
    return this.queryClient.prefetchQuery({
      queryKey,
      queryFn: () => this.fetchTimetableEntries(options, startOfWeek, endOfWeek),
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  }

  // Preload next week's timetable
  async preloadNextWeek(options: TimetablePreloadOptions = {}) {
    const now = new Date()
    const nextWeek = new Date(now.setDate(now.getDate() + 7))
    const startOfNextWeek = new Date(nextWeek.setDate(nextWeek.getDate() - nextWeek.getDay()))
    const endOfNextWeek = new Date(nextWeek.setDate(startOfNextWeek.getDate() + 6))

    const queryKey = ['timetableEntries', {
      ...options,
      dateFrom: startOfNextWeek.toISOString().split('T')[0],
      dateTo: endOfNextWeek.toISOString().split('T')[0],
      fields: options.fields || 'calendar'
    }]

    if (process.env.DEBUG_PRELOADER === 'true') {
      console.log('🔄 Preloading timetable data for next week...')
    }

    return this.queryClient.prefetchQuery({
      queryKey,
      queryFn: () => this.fetchTimetableEntries(options, startOfNextWeek, endOfNextWeek),
      staleTime: 10 * 60 * 1000, // 10 minutes
    })
  }

  // Preload user-specific data
  async preloadUserTimetables(userId: string, userRole: 'FACULTY' | 'STUDENT') {
    if (process.env.DEBUG_PRELOADER === 'true') {
      console.log(`🔄 Preloading ${userRole.toLowerCase()} timetable data...`)
    }

    const promises = []

    if (userRole === 'FACULTY') {
      // Preload faculty's teaching schedule
      promises.push(
        this.preloadCurrentWeek({ facultyId: userId, fields: 'calendar' }),
        this.preloadNextWeek({ facultyId: userId, fields: 'calendar' })
      )
    } else if (userRole === 'STUDENT') {
      // For students, we'd need to get their batch first
      // This would require a separate API call or context
      if (process.env.DEBUG_PRELOADER === 'true') {
        console.log('Student timetable preloading requires batch information')
      }
    }

    return Promise.all(promises)
  }

  // Background preloading for commonly accessed data
  async preloadCommonData() {
    if (process.env.DEBUG_PRELOADER === 'true') {
      console.log('🔄 Background preloading common timetable data...')
    }

    const promises = [
      // Preload current week for all batches (minimal data)
      this.preloadCurrentWeek({ fields: 'minimal' }),
      
      // Preload time slots (rarely change)
      this.queryClient.prefetchQuery({
        queryKey: ['timeSlots'],
        queryFn: () => fetch('/api/timeslots').then(r => r.json()),
        staleTime: 30 * 60 * 1000, // 30 minutes
      }),

      // Preload active batches (minimal data)
      this.queryClient.prefetchQuery({
        queryKey: ['batches'],
        queryFn: () => fetch('/api/batches?fields=minimal').then(r => r.json()),
        staleTime: 15 * 60 * 1000, // 15 minutes
      })
    ]

    return Promise.all(promises)
  }

  // Intelligent preloading based on navigation patterns
  async smartPreload(currentPath: string, userRole: string) {
    if (process.env.DEBUG_PRELOADER === 'true') {
      console.log(`🧠 Smart preloading for ${currentPath}...`)
    }

    const preloadPromises = []

    // Always preload common data
    preloadPromises.push(this.preloadCommonData())

    // Path-based preloading
    if (currentPath.includes('/timetable')) {
      preloadPromises.push(
        this.preloadCurrentWeek({ fields: 'calendar' }),
        this.preloadNextWeek({ fields: 'calendar' })
      )
    }

    if (currentPath.includes('/students') && userRole === 'ADMIN') {
      preloadPromises.push(
        this.queryClient.prefetchQuery({
          queryKey: ['students', '', 'all'],
          queryFn: () => fetch('/api/students?fields=minimal').then(r => r.json()),
          staleTime: 5 * 60 * 1000,
        })
      )
    }

    return Promise.all(preloadPromises)
  }

  private async fetchTimetableEntries(
    options: TimetablePreloadOptions,
    dateFrom: Date,
    dateTo: Date
  ) {
    const params = new URLSearchParams({
      dateFrom: dateFrom.toISOString().split('T')[0],
      dateTo: dateTo.toISOString().split('T')[0],
      fields: options.fields || 'calendar',
      limit: '500', // Load more entries for better caching
    })

    if (options.batchId) params.append('batchId', options.batchId)
    if (options.facultyId) params.append('facultyId', options.facultyId)

    const response = await fetch(`/api/timetable/entries?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch timetable entries: ${response.status}`)
    }

    return response.json()
  }

  // Clear stale cache data
  clearStaleData() {
    if (process.env.DEBUG_PRELOADER === 'true') {
      console.log('🧹 Clearing stale timetable cache data...')
    }
    
    // Remove queries older than 1 hour
    this.queryClient.getQueryCache().findAll().forEach(query => {
      if (query.queryKey[0] === 'timetableEntries') {
        const queryAge = Date.now() - (query.state.dataUpdatedAt || 0)
        if (queryAge > 60 * 60 * 1000) { // 1 hour
          this.queryClient.removeQueries({ queryKey: query.queryKey })
        }
      }
    })
  }
}

export { TimetablePreloader }
export type { TimetablePreloadOptions }