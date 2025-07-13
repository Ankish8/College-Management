"use client"

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { FullCalendar } from '@/components/ui/full-calendar'
import { CalendarEvent, TimetableFilters, CalendarView } from '@/types/timetable'
import { Button } from '@/components/ui/button'
import { Plus, Settings, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { CreateTimetableEntryModal } from '@/components/timetable/create-timetable-entry-modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// Fetch timetable entries
async function fetchTimetableEntries(filters: TimetableFilters = {}) {
  const searchParams = new URLSearchParams()
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })

  console.log('Fetching timetable entries with filters:', filters)
  console.log('API URL:', `/api/timetable/entries?${searchParams.toString()}`)

  const response = await fetch(`/api/timetable/entries?${searchParams.toString()}`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch timetable entries' }))
    throw new Error(error.message || 'Failed to fetch timetable entries')
  }

  const data = await response.json()
  console.log('Timetable API response:', data)
  return data
}

// Helper function to get day index from DayOfWeek enum
function getDayIndex(dayOfWeek: string): number {
  const dayMap: Record<string, number> = {
    'MONDAY': 1,
    'TUESDAY': 2,
    'WEDNESDAY': 3,
    'THURSDAY': 4,
    'FRIDAY': 5,
    'SATURDAY': 6,
    'SUNDAY': 0
  }
  return dayMap[dayOfWeek] || 1
}

// Convert timetable entry to calendar events (supporting recurring entries)
function timetableEntryToCalendarEvents(entry: any, currentDate: Date = new Date()): CalendarEvent[] {
  // Parse time slot to get start and end times
  const [startTime, endTime] = entry.timeSlot.name.split('-')
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)

  const events: CalendarEvent[] = []
  
  // If this is a specific date entry, create single event
  if (entry.date) {
    const eventDate = new Date(entry.date)
    const start = new Date(eventDate)
    start.setHours(startHour, startMin, 0, 0)
    
    const end = new Date(eventDate)
    end.setHours(endHour, endMin, 0, 0)

    events.push({
      id: `${entry.id}-${eventDate.toISOString().split('T')[0]}`,
      title: `${entry.subject.name} - ${entry.faculty.name}`,
      start,
      end,
      className: `bg-blue-500 text-white`,
      extendedProps: {
        timetableEntryId: entry.id,
        batchId: entry.batchId,
        batchName: entry.batch.name,
        subjectId: entry.subjectId,
        subjectName: entry.subject.name,
        subjectCode: entry.subject.code,
        facultyId: entry.facultyId,
        facultyName: entry.faculty.name,
        timeSlotId: entry.timeSlotId,
        timeSlotName: entry.timeSlot.name,
        dayOfWeek: entry.dayOfWeek,
        entryType: entry.entryType,
        credits: entry.subject.credits,
        notes: entry.notes
      }
    })
  } else {
    // For recurring entries, generate events for the next 8 weeks (to cover month view)
    const targetDayIndex = getDayIndex(entry.dayOfWeek)
    const startOfCurrentWeek = new Date(currentDate)
    startOfCurrentWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1) // Monday
    
    // Generate events for 8 weeks (past 4 weeks + current + future 3 weeks)
    for (let weekOffset = -4; weekOffset <= 3; weekOffset++) {
      const weekStart = new Date(startOfCurrentWeek)
      weekStart.setDate(startOfCurrentWeek.getDate() + (weekOffset * 7))
      
      // Calculate the specific day in this week
      const eventDate = new Date(weekStart)
      eventDate.setDate(weekStart.getDate() + targetDayIndex - 1) // Adjust for Monday = 1
      
      const start = new Date(eventDate)
      start.setHours(startHour, startMin, 0, 0)
      
      const end = new Date(eventDate)
      end.setHours(endHour, endMin, 0, 0)

      events.push({
        id: `${entry.id}-${eventDate.toISOString().split('T')[0]}`,
        title: `${entry.subject.name} - ${entry.faculty.name}`,
        start,
        end,
        className: `bg-blue-500 text-white`,
        extendedProps: {
          timetableEntryId: entry.id,
          batchId: entry.batchId,
          batchName: entry.batch.name,
          subjectId: entry.subjectId,
          subjectName: entry.subject.name,
          subjectCode: entry.subject.code,
          facultyId: entry.facultyId,
          facultyName: entry.faculty.name,
          timeSlotId: entry.timeSlotId,
          timeSlotName: entry.timeSlot.name,
          dayOfWeek: entry.dayOfWeek,
          entryType: entry.entryType,
          credits: entry.subject.credits,
          notes: entry.notes
        }
      })
    }
  }

  return events
}

