"use client"

import React, { useState } from 'react'
import { CalendarEvent, CalendarView } from '@/types/timetable'
import { format, startOfWeek, addDays } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Clock, User, ChevronLeft, ChevronRight, Filter, GripVertical, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { QuickCreatePopup } from './quick-create-popup'

interface TraditionalTimetableViewProps {
  date: Date
  events: CalendarEvent[]
  batchId?: string
  onEventClick?: (event: CalendarEvent) => void
  onEventCreate?: (date: Date, timeSlot?: string) => void
  onQuickCreate?: (data: {
    subjectId: string
    facultyId: string
    date: Date
    timeSlot: string
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
  onFiltersToggle?: () => void
  showFilters?: boolean
  onCheckConflicts?: (facultyId: string, dayOfWeek: string, timeSlot: string, excludeEventId?: string) => Promise<boolean>
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

export function TraditionalTimetableView({
  date,
  events,
  batchId,
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
  onFiltersToggle,
  showFilters,
  onCheckConflicts
}: TraditionalTimetableViewProps) {
  const [activeEvent, setActiveEvent] = React.useState<CalendarEvent | null>(null)
  const [conflictCache, setConflictCache] = React.useState<Record<string, boolean>>({})
  const [isLoadingConflicts, setIsLoadingConflicts] = React.useState(false)
  
  // State for popup management
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')
  const [selectedDay, setSelectedDay] = useState<string>('')
  
  
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
    
    // Find any event already in the target slot (in current view)
    const existingEvent = events.find(event => 
      event.id !== draggedEvent.id && // Don't conflict with self
      event.extendedProps?.dayOfWeek === targetDayKey &&
      event.extendedProps?.timeSlotName === targetTimeSlot
    )
    
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
    return events.find(event => 
      event.extendedProps?.dayOfWeek === dayKey &&
      event.extendedProps?.timeSlotName === timeSlot
    )
  }

  const handleEventClick = (event: CalendarEvent) => {
    if (onEventClick) {
      onEventClick(event)
    }
  }

  const handleSlotClick = (dayKey: string, timeSlot: string, event?: React.MouseEvent) => {
    if (onQuickCreate && event) {
      // Use the new popup system
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
    subjectId: string
    facultyId: string
    date: Date
    timeSlot: string
  }) => {
    if (onQuickCreate) {
      onQuickCreate(data)
    }
    setIsPopupOpen(false)
    setSelectedTimeSlot('')
    setSelectedDay('')
  }

  const handleDragStart = (event: DragStartEvent) => {
    const draggedEvent = events.find(e => e.id === event.active.id)
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
    const draggedEvent = events.find(e => e.id === eventId)
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
      
      // Calculate the new date
      const dayIndex = WEEKDAYS.findIndex(d => d.key === dayKey)
      const newDate = new Date(date)
      newDate.setDate(newDate.getDate() - newDate.getDay() + 1 + dayIndex) // Monday = 1
      
      onEventDrop(eventId, newDate, timeSlot, dayKey)
    }
    
    setActiveEvent(null)
  }

  // Draggable Event Component
  const DraggableEvent = ({ event }: { event: CalendarEvent }) => {
    const isSampleEvent = event.id === "1" || event.id === "2" || event.id === "3" || event.id.length < 10
    
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      isDragging,
    } = useDraggable({
      id: event.id,
    })

    const style = {
      transform: CSS.Translate.toString(transform),
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className={cn(
          "p-3 h-full transition-all hover:shadow-md rounded-lg group relative",
          "bg-muted/50 border border-border hover:bg-muted/70",
          isSampleEvent && "border-dashed border-orange-300 bg-orange-50/50",
          isDragging && "opacity-50 z-50"
        )}
        onClick={() => handleEventClick(event)}
        title={isSampleEvent ? "Sample data - you can drag but changes won't save" : "Drag to move this class"}
      >
        {/* Delete button - only show for real events, not sample data */}
        {!isSampleEvent && onEventDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-1 right-1 h-5 w-5 p-0 rounded-full bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // Delete button clicked for event
              onEventDelete(event.id)
            }}
            title="Delete this class"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        
        <div className="space-y-1" {...listeners} style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
          <div className="flex items-center gap-1">
            <GripVertical className={cn(
              "h-3 w-3 flex-shrink-0",
              isSampleEvent ? "text-orange-500" : "text-muted-foreground"
            )} />
            <div className="font-semibold text-sm line-clamp-1">
              {event.extendedProps?.subjectName || event.extendedProps?.subjectCode}
            </div>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="line-clamp-1">{event.extendedProps?.facultyName}</span>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              {event.start && !isNaN(new Date(event.start).getTime()) ? format(new Date(event.start), 'h:mm a') : 'Invalid time'} - {event.end && !isNaN(new Date(event.end).getTime()) ? format(new Date(event.end), 'h:mm a') : 'Invalid time'}
            </span>
          </div>
          {event.extendedProps?.subjectCode && (
            <div className="text-xs text-muted-foreground">
              {event.extendedProps.subjectCode}
            </div>
          )}
        </div>
        
      </div>
    )
  }

  // Droppable Time Slot Component
  const DroppableTimeSlot = ({ dayKey, timeSlot }: { dayKey: string; timeSlot: string }) => {
    const event = getEventForSlot(dayKey, timeSlot)
    const conflict = activeEvent ? checkDropConflict(activeEvent, dayKey, timeSlot) : null
    const isValidDrop = !conflict && !event // No conflict and slot is empty
    const isCurrentSlot = activeEvent?.extendedProps?.dayOfWeek === dayKey && activeEvent?.extendedProps?.timeSlotName === timeSlot
    
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
        
        <p className="text-sm text-muted-foreground mt-2">
          {events.length} class{events.length !== 1 ? 'es' : ''} scheduled this week
        </p>
      </div>

      {/* Traditional Timetable Grid */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="grid grid-cols-6 gap-1 min-w-[800px]">
          {/* Header Row */}
          <div className="bg-muted/50 p-3 text-center font-medium border rounded-lg">
            Time / Day
          </div>
          {weekDays.map((day) => (
            <div key={day.key} className="bg-muted/50 p-3 text-center font-medium border rounded-lg">
              <div className="text-sm font-semibold">{day.short} {day.dayNumber}</div>
              <div className="text-xs text-muted-foreground">
                {day.fullDate && !isNaN(new Date(day.fullDate).getTime()) ? format(new Date(day.fullDate), 'MMM') : 'Invalid'}
              </div>
            </div>
          ))}

          {/* Time Slot Rows */}
          {activeTimeSlots.map((timeSlot) => (
            <React.Fragment key={timeSlot.time}>
              {/* Time Header */}
              <div className="bg-muted/30 p-3 text-center border rounded-lg">
                <div className="text-sm font-medium">
                  {(() => {
                    try {
                      const startDate = new Date(`2000-01-01T${timeSlot.label}`)
                      return !isNaN(startDate.getTime()) ? format(startDate, 'h:mm a') : timeSlot.label
                    } catch {
                      return timeSlot.label
                    }
                  })()}
                </div>
                <div className="text-xs text-muted-foreground">
                  to {(() => {
                    try {
                      const endDate = new Date(`2000-01-01T${timeSlot.endTime}`)
                      return !isNaN(endDate.getTime()) ? format(endDate, 'h:mm a') : timeSlot.endTime
                    } catch {
                      return timeSlot.endTime
                    }
                  })()}
                </div>
              </div>
              
              {/* Day Cells */}
              {weekDays.map((day) => (
                <div key={`${day.key}-${timeSlot.time}`} className="border rounded-lg min-h-[100px]">
                  <DroppableTimeSlot dayKey={day.key} timeSlot={timeSlot.time} />
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {events.length === 0 && (
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
          const dayIndex = WEEKDAYS.findIndex(d => d.key === selectedDay)
          const clickDate = new Date(date)
          clickDate.setDate(clickDate.getDate() - clickDate.getDay() + 1 + dayIndex)
          return clickDate
        })() : new Date()}
        timeSlot={selectedTimeSlot}
        batchId={batchId || events[0]?.extendedProps?.batchId || ''}
        dayOfWeek={selectedDay}
        subjects={subjects}
        onCheckConflicts={onCheckConflicts}
      />

    </DndContext>
  )
}