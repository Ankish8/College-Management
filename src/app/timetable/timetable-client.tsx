"use client"

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FullCalendar } from '@/components/ui/full-calendar'
import { CalendarEvent, TimetableFilters, CalendarView } from '@/types/timetable'
import { Button } from '@/components/ui/button'
import { Plus, Settings, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { CreateTimetableEntryModal } from '@/components/timetable/create-timetable-entry-modal'
import { DeleteConfirmationModal } from '@/components/timetable/delete-confirmation-modal'
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
  
  // Ensure we get all entries by setting a high limit for large datasets
  if (!searchParams.has('limit')) {
    searchParams.append('limit', '5000')
  }

  // Fetch timetable entries with filters

  const response = await fetch(`/api/timetable/entries?${searchParams.toString()}`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch timetable entries' }))
    throw new Error(error.message || 'Failed to fetch timetable entries')
  }

  const data = await response.json()
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

    const eventId = `${entry.id}-${eventDate.toISOString().split('T')[0]}`
    
    // Check if this is a custom event or regular subject
    const isCustomEvent = !!entry.customEventTitle
    const eventTitle = isCustomEvent 
      ? entry.customEventTitle 
      : `${entry.subject?.name || 'Unknown Subject'} - ${entry.faculty?.name || 'No Faculty'}`
    
    // Debug logging for date-specific entries
    if (entry.subject?.name === 'Design Ethics' || (entry.dayOfWeek === 'WEDNESDAY' && entry.subject?.name === 'Thesis Project')) {
      console.log(`📍 Date-specific event: ${entry.subject.name} on ${eventDate.toDateString()} (${eventDate.toISOString().split('T')[0]}) - ID: ${eventId}`)
    }

    // Check if this is a past date to apply different styling
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const eventDateOnly = new Date(eventDate)
    eventDateOnly.setHours(0, 0, 0, 0)
    
    // For academic planning, don't gray out recent dates in the same academic year
    // Only gray out dates that are significantly in the past (more than 30 days ago)
    const daysDifference = Math.floor((today.getTime() - eventDateOnly.getTime()) / (1000 * 60 * 60 * 24))
    const isPastDate = daysDifference > 30
    
    // Determine event styling
    let eventClassName = ''
    let backgroundColor = undefined
    let borderColor = undefined
    let textColor = undefined
    
    if (isPastDate) {
      eventClassName = 'bg-gray-400 text-gray-600 opacity-60 cursor-not-allowed'
      backgroundColor = '#9ca3af'
      borderColor = '#9ca3af'
      textColor = '#6b7280'
    } else if (isCustomEvent && entry.customEventColor) {
      // EXTREMELY subtle colors for custom events ONLY
      backgroundColor = '#f8fafc' // Almost white with tiny tint
      borderColor = '#e2e8f0' // Very light gray border
      textColor = '#1e293b' // Dark text
      eventClassName = 'font-medium'
    } else if (isCustomEvent) {
      // Default extremely subtle for custom events ONLY
      backgroundColor = '#f8fafc' // Almost white
      borderColor = '#e2e8f0' // Very light gray border
      textColor = '#1e293b' // Dark text
      eventClassName = 'font-medium'
    } else {
      // Regular subject events - NO special styling, use default
      backgroundColor = undefined // No background color
      borderColor = undefined // No border color
      textColor = undefined // No text color
      eventClassName = '' // No special class
    }
    
    events.push({
      id: eventId,
      title: eventTitle, // Just the clean title, no extra text
      start,
      end,
      className: eventClassName,
      backgroundColor: backgroundColor,
      borderColor: borderColor,
      textColor: textColor,
      editable: !isPastDate,
      startEditable: !isPastDate,
      durationEditable: !isPastDate,
      extendedProps: {
        timetableEntryId: entry.id,
        batchId: entry.batchId,
        batchName: entry.batch.name,
        subjectId: entry.subjectId,
        subjectName: entry.subject?.name,
        subjectCode: entry.subject?.code,
        facultyId: entry.facultyId,
        facultyName: entry.faculty?.name,
        timeSlotId: entry.timeSlotId,
        timeSlotName: entry.timeSlot.name,
        dayOfWeek: entry.dayOfWeek,
        entryType: entry.entryType,
        credits: entry.subject?.credits,
        notes: entry.notes,
        isPastDate: isPastDate,
        isCustomEvent: isCustomEvent,
        customEventTitle: entry.customEventTitle,
        customEventColor: entry.customEventColor
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

      const eventId = `${entry.id}-${eventDate.toISOString().split('T')[0]}`
      
      // Check if this is a custom event or regular subject
      const isCustomEvent = entry.customEventTitle
      const eventTitle = isCustomEvent 
        ? entry.customEventTitle 
        : `${entry.subject?.name || 'Unknown Subject'} - ${entry.faculty?.name || 'No Faculty'}`

      // Debug logging for recurring entries on Wednesday (to debug Thesis Project issue)
      if (entry.dayOfWeek === 'WEDNESDAY' && entry.subject?.name === 'Thesis Project') {
        console.log(`🔄 Recurring WEDNESDAY event: ${entry.subject.name} on ${eventDate.toDateString()} (${eventDate.toISOString().split('T')[0]}) - ID: ${eventId}`)
      }

      // Check if this is a past date to apply different styling
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const eventDateOnly = new Date(eventDate)
      eventDateOnly.setHours(0, 0, 0, 0)
      
      // For academic planning, don't gray out recent dates in the same academic year
      // Only gray out dates that are significantly in the past (more than 30 days ago)
      const daysDifference = Math.floor((today.getTime() - eventDateOnly.getTime()) / (1000 * 60 * 60 * 24))
      const isPastDate = daysDifference > 30
      
      // Determine event styling
      let eventClassName = ''
      let backgroundColor = undefined
      let borderColor = undefined
      let textColor = undefined
      
      if (isPastDate) {
        eventClassName = 'bg-gray-400 text-gray-600 opacity-60 cursor-not-allowed'
        backgroundColor = '#9ca3af'
        borderColor = '#9ca3af'
        textColor = '#6b7280'
      } else if (isCustomEvent && entry.customEventColor) {
        // EXTREMELY subtle colors for custom events ONLY
        backgroundColor = '#f8fafc' // Almost white with tiny tint
        borderColor = '#e2e8f0' // Very light gray border
        textColor = '#1e293b' // Dark text
        eventClassName = 'font-medium'
      } else if (isCustomEvent) {
        // Default extremely subtle for custom events ONLY
        backgroundColor = '#f8fafc' // Almost white
        borderColor = '#e2e8f0' // Very light gray border
        textColor = '#1e293b' // Dark text
        eventClassName = 'font-medium'
      } else {
        // Regular subject events - NO special styling, use default
        backgroundColor = undefined // No background color
        borderColor = undefined // No border color
        textColor = undefined // No text color
        eventClassName = '' // No special class
      }
      
      events.push({
        id: eventId,
        title: `${eventTitle}${isPastDate ? ' (Past)' : ''}`,
        start,
        end,
        className: eventClassName,
        backgroundColor: backgroundColor,
        borderColor: borderColor,
        textColor: textColor,
        editable: !isPastDate, // Disable drag/drop for past events
        startEditable: !isPastDate, // Disable time editing for past events
        durationEditable: !isPastDate, // Disable duration editing for past events
        extendedProps: {
          timetableEntryId: entry.id,
          batchId: entry.batchId,
          batchName: entry.batch.name,
          subjectId: entry.subjectId,
          subjectName: entry.subject?.name,
          subjectCode: entry.subject?.code,
          facultyId: entry.facultyId,
          facultyName: entry.faculty?.name,
          timeSlotId: entry.timeSlotId,
          timeSlotName: entry.timeSlot.name,
          dayOfWeek: entry.dayOfWeek,
          entryType: entry.entryType,
          credits: entry.subject?.credits,
          notes: entry.notes,
          isPastDate: isPastDate,
          isCustomEvent: isCustomEvent,
          customEventTitle: entry.customEventTitle,
          customEventColor: entry.customEventColor
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
  const queryClient = useQueryClient()
  const [currentView, setCurrentView] = useState<CalendarView>('week')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [skipDeleteConfirmation, setSkipDeleteConfirmation] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()) // Today's date
  const [selectedBatchId, setSelectedBatchId] = useState<string>('')
  const [forceRefreshKey, setForceRefreshKey] = useState<number>(Date.now())
  const hasInitializedBatch = React.useRef(false)

  // Initialize "don't ask again" state from session storage
  React.useEffect(() => {
    const skipConfirmation = sessionStorage.getItem('skipDeleteConfirmation')
    if (skipConfirmation === 'true') {
      setSkipDeleteConfirmation(true)
    }
  }, [])

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


  // Load saved batch from localStorage and auto-select first batch if none selected
  useEffect(() => {
    if (batchesData && batchesData.length > 0 && !hasInitializedBatch.current) {
      // Try to load saved batch from localStorage
      const savedBatchId = localStorage.getItem('selectedBatchId')
      if (savedBatchId && batchesData.find((batch: any) => batch.id === savedBatchId)) {
        setSelectedBatchId(savedBatchId)
      } else {
        setSelectedBatchId(batchesData[0].id)
      }
      hasInitializedBatch.current = true
    }
  }, [batchesData])

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
    queryFn: () => {
      console.log('🔄 Fetching timetable with filters:', filters)
      return fetchTimetableEntries(filters)
    },
    enabled: !!session?.user && !!selectedBatchId,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache data
    refetchOnMount: true,
    refetchOnWindowFocus: true
  })

  // Debug logging
  React.useEffect(() => {
    console.log('📊 Timetable Query State:', {
      selectedBatchId,
      isLoading,
      error: error?.message,
      dataEntries: timetableData?.entries?.length || 0,
      enabled: !!session?.user && !!selectedBatchId
    })
  }, [selectedBatchId, isLoading, error, timetableData, session])


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

  // Convert entries to calendar events - COMPLETELY REWRITTEN
  const events: CalendarEvent[] = React.useMemo(() => {
    
    if (!timetableData?.entries || timetableData.entries.length === 0) {
      return []
    }
    
    console.log(`🎯 Processing ${timetableData.entries.length} timetable entries`)
    
    // Get the current visible week range
    const currentWeekStart = new Date(selectedDate)
    currentWeekStart.setDate(selectedDate.getDate() - selectedDate.getDay()) // Start of week (Sunday)
    const currentWeekEnd = new Date(currentWeekStart)
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6) // End of week (Saturday)
    
    console.log(`📅 Filtering events for visible week: ${currentWeekStart.toDateString()} to ${currentWeekEnd.toDateString()}`)
    
    const allEvents: CalendarEvent[] = []
    
    // Process each entry individually - only show entries that fall in the visible week
    timetableData.entries.forEach((entry: any) => {
      if (!entry.date) {
        // Skip recurring entries for now - we only want date-specific entries
        return
      }
      
      // Check if this entry's date falls within the current visible week
      // Use UTC methods to avoid timezone issues
      const entryDate = new Date(entry.date)
      entryDate.setUTCHours(0, 0, 0, 0)
      const weekStart = new Date(currentWeekStart)
      weekStart.setUTCHours(0, 0, 0, 0)
      const weekEnd = new Date(currentWeekEnd)
      weekEnd.setUTCHours(23, 59, 59, 999)
      
      if (entryDate < weekStart || entryDate > weekEnd) {
        // This entry is not in the current visible week, skip it
        return
      }
      
      // Parse time slot to get start and end times
      const [startTime, endTime] = entry.timeSlot.name.split('-')
      const [startHour, startMin] = startTime.split(':').map(Number)
      const [endHour, endMin] = endTime.split(':').map(Number)
      
      // Create event for this specific date only
      const eventDate = new Date(entry.date)
      const start = new Date(eventDate)
      start.setHours(startHour, startMin, 0, 0)
      
      const end = new Date(eventDate)
      end.setHours(endHour, endMin, 0, 0)
      
      const eventId = `${entry.id}-${eventDate.toISOString().split('T')[0]}`
      
      // Check if this is a custom event or regular subject
      const isCustomEvent = !!entry.customEventTitle
      const eventTitle = isCustomEvent 
        ? entry.customEventTitle 
        : `${entry.subject?.name || 'Unknown Subject'} - ${entry.faculty?.name || 'No Faculty'}`
      
      // Check if this is a past date
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const eventDateOnly = new Date(eventDate)
      eventDateOnly.setHours(0, 0, 0, 0)
      
      const daysDifference = Math.floor((today.getTime() - eventDateOnly.getTime()) / (1000 * 60 * 60 * 24))
      const isPastDate = daysDifference > 30
      
      // Determine event styling
      let eventClassName = ''
      let backgroundColor = undefined
      let borderColor = undefined
      let textColor = undefined
      
      if (isPastDate) {
        eventClassName = 'bg-gray-400 text-gray-600 opacity-60 cursor-not-allowed'
        backgroundColor = '#9ca3af'
        borderColor = '#9ca3af'
        textColor = '#6b7280'
      } else if (isCustomEvent) {
        // Custom events get subtle styling
        backgroundColor = '#f8fafc'
        borderColor = '#e2e8f0'
        textColor = '#1e293b'
        eventClassName = 'font-medium'
      }
      
      allEvents.push({
        id: eventId,
        title: eventTitle,
        start,
        end,
        className: eventClassName,
        backgroundColor: backgroundColor,
        borderColor: borderColor,
        textColor: textColor,
        editable: !isPastDate,
        startEditable: !isPastDate,
        durationEditable: !isPastDate,
        extendedProps: {
          timetableEntryId: entry.id,
          batchId: entry.batchId,
          batchName: entry.batch.name,
          subjectId: entry.subjectId,
          subjectName: entry.subject?.name,
          subjectCode: entry.subject?.code,
          facultyId: entry.facultyId,
          facultyName: entry.faculty?.name,
          timeSlotId: entry.timeSlotId,
          timeSlotName: entry.timeSlot.name,
          dayOfWeek: entry.dayOfWeek,
          entryType: entry.entryType,
          credits: entry.subject?.credits,
          notes: entry.notes,
          isPastDate: isPastDate,
          isCustomEvent: isCustomEvent,
          customEventTitle: entry.customEventTitle,
          customEventColor: entry.customEventColor
        }
      })
    })
    
    console.log(`✅ Generated ${allEvents.length} calendar events for current week`)
    
    // Debug: Show events by date
    const eventsByDate = allEvents.reduce((acc, event) => {
      const date = event.start.toISOString().split('T')[0]
      if (!acc[date]) acc[date] = []
      acc[date].push(event.title)
      return acc
    }, {} as Record<string, string[]>)
    
    console.log('📅 Events by date:')
    Object.entries(eventsByDate).forEach(([date, titles]) => {
      console.log(`  ${date}: ${titles.length} events`)
      titles.slice(0, 3).forEach(title => console.log(`    - ${title}`))
      if (titles.length > 3) console.log(`    ... and ${titles.length - 3} more`)
    })
    return allEvents
    
  }, [timetableData, selectedDate])
  
  // DEBUG: Log what data we're actually getting
  React.useEffect(() => {
    if (timetableData?.entries) {
      const allDates = [...new Set(timetableData.entries.map((entry: any) => 
        entry.date ? new Date(entry.date).toDateString() : 'NO DATE'
      ))].sort()
      
      console.log('📋 RAW DATA FROM API:')
      console.log('   Total entries:', timetableData.entries.length)
      console.log('   Unique dates:', allDates)
      console.log('   First 5 entries:')
      timetableData.entries.slice(0, 5).forEach((entry: any, i: number) => {
        console.log(`     ${i + 1}. ${entry.subject?.name} - ${entry.dayOfWeek} ${entry.date ? new Date(entry.date).toDateString() : 'NO DATE'} at ${entry.timeSlot?.name}`)
      })
    }
  }, [timetableData])

  // Fetch real subjects data for quick creation
  const { data: subjectsData, error: subjectsError, isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects-for-creation', selectedBatchId],
    queryFn: async () => {
      if (!selectedBatchId) return []
      const response = await fetch(`/api/subjects?batchId=${selectedBatchId}&include=primaryFaculty`, {
        credentials: 'include'
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch subjects`)
      const data = await response.json()
      return data
    },
    enabled: !!selectedBatchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  })

  // Track subjects query state for debugging if needed

  // Fetch time slots to get correct IDs
  const { data: timeSlotsData } = useQuery({
    queryKey: ['timeslots-for-creation'],
    queryFn: async () => {
      const response = await fetch('/api/timeslots?active=true')
      if (!response.ok) throw new Error('Failed to fetch time slots')
      const data = await response.json()
      return data
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  // Transform subjects data for quick creation popup
  const realSubjects = React.useMemo(() => {
    if (!subjectsData || !Array.isArray(subjectsData)) {
      return []
    }
    
    const transformed = subjectsData.map((subject: any) => ({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      credits: subject.credits,
      facultyId: subject.primaryFacultyId || subject.primaryFaculty?.id,
      facultyName: subject.primaryFaculty?.user?.name || subject.primaryFaculty?.name || 'No Faculty Assigned'
    }))
    
    return transformed
  }, [subjectsData])

  const handleEventClick = (event: CalendarEvent) => {
    // Check if this is a past event
    if (event.extendedProps?.isPastDate) {
      toast.info('📅 This is a past class. Historical records cannot be modified.')
      return
    }
    
    toast.info(`Clicked: ${event.extendedProps?.subjectName} - ${event.extendedProps?.facultyName}`)
  }

  const handleEventEdit = (event: CalendarEvent) => {
    // Check if this is a past event
    if (event.extendedProps?.isPastDate) {
      toast.info('📅 Past classes cannot be edited.')
      return
    }
    
    toast.info(`Edit: ${event.extendedProps?.subjectName}`)
  }

  const handleEventCreate = (date: Date, timeSlot?: string) => {
    setSelectedDate(date)
    setIsCreateModalOpen(true)
  }

  const handleQuickCreate = async (data: {
    subjectId: string
    facultyId: string
    date: Date
    timeSlot: string
  }) => {
    try {
      // Map day of week
      const dayOfWeekMap = {
        0: 'SUNDAY',
        1: 'MONDAY', 
        2: 'TUESDAY',
        3: 'WEDNESDAY',
        4: 'THURSDAY',
        5: 'FRIDAY',
        6: 'SATURDAY'
      }
      const dayOfWeek = dayOfWeekMap[data.date.getDay() as keyof typeof dayOfWeekMap]
      
      // Map time slot names to actual IDs from database
      let timeSlotId = null
      const timeSlotsList = timeSlotsData?.timeSlots || timeSlotsData
      if (timeSlotsList && Array.isArray(timeSlotsList)) {
        const timeSlot = timeSlotsList.find((ts: any) => ts.name === data.timeSlot)
        timeSlotId = timeSlot?.id
        // Time slot found and mapped successfully
      }
      
      if (!timeSlotId) {
        throw new Error(`Time slot "${data.timeSlot}" not found or is inactive`)
      }
      
      const createData = {
        batchId: selectedBatchId || '',
        subjectId: data.subjectId,
        facultyId: data.facultyId,
        timeSlotId: timeSlotId,
        dayOfWeek: dayOfWeek,
        entryType: 'REGULAR',
        date: data.date.toISOString().split('T')[0] // Format as YYYY-MM-DD
      }
      
      // Creating timetable entry
      
      const response = await fetch('/api/timetable/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      })
      
      // API request sent
      
      if (!response.ok) {
        const errorText = await response.text()
        let error
        try {
          error = JSON.parse(errorText)
        } catch {
          error = { message: errorText }
        }
        throw new Error(error.message || `Failed to create timetable entry (${response.status})`)
      }
      
      const result = await response.json()
      toast.success('Class created successfully!')
      
      // Refetch the timetable data to show the new event
      refetch()
    } catch (error) {
      console.error('Error creating class:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create class')
    }
  }

  const handleEventDrop = async (eventId: string, newDate: Date, newTimeSlot: string, newDayOfWeek: string) => {
    try {
      
      // Check if this is a sample event (sample events have simple numeric IDs)
      if (eventId === "1" || eventId === "2" || eventId === "3" || eventId.length < 10) {
        toast.info('📋 Nice! Drag and drop is working. This is sample data, so changes won\'t save. Create real classes to persist changes.')
        return
      }
      
      // Find the event to check if it's a past event
      const event = events.find(e => e.id === eventId)
      if (event?.extendedProps?.isPastDate) {
        toast.error('📅 Past classes cannot be moved.')
        return
      }
      
      // Extract the base timetable entry ID from the event ID
      // Event IDs for recurring events are formatted as "entryId-YYYY-MM-DD"
      const baseEntryId = eventId.includes('-202') ? eventId.split('-202')[0] : eventId
      
      const requestBody = {
        dayOfWeek: newDayOfWeek,
        timeSlotName: newTimeSlot,
      }
      
      // Update the timetable entry via API
      const response = await fetch(`/api/timetable/entries/${baseEntryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const responseText = await response.text()
      
      if (!response.ok) {
        let errorData = {}
        try {
          errorData = JSON.parse(responseText)
        } catch {
          errorData = { error: `HTTP ${response.status}: ${responseText}` }
        }
        // API Error occurred
        
        // Show user-friendly conflict messages
        if (response.status === 409 && (errorData as any).conflicts) {
          const conflict = (errorData as any).conflicts[0]
          if (conflict.type === 'FACULTY_CONFLICT') {
            const facultyName = conflict.details[0]?.subject?.name || 'another subject'
            throw new Error(`Faculty is already teaching ${facultyName} at this time. Please choose a different time slot.`)
          } else if (conflict.type === 'BATCH_CONFLICT') {
            const subjectName = conflict.details[0]?.subject?.name || 'another class'
            throw new Error(`This batch already has ${subjectName} scheduled at this time. Please choose a different time slot.`)
          }
        }
        
        throw new Error((errorData as any).error || `Failed to update timetable entry (${response.status})`)
      }

      const result = JSON.parse(responseText)

      // Refresh the timetable data
      refetch()
      toast.success('Class moved successfully!')
    } catch (error) {
      console.error('Error moving class:', error)
      toast.error(`Failed to move class: ${(error as Error).message}`)
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

  // Show delete confirmation modal or directly delete if skipping confirmation
  const handleEventDelete = (eventId: string) => {
    
    // Check if this is a sample event
    if (eventId === "1" || eventId === "2" || eventId === "3" || eventId.length < 10) {
      toast.info('📋 This is sample data and cannot be deleted. Create real classes to enable deletion.')
      return
    }

    // Find the event
    const event = events.find(e => e.id === eventId)
    if (!event) return

    // Check if the event is in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today
    const eventDate = new Date(event.start)
    eventDate.setHours(0, 0, 0, 0)
    
    if (eventDate < today) {
      toast.error('⏰ Cannot delete timetable entries for past dates. Past classes cannot be modified.')
      return
    }

    // If user has chosen to skip confirmation, delete directly
    if (skipDeleteConfirmation) {
      setEventToDelete(event)
      confirmEventDelete()
    } else {
      // Show confirmation modal
      setEventToDelete(event)
      setIsDeleteModalOpen(true)
    }
  }

  // Actually delete the timetable entry
  const confirmEventDelete = async (dontAskAgain: boolean = false) => {
    if (!eventToDelete) return

    // Save "don't ask again" preference to session storage
    if (dontAskAgain) {
      sessionStorage.setItem('skipDeleteConfirmation', 'true')
      setSkipDeleteConfirmation(true)
    }
    
    try {
      setIsDeleting(true)
      
      // Extract the base timetable entry ID from the event ID
      // Event IDs are formatted as "entryId-YYYY-MM-DD"
      console.log(`🔍 Parsing event ID for deletion: ${eventToDelete.id}`)
      
      let baseEntryId = eventToDelete.id
      let specificDate = null
      
      // Use a more robust approach: look for ISO date pattern at the end
      const datePattern = /(\d{4}-\d{2}-\d{2})$/
      const dateMatch = eventToDelete.id.match(datePattern)
      
      if (dateMatch) {
        specificDate = dateMatch[1]
        // Remove the date part (including the hyphen before it) to get the base entry ID
        baseEntryId = eventToDelete.id.replace(`-${specificDate}`, '')
        console.log(`✅ Date-specific entry: ${specificDate}, base ID: ${baseEntryId}`)
      } else {
        console.log(`🔄 Recurring entry (no date): ID: ${baseEntryId}`)
      }
      
      // Build the delete URL
      let deleteUrl = `/api/timetable/entries/${baseEntryId}`
      if (specificDate) {
        deleteUrl += `?date=${specificDate}`
      }
      
      console.log(`🌐 Sending DELETE request to: ${deleteUrl}`)

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
      })
      
      console.log(`📡 DELETE response status: ${response.status}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete' }))
        throw new Error(errorData.error || `Failed to delete class (${response.status})`)
      }

      const result = await response.json()
      
      // Invalidate and refetch the timetable data to get fresh data
      queryClient.invalidateQueries({ queryKey: ['timetable-entries'] })
      queryClient.removeQueries({ queryKey: ['timetable-entries'] }) // Force remove cached data
      await refetch()
      
      // Force calendar re-render
      setForceRefreshKey(Date.now())
      
      // Show appropriate success message
      if (result.converted_to_specific) {
        toast.success(`Class deleted for this date. Converted recurring pattern to ${result.entries_created} individual entries.`)
      } else {
        toast.success('Class deleted successfully!')
      }
    } catch (error) {
      console.error('Error deleting class:', error)
      toast.error(`Failed to delete class: ${(error as Error).message}`)
    } finally {
      setIsDeleting(false)
      setEventToDelete(null)
    }
  }

  const handleFiltersChange = (newFilters: TimetableFilters) => {
    // For now, we only support batch filtering from the main selector
    // Additional filters can be implemented here if needed
  }

  const handleViewStateChange = (viewState: any) => {
    console.log(`📆 Calendar view state changed:`, viewState)
    setCurrentView(viewState.view)
    // Update selected date when view date changes (for month navigation)
    if (viewState.currentDate && viewState.currentDate !== selectedDate) {
      console.log(`📅 Updating selected date from ${selectedDate.toDateString()} to ${viewState.currentDate.toDateString()}`)
      setSelectedDate(viewState.currentDate)
    }
  }

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId)
    // Save selected batch to localStorage
    localStorage.setItem('selectedBatchId', batchId)
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
                      <span className="font-medium truncate">
                        {formatBatchDisplay(selectedBatch)}
                      </span>
                    ) : (
                      "Select batch..."
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {batchesData?.map((batch: any) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          {formatBatchDisplay(batch)}
                        </span>
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
            {skipDeleteConfirmation && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  sessionStorage.removeItem('skipDeleteConfirmation')
                  setSkipDeleteConfirmation(false)
                  toast.info('Delete confirmations re-enabled')
                }}
                className="text-xs"
              >
                Re-enable delete confirmations
              </Button>
            )}
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
        ) : (
          <FullCalendar
            key={`calendar-${events.length}-${forceRefreshKey}-${timetableData?.entries?.[0]?.updatedAt || 'none'}`}
            events={events}
            initialView={currentView}
            initialDate={selectedDate}
            batchId={selectedBatchId}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onEventClick={handleEventClick}
            onEventEdit={handleEventEdit}
            onEventCreate={handleEventCreate}
            onQuickCreate={handleQuickCreate}
            onEventDrop={handleEventDrop}
            onEventDelete={handleEventDelete}
            onViewStateChange={handleViewStateChange}
            onCheckConflicts={checkConflicts}
            subjects={realSubjects}
            timeSlots={timeSlotsData?.timeSlots || timeSlotsData || []}
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setEventToDelete(null)
        }}
        onConfirm={(dontAskAgain) => confirmEventDelete(dontAskAgain)}
        event={eventToDelete}
        isDeleting={isDeleting}
      />
    </div>
  )
}