"use client"

import React, { memo, useState, useEffect, useMemo, useRef } from 'react'
import { CalendarEvent, CalendarView } from '@/types/timetable'
import { format, startOfWeek, addDays } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Plus, Clock, User, ChevronLeft, ChevronRight, Filter, GripVertical, X, Calendar, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { QuickCreatePopup } from './quick-create-popup'
import { TimetableEntryContextMenu } from './timetable-entry-context-menu'
import { CustomHolidayMenu } from './custom-holiday-menu'
import { 
  fetchAttendanceStatus, 
  mergeAttendanceWithEvents, 
  getAttendanceHeatmapColor, 
  getAttendanceDotColor 
} from '@/lib/utils/attendance-status'

interface TraditionalTimetableViewProps {
  date: Date
  events: CalendarEvent[]
  batchId?: string
  session?: any
  onEventClick?: (event: CalendarEvent) => void
  onEventCreate?: (date: Date, timeSlot?: string) => void
  onQuickCreate?: (data: {
    subjectId?: string
    facultyId?: string
    date: Date
    timeSlot: string
    customEventTitle?: string
    customEventColor?: string
    isCustomEvent?: boolean
    requiresAttendance?: boolean
    isHoliday?: boolean
    holidayName?: string
    holidayType?: string
    holidayDescription?: string
  }) => void
  subjects?: Array<{
    id: string
    name: string
    code: string
    credits: number
    facultyId: string
    facultyName: string
  }>
  timeSlots?: Array<{
    id: string
    name: string
    startTime: string
    endTime: string
    duration: number
    isActive: boolean
    sortOrder: number
  }>
  onEventDrop?: (eventId: string, newDate: Date, newTimeSlot: string, newDayOfWeek: string) => void
  onEventDelete?: (eventId: string) => void
  className?: string
  viewTitle?: string
  onPrevious?: () => void
  onNext?: () => void
  onToday?: () => void
  onViewChange?: (view: CalendarView) => void
  currentView?: CalendarView
  onDateSelect?: (date: Date) => void
  onFiltersToggle?: () => void
  showFilters?: boolean
  onCheckConflicts?: (facultyId: string, dayOfWeek: string, timeSlot: string, excludeEventId?: string) => Promise<boolean>
  onRefresh?: () => void
}

// Default time slots matching database
const DEFAULT_TIME_SLOTS = [
  { time: "10:15-11:05", label: "10:15 AM", endTime: "11:05" },
  { time: "11:15-12:05", label: "11:15 AM", endTime: "12:05" },
  { time: "12:15-13:05", label: "12:15 PM", endTime: "13:05" },
  { time: "14:15-15:05", label: "2:15 PM", endTime: "15:05" },
]