// Fetch batches with program and specialization info
async function fetchBatches() {
  const response = await fetch('/api/batches?active=true')
  if (!response.ok) {
    throw new Error('Failed to fetch batches')
  }
  return response.json()
}

export default function TimetableClient() {
  const { data: session } = useSession()
  const [currentView, setCurrentView] = useState<CalendarView>('week')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedBatchId, setSelectedBatchId] = useState<string>('')
  const hasInitializedBatch = React.useRef(false)

  // Fetch batches
  const { 
    data: batchesData, 
    isLoading: isLoadingBatches,
    error: batchesError
  } = useQuery({
    queryKey: ['batches-for-timetable'],
    queryFn: fetchBatches,
    enabled: !!session?.user
  })


  // Auto-select first batch if none selected (only once)
  useEffect(() => {
    if (batchesData && batchesData.length > 0 && !hasInitializedBatch.current) {
      setSelectedBatchId(batchesData[0].id)
      hasInitializedBatch.current = true
    }
  }, [batchesData])

  // Create stable filters object
  const filters = React.useMemo(() => {
    console.log('Creating filters with selectedBatchId:', selectedBatchId)
    return selectedBatchId ? { batchId: selectedBatchId } : {}
  }, [selectedBatchId])

  // Fetch timetable entries
  const { 
    data: timetableData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['timetable-entries', filters],
    queryFn: () => fetchTimetableEntries(filters),
    enabled: !!session?.user && !!selectedBatchId
  })

  // Sample events for testing (will be replaced with real data)
  const sampleEvents: CalendarEvent[] = [
    {
      id: "1",
      title: "Design Fundamentals - Prof. Smith",
      start: new Date(2025, 6, 14, 10, 0), // July 14, 2025, 10:00 AM (Monday)
      end: new Date(2025, 6, 14, 11, 30), // July 14, 2025, 11:30 AM
      className: "",
      extendedProps: {
        timetableEntryId: "1",
        batchId: "batch1",
        batchName: "B.Des Semester 5",
        subjectId: "subject1",
        subjectName: "Design Fundamentals",
        subjectCode: "DF101",
        facultyId: "faculty1",
        facultyName: "Prof. Smith",
        timeSlotId: "slot1",
        timeSlotName: "10:00-11:30",
        dayOfWeek: "MONDAY" as const,
        entryType: "REGULAR" as const,
        credits: 4
      }
    },
    {
      id: "2",
      title: "Typography - Prof. Johnson",
      start: new Date(2025, 6, 15, 11, 30), // July 15, 2025, 11:30 AM (Tuesday)
      end: new Date(2025, 6, 15, 13, 0), // July 15, 2025, 1:00 PM
      className: "",
      extendedProps: {
        timetableEntryId: "2",
        batchId: "batch1",
        batchName: "B.Des Semester 5",
        subjectId: "subject2",
        subjectName: "Typography",
        subjectCode: "TYP201",
        facultyId: "faculty2",
        facultyName: "Prof. Johnson",
        timeSlotId: "slot2",
        timeSlotName: "11:30-13:00",
        dayOfWeek: "TUESDAY" as const,
        entryType: "REGULAR" as const,
        credits: 3
      }
    },
    {
      id: "3",
      title: "Color Theory - Prof. Davis",
      start: new Date(2025, 6, 16, 14, 30), // July 16, 2025, 2:30 PM (Wednesday)
      end: new Date(2025, 6, 16, 16, 0), // July 16, 2025, 4:00 PM
      className: "",
      extendedProps: {
        timetableEntryId: "3",
        batchId: "batch1",
        batchName: "B.Des Semester 5",
        subjectId: "subject3",
        subjectName: "Color Theory",
        subjectCode: "CT301",
        facultyId: "faculty3",
        facultyName: "Prof. Davis",
        timeSlotId: "slot3",
        timeSlotName: "14:30-16:00",
        dayOfWeek: "WEDNESDAY" as const,
        entryType: "REGULAR" as const,
        credits: 3
      }
    }
  ]

  // Format batch display text
  const formatBatchDisplay = React.useCallback((batch: any) => {
    if (!batch) return ''
    
    const parts = []
    
    // Add program (e.g., "B.Des")
    if (batch.program?.shortName) {
      parts.push(batch.program.shortName)
    }
    
    // Add semester (e.g., "Semester 6")
    if (batch.semester) {
      parts.push(`Semester ${batch.semester}`)
    }
    
    // Add specialization (e.g., "UX")
    if (batch.specialization?.shortName) {
      parts.push(batch.specialization.shortName)
    }
    
    return parts.join(' • ')
  }, [])

  // Convert entries to calendar events
  const events: CalendarEvent[] = React.useMemo(() => {
    // Use real data if available
    if (timetableData?.entries && timetableData.entries.length > 0) {
      const allEvents: CalendarEvent[] = []
      timetableData.entries.forEach(entry => {
        const entryEvents = timetableEntryToCalendarEvents(entry, selectedDate)
        allEvents.push(...entryEvents)
      })
      console.log('Using real timetable data:', allEvents.length, 'events from', timetableData.entries.length, 'entries')
      return allEvents
    }
    
    // If no real data, generate sample recurring events for demonstration
    if (selectedBatchId) {
      const batchInfo = batchesData?.find(b => b.id === selectedBatchId)
      if (batchInfo) {
        const batchName = formatBatchDisplay(batchInfo)
        console.log('Using sample data for batch:', batchName)
        
        // Create sample recurring events
        const sampleTimetableEntries = [
          {
            id: "sample-1",
            dayOfWeek: "MONDAY",
            timeSlot: { name: "10:15-11:05" },
            subject: { name: "Design Fundamentals", code: "DF101", credits: 4 },
            faculty: { name: "Prof. Smith" },
            batch: { name: batchName },
            batchId: selectedBatchId,
            entryType: "REGULAR"
          },
          {
            id: "sample-2", 
            dayOfWeek: "TUESDAY",
            timeSlot: { name: "11:15-12:05" },
            subject: { name: "Typography", code: "TYP201", credits: 3 },
            faculty: { name: "Prof. Johnson" },
            batch: { name: batchName },
            batchId: selectedBatchId,
            entryType: "REGULAR"
          },
          {
            id: "sample-3",
            dayOfWeek: "WEDNESDAY", 
            timeSlot: { name: "14:15-15:05" },
            subject: { name: "Color Theory", code: "CT301", credits: 3 },
            faculty: { name: "Prof. Davis" },
            batch: { name: batchName },
            batchId: selectedBatchId,
            entryType: "REGULAR"
          }
        ]
        
        const allSampleEvents: CalendarEvent[] = []
        sampleTimetableEntries.forEach(entry => {
          const entryEvents = timetableEntryToCalendarEvents(entry, selectedDate)
          allSampleEvents.push(...entryEvents)
        })
        
        return allSampleEvents
      }
    }
    
    return []
  }, [timetableData, selectedBatchId, batchesData, formatBatchDisplay, selectedDate])

  const handleEventClick = (event: CalendarEvent) => {
    toast.info(`Clicked: ${event.extendedProps?.subjectName} - ${event.extendedProps?.facultyName}`)
  }

  const handleEventEdit = (event: CalendarEvent) => {
    toast.info(`Edit: ${event.extendedProps?.subjectName}`)
  }

  const handleEventCreate = (date: Date, timeSlot?: string) => {
    setSelectedDate(date)
    setIsCreateModalOpen(true)
  }

  const handleEventDrop = async (eventId: string, newDate: Date, newTimeSlot: string, newDayOfWeek: string) => {
    try {
      console.log('Dropping event:', { eventId, newDate, newTimeSlot, newDayOfWeek })
      
      // Check if this is a sample event (sample events have simple numeric IDs)
      if (eventId === "1" || eventId === "2" || eventId === "3" || eventId.length < 10) {
        toast.info('📋 Nice! Drag and drop is working. This is sample data, so changes won\'t save. Create real classes to persist changes.')
        return
      }
      
      const requestBody = {
        dayOfWeek: newDayOfWeek,
        timeSlotName: newTimeSlot,
      }
      console.log('Request body:', requestBody)
      
      // Update the timetable entry via API
      const response = await fetch(`/api/timetable/entries/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('Response status:', response.status)
      const responseText = await response.text()
      console.log('Response body:', responseText)
      
      if (!response.ok) {
        let errorData = {}
        try {
          errorData = JSON.parse(responseText)
        } catch {
          errorData = { error: `HTTP ${response.status}: ${responseText}` }
        }
        console.error('API Error:', errorData)
        
        // Show user-friendly conflict messages
        if (response.status === 409 && errorData.conflicts) {
          const conflict = errorData.conflicts[0]
          if (conflict.type === 'FACULTY_CONFLICT') {
            const facultyName = conflict.details[0]?.subject?.name || 'another subject'
            throw new Error(`Faculty is already teaching ${facultyName} at this time. Please choose a different time slot.`)
          } else if (conflict.type === 'BATCH_CONFLICT') {
            const subjectName = conflict.details[0]?.subject?.name || 'another class'
            throw new Error(`This batch already has ${subjectName} scheduled at this time. Please choose a different time slot.`)
          }
        }
        
        throw new Error(errorData.error || `Failed to update timetable entry (${response.status})`)
      }

      const result = JSON.parse(responseText)
      console.log('Update successful:', result)

      // Refresh the timetable data
      refetch()
      toast.success('Class moved successfully!')
    } catch (error) {
      console.error('Error moving class:', error)
      toast.error(`Failed to move class: ${error.message}`)
    }
  }

  // Check conflicts across all batches for a faculty
  const checkConflicts = async (facultyId: string, dayOfWeek: string, timeSlot: string, excludeEventId?: string) => {
    try {
      const params = new URLSearchParams({
        facultyId,
        dayOfWeek,
        timeSlotName: timeSlot,
      })
      
      if (excludeEventId) {
        params.append('excludeEventId', excludeEventId)
      }
      
      const response = await fetch(`/api/timetable/conflicts?${params.toString()}`)
      
      if (!response.ok) {
        console.error('Conflict check failed:', response.status)
        return false // Assume no conflict if check fails
      }
      
      const result = await response.json()
      return result.hasConflict
    } catch (error) {
      console.error('Error checking conflicts:', error)
      return false // Assume no conflict if check fails
    }
  }

  const handleFiltersChange = (newFilters: TimetableFilters) => {
    // For now, we only support batch filtering from the main selector
    // Additional filters can be implemented here if needed
    console.log('Filters changed:', newFilters)
  }

  const handleViewStateChange = (viewState: any) => {
    setCurrentView(viewState.view)
    // Update selected date when view date changes (for month navigation)
    if (viewState.currentDate && viewState.currentDate !== selectedDate) {
      setSelectedDate(viewState.currentDate)
    }
  }

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId)
    // Force refetch of timetable data when batch changes
    refetch()
  }

  // Get selected batch info for display
  const selectedBatch = batchesData?.find((batch: any) => batch.id === selectedBatchId)

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load timetable data: {(error as Error).message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Timetable</h1>
            <p className="text-muted-foreground">
              View and manage class schedules
            </p>
          </div>
          
          {/* Batch Selector */}
          {isLoadingBatches ? (
            <Skeleton className="h-10 w-80" />
          ) : (
            <div className="flex items-center gap-3">
              <Select value={selectedBatchId} onValueChange={handleBatchChange}>
                <SelectTrigger className="w-80">
                  <SelectValue placeholder="Select batch...">
                    {selectedBatch ? (
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-medium truncate">
                          {formatBatchDisplay(selectedBatch)}
                        </span>
                        {selectedBatch.specialization && (
                          <Badge variant="secondary" className="text-xs">
                            {selectedBatch.specialization.name}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      "Select batch..."
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {batchesData?.map((batch: any) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {formatBatchDisplay(batch)}
                          </span>
                          {batch.specialization && (
                            <Badge variant="secondary" className="text-xs">
                              {batch.specialization.name}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {batch.program?.name} • {batch.name}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedBatch && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">{selectedBatch.program?.name}</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              disabled={!selectedBatchId}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Class
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                console.log('Manual refetch triggered')
                refetch()
              }}
            >
              🔄 Refresh Data
            </Button>
            <Button variant="outline" asChild>
              <Link href="/settings/timetable">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
          </div>
          
          {events.length > 0 && events.every(e => e.id.length < 10) && (
            <div className="text-sm text-muted-foreground bg-orange-50/50 px-3 py-2 rounded-lg border border-orange-200">
              🎯 <strong>Try it out!</strong> Drag the classes around to see how it works. Create real classes to save changes permanently.
            </div>
          )}
        </div>
      </div>

      {/* Calendar Component */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : events.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">No timetable entries found.</p>
            <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Entry
            </Button>
          </div>
        ) : (
          <FullCalendar
            events={events}
            initialView={currentView}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onEventClick={handleEventClick}
            onEventEdit={handleEventEdit}
            onEventCreate={handleEventCreate}
            onEventDrop={handleEventDrop}
            onViewStateChange={handleViewStateChange}
            onCheckConflicts={checkConflicts}
            isLoading={isLoading}
            conflicts={[]}
            showWeekends={false}
            className="h-full"
          />
        )}
      </div>

      {/* Create Timetable Entry Modal */}
      <CreateTimetableEntryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        defaultDate={selectedDate}
        defaultBatchId={selectedBatchId}
        onSuccess={(newEntry) => {
          toast.success("Timetable entry created successfully!")
          setIsCreateModalOpen(false)
          refetch() // Refresh the timetable data
        }}
      />
    </div>
  )
}