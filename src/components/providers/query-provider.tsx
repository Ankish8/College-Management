"use client"

import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { toast } from 'sonner'

// Enhanced error handling function
function onError(error: Error, context?: any) {
  console.error('Query/Mutation Error:', error, context)
  
  // User-friendly error messages
  const message = error.message.includes('fetch')
    ? 'Network error. Please check your connection.'
    : error.message || 'Something went wrong. Please try again.'
    
  toast.error('Error', {
    description: message,
    duration: 5000,
  })
}

// Global mutation success handler
function onMutationSuccess(data: any, variables: any, context: any, mutation: any) {
  // Auto-invalidate related queries based on mutation key
  const mutationKey = mutation.options.mutationKey?.[0]
  
  if (mutationKey && typeof mutationKey === 'string') {
    const relatedQueries = getRelatedQueries(mutationKey)
    relatedQueries.forEach(queryKey => {
      mutation.options.onSuccess?.(data, variables, context)
    })
  }
}

// Map mutations to related queries for auto-invalidation
function getRelatedQueries(mutationKey: string): string[] {
  const mutationToQueryMap: Record<string, string[]> = {
    'create-batch': ['batches', 'dashboard-stats'],
    'update-batch': ['batches', 'batch-details', 'dashboard-stats'],
    'delete-batch': ['batches', 'dashboard-stats'],
    'create-student': ['students', 'batch-details', 'dashboard-stats'],
    'update-student': ['students', 'student-details', 'batch-details'],
    'delete-student': ['students', 'batch-details', 'dashboard-stats'],
    'create-subject': ['subjects', 'batch-details', 'timetable'],
    'update-subject': ['subjects', 'subject-details', 'timetable'],
    'delete-subject': ['subjects', 'batch-details', 'timetable'],
    'create-timetable-entry': ['timetable', 'conflicts', 'dashboard-today'],
    'update-timetable-entry': ['timetable', 'conflicts', 'dashboard-today'],
    'delete-timetable-entry': ['timetable', 'conflicts', 'dashboard-today'],
    'mark-attendance': ['attendance', 'dashboard-stats', 'attendance-summary'],
  }
  
  return mutationToQueryMap[mutationKey] || []
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // Global query cache with error handling
        queryCache: new QueryCache({
          onError: (error, query) => {
            // Only show toast for errors that occur in the background
            if (query.state.data !== undefined) {
              onError(error as Error, { queryKey: query.queryKey })
            }
          },
        }),
        
        // Global mutation cache with error handling and auto-invalidation
        mutationCache: new MutationCache({
          onError: (error, variables, context, mutation) => {
            onError(error as Error, { 
              mutationKey: mutation.options.mutationKey,
              variables 
            })
          },
          onSuccess: onMutationSuccess,
        }),
        
        defaultOptions: {
          queries: {
            // Production-optimized caching strategy
            staleTime: process.env.NODE_ENV === 'production' ? 5 * 60 * 1000 : 10 * 1000, // 5min prod, 10s dev
            gcTime: 10 * 60 * 1000, // 10 minutes
            refetchOnWindowFocus: process.env.NODE_ENV === 'production',
            refetchOnMount: true,
            refetchOnReconnect: true,
            refetchInterval: false,
            refetchIntervalInBackground: false,
            retry: (failureCount, error) => {
              // Don't retry on 4xx errors except 429 (rate limit)
              if (error instanceof Error && 'status' in error) {
                const status = (error as any).status
                if (status >= 400 && status < 500 && status !== 429) {
                  return false
                }
              }
              return failureCount < 2
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            networkMode: 'online',
            
            // Enable background updates for real-time features
            refetchIntervalInBackground: false,
            
            // Optimize for mobile performance
            structuralSharing: true,
          },
          mutations: {
            retry: (failureCount, error) => {
              // Don't retry mutations on client errors
              if (error instanceof Error && 'status' in error) {
                const status = (error as any).status
                if (status >= 400 && status < 500) {
                  return false
                }
              }
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
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  )
}

// Enhanced query hooks with optimistic updates and error handling
export { useOptimisticMutation } from '@/hooks/use-optimistic-mutation'