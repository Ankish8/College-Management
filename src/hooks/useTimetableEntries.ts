"use client"

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

interface TimetableEntry {
  id: string
  batchId: string
  subjectId?: string | null
  facultyId?: string | null
  timeSlotId: string
  dayOfWeek: string
  date?: Date | string | null
  entryType: string
  isActive: boolean
  notes?: string | null
  customEventTitle?: string | null
  customEventColor?: string | null
  createdAt?: Date | string
  updatedAt?: Date | string
  // Relations
  subject?: {
    id: string
    name: string
    code: string
    credits: number
  }
  faculty?: {
    id: string
    name: string
    email: string
  }
  timeSlot?: {
    id: string
    name: string
    startTime: string
    endTime: string
  }
  batch?: {
    id: string
    name: string
    semester: number
  }
}

interface CreateTimetableEntryData {
  batchId: string
  subjectId?: string | null
  facultyId?: string | null
  timeSlotId: string
  dayOfWeek: string
  date?: string | null
  entryType?: string
  notes?: string | null
  customEventTitle?: string | null
  customEventColor?: string | null
}

interface TimetableFilter {
  batchId?: string
  dateFrom?: string
  dateTo?: string
  facultyId?: string
}

// Generate optimistic ID for new entries
const generateOptimisticId = () => `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export function useTimetableEntries(filters: TimetableFilter = {}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Query for timetable entries
  const {
    data: entries = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['timetable-entries', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.batchId) params.append('batchId', filters.batchId)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      if (filters.facultyId) params.append('facultyId', filters.facultyId)

      const response = await fetch(`/api/timetable/entries?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch timetable entries')
      }
      return response.json() as Promise<TimetableEntry[]>
    },
    staleTime: 1 * 60 * 1000, // 1 minute for timetable entries
  })

  // Create timetable entry mutation with optimistic updates
  const createEntryMutation = useMutation({
    mutationFn: async (data: CreateTimetableEntryData): Promise<TimetableEntry> => {
      const response = await fetch('/api/timetable/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create timetable entry')
      }

      return response.json()
    },
    onMutate: async (newEntry) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['timetable-entries'] })

      // Snapshot the previous value
      const previousEntries = queryClient.getQueryData(['timetable-entries', filters])

      // Create optimistic entry
      const optimisticEntry: TimetableEntry = {
        id: generateOptimisticId(),
        batchId: newEntry.batchId,
        subjectId: newEntry.subjectId,
        facultyId: newEntry.facultyId,
        timeSlotId: newEntry.timeSlotId,
        dayOfWeek: newEntry.dayOfWeek,
        date: newEntry.date,
        entryType: newEntry.entryType || 'REGULAR',
        isActive: true,
        notes: newEntry.notes,
        customEventTitle: newEntry.customEventTitle,
        customEventColor: newEntry.customEventColor,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Optimistically update the cache
      queryClient.setQueryData(['timetable-entries', filters], (old: TimetableEntry[] = []) => {
        return [...old, optimisticEntry]
      })

      // Show optimistic toast
      const entryName = newEntry.customEventTitle || newEntry.subjectId ? 'class' : 'entry'
      toast({
        title: "Creating Entry",
        description: `Adding ${entryName} to timetable...`,
      })

      return { previousEntries, optimisticEntry }
    },
    onSuccess: (data, variables, context) => {
      // Update all related queries with the real data
      queryClient.setQueryData(['timetable-entries', filters], (old: TimetableEntry[] = []) => {
        return old.map(entry => 
          entry.id === context?.optimisticEntry.id ? data : entry
        )
      })

      const entryName = data.customEventTitle || data.subject?.name || 'Entry'
      toast({
        title: "Success",
        description: `${entryName} added to timetable successfully`,
      })
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousEntries) {
        queryClient.setQueryData(['timetable-entries', filters], context.previousEntries)
      }

      toast({
        title: "Error",
        description: error.message || 'Failed to create timetable entry',
        variant: "destructive",
      })
    },
    onSettled: () => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['timetable-entries'] })
    },
  })

  // Update timetable entry mutation with optimistic updates
  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<TimetableEntry> & { id: string }): Promise<TimetableEntry> => {
      const response = await fetch(`/api/timetable/entries/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update timetable entry')
      }

      return response.json()
    },
    onMutate: async (updatedEntry) => {
      await queryClient.cancelQueries({ queryKey: ['timetable-entries'] })
      
      const previousEntries = queryClient.getQueryData(['timetable-entries', filters])

      queryClient.setQueryData(['timetable-entries', filters], (old: TimetableEntry[] = []) => {
        return old.map(entry => 
          entry.id === updatedEntry.id 
            ? { ...entry, ...updatedEntry, updatedAt: new Date().toISOString() }
            : entry
        )
      })

      const entryName = updatedEntry.customEventTitle || 'entry'
      toast({
        title: "Updating Entry",
        description: `Saving changes to ${entryName}...`,
      })

      return { previousEntries }
    },
    onSuccess: (data) => {
      const entryName = data.customEventTitle || data.subject?.name || 'Entry'
      toast({
        title: "Success",
        description: `${entryName} updated successfully`,
      })
    },
    onError: (error, variables, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(['timetable-entries', filters], context.previousEntries)
      }

      toast({
        title: "Error",
        description: error.message || 'Failed to update timetable entry',
        variant: "destructive",
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-entries'] })
    },
  })

  // Delete/Cancel timetable entry mutation with optimistic updates
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/timetable/entries/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete timetable entry')
      }
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['timetable-entries'] })
      
      const previousEntries = queryClient.getQueryData(['timetable-entries', filters]) as TimetableEntry[]
      const deletedEntry = previousEntries?.find(e => e.id === deletedId)

      queryClient.setQueryData(['timetable-entries', filters], (old: TimetableEntry[] = []) => {
        return old.filter(entry => entry.id !== deletedId)
      })

      const entryName = deletedEntry?.customEventTitle || deletedEntry?.subject?.name || 'entry'
      toast({
        title: "Removing Entry",
        description: `Removing ${entryName} from timetable...`,
      })

      return { previousEntries, deletedEntry }
    },
    onSuccess: (data, variables, context) => {
      const entryName = context?.deletedEntry?.customEventTitle || context?.deletedEntry?.subject?.name || 'entry'
      toast({
        title: "Success",
        description: `${entryName} removed successfully`,
      })
    },
    onError: (error, variables, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(['timetable-entries', filters], context.previousEntries)
      }

      toast({
        title: "Error",
        description: error.message || 'Failed to remove timetable entry',
        variant: "destructive",
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-entries'] })
    },
  })

  // Cancel entry (soft delete) mutation
  const cancelEntryMutation = useMutation({
    mutationFn: async (id: string): Promise<TimetableEntry> => {
      const response = await fetch(`/api/timetable/entries/${id}/cancel`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel timetable entry')
      }

      return response.json()
    },
    onMutate: async (cancelledId) => {
      await queryClient.cancelQueries({ queryKey: ['timetable-entries'] })
      
      const previousEntries = queryClient.getQueryData(['timetable-entries', filters]) as TimetableEntry[]
      const cancelledEntry = previousEntries?.find(e => e.id === cancelledId)

      queryClient.setQueryData(['timetable-entries', filters], (old: TimetableEntry[] = []) => {
        return old.map(entry => 
          entry.id === cancelledId 
            ? { ...entry, isActive: false, entryType: 'CANCELLED' }
            : entry
        )
      })

      const entryName = cancelledEntry?.customEventTitle || cancelledEntry?.subject?.name || 'entry'
      toast({
        title: "Cancelling Entry",
        description: `Cancelling ${entryName}...`,
      })

      return { previousEntries, cancelledEntry }
    },
    onSuccess: (data) => {
      const entryName = data.customEventTitle || data.subject?.name || 'Entry'
      toast({
        title: "Success",
        description: `${entryName} cancelled successfully`,
      })
    },
    onError: (error, variables, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(['timetable-entries', filters], context.previousEntries)
      }

      toast({
        title: "Error",
        description: error.message || 'Failed to cancel timetable entry',
        variant: "destructive",
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-entries'] })
    },
  })

  return {
    entries,
    isLoading,
    error,
    refetch,
    createEntry: createEntryMutation.mutate,
    updateEntry: updateEntryMutation.mutate,
    deleteEntry: deleteEntryMutation.mutate,
    cancelEntry: cancelEntryMutation.mutate,
    isCreating: createEntryMutation.isPending,
    isUpdating: updateEntryMutation.isPending,
    isDeleting: deleteEntryMutation.isPending,
    isCancelling: cancelEntryMutation.isPending,
  }
}