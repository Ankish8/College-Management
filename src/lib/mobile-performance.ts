/**
 * Mobile Performance Optimization Utilities
 * Educational focus: Optimizations for college management system mobile usage
 */

import { useEffect, useRef, useCallback, useState } from 'react'

// Device capability detection
export interface DeviceCapabilities {
  isLowEndDevice: boolean
  supportsTouchEvents: boolean
  supportsServiceWorker: boolean
  supportsWebGL: boolean
  supportsWebP: boolean
  connectionType: string
  memoryInfo?: any
  concurrency: number
  devicePixelRatio: number
}

// Performance monitoring
export interface PerformanceMetrics {
  firstContentfulPaint: number
  largestContentfulPaint: number
  firstInputDelay: number
  cumulativeLayoutShift: number
  timeToInteractive: number
  resourceLoadTimes: Map<string, number>
}

// Detect device capabilities for mobile optimization
export function getDeviceCapabilities(): DeviceCapabilities {
  const isLowEndDevice = (() => {
    // Check for low-end device indicators
    const memory = (navigator as any).deviceMemory
    const connection = (navigator as any).connection
    const concurrency = navigator.hardwareConcurrency || 1
    
    // Consider device low-end if:
    // - RAM <= 2GB
    // - Single core or limited cores
    // - Slow connection
    if (memory && memory <= 2) return true
    if (concurrency <= 2) return true
    if (connection && (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g')) return true
    
    return false
  })()

  const supportsTouchEvents = 'ontouchstart' in window
  const supportsServiceWorker = 'serviceWorker' in navigator
  const supportsWebGL = (() => {
    try {
      const canvas = document.createElement('canvas')
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    } catch {
      return false
    }
  })()

  const supportsWebP = (() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/webp').indexOf('webp') !== -1
  })()

  return {
    isLowEndDevice,
    supportsTouchEvents,
    supportsServiceWorker,
    supportsWebGL,
    supportsWebP,
    connectionType: (navigator as any).connection?.effectiveType || 'unknown',
    memoryInfo: (navigator as any).deviceMemory,
    concurrency: navigator.hardwareConcurrency || 1,
    devicePixelRatio: window.devicePixelRatio || 1
  }
}

// Performance monitoring hook
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({})
  const observerRef = useRef<PerformanceObserver | null>(null)

  useEffect(() => {
    if (!('PerformanceObserver' in window)) return

    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      
      entries.forEach((entry) => {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              setMetrics(prev => ({ ...prev, firstContentfulPaint: entry.startTime }))
            }
            break
            
          case 'largest-contentful-paint':
            setMetrics(prev => ({ ...prev, largestContentfulPaint: entry.startTime }))
            break
            
          case 'first-input':
            setMetrics(prev => ({ ...prev, firstInputDelay: (entry as any).processingStart - entry.startTime }))
            break
            
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              setMetrics(prev => ({
                ...prev,
                cumulativeLayoutShift: (prev.cumulativeLayoutShift || 0) + (entry as any).value
              }))
            }
            break
            
          case 'resource':
            setMetrics(prev => ({
              ...prev,
              resourceLoadTimes: new Map([
                ...(prev.resourceLoadTimes || new Map()),
                [entry.name, entry.duration]
              ])
            }))
            break
        }
      })
    })

    try {
      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift', 'resource'] })
      observerRef.current = observer
    } catch (error) {
      console.warn('Performance monitoring not fully supported:', error)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  return metrics
}

// Image optimization for mobile
export function optimizeImageForMobile(src: string, deviceCapabilities: DeviceCapabilities): string {
  const url = new URL(src, window.location.origin)
  
  // Use WebP if supported
  if (deviceCapabilities.supportsWebP && !src.includes('.webp')) {
    url.searchParams.set('format', 'webp')
  }
  
  // Adjust quality for low-end devices
  if (deviceCapabilities.isLowEndDevice) {
    url.searchParams.set('quality', '70')
  }
  
  // Adjust size based on device pixel ratio
  const dpr = Math.min(deviceCapabilities.devicePixelRatio, 2) // Cap at 2x for performance
  url.searchParams.set('dpr', dpr.toString())
  
  return url.toString()
}

// Lazy loading hook with intersection observer
export function useLazyLoading(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false)
  const elementRef = useRef<HTMLElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element || isVisible) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin: '50px' }
    )

    observer.observe(element)
    observerRef.current = observer

    return () => observer.disconnect()
  }, [threshold, isVisible])

  return { isVisible, elementRef }
}

// Virtual scrolling for large lists
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 5
) {
  const [scrollTop, setScrollTop] = useState(0)
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  )
  
  const visibleItems = items.slice(startIndex, endIndex + 1)
  const totalHeight = items.length * itemHeight
  const offsetY = startIndex * itemHeight

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex,
    endIndex
  }
}

// Memory usage monitoring
export function useMemoryMonitoring() {
  const [memoryInfo, setMemoryInfo] = useState<any>(null)

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        setMemoryInfo({
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
          usagePercentage: ((performance as any).memory.usedJSHeapSize / (performance as any).memory.jsHeapSizeLimit) * 100
        })
      }
    }

    updateMemoryInfo()
    const interval = setInterval(updateMemoryInfo, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  return memoryInfo
}

