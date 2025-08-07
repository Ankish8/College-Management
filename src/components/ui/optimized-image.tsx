'use client'

import { useState, useEffect, useRef } from 'react'
import NextImage, { ImageProps as NextImageProps } from 'next/image'
import { cn } from '@/lib/utils'

interface OptimizedImageProps extends Omit<NextImageProps, 'onLoad' | 'onError' | 'placeholder'> {
  // Enhanced props for optimization
  lazy?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty' | 'skeleton'
  fallbackSrc?: string
  loadingClassName?: string
  errorClassName?: string
  onImageLoad?: () => void
  onImageError?: (error: Error) => void
  
  // Performance monitoring
  trackPerformance?: boolean
  name?: string
  
  // Responsive loading
  priority?: boolean
  threshold?: number
  rootMargin?: string
}

interface ImageLoadMetrics {
  name: string
  src: string
  loadTime: number
  size?: { width: number; height: number }
  success: boolean
  error?: string
  timestamp: number
}

class ImageLoadMonitor {
  private metrics: ImageLoadMetrics[] = []
  private readonly maxMetrics = 100

  recordLoad(metric: ImageLoadMetrics) {
    this.metrics.push(metric)
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift()
    }

    // Log slow loads
    if (metric.loadTime > 2000) {
      console.warn(`🐌 Slow image load: ${metric.name} took ${metric.loadTime}ms`, {
        src: metric.src,
        success: metric.success
      })
    }

    // Log to performance API if available
    if (typeof window !== 'undefined' && 'performance' in window && metric.success) {
      try {
        // Create performance mark
        performance.mark(`image-load-${metric.name}`)
        
        // Add to performance observer if available
        if ('PerformanceObserver' in window) {
          const entry = performance.getEntriesByName(`image-load-${metric.name}`)
          if (entry.length > 0) {
            console.log(`📊 Image load performance recorded: ${metric.name}`)
          }
        }
      } catch (error) {
        // Silently fail if performance API is not available
      }
    }
  }

  getMetrics(): ImageLoadMetrics[] {
    return [...this.metrics]
  }

  getStats() {
    if (this.metrics.length === 0) return null

    const successful = this.metrics.filter(m => m.success)
    const failed = this.metrics.filter(m => !m.success)
    const loadTimes = successful.map(m => m.loadTime)

    return {
      totalImages: this.metrics.length,
      successful: successful.length,
      failed: failed.length,
      averageLoadTime: loadTimes.length > 0 
        ? Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length) 
        : 0,
      slowLoads: successful.filter(m => m.loadTime > 2000).length,
      fastLoads: successful.filter(m => m.loadTime < 500).length,
    }
  }
}

// Global image load monitor
const imageMonitor = new ImageLoadMonitor()

export function OptimizedImage({
  src,
  alt,
  lazy = true,
  quality = 85,
  placeholder = 'skeleton',
  fallbackSrc,
  loadingClassName,
  errorClassName,
  onImageLoad,
  onImageError,
  trackPerformance = true,
  name,
  priority = false,
  threshold = 0.1,
  rootMargin = '50px',
  className,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)
  const [isInView, setIsInView] = useState(!lazy || priority)
  const [loadStartTime, setLoadStartTime] = useState<number>(0)
  
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold,
        rootMargin,
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
      observerRef.current = observer
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [lazy, priority, isInView, threshold, rootMargin])

  // Track load start time
  useEffect(() => {
    if (isInView && !loadStartTime) {
      setLoadStartTime(performance.now())
    }
  }, [isInView, loadStartTime])

  const handleLoad = () => {
    const loadTime = loadStartTime ? performance.now() - loadStartTime : 0
    setIsLoading(false)
    setHasError(false)

    // Track performance
    if (trackPerformance && loadStartTime) {
      imageMonitor.recordLoad({
        name: name || alt || 'unnamed-image',
        src: typeof currentSrc === 'string' ? currentSrc : String(currentSrc),
        loadTime,
        success: true,
        timestamp: Date.now(),
        size: imgRef.current 
          ? { width: imgRef.current.naturalWidth, height: imgRef.current.naturalHeight }
          : undefined
      })
    }

    onImageLoad?.()
  }

  const handleError = () => {
    const loadTime = loadStartTime ? performance.now() - loadStartTime : 0
    setIsLoading(false)
    setHasError(true)

    // Track error
    if (trackPerformance && loadStartTime) {
      imageMonitor.recordLoad({
        name: name || alt || 'unnamed-image',
        src: typeof currentSrc === 'string' ? currentSrc : String(currentSrc),
        loadTime,
        success: false,
        error: 'Image failed to load',
        timestamp: Date.now()
      })
    }

    // Try fallback
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc)
      setHasError(false)
      setIsLoading(true)
      return
    }

    const error = new Error(`Failed to load image: ${currentSrc}`)
    onImageError?.(error)
  }

  // Skeleton placeholder component
  const SkeletonPlaceholder = () => (
    <div 
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-800 rounded',
        className,
        loadingClassName
      )}
      style={{ 
        width: props.width || '100%', 
        height: props.height || '200px' 
      }}
    />
  )

  // Error placeholder component
  const ErrorPlaceholder = () => (
    <div 
      className={cn(
        'flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-600 rounded border-2 border-dashed border-gray-300 dark:border-gray-700',
        className,
        errorClassName
      )}
      style={{ 
        width: props.width || '100%', 
        height: props.height || '200px' 
      }}
    >
      <div className="text-center">
        <svg 
          className="mx-auto h-8 w-8 mb-2" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
        <p className="text-xs">Image not available</p>
      </div>
    </div>
  )

  // Don't render anything if not in view (lazy loading)
  if (!isInView) {
    return <div ref={imgRef}>{placeholder === 'skeleton' && <SkeletonPlaceholder />}</div>
  }

  // Show error placeholder
  if (hasError) {
    return <ErrorPlaceholder />
  }

  // Show loading placeholder
  if (isLoading && placeholder === 'skeleton') {
    return (
      <div className="relative">
        <SkeletonPlaceholder />
        <NextImage
          {...props}
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          quality={quality}
          priority={priority}
          onLoad={handleLoad}
          onError={handleError}
          className={cn('opacity-0 absolute inset-0', className)}
        />
      </div>
    )
  }

  // Render optimized image
  return (
    <NextImage
      {...props}
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      quality={quality}
      priority={priority}
      placeholder={placeholder === 'blur' ? 'blur' : 'empty'}
      onLoad={handleLoad}
      onError={handleError}
      className={cn(
        'transition-opacity duration-300',
        isLoading ? 'opacity-0' : 'opacity-100',
        className
      )}
    />
  )
}

// Hook to access image performance data
export function useImagePerformance() {
  const [stats, setStats] = useState(imageMonitor.getStats())

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(imageMonitor.getStats())
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  return {
    stats,
    metrics: imageMonitor.getMetrics(),
    refresh: () => setStats(imageMonitor.getStats())
  }
}

// Export monitor for advanced usage
export { imageMonitor }