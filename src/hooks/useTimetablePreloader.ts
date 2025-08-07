"use client"

import { useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { TimetablePreloader } from '@/lib/utils/timetable-preloader'

export function useTimetablePreloader() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const router = useRouter()

  const preloader = useMemo(
    () => new TimetablePreloader(queryClient),
    [queryClient]
  )

  // Preload data on session establishment
  useEffect(() => {
    if (session?.user) {
      const user = session.user as any
      
      // Run smart preloading based on current path
      const currentPath = window.location.pathname
      preloader.smartPreload(currentPath, user.role)

      // User-specific preloading
      if (user.role === 'FACULTY') {
        preloader.preloadUserTimetables(user.id, 'FACULTY')
      }

      // Clear stale data periodically
      const cleanupInterval = setInterval(() => {
        preloader.clearStaleData()
      }, 15 * 60 * 1000) // Every 15 minutes

      return () => clearInterval(cleanupInterval)
    }
  }, [session, preloader])

  // Preload on route changes
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (session?.user) {
        const user = session.user as any
        preloader.smartPreload(url, user.role)
      }
    }

    // Listen for route changes (Next.js 13+ app router)
    const handlePopState = () => {
      handleRouteChange(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [session, preloader])

  return {
    preloader,
    preloadCurrentWeek: preloader.preloadCurrentWeek.bind(preloader),
    preloadNextWeek: preloader.preloadNextWeek.bind(preloader),
    preloadUserTimetables: preloader.preloadUserTimetables.bind(preloader),
    clearStaleData: preloader.clearStaleData.bind(preloader),
  }
}

// Utility hook for specific preloading scenarios
export function useTimetablePreload() {
  const { preloader } = useTimetablePreloader()
  
  const preloadForBatch = (batchId: string) => {
    return Promise.all([
      preloader.preloadCurrentWeek({ batchId, fields: 'calendar' }),
      preloader.preloadNextWeek({ batchId, fields: 'calendar' })
    ])
  }

  const preloadForFaculty = (facultyId: string) => {
    return Promise.all([
      preloader.preloadCurrentWeek({ facultyId, fields: 'calendar' }),
      preloader.preloadNextWeek({ facultyId, fields: 'calendar' })
    ])
  }

  return {
    preloadForBatch,
    preloadForFaculty,
  }
}