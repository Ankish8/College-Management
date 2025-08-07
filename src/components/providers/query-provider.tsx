"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Optimized caching for performance
            staleTime: 5 * 60 * 1000, // 5 minutes - aggressive caching
            gcTime: 10 * 60 * 1000, // 10 minutes in memory
            refetchOnWindowFocus: false,
            refetchOnMount: false, // Use cache first, only refetch if stale
            refetchOnReconnect: 'always',
            refetchInterval: false,
            refetchIntervalInBackground: false,
            retry: (failureCount, error: any) => {
              // Don't retry on 4xx errors
              if (error?.status >= 400 && error?.status < 500) return false
              return failureCount < 2
            },
            networkMode: 'online',
          },
          mutations: {
            retry: (failureCount, error: any) => {
              // Don't retry client errors
              if (error?.status >= 400 && error?.status < 500) return false
              return failureCount < 1
            },
            networkMode: 'online',
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}