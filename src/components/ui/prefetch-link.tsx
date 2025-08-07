"use client"

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface PrefetchLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  prefetchData?: () => Promise<any>
  prefetchDelay?: number
  [key: string]: any
}

// Data prefetching configurations for different routes
const PREFETCH_CONFIGS: Record<string, () => Promise<any>> = {
  '/students': () => fetch('/api/students?fields=minimal').then(r => r.json()),
  '/subjects': () => fetch('/api/subjects?fields=minimal').then(r => r.json()),
  '/batches': () => fetch('/api/batches?fields=minimal').then(r => r.json()),
  '/faculty': () => fetch('/api/faculty?fields=minimal').then(r => r.json()),
  '/timetable': () => {
    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    const endOfWeek = new Date(now.setDate(startOfWeek.getDate() + 6))
    
    const params = new URLSearchParams({
      dateFrom: startOfWeek.toISOString().split('T')[0],
      dateTo: endOfWeek.toISOString().split('T')[0],
      fields: 'calendar',
      limit: '200'
    })
    
    return fetch(`/api/timetable/entries?${params}`).then(r => r.json())
  },
  '/settings': () => Promise.all([
    fetch('/api/settings/timeslots').then(r => r.json()),
    fetch('/api/batches?fields=minimal').then(r => r.json())
  ]),
}

export function PrefetchLink({ 
  href, 
  children, 
  className,
  prefetchData,
  prefetchDelay = 150,
  ...props 
}: PrefetchLinkProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [hasPrefetched, setHasPrefetched] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const queryClient = useQueryClient()
  const router = useRouter()

  // Get the prefetch function for this route
  const getPrefetchFn = () => {
    if (prefetchData) return prefetchData
    
    // Find matching route config
    const routeKey = Object.keys(PREFETCH_CONFIGS).find(route => 
      href.startsWith(route)
    )
    
    return routeKey ? PREFETCH_CONFIGS[routeKey] : null
  }

  const handleMouseEnter = () => {
    setIsHovering(true)
    
    if (hasPrefetched) return

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set a delay before prefetching to avoid unnecessary requests
    timeoutRef.current = setTimeout(async () => {
      const prefetchFn = getPrefetchFn()
      
      if (!prefetchFn) {
        // Just prefetch the route if no specific data prefetching is configured
        router.prefetch(href)
        setHasPrefetched(true)
        return
      }

      try {
        console.log(`🔄 Prefetching data for ${href}...`)
        
        // Prefetch the route
        router.prefetch(href)
        
        // Prefetch the data and cache it
        const data = await prefetchFn()
        
        // Determine the cache key based on the route
        let cacheKey: string[] = []
        
        if (href.startsWith('/students')) {
          cacheKey = ['students', '', 'all']
        } else if (href.startsWith('/subjects')) {
          cacheKey = ['subjects']
        } else if (href.startsWith('/batches')) {
          cacheKey = ['batches']
        } else if (href.startsWith('/faculty')) {
          cacheKey = ['faculty']
        } else if (href.startsWith('/timetable')) {
          const now = new Date()
          const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
          const endOfWeek = new Date(now.setDate(startOfWeek.getDate() + 6))
          
          cacheKey = ['timetableEntries', {
            dateFrom: startOfWeek.toISOString().split('T')[0],
            dateTo: endOfWeek.toISOString().split('T')[0],
            fields: 'calendar'
          }]
        }
        
        // Cache the prefetched data
        if (cacheKey.length > 0) {
          queryClient.setQueryData(cacheKey, data, {
            updatedAt: Date.now(),
          })
        }
        
        setHasPrefetched(true)
        console.log(`✅ Successfully prefetched ${href}`)
        
      } catch (error) {
        console.warn(`Failed to prefetch ${href}:`, error)
        // Still mark as prefetched to avoid repeated attempts
        setHasPrefetched(true)
      }
    }, prefetchDelay)
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
    
    // Clear the timeout if the user stops hovering
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <Link
      href={href}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </Link>
  )
}

// Higher-order component to add prefetching to existing Link components
export function withPrefetch<T extends { href: string }>(
  Component: React.ComponentType<T>,
  prefetchConfig?: {
    prefetchData?: () => Promise<any>
    prefetchDelay?: number
  }
) {
  return function PrefetchedComponent(props: T) {
    const { href, ...otherProps } = props
    
    return (
      <PrefetchLink
        href={href}
        prefetchData={prefetchConfig?.prefetchData}
        prefetchDelay={prefetchConfig?.prefetchDelay}
      >
        <Component {...otherProps as T} />
      </PrefetchLink>
    )
  }
}