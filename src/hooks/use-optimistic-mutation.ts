import { useMutation, useQueryClient, QueryKey } from '@tanstack/react-query'
import { useCallback } from 'react'
import { toast } from 'sonner'

interface OptimisticMutationOptions<TData, TError, TVariables, TContext> {
  mutationFn: (variables: TVariables) => Promise<TData>
  queryKey: QueryKey
  optimisticUpdateFn: (old: any, variables: TVariables) => any
  successMessage?: string
  errorMessage?: string
  invalidateQueries?: QueryKey[]
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void
  onError?: (error: TError, variables: TVariables, context: TContext | undefined) => void
}

/**
 * Enhanced mutation hook with optimistic updates, error handling, and auto-invalidation
 */
export function useOptimisticMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>({
  mutationFn,
  queryKey,
  optimisticUpdateFn,
  successMessage,
  errorMessage,
  invalidateQueries = [],
  onSuccess,
  onError,
}: OptimisticMutationOptions<TData, TError, TVariables, TContext>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    
    // Optimistic update on mutation start
    onMutate: async (variables: TVariables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey)

      // Optimistically update the cache
      queryClient.setQueryData(queryKey, (old: any) => optimisticUpdateFn(old, variables))

      // Return context with previous data for rollback
      return { previousData } as TContext
    },

    // Rollback on error
    onError: (error: TError, variables: TVariables, context: TContext | undefined) => {
      // Rollback to previous data
      if (context && 'previousData' in context) {
        queryClient.setQueryData(queryKey, (context as any).previousData)
      }

      // Show error toast
      if (errorMessage) {
        toast.error('Error', {
          description: errorMessage,
          duration: 5000,
        })
      }

      // Call custom error handler
      onError?.(error, variables, context)
    },

    // Handle success
    onSuccess: (data: TData, variables: TVariables, context: TContext | undefined) => {
      // Show success toast
      if (successMessage) {
        toast.success('Success', {
          description: successMessage,
          duration: 3000,
        })
      }

      // Call custom success handler
      onSuccess?.(data, variables, context)
    },

    // Always refetch to ensure data consistency
    onSettled: () => {
      // Invalidate main query
      queryClient.invalidateQueries({ queryKey })

      // Invalidate related queries
      invalidateQueries.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key })
      })
    },
  })
}

/**
 * Hook for bulk optimistic updates (e.g., bulk delete, bulk update)
 */
export function useBulkOptimisticMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>({
  mutationFn,
  queryKey,
  optimisticUpdateFn,
  successMessage,
  errorMessage,
  invalidateQueries = [],
  onSuccess,
  onError,
}: OptimisticMutationOptions<TData, TError, TVariables, TContext>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    
    onMutate: async (variables: TVariables) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData(queryKey)
      
      queryClient.setQueryData(queryKey, (old: any) => optimisticUpdateFn(old, variables))
      
      return { previousData } as TContext
    },

    onError: (error: TError, variables: TVariables, context: TContext | undefined) => {
      if (context && 'previousData' in context) {
        queryClient.setQueryData(queryKey, (context as any).previousData)
      }

      if (errorMessage) {
        toast.error('Bulk Operation Failed', {
          description: errorMessage,
          duration: 5000,
        })
      }

      onError?.(error, variables, context)
    },

    onSuccess: (data: TData, variables: TVariables, context: TContext | undefined) => {
      if (successMessage) {
        toast.success('Bulk Operation Complete', {
          description: successMessage,
          duration: 3000,
        })
      }

      onSuccess?.(data, variables, context)
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      invalidateQueries.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key })
      })
    },
  })
}

/**
 * Smart invalidation hook that batches invalidations to reduce network requests
 */
export function useSmartInvalidation() {
  const queryClient = useQueryClient()
  
  const invalidateQueries = useCallback((queries: QueryKey[]) => {
    // Batch invalidations to happen at the same time
    Promise.all(
      queries.map(queryKey => 
        queryClient.invalidateQueries({ queryKey })
      )
    )
  }, [queryClient])

  const invalidateRelatedQueries = useCallback((entityType: string, action: string) => {
    const invalidationMap: Record<string, QueryKey[]> = {
      'batch-create': [['batches'], ['dashboard-stats']],
      'batch-update': [['batches'], ['batch-details'], ['dashboard-stats']],
      'batch-delete': [['batches'], ['dashboard-stats']],
      'student-create': [['students'], ['batch-details'], ['dashboard-stats']],
      'student-update': [['students'], ['student-details'], ['batch-details']],
      'student-delete': [['students'], ['batch-details'], ['dashboard-stats']],
      'subject-create': [['subjects'], ['batch-details'], ['timetable']],
      'subject-update': [['subjects'], ['subject-details'], ['timetable']],
      'subject-delete': [['subjects'], ['batch-details'], ['timetable']],
      'timetable-create': [['timetable'], ['conflicts'], ['dashboard-today']],
      'timetable-update': [['timetable'], ['conflicts'], ['dashboard-today']],
      'timetable-delete': [['timetable'], ['conflicts'], ['dashboard-today']],
      'attendance-mark': [['attendance'], ['dashboard-stats'], ['attendance-summary']],
    }

    const key = `${entityType}-${action}`
    const queries = invalidationMap[key] || []
    
    if (queries.length > 0) {
      invalidateQueries(queries)
    }
  }, [invalidateQueries])

  return { invalidateQueries, invalidateRelatedQueries }
}

/**
 * Background sync hook for keeping data fresh
 */
export function useBackgroundSync(queryKeys: QueryKey[], interval: number = 30000) {
  const queryClient = useQueryClient()

  const syncData = useCallback(() => {
    queryKeys.forEach(queryKey => {
      queryClient.invalidateQueries({ 
        queryKey,
        refetchType: 'active' // Only refetch if query is currently being used
      })
    })
  }, [queryClient, queryKeys])

  // Set up interval for background sync
  useEffect(() => {
    const intervalId = setInterval(syncData, interval)
    return () => clearInterval(intervalId)
  }, [syncData, interval])

  return { syncData }
}