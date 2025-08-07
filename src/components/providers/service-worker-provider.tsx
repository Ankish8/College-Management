'use client'

import { useEffect } from 'react'
import serviceWorker from '@/lib/utils/service-worker'

interface ServiceWorkerProviderProps {
  children: React.ReactNode
}

export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  useEffect(() => {
    // Only run on client side and in production
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // Register service worker with a slight delay to not impact initial page load
      const timer = setTimeout(() => {
        serviceWorker.register().then((registration) => {
          if (registration) {
            console.log('✅ Service worker registered successfully')
          }
        }).catch((error) => {
          console.error('❌ Service worker registration failed:', error)
        })
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [])

  return <>{children}</>
}

export default ServiceWorkerProvider