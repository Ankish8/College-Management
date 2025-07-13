"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Balanced caching for development
            staleTime: 10 * 1000, // 10 seconds - fresh enough for development
            gcTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
            refetchOnMount: 'always', // Always refetch on mount for fresh data
            refetchOnReconnect: true,
            refetchInterval: false,
            refetchIntervalInBackground: false,
            retry: 1, // One retry for reliability
            networkMode: 'online',
          },
          mutations: {
            retry: 0,
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