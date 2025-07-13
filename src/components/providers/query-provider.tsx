"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Aggressive caching for maximum performance
            staleTime: 30 * 1000, // 30 seconds - much faster
            gcTime: 2 * 60 * 1000, // 2 minutes
            refetchOnWindowFocus: false,
            refetchOnMount: false, // Don't refetch if data exists
            refetchOnReconnect: false,
            refetchInterval: false,
            refetchIntervalInBackground: false,
            retry: 0, // No retries for faster responses
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