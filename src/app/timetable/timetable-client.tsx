"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
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

// Fetch holidays for calendar display
async function fetchHolidays() {
  const response = await fetch('/api/holidays', {
    credentials: 'include'
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch holidays' }))
    throw new Error(error.message || 'Failed to fetch holidays')
  }

  const data = await response.json()
  return data
}

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

  const response = await fetch(`/api/timetable/entries?${searchParams.toString()}`, {
    credentials: 'include'
  })
  
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
      editable: true, // All events are editable - past date restriction removed
      startEditable: true, // All events can be moved in time
      durationEditable: true, // All events can have duration changed
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
        editable: true, // All events are editable - past date restriction removed
        startEditable: true, // All events can be moved in time
        durationEditable: true, // All events can have duration changed
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
  const hasInitializedBatch = useRef(false)

  // Initialize "don't ask again" state from session storage
  useEffect(() => {
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
  const filters = useMemo(() => {
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
    enabled: !!session?.user && !!selectedBatchId,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache data
    refetchOnMount: true,
    refetchOnWindowFocus: true
  })

  // Fetch holidays
  const { 
    data: holidaysData,
    isLoading: isLoadingHolidays,
    error: holidaysError
  } = useQuery({
    queryKey: ['holidays'],
    queryFn: fetchHolidays,
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000, // Cache holidays for 5 minutes
  })

  // Holidays are ready for display
  const hasHolidays = holidaysData && holidaysData.length > 0



  // Format batch display text
  const formatBatchDisplay = useCallback((batch: any) => {
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

  // Convert entries to calendar events - INCLUDES HOLIDAYS
  const events: CalendarEvent[] = useMemo(() => {
    
    
    // Get the current visible week range for timetable entries
    const currentWeekStart = new Date(selectedDate)
    currentWeekStart.setDate(selectedDate.getDate() - selectedDate.getDay()) // Start of week (Sunday)
    const currentWeekEnd = new Date(currentWeekStart)
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6) // End of week (Saturday)
    
    // Get broader date range for holidays (current month ± 6 months)
    const currentMonth = new Date(selectedDate)
    const rangeStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 6, 1)
    const rangeEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 6, 31)
    
    
    const allEvents: CalendarEvent[] = []

    // First, add holiday events that fall in the broader range
    if (holidaysData && holidaysData.length > 0) {
      holidaysData.forEach((holiday: any) => {
        const holidayDate = new Date(holiday.date)
        holidayDate.setUTCHours(0, 0, 0, 0)
        
        // Show all holidays in the broader range, not just current week
        if (holidayDate >= rangeStart && holidayDate <= rangeEnd) {
          // Get holiday type display name
          const getHolidayTypeLabel = (type: string) => {
            const typeMap: { [key: string]: string } = {
              'NATIONAL': 'National',
              'UNIVERSITY': 'University', 
              'DEPARTMENT': 'Department',
              'LOCAL': 'Local',
              'FESTIVAL': 'Festival'
            }
            return typeMap[type] || type
          }
          
          // Create all-day holiday event
          const holidayEvent: CalendarEvent = {
            id: `holiday-${holiday.id}`,
            title: `${holiday.name} (${getHolidayTypeLabel(holiday.type)})`,
            start: new Date(holiday.date),
            end: new Date(holiday.date),
            allDay: true,
            className: 'holiday-event',
            backgroundColor: '#ef4444', // Red background for holidays
            borderColor: '#dc2626',
            textColor: '#ffffff',
            editable: false,
            startEditable: false,
            durationEditable: false,
            extendedProps: {
              type: holiday.type,
              holidayId: holiday.id,
              holidayName: holiday.name,
              holidayDescription: holiday.description
            }
          }
          allEvents.push(holidayEvent)
        }
      })
    }
    
    // Process timetable entries - only show entries that fall in the visible week
    if (timetableData?.entries && timetableData.entries.length > 0) {
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
        editable: true, // All events are editable - past date restriction removed
        startEditable: true, // All events can be moved in time
        durationEditable: true, // All events can have duration changed
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
    }
    
    return allEvents
    
  }, [timetableData, holidaysData, selectedDate])
  
  // DEBUG: Log what data we're actually getting
  useEffect(() => {
    if (timetableData?.entries) {
      const allDates = [...new Set(timetableData.entries.map((entry: any) => 
        entry.date ? new Date(entry.date).toDateString() : 'NO DATE'
      ))].sort()
      
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
  const realSubjects = useMemo(() => {
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
    // Allow editing all events - past date restriction removed
    
    // Only show toast if we have valid subject and faculty names
    const subjectName = event.extendedProps?.subjectName
    const facultyName = event.extendedProps?.facultyName
    
    if (subjectName && facultyName) {
      toast.info(`Clicked: ${subjectName} - ${facultyName}`)
    }
  }

  const handleEventEdit = (event: CalendarEvent) => {
    // Allow editing all events - past date restriction removed
    
    toast.info(`Edit: ${event.extendedProps?.subjectName}`)
  }

  const handleEventCreate = (date: Date, timeSlot?: string) => {
    setSelectedDate(date)
    setIsCreateModalOpen(true)
  }

  const handleQuickCreate = async (data: {
    subjectId?: string
    facultyId?: string
    date: Date
    timeSlot: string
    customEventTitle?: string
    customEventColor?: string
    isCustomEvent?: boolean
    isHoliday?: boolean
    holidayName?: string
    holidayType?: string
    holidayDescription?: string
  }) => {
    try {
      // Handle holidays separately
      if (data.isHoliday) {
        const holidayData = {
          name: data.holidayName!,
          date: `${data.date.getFullYear()}-${String(data.date.getMonth() + 1).padStart(2, '0')}-${String(data.date.getDate()).padStart(2, '0')}`, // Format as YYYY-MM-DD without timezone conversion
          type: data.holidayType!,
          description: data.holidayDescription || '',
          isRecurring: false,
          departmentId: null // University-wide holiday
        }
        
        console.log('Sending holiday data:', holidayData)
        
        const response = await fetch('/api/holidays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(holidayData),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('Holiday creation failed:', errorData)
          
          // Handle validation errors more gracefully
          if (errorData.details && Array.isArray(errorData.details)) {
            const validationErrors = errorData.details.map((err: any) => err.message).join(', ')
            throw new Error(`Validation failed: ${validationErrors}`)
          }
          
          throw new Error(errorData.error || 'Failed to create holiday')
        }
        
        const result = await response.json()
        toast.success(`🎊 Holiday "${data.holidayName}" created successfully!`)
        
        // Refresh both timetable and holiday data
        refetch()
        queryClient.invalidateQueries({ queryKey: ['holidays'] })
        return
      }

      // Handle timetable entries (subjects and custom events)
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
      
      console.log('🔍 Quick Create Debug:');
      console.log('Selected Date:', data.date);
      console.log('Date String:', data.date.toDateString());
      console.log('Day of Week:', dayOfWeek);
      console.log('Time Slot:', data.timeSlot);
      
      // Debug the date formatting
      const formattedDate = `${data.date.getFullYear()}-${String(data.date.getMonth() + 1).padStart(2, '0')}-${String(data.date.getDate()).padStart(2, '0')}`;
      console.log('📅 Formatted Date (what we send to API):', formattedDate);
      console.log('⚠️ Original toISOString would have been:', data.date.toISOString().split('T')[0]);
      
      // Map time slot names to actual IDs from database
      let timeSlotId = null
      const timeSlotsList = timeSlotsData?.timeSlots || timeSlotsData
      if (timeSlotsList && Array.isArray(timeSlotsList)) {
        const timeSlot = timeSlotsList.find((ts: any) => ts.name === data.timeSlot)
        timeSlotId = timeSlot?.id
      }
      
      if (!timeSlotId) {
        throw new Error(`Time slot "${data.timeSlot}" not found or is inactive`)
      }
      
      let createData: any = {
        batchId: selectedBatchId || '',
        timeSlotId: timeSlotId,
        dayOfWeek: dayOfWeek,
        entryType: 'REGULAR',
        date: `${data.date.getFullYear()}-${String(data.date.getMonth() + 1).padStart(2, '0')}-${String(data.date.getDate()).padStart(2, '0')}` // Format as YYYY-MM-DD without timezone conversion
      }

      // Add fields based on whether it's a custom event or regular subject
      if (data.isCustomEvent) {
        createData.customEventTitle = data.customEventTitle!
        createData.customEventColor = data.customEventColor
        createData.isCustomEvent = true
        createData.subjectId = null
        createData.facultyId = data.facultyId || null // Optional faculty for custom events
      } else {
        createData.subjectId = data.subjectId!
        createData.facultyId = data.facultyId!
      }
      
      console.log('📤 Sending to API:', createData);
      
      const response = await fetch('/api/timetable/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
      
      // Allow moving all events - past date restriction removed
      
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
        credentials: 'include',
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
      
      const response = await fetch(`/api/timetable/conflicts?${params.toString()}`, {
        credentials: 'include'
      })
      
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
    
    // Allow deleting all events - past date restriction removed

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
      
      let baseEntryId = eventToDelete.id
      let specificDate = null
      
      // Use a more robust approach: look for ISO date pattern at the end
      const datePattern = /(\d{4}-\d{2}-\d{2})$/
      const dateMatch = eventToDelete.id.match(datePattern)
      
      if (dateMatch) {
        specificDate = dateMatch[1]
        // Remove the date part (including the hyphen before it) to get the base entry ID
        baseEntryId = eventToDelete.id.replace(`-${specificDate}`, '')
      }
      
      // Build the delete URL
      let deleteUrl = `/api/timetable/entries/${baseEntryId}`
      if (specificDate) {
        deleteUrl += `?date=${specificDate}`
      }
      

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        credentials: 'include',
      })
      

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete' }))
        throw new Error(errorData.error || `Failed to delete class (${response.status})`)
      }

      const result = await response.json()
      
      // Invalidate and refetch the timetable data to get fresh data
      queryClient.invalidateQueries({ queryKey: ['timetable-entries'] })
      queryClient.removeQueries({ queryKey: ['timetable-entries'] }) // Force remove cached data
      
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
    setCurrentView(viewState.view)
    // Update selected date when view date changes (for month navigation)
    if (viewState.currentDate && viewState.currentDate !== selectedDate) {
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
        onSuccess={(newEntry: any) => {
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