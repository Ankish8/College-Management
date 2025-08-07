"use client"

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

interface Holiday {
  id: string
  name: string
  date: Date | string
  type: string
  description?: string
  isRecurring?: boolean
  departmentId?: string | null
  academicCalendarId?: string | null
}

interface CreateHolidayData {
  name: string
  date: string
  type: "NATIONAL" | "UNIVERSITY" | "DEPARTMENT" | "LOCAL" | "FESTIVAL"
  description?: string
  isRecurring?: boolean
  departmentId?: string | null
  academicCalendarId?: string | null
}

interface HolidaysFilter {
  dateFrom?: string
  dateTo?: string
}

// Generate optimistic ID for new holidays
const generateOptimisticId = () => `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export function useHolidays(filters: HolidaysFilter = {}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Query for holidays
  const {
    data: holidays = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['holidays', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)

      const response = await fetch(`/api/holidays?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch holidays')
      }
      return response.json() as Promise<Holiday[]>
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for holidays
  })

  // Create holiday mutation with optimistic updates
  const createHolidayMutation = useMutation({
    mutationFn: async (data: CreateHolidayData): Promise<Holiday> => {
      const response = await fetch('/api/holidays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create holiday')
      }

      return response.json()
    },
    onMutate: async (newHoliday) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['holidays'] })

      // Snapshot the previous value
      const previousHolidays = queryClient.getQueryData(['holidays', filters])

      // Create optimistic holiday
      const optimisticHoliday: Holiday = {
        id: generateOptimisticId(),
        name: newHoliday.name,
        date: newHoliday.date,
        type: newHoliday.type,
        description: newHoliday.description,
        isRecurring: newHoliday.isRecurring || false,
        departmentId: newHoliday.departmentId,
        academicCalendarId: newHoliday.academicCalendarId,
      }

      // Optimistically update the cache
      queryClient.setQueryData(['holidays', filters], (old: Holiday[] = []) => {
        const newHolidays = [...old, optimisticHoliday]
        return newHolidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      })

      // Show optimistic toast
      toast({
        title: "Creating Holiday",
        description: `Adding "${newHoliday.name}" to calendar...`,
      })

      return { previousHolidays, optimisticHoliday }
    },
    onSuccess: (data, variables, context) => {
      // Update all related queries with the real data
      queryClient.setQueryData(['holidays', filters], (old: Holiday[] = []) => {
        return old.map(holiday => 
          holiday.id === context?.optimisticHoliday.id ? data : holiday
        )
      })

      toast({
        title: "Success",
        description: `Holiday "${data.name}" created successfully`,
      })
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousHolidays) {
        queryClient.setQueryData(['holidays', filters], context.previousHolidays)
      }

      toast({
        title: "Error",
        description: error.message || 'Failed to create holiday',
        variant: "destructive",
      })
    },
    onSettled: () => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['holidays'] })
    },
  })

  // Update holiday mutation with optimistic updates
  const updateHolidayMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Holiday> & { id: string }): Promise<Holiday> => {
      const response = await fetch(`/api/holidays/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update holiday')
      }

      return response.json()
    },
    onMutate: async (updatedHoliday) => {
      await queryClient.cancelQueries({ queryKey: ['holidays'] })
      
      const previousHolidays = queryClient.getQueryData(['holidays', filters])

      queryClient.setQueryData(['holidays', filters], (old: Holiday[] = []) => {
        return old.map(holiday => 
          holiday.id === updatedHoliday.id 
            ? { ...holiday, ...updatedHoliday }
            : holiday
        )
      })

      toast({
        title: "Updating Holiday",
        description: `Saving changes to "${updatedHoliday.name || 'holiday'}"...`,
      })

      return { previousHolidays }
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Holiday "${data.name}" updated successfully`,
      })
    },
    onError: (error, variables, context) => {
      if (context?.previousHolidays) {
        queryClient.setQueryData(['holidays', filters], context.previousHolidays)
      }

      toast({
        title: "Error",
        description: error.message || 'Failed to update holiday',
        variant: "destructive",
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] })
    },
  })

  // Delete holiday mutation with optimistic updates
  const deleteHolidayMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/holidays/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete holiday')
      }
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['holidays'] })
      
      const previousHolidays = queryClient.getQueryData(['holidays', filters]) as Holiday[]
      const deletedHoliday = previousHolidays?.find(h => h.id === deletedId)

      queryClient.setQueryData(['holidays', filters], (old: Holiday[] = []) => {
        return old.filter(holiday => holiday.id !== deletedId)
      })

      toast({
        title: "Deleting Holiday",
        description: `Removing "${deletedHoliday?.name || 'holiday'}" from calendar...`,
      })

      return { previousHolidays, deletedHoliday }
    },
    onSuccess: (data, variables, context) => {
      toast({
        title: "Success",
        description: `Holiday "${context?.deletedHoliday?.name || 'holiday'}" deleted successfully`,
      })
    },
    onError: (error, variables, context) => {
      if (context?.previousHolidays) {
        queryClient.setQueryData(['holidays', filters], context.previousHolidays)
      }

      toast({
        title: "Error",
        description: error.message || 'Failed to delete holiday',
        variant: "destructive",
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] })
    },
  })

  return {
    holidays,
    isLoading,
    error,
    refetch,
    createHoliday: createHolidayMutation.mutate,
    updateHoliday: updateHolidayMutation.mutate,
    deleteHoliday: deleteHolidayMutation.mutate,
    isCreating: createHolidayMutation.isPending,
    isUpdating: updateHolidayMutation.isPending,
    isDeleting: deleteHolidayMutation.isPending,
  }
}