const WEEKDAYS = [
  { key: 'MONDAY', label: 'Monday', short: 'Mon' },
  { key: 'TUESDAY', label: 'Tuesday', short: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wednesday', short: 'Wed' },
  { key: 'THURSDAY', label: 'Thursday', short: 'Thu' },
  { key: 'FRIDAY', label: 'Friday', short: 'Fri' },
]

export const TraditionalTimetableView = memo(function TraditionalTimetableView({
  date,
  events,
  batchId,
  session,
  onEventClick,
  onEventCreate,
  onQuickCreate,
  subjects = [],
  timeSlots = [],
  onEventDrop,
  onEventDelete,
  className,
  viewTitle,
  onPrevious,
  onNext,
  onToday,
  onViewChange,
  currentView,
  onDateSelect,
  onFiltersToggle,
  showFilters,
  onCheckConflicts,
  onRefresh
}: TraditionalTimetableViewProps) {
  const [activeEvent, setActiveEvent] = React.useState<CalendarEvent | null>(null)
  const [conflictCache, setConflictCache] = React.useState<Record<string, boolean>>({})
  const [isLoadingConflicts, setIsLoadingConflicts] = React.useState(false)
  const [eventsWithAttendance, setEventsWithAttendance] = React.useState<CalendarEvent[]>(events)
  const [isLoadingAttendance, setIsLoadingAttendance] = React.useState(false)
  
  // State for popup management
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')
  const [selectedDay, setSelectedDay] = useState<string>('')
  
  // Configure drag sensors with movement threshold
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before drag starts
      },
    })
  )
  
  
  // Calculate week dates
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }) // Monday = 1
  const weekDays = WEEKDAYS.map((day, index) => ({
    ...day,
    date: addDays(weekStart, index),
    dayNumber: format(addDays(weekStart, index), 'd'),
    fullDate: addDays(weekStart, index)
  }))
  
  
  // Use dynamic time slots with fallback to default
  const activeTimeSlots = React.useMemo(() => {
    if (timeSlots.length > 0) {
      return timeSlots
        .filter(ts => ts.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(ts => ({
          time: ts.name,
          label: ts.startTime,
          endTime: ts.endTime,
          id: ts.id
        }))
    }
    return DEFAULT_TIME_SLOTS
  }, [timeSlots])

  // Fetch attendance status when events change
  React.useEffect(() => {
    const loadAttendanceStatus = async () => {
      if (events.length === 0) {
        setEventsWithAttendance([])
        return
      }

      setIsLoadingAttendance(true)
      try {
        console.log('🎉 Loading attendance for events:', events.map(e => ({
          id: e.id,
          title: e.title,
          start: e.start ? (e.start instanceof Date ? e.start.toDateString() : new Date(e.start).toDateString()) : 'No start',
          batchId: e.extendedProps?.batchId?.slice(-8),
          subjectId: e.extendedProps?.subjectId?.slice(-8)
        })));
        
        const attendanceStatus = await fetchAttendanceStatus(events)
        
        console.log('📊 Received attendance status:', attendanceStatus.map(s => ({
          entryId: s.timetableEntryId,
          isMarked: s.isMarked,
          percentage: s.attendancePercentage,
          count: `${s.presentStudents}/${s.totalStudents}`
        })));
        
        const eventsWithAttendanceData = mergeAttendanceWithEvents(events, attendanceStatus)
        setEventsWithAttendance(eventsWithAttendanceData)
      } catch (error) {
        console.error('Failed to load attendance status:', error)
        setEventsWithAttendance(events) // Fallback to events without attendance data
      } finally {
        setIsLoadingAttendance(false)
      }
    }

    loadAttendanceStatus()
  }, [events])

  // Preload conflicts when activeEvent changes
  React.useEffect(() => {
    if (!activeEvent || !onCheckConflicts) return
    
    const loadConflicts = async () => {
      setIsLoadingConflicts(true)
      const facultyId = activeEvent.extendedProps?.facultyId
      if (!facultyId) return
      
      // Check all time slots and days for conflicts
      const conflictPromises: Promise<void>[] = []
      
      for (const day of WEEKDAYS) {
        for (const timeSlot of activeTimeSlots) {
          const cacheKey = `${facultyId}-${day.key}-${timeSlot.time}-${activeEvent.id}`
          
          // Skip if already cached
          if (conflictCache[cacheKey] !== undefined) continue
          
          conflictPromises.push(
            onCheckConflicts(facultyId, day.key, timeSlot.time, activeEvent.id)
              .then(hasConflict => {
                setConflictCache(prev => ({ ...prev, [cacheKey]: hasConflict }))
              })
              .catch(error => {
                console.error('Error checking conflict:', error)
                setConflictCache(prev => ({ ...prev, [cacheKey]: false }))
              })
          )
        }
      }
      
      await Promise.all(conflictPromises)
      setIsLoadingConflicts(false)
    }
    
    loadConflicts()
  }, [activeEvent, onCheckConflicts, conflictCache, activeTimeSlots])
  
  // Check if dropping an event to a specific slot would cause conflicts
  const checkDropConflict = (draggedEvent: CalendarEvent, targetDayKey: string, targetTimeSlot: string) => {
    if (!draggedEvent) return null
    
    const cacheKey = `${draggedEvent.extendedProps?.facultyId}-${targetDayKey}-${targetTimeSlot}-${draggedEvent.id}`
    
    // Check cache first for API-based conflict detection
    if (onCheckConflicts && conflictCache[cacheKey] !== undefined) {
      return conflictCache[cacheKey] ? {
        type: 'FACULTY_CONFLICT',
        message: `${draggedEvent.extendedProps?.facultyName} is already teaching another class at this time`,
        conflictingEvent: null
      } : null
    }
    
    // Fallback to local conflict detection
    return checkLocalConflict(draggedEvent, targetDayKey, targetTimeSlot)
  }
  
  // Fallback local conflict detection (only checks current batch events)
  const checkLocalConflict = (draggedEvent: CalendarEvent, targetDayKey: string, targetTimeSlot: string) => {
    if (!draggedEvent) return null
    
    // Find the actual date for this dayKey in the current week
    const dayData = weekDays.find(day => day.key === targetDayKey)
    if (!dayData) return null
    
    // Find any event already in the target slot (in current view)
    const existingEvent = eventsWithAttendance.find(event => {
      if (event.id === draggedEvent.id) return false // Don't conflict with self
      
      // Check if the event is on the same date as the target slot
      const eventDateStr = event.start.toDateString()
      const slotDateStr = dayData.fullDate.toDateString()
      
      return eventDateStr === slotDateStr &&
        event.extendedProps?.timeSlotName === targetTimeSlot
    })
    
    if (!existingEvent) return null
    
    // Check if it's the same faculty
    if (existingEvent.extendedProps?.facultyId === draggedEvent.extendedProps?.facultyId) {
      return {
        type: 'FACULTY_CONFLICT',
        message: `${draggedEvent.extendedProps?.facultyName} is already teaching ${existingEvent.extendedProps?.subjectName} at this time`,
        conflictingEvent: existingEvent
      }
    }
    
    // Check if it's the same batch
    if (existingEvent.extendedProps?.batchId === draggedEvent.extendedProps?.batchId) {
      return {
        type: 'BATCH_CONFLICT', 
        message: `${draggedEvent.extendedProps?.batchName} already has ${existingEvent.extendedProps?.subjectName} at this time`,
        conflictingEvent: existingEvent
      }
    }
    
    return null
  }
  // Get events for a specific day and time slot
  const getEventForSlot = (dayKey: string, timeSlot: string) => {
    // Find the actual date for this dayKey in the current week
    const dayData = weekDays.find(day => day.key === dayKey)
    if (!dayData) return undefined
    
    return eventsWithAttendance.find(event => {
      // Check if the event is on the same date as this slot
      const eventDateStr = event.start.toDateString()
      const slotDateStr = dayData.fullDate.toDateString()
      
      return eventDateStr === slotDateStr &&
        event.extendedProps?.timeSlotName === timeSlot
    })
  }

  const handleEventClick = (event: CalendarEvent) => {
    // Check if this is a regular click (not part of drag operation)
    if (onEventClick) {
      onEventClick(event)
    }
    
    // Add direct navigation to attendance marking
    const subjectId = event.extendedProps?.subjectId
    const batchId = event.extendedProps?.batchId
    
    if (subjectId && batchId) {
      // Navigate to attendance page with pre-selected batch and subject in same tab
      const today = new Date().toISOString().split('T')[0]
      const attendanceUrl = `/attendance?batch=${batchId}&subject=${subjectId}&date=${today}`
      
      // Navigate in same page for native feel
      window.location.href = attendanceUrl
    }
  }

  const handleSlotClick = (dayKey: string, timeSlot: string, event?: React.MouseEvent) => {
    console.log('🎯 handleSlotClick called:', {
      dayKey,
      timeSlot,
      clickX: event?.clientX,
      clickY: event?.clientY,
      targetElement: event?.target
    });
    
    if (onQuickCreate && event) {
      // Use the new popup system
      console.log('📍 Setting popup position and opening popup');
      setPopupPosition({ x: event.clientX, y: event.clientY })
      setSelectedTimeSlot(timeSlot)
      setSelectedDay(dayKey)
      setIsPopupOpen(true)
    } else if (onEventCreate) {
      // Fallback to the old modal system
      const dayIndex = WEEKDAYS.findIndex(d => d.key === dayKey)
      const clickDate = new Date(date)
      clickDate.setDate(clickDate.getDate() - clickDate.getDay() + 1 + dayIndex) // Monday = 1
      onEventCreate(clickDate, timeSlot)
    }
  }

  const handlePopupClose = () => {
    setIsPopupOpen(false)
    setSelectedTimeSlot('')
    setSelectedDay('')
  }

  const handleQuickCreate = (data: {
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
    if (onQuickCreate) {
      // Pass all data to parent - let parent handle different types of events
      onQuickCreate(data)
    }
    setIsPopupOpen(false)
    setSelectedTimeSlot('')
    setSelectedDay('')
  }

  const handleDragStart = (event: DragStartEvent) => {
    const draggedEvent = eventsWithAttendance.find(e => e.id === event.active.id)
    setActiveEvent(draggedEvent || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || !onEventDrop) {
      setActiveEvent(null)
      return
    }

    const eventId = active.id as string
    const dropTarget = over.id as string
    
    // Find the dragged event
    const draggedEvent = eventsWithAttendance.find(e => e.id === eventId)
    if (!draggedEvent) {
      setActiveEvent(null)
      return
    }

    // Parse drop target: "DAYKEY-TIMESLOT" format (e.g., "MONDAY-10:15-11:05")
    // Split only on the first dash to separate day from time slot
    const dashIndex = dropTarget.indexOf('-')
    if (dashIndex === -1) {
      setActiveEvent(null)
      return
    }
    
    const dayKey = dropTarget.substring(0, dashIndex)
    const timeSlot = dropTarget.substring(dashIndex + 1)
    
    if (dayKey && timeSlot) {
      // Check for conflicts before attempting the move
      const conflict = checkDropConflict(draggedEvent, dayKey, timeSlot)
      if (conflict) {
        // Show user-friendly error message
        if (onEventClick) {
          // Use a toast or alert here instead of console.log
          // Cannot move class due to conflict
        }
        setActiveEvent(null)
        return
      }
      
      // Calculate the new date using the weekDays array which has the correct dates
      const targetDay = weekDays.find(d => d.key === dayKey)
      if (!targetDay) {
        setActiveEvent(null)
        return
      }
      
      onEventDrop(eventId, targetDay.fullDate, timeSlot, dayKey)
    }
    
    setActiveEvent(null)
  }

  // Draggable Event Component
  const DraggableEvent = ({ event }: { event: CalendarEvent }) => {
    const isSampleEvent = event.id === "1" || event.id === "2" || event.id === "3" || event.id.length < 10
    const isPastDate = event.extendedProps?.isPastDate || false
    
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      isDragging,
    } = useDraggable({
      id: event.id,
      disabled: isPastDate || isSampleEvent, // Disable dragging for past dates and sample events
    })

    const style = {
      transform: CSS.Translate.toString(transform),
      backgroundColor: event.backgroundColor || undefined,
      borderColor: event.borderColor || undefined,
      color: event.textColor || undefined,
    }

    const handleMarkAttendance = (e: React.MouseEvent) => {
      e.stopPropagation() // Prevent card click from triggering
      
      const subjectId = event.extendedProps?.subjectId
      const batchId = event.extendedProps?.batchId
      
      if (subjectId && batchId) {
        // Use the event's actual date, not today's date
        const eventDate = event.start.toISOString().split('T')[0]
        const attendanceUrl = `/attendance?batch=${batchId}&subject=${subjectId}&date=${eventDate}`
        window.location.href = attendanceUrl
      }
    }

    return (
      <TimetableEntryContextMenu 
        event={event}
        canMarkAttendance={true}
        canEdit={!isPastDate && !isSampleEvent}
        canDelete={!isPastDate && !isSampleEvent}
        onDelete={onEventDelete ? () => onEventDelete(event.id) : undefined}
        onRefresh={onRefresh}
      >
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          className={cn(
            "p-3 h-full transition-all hover:shadow-md rounded-lg group relative",
            // Don't override backgroundColor/borderColor - let inline styles handle it
            !event.backgroundColor && "bg-muted/50 border border-border hover:bg-muted/70", // Only use fallback if no custom color
            isSampleEvent && "border-dashed border-orange-300 bg-orange-50/50",
            isPastDate && "opacity-75", // Subtle indication for past events but still interactive
            isDragging && "opacity-50 z-50"
          )}
          // onClick removed - no card click action needed
          title={
            isSampleEvent 
              ? "Sample data - you can drag but changes won't save" 
              : isPastDate
                ? "Past class - can be modified (restriction removed)"
                : "Drag to move this class"
          }
        >
        
        <div className="space-y-1 flex flex-col h-full">
          <div className="flex items-center gap-1">
            <div
              {...(isPastDate ? {} : listeners)}
              style={{ 
                cursor: isPastDate 
                  ? 'not-allowed' 
                  : isDragging 
                    ? 'grabbing' 
                    : 'grab' 
              }}
              className="flex-shrink-0 p-1 hover:bg-muted/50 rounded transition-colors"
              title={isPastDate ? "Cannot drag past events" : "Drag to move this class"}
            >
              <GripVertical className={cn(
                "h-3 w-3",
                isSampleEvent ? "text-orange-500" : isPastDate ? "text-gray-400" : "text-muted-foreground"
              )} />
            </div>
            <div className="font-semibold text-sm line-clamp-1">
              {event.extendedProps?.customEventTitle || event.extendedProps?.subjectName || event.extendedProps?.subjectCode || event.title}
            </div>
          </div>
          {event.extendedProps?.facultyName && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="line-clamp-1">{event.extendedProps?.facultyName}</span>
            </div>
          )}
          {event.extendedProps?.subjectCode && (
            <div className="text-xs text-muted-foreground">
              {event.extendedProps.subjectCode}
            </div>
          )}
          
          {/* Attendance Status Indicators */}
          <div className="flex-1 flex items-end justify-between">
            {/* Left side: Attendance status indicators */}
            <div className="flex items-center gap-1">
              {/* Attendance marked checkmark */}
              {event.extendedProps?.attendance?.isMarked ? (
                <div className="flex items-center gap-1">
                  <div className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-medium",
                    event.extendedProps.attendance.attendancePercentage >= 76 ? "bg-green-100 text-green-800" :
                    event.extendedProps.attendance.attendancePercentage >= 51 ? "bg-yellow-100 text-yellow-800" :
                    event.extendedProps.attendance.attendancePercentage >= 26 ? "bg-orange-100 text-orange-800" :
                    "bg-red-100 text-red-800"
                  )}>
                    {event.extendedProps.attendance.presentStudents}/{event.extendedProps.attendance.totalStudents}
                  </div>
                </div>
              ) : (
                event.extendedProps?.batchId && event.extendedProps?.subjectId ? (
                  <div className="flex items-center gap-1">
                    <div className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-gray-100 text-gray-600">
                      Not Marked
                    </div>
                  </div>
                ) : null
              )}
            </div>

            {/* Right side: Mark Attendance Button */}
            {/* Only show for admin or faculty teaching this subject, and not for custom events */}
            {(session?.user?.role === 'ADMIN' || 
              (session?.user?.role === 'FACULTY' && 
               event.extendedProps?.facultyId === session?.user?.id)) && 
               event.extendedProps?.type !== 'custom' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleMarkAttendance(e)
                }}
                className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors cursor-pointer"
                title="Mark Attendance"
              >
                Mark Attendance
              </button>
            )}
          </div>
          
          {/* Heat map bar at bottom */}
          {event.extendedProps?.attendance?.isMarked && (
            <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-lg overflow-hidden">
              <div 
                className={cn(
                  "h-full w-full opacity-80",
                  getAttendanceHeatmapColor(event.extendedProps.attendance.attendancePercentage)
                )}
              />
            </div>
          )}
        </div>
        
        </div>
      </TimetableEntryContextMenu>
    )
  }

  // Droppable Time Slot Component
  const DroppableTimeSlot = ({ dayKey, timeSlot }: { dayKey: string; timeSlot: string }) => {
    const event = getEventForSlot(dayKey, timeSlot)
    const conflict = activeEvent ? checkDropConflict(activeEvent, dayKey, timeSlot) : null
    const isValidDrop = !conflict && !event // No conflict and slot is empty
    
    // Check if this is the current slot of the dragged event
    const dayData = weekDays.find(day => day.key === dayKey)
    const isCurrentSlot = activeEvent && dayData ? 
      activeEvent.start.toDateString() === dayData.fullDate.toDateString() &&
      activeEvent.extendedProps?.timeSlotName === timeSlot : false
    
    const { isOver, setNodeRef } = useDroppable({
      id: `${dayKey}-${timeSlot}`,
      disabled: !!conflict || (!!event && !isCurrentSlot) // Disable if conflict or slot occupied (unless it's the current slot)
    })

    
    // Determine visual state
    const getSlotState = () => {
      if (isCurrentSlot) return 'current' // Currently dragged item's original slot
      if (conflict) return 'conflict' // Would cause conflict
      if (event) return 'occupied' // Already has an event
      if (activeEvent && isValidDrop) return 'valid' // Valid drop target
      if (activeEvent) return 'invalid' // Invalid for some reason
      return 'empty' // Normal empty slot
    }
    
    const slotState = getSlotState()

    return (
      <div
        ref={setNodeRef}
        className={cn(
          "h-full min-h-[100px] transition-all relative",
          // Base states
          slotState === 'current' && "bg-blue-50 border-2 border-blue-200 border-dashed rounded-lg",
          slotState === 'valid' && isOver && "bg-green-50 border-2 border-green-400 border-dashed rounded-lg",
          slotState === 'valid' && !isOver && activeEvent && "bg-green-50/50 border border-green-200 rounded-lg",
          slotState === 'conflict' && "bg-red-50 border border-red-200 rounded-lg opacity-50 cursor-not-allowed",
          slotState === 'invalid' && "opacity-50 cursor-not-allowed",
          slotState === 'occupied' && !isCurrentSlot && "opacity-75"
        )}
        title={
          conflict ? conflict.message :
          slotState === 'current' ? "Original position" :
          slotState === 'valid' ? "Drop here to move class" :
          ""
        }
      >
        {conflict && activeEvent && (
          <div className="absolute top-1 right-1 z-10">
            <div className="bg-red-500 text-white text-xs px-1 py-0.5 rounded">
              ⚠️
            </div>
          </div>
        )}
        
        {event ? (
          <DraggableEvent event={event} />
        ) : (
          <Button
            variant="ghost"
            className={cn(
              "w-full h-full border-2 border-dashed transition-colors",
              slotState === 'valid' ? "border-green-300 hover:border-green-400" :
              slotState === 'conflict' ? "border-red-300 cursor-not-allowed" :
              slotState === 'current' ? "border-blue-300" :
              "border-muted-foreground/25 hover:border-primary/50"
            )}
            onClick={(e) => handleSlotClick(dayKey, timeSlot, e)}
            disabled={slotState === 'conflict'}
            data-day={dayKey}
            data-timeslot={timeSlot}
            data-testid={`add-event-${dayKey}-${timeSlot}`}
          >
            {slotState === 'conflict' ? (
              <div className="text-red-500 text-xs text-center">
                <div>⚠️</div>
                <div>Conflict</div>
              </div>
            ) : (
              <Plus className={cn(
                "h-4 w-4",
                slotState === 'valid' ? "text-green-500" :
                slotState === 'current' ? "text-blue-500" :
                "text-muted-foreground"
              )} />
            )}
          </Button>
        )}
      </div>
    )
  }

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={cn("h-full flex flex-col", className)}>
      {/* Integrated Header with Navigation */}
      <div className="flex-shrink-0 p-4 bg-background border-b">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Title and Navigation */}
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              {viewTitle || (date && !isNaN(new Date(date).getTime()) ? format(new Date(date), 'MMMM d, yyyy') : 'Invalid Date')}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={onPrevious}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onToday}
                className="h-8 px-2 text-xs"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onNext}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next</span>
              </Button>
              {onDateSelect && (
                <DatePicker
                  date={date}
                  onDateChange={(selectedDate) => {
                    if (selectedDate) {
                      onDateSelect(selectedDate)
                    }
                  }}
                  placeholder="Jump to date"
                  className="h-8"
                />
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex rounded-lg border">
              {(['day', 'week', 'month', 'year'] as CalendarView[]).map((view) => (
                <Button
                  key={view}
                  variant={currentView === view ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onViewChange?.(view)}
                  className={cn(
                    "rounded-none first:rounded-l-lg last:rounded-r-lg h-8 px-2 text-xs",
                    "min-w-[30px]"
                  )}
                >
                  <span className="hidden sm:inline">
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </span>
                  <span className="sm:hidden">
                    {view.charAt(0).toUpperCase()}
                  </span>
                </Button>
              ))}
            </div>

            {/* Filter Toggle */}
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={onFiltersToggle}
              className="h-8 w-8 p-0"
            >
              <Filter className="h-4 w-4" />
              <span className="sr-only">Toggle filters</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Traditional Timetable Grid */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="grid gap-1 min-w-[800px]" style={{gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr 1fr'}}>
          {/* Header Row */}
          <div className="bg-muted/50 p-3 text-center font-medium border rounded-lg" style={{width: '141px'}}>
            Time / Day
          </div>
          {weekDays.map((day) => {
            const dayEvents = eventsWithAttendance.filter(event => 
              event.start.toDateString() === day.fullDate.toDateString()
            )
            const holidayEvents = dayEvents.filter(event => event.allDay)
            const hasHoliday = holidayEvents.length > 0
            
            return (
              <div key={day.key} className={cn(
                "p-3 text-center font-medium border rounded-lg",
                hasHoliday ? "bg-red-50 border-red-200" : "bg-muted/50"
              )}>
                <div className={cn(
                  "text-sm font-semibold",
                  hasHoliday ? "text-red-700" : ""
                )}>
                  {day.short} {day.dayNumber}
                </div>
                {hasHoliday ? (
                  <div className="text-xs text-red-600">
                    🎊 {holidayEvents[0].title}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    {day.fullDate && !isNaN(new Date(day.fullDate).getTime()) ? format(new Date(day.fullDate), 'MMM') : 'Invalid'}
                  </div>
                )}
              </div>
            )
          })}

          {/* Time Slot Rows */}
          {activeTimeSlots.map((timeSlot) => (
            <React.Fragment key={timeSlot.time}>
              {/* Time Header */}
              <div className="bg-gradient-to-b from-slate-50 to-slate-100 border-2 border-slate-200 rounded-lg p-2 shadow-sm" style={{width: '141px'}}>
                <div className="text-center flex flex-col justify-around" style={{minHeight: '82px'}}>
                  <div className="text-xs font-semibold text-slate-700 leading-tight">
                    {(() => {
                      try {
                        const startDate = new Date(`2000-01-01T${timeSlot.label}`)
                        return !isNaN(startDate.getTime()) ? format(startDate, 'h:mm a') : timeSlot.label
                      } catch {
                        return timeSlot.label
                      }
                    })()}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">to</div>
                  <div className="text-xs font-semibold text-slate-700 leading-tight">
                    {(() => {
                      try {
                        const endDate = new Date(`2000-01-01T${timeSlot.endTime}`)
                        return !isNaN(endDate.getTime()) ? format(endDate, 'h:mm a') : timeSlot.endTime
                      } catch {
                        return timeSlot.endTime
                      }
                    })()}
                  </div>
                </div>
              </div>
              
              {/* Day Cells */}
              {weekDays.map((day) => {
                // Check if this day has holidays
                const dayEvents = eventsWithAttendance.filter(event => 
                  event.start.toDateString() === day.fullDate.toDateString()
                )
                const holidayEvents = dayEvents.filter(event => event.allDay)
                const hasHoliday = holidayEvents.length > 0
                
                return (
                  <div 
                    key={`${day.key}-${timeSlot.time}`} 
                    className={cn(
                      "border rounded-lg min-h-[100px]",
                      hasHoliday ? "bg-red-50 border-red-200" : ""
                    )}
                  >
                    {hasHoliday ? (
                      // Holiday cell - entire cell is clickable
                      <CustomHolidayMenu
                        event={holidayEvents[0]}
                        onClick={() => {}}
                        className="h-full w-full rounded-lg"
                      >
                        <div className="h-full p-3 flex items-center justify-center text-center min-h-[100px] rounded-lg">
                          <div className="text-red-400 text-xs opacity-60">
                            Holiday
                          </div>
                        </div>
                      </CustomHolidayMenu>
                    ) : (
                      // Regular time slot
                      <DroppableTimeSlot dayKey={day.key} timeSlot={timeSlot.time} />
                    )}
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {eventsWithAttendance.length === 0 && (
        <div className="flex-shrink-0 p-8 text-center">
          <div className="text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No classes scheduled this week</p>
            <p className="text-sm">
              Click on any time slot to add a new class
            </p>
          </div>
        </div>
      )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeEvent ? (
          <div className="p-3 rounded-lg bg-muted/90 border border-border shadow-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <div className="font-semibold text-sm line-clamp-1">
                  {activeEvent.extendedProps?.subjectName || activeEvent.extendedProps?.subjectCode}
                </div>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="line-clamp-1">{activeEvent.extendedProps?.facultyName}</span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {activeEvent.start && !isNaN(new Date(activeEvent.start).getTime()) ? format(new Date(activeEvent.start), 'h:mm a') : 'Invalid time'} - {activeEvent.end && !isNaN(new Date(activeEvent.end).getTime()) ? format(new Date(activeEvent.end), 'h:mm a') : 'Invalid time'}
                </span>
              </div>
              {activeEvent.extendedProps?.subjectCode && (
                <div className="text-xs text-muted-foreground">
                  {activeEvent.extendedProps.subjectCode}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DragOverlay>

      {/* Quick Create Popup */}
      <QuickCreatePopup
        isOpen={isPopupOpen}
        onClose={handlePopupClose}
        onCreateEvent={handleQuickCreate}
        position={popupPosition}
        date={selectedDay ? (() => {
          // Use the pre-calculated weekDays array for correct dates
          const targetDay = weekDays.find(day => day.key === selectedDay)
          return targetDay ? targetDay.fullDate : new Date()
        })() : new Date()}
        timeSlot={selectedTimeSlot}
        batchId={batchId || eventsWithAttendance[0]?.extendedProps?.batchId || ''}
        dayOfWeek={selectedDay}
        subjects={subjects}
        onCheckConflicts={onCheckConflicts}
      />

    </DndContext>
  )
})