// Battery status monitoring
export function useBatteryMonitoring() {
  const [batteryInfo, setBatteryInfo] = useState<any>(null)

  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBatteryInfo = () => {
          setBatteryInfo({
            level: battery.level,
            charging: battery.charging,
            chargingTime: battery.chargingTime,
            dischargingTime: battery.dischargingTime
          })
        }

        updateBatteryInfo()
        battery.addEventListener('levelchange', updateBatteryInfo)
        battery.addEventListener('chargingchange', updateBatteryInfo)

        return () => {
          battery.removeEventListener('levelchange', updateBatteryInfo)
          battery.removeEventListener('chargingchange', updateBatteryInfo)
        }
      }).catch(() => {
        // Battery API not supported
      })
    }
  }, [])

  return batteryInfo
}

// Network-aware loading
export function useNetworkAwareLoading() {
  const [networkInfo, setNetworkInfo] = useState({
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false
  })

  useEffect(() => {
    const connection = (navigator as any).connection
    if (!connection) return

    const updateNetworkInfo = () => {
      setNetworkInfo({
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 100,
        saveData: connection.saveData || false
      })
    }

    updateNetworkInfo()
    connection.addEventListener('change', updateNetworkInfo)

    return () => connection.removeEventListener('change', updateNetworkInfo)
  }, [])

  const shouldReduceQuality = networkInfo.effectiveType === '2g' || 
                            networkInfo.effectiveType === 'slow-2g' ||
                            networkInfo.saveData

  const shouldPrefetch = networkInfo.effectiveType === '4g' && 
                        networkInfo.downlink > 1.5 && 
                        !networkInfo.saveData

  return { networkInfo, shouldReduceQuality, shouldPrefetch }
}

// Component-level performance optimization
export function withMobileOptimization<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    enableLazyLoading?: boolean
    enableVirtualization?: boolean
    enableMemoryMonitoring?: boolean
  } = {}
) {
  return React.memo((props: P) => {
    const deviceCapabilities = getDeviceCapabilities()
    const memoryInfo = options.enableMemoryMonitoring ? useMemoryMonitoring() : null
    const { shouldReduceQuality } = useNetworkAwareLoading()

    // Skip rendering on low-end devices with high memory usage
    if (options.enableMemoryMonitoring && 
        memoryInfo?.usagePercentage > 80 && 
        deviceCapabilities.isLowEndDevice) {
      return <div className="text-center p-4 text-muted-foreground">Loading...</div>
    }

    // Pass optimization context to component
    const optimizationContext = {
      deviceCapabilities,
      shouldReduceQuality,
      memoryInfo
    }

    return <Component {...props} {...optimizationContext} />
  })
}

// Educational app specific optimizations
export const EducationalAppOptimizations = {
  // Optimize timetable rendering for mobile
  optimizeTimetableForMobile: (events: any[], deviceCapabilities: DeviceCapabilities) => {
    if (deviceCapabilities.isLowEndDevice) {
      // Limit events shown at once
      return events.slice(0, 20)
    }
    return events
  },

  // Optimize attendance marking for touch
  optimizeAttendanceForTouch: (students: any[], deviceCapabilities: DeviceCapabilities) => {
    if (deviceCapabilities.supportsTouchEvents) {
      // Add larger touch targets
      return students.map(student => ({
        ...student,
        _touchOptimized: true
      }))
    }
    return students
  },

  // Batch size for student lists on mobile
  getMobileBatchSize: (deviceCapabilities: DeviceCapabilities) => {
    if (deviceCapabilities.isLowEndDevice) return 10
    if (deviceCapabilities.memoryInfo && deviceCapabilities.memoryInfo <= 4) return 25
    return 50
  },

  // Image quality for profile pictures
  getProfileImageQuality: (deviceCapabilities: DeviceCapabilities) => {
    if (deviceCapabilities.isLowEndDevice) return 60
    if (deviceCapabilities.connectionType === '2g') return 50
    return 80
  }
}

// Performance budget monitoring
export function usePerformanceBudget(budgets: {
  firstContentfulPaint?: number
  largestContentfulPaint?: number
  firstInputDelay?: number
  cumulativeLayoutShift?: number
}) {
  const metrics = usePerformanceMonitoring()
  
  const violations = Object.entries(budgets).filter(([metric, budget]) => {
    const currentValue = metrics[metric as keyof PerformanceMetrics] as number
    return currentValue && currentValue > budget
  })

  return {
    violations,
    isWithinBudget: violations.length === 0,
    metrics
  }
}

// Resource preloading for mobile
export function preloadCriticalResources(resources: string[]) {
  const deviceCapabilities = getDeviceCapabilities()
  const { shouldPrefetch } = useNetworkAwareLoading()

  if (!shouldPrefetch || deviceCapabilities.isLowEndDevice) return

  resources.forEach(resource => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = resource
    
    if (resource.includes('.woff2')) link.as = 'font'
    else if (resource.includes('.css')) link.as = 'style'
    else if (resource.includes('.js')) link.as = 'script'
    else link.as = 'fetch'
    
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  })
}

export default {
  getDeviceCapabilities,
  usePerformanceMonitoring,
  optimizeImageForMobile,
  useLazyLoading,
  useVirtualScrolling,
  useMemoryMonitoring,
  useBatteryMonitoring,
  useNetworkAwareLoading,
  withMobileOptimization,
  EducationalAppOptimizations,
  usePerformanceBudget,
  preloadCriticalResources
}