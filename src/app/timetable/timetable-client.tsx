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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check, ChevronsUpDown } from 'lucide-react'
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

  const response = await fetch(`/api/timetable/entries?${searchParams.toString()}`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch timetable entries' }))
    throw new Error(error.message || 'Failed to fetch timetable entries')
  }

  return response.json()
}

// Convert timetable entry to calendar event
function timetableEntryToCalendarEvent(entry: any): CalendarEvent {
  // Parse time slot to get start and end times
  const [startTime, endTime] = entry.timeSlot.name.split('-')
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)

  // Create date objects (using today's date for now - in real app this would be based on schedule dates)
  const start = new Date()
  start.setHours(startHour, startMin, 0, 0)
  
  const end = new Date() 
  end.setHours(endHour, endMin, 0, 0)

  return {
    id: entry.id,
    title: `${entry.subject.name} - ${entry.faculty.name}`,
    start,
    end,
    className: `bg-blue-500 text-white`, // Color will be determined by calendar component
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
  }
}

// Fetch batches with program and specialization info
async function fetchBatches() {
  const response = await fetch('/api/batches?include=program,specialization')
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
  const [batchSelectorOpen, setBatchSelectorOpen] = useState(false)
  const hasInitializedBatch = React.useRef(false)

  // Fetch batches
  const { 
    data: batchesData, 
    isLoading: isLoadingBatches 
  } = useQuery({
    queryKey: ['batches-for-timetable'],
    queryFn: fetchBatches,
    enabled: !!session?.user
  })

  // Auto-select first batch if none selected (only once)
  useEffect(() => {
    if (batchesData?.batches && batchesData.batches.length > 0 && !hasInitializedBatch.current) {
      setSelectedBatchId(batchesData.batches[0].id)
      hasInitializedBatch.current = true
    }
  }, [batchesData?.batches])

  // Create stable filters object
  const filters = React.useMemo(() => {
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

  // Convert entries to calendar events
  const events: CalendarEvent[] = React.useMemo(() => {
    // For now, use sample data if no real data is available
    if (!timetableData?.entries || timetableData.entries.length === 0) {
      return sampleEvents
    }
    return timetableData.entries.map(timetableEntryToCalendarEvent)
  }, [timetableData, sampleEvents])

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

  const handleFiltersChange = (newFilters: TimetableFilters) => {
    // For now, we only support batch filtering from the main selector
    // Additional filters can be implemented here if needed
    console.log('Filters changed:', newFilters)
  }

  const handleViewStateChange = (viewState: any) => {
    setCurrentView(viewState.view)
  }

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId)
    setBatchSelectorOpen(false)
  }

  // Get selected batch info for display
  const selectedBatch = batchesData?.batches?.find((batch: any) => batch.id === selectedBatchId)

  // Format batch display text
  const formatBatchDisplay = (batch: any) => {
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
  }

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
              <Popover open={batchSelectorOpen} onOpenChange={setBatchSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={batchSelectorOpen}
                    className="w-80 justify-between"
                  >
                    {selectedBatch ? (
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-medium truncate">
                          {formatBatchDisplay(selectedBatch)}
                        </span>
                      </div>
                    ) : (
                      "Select batch..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <Command>
                    <CommandInput placeholder="Search batches..." />
                    <CommandList>
                      <CommandEmpty>No batch found.</CommandEmpty>
                      <CommandGroup>
                        {batchesData?.batches?.map((batch: any) => (
                          <CommandItem
                            key={batch.id}
                            value={formatBatchDisplay(batch)}
                            onSelect={() => handleBatchChange(batch.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedBatchId === batch.id ? "opacity-100" : "opacity-0"
                              )}
                            />
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
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {selectedBatch && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">{selectedBatch.program?.name}</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            disabled={!selectedBatchId}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Class
          </Button>
          <Button variant="outline" asChild>
            <Link href="/settings/timetable">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
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
            onViewStateChange={handleViewStateChange}
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