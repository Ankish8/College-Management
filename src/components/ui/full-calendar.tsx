"use client"

import React, { useState, useCallback, useEffect } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { 
  CalendarEvent, 
  CalendarView, 
  TimetableViewProps, 
  CalendarViewState 
} from '@/types/timetable'
import { 
  navigateDate, 
  getCalendarViewTitle
} from '@/lib/utils/calendar-utils'
import { 
  detectEventConflicts, 
  getEventConflictSeverity,
  getConflictStyling 
} from '@/lib/utils/conflict-detection'
import { ConflictSummary } from '@/components/timetable/conflict-indicator'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarDayView } from '@/components/timetable/calendar-day-view'
import { TraditionalTimetableView } from '@/components/timetable/traditional-timetable-view'
import { CalendarMonthView } from '@/components/timetable/calendar-month-view'
import { CalendarYearView } from '@/components/timetable/calendar-year-view'
import { CalendarFilters } from '@/components/timetable/calendar-filters'
import { cn } from '@/lib/utils'

interface FullCalendarProps extends Omit<TimetableViewProps, 'currentDate' | 'onDateChange'> {
  initialDate?: Date
  initialView?: CalendarView
  showWeekends?: boolean
  className?: string
  batchId?: string
  onViewStateChange?: (state: CalendarViewState) => void
  onEventDrop?: (eventId: string, newDate: Date, newTimeSlot: string, newDayOfWeek: string) => void
  onEventDelete?: (eventId: string) => void
  onCheckConflicts?: (facultyId: string, dayOfWeek: string, timeSlot: string, excludeEventId?: string) => Promise<boolean>
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
}

export function FullCalendar({
  events = [],
  initialDate = new Date(),
  initialView = 'week',
  showWeekends = true,
  batchId,
  filters,
  onFiltersChange,
  onEventClick,
  onEventCreate,
  onQuickCreate,
  onEventDrop,
  onEventDelete,
  onCheckConflicts,
  subjects = [],
  timeSlots = [],
  isLoading = false,
  className,
  onViewStateChange
}: FullCalendarProps) {
  // Detect mobile device and set default view to day on mobile
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  const defaultView = isMobile ? 'day' : initialView
  
  const [viewState, setViewState] = useState<CalendarViewState>({
    currentDate: initialDate,
    view: defaultView,
    selectedEvent: undefined,
    filters: filters || {}
  })
  
  // Update view when mobile state changes
  useEffect(() => {
    if (isMobile && viewState.view === 'week') {
      setViewState(prev => ({ ...prev, view: 'day' }))
    }
  }, [isMobile, viewState.view])

  const [showFilters, setShowFilters] = useState(false)

  // Update view state when props change
  useEffect(() => {
    setViewState(prev => ({
      ...prev,
      filters: filters || {}
    }))
  }, [filters])

  // Notify parent of view state changes
  useEffect(() => {
    onViewStateChange?.(viewState)
  }, [viewState, onViewStateChange])

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      currentDate: navigateDate(prev.currentDate, prev.view, 'previous')
    }))
  }, [])

  const handleNext = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      currentDate: navigateDate(prev.currentDate, prev.view, 'next')
    }))
  }, [])

  const handleToday = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      currentDate: new Date()
    }))
  }, [])

  const handleViewChange = useCallback((view: CalendarView) => {
    setViewState(prev => ({
      ...prev,
      view
    }))
  }, [])

  const handleDateChange = useCallback((date: Date) => {
    setViewState(prev => ({
      ...prev,
      currentDate: date
    }))
  }, [])

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setViewState(prev => ({
      ...prev,
      selectedEvent: event
    }))
    onEventClick?.(event)
  }, [onEventClick])

  const handleFiltersChange = useCallback((newFilters: typeof filters) => {
    onFiltersChange?.(newFilters)
  }, [onFiltersChange])

  // Keyboard shortcuts
  useHotkeys('left', handlePrevious, [handlePrevious])
  useHotkeys('right', handleNext, [handleNext])
  useHotkeys('t', handleToday, [handleToday])
  useHotkeys('d', () => handleViewChange('day'), [handleViewChange])
  useHotkeys('w', () => handleViewChange('week'), [handleViewChange])
  useHotkeys('m', () => handleViewChange('month'), [handleViewChange])
  useHotkeys('y', () => handleViewChange('year'), [handleViewChange])
  useHotkeys('f', () => setShowFilters(!showFilters), [showFilters])
  useHotkeys('escape', () => {
    setViewState(prev => ({ ...prev, selectedEvent: undefined }))
    setShowFilters(false)
  }, [])

  // Detect conflicts in events
  const conflictResults = detectEventConflicts(events)
  
  // Process events with subtle styling and conflict highlighting
  const processedEvents = events.map(event => {
    const conflictSeverity = getEventConflictSeverity(event.id, conflictResults.conflicts)
    const conflictStyling = conflictSeverity ? getConflictStyling(conflictSeverity) : null
    
    return {
      ...event,
      className: cn(
        // Don't override backgroundColor/borderColor - let the individual events control their colors
        'rounded-lg',
        event.className, // Preserve the original event className
        event.id === viewState.selectedEvent?.id && 'ring-2 ring-primary',
        conflictStyling && [
          conflictStyling.border,
          conflictStyling.background,
          'shadow-lg animate-pulse'
        ]
      )
    }
  })

  const viewTitle = getCalendarViewTitle(viewState.currentDate, viewState.view)

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Conflicts Panel */}
      {conflictResults.hasConflicts && (
        <Card className="flex-none mb-2">
          <CardContent className="pt-4">
            <ConflictSummary 
              conflicts={conflictResults.conflicts}
              onResolveAll={() => {
                // TODO: Implement conflict resolution
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <Card className="flex-none mb-2">
          <CardContent className="pt-4">
            <CalendarFilters
              filters={viewState.filters}
              onFiltersChange={handleFiltersChange}
              onReset={() => handleFiltersChange({})}
              availableOptions={{
                batches: [],
                specializations: [],
                faculty: [],
                subjects: []
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Calendar Content */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-0 h-full">
          {isLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            <div className="h-full">
              {viewState.view === 'day' && (
                <CalendarDayView
                  date={viewState.currentDate}
                  events={processedEvents}
                  batchId={batchId}
                  onEventClick={handleEventClick}
                  onEventCreate={onEventCreate}
                  onQuickCreate={onQuickCreate}
                  subjects={subjects}
                  timeSlots={timeSlots}
                  showWeekends={showWeekends}
                  viewTitle={viewTitle}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                  onToday={handleToday}
                  onViewChange={handleViewChange}
                  currentView={viewState.view}
                  onFiltersToggle={() => setShowFilters(!showFilters)}
                  showFilters={showFilters}
                  onCheckConflicts={onCheckConflicts}
                />
              )}
              
              {viewState.view === 'week' && (
                <TraditionalTimetableView
                  date={viewState.currentDate}
                  events={processedEvents}
                  batchId={batchId}
                  onEventClick={handleEventClick}
                  onEventCreate={onEventCreate}
                  onQuickCreate={onQuickCreate}
                  subjects={subjects}
                  timeSlots={timeSlots}
                  onEventDrop={onEventDrop}
                  onEventDelete={onEventDelete}
                  onCheckConflicts={onCheckConflicts}
                  viewTitle={viewTitle}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                  onToday={handleToday}
                  onViewChange={handleViewChange}
                  currentView={viewState.view}
                  onDateSelect={handleDateChange}
                  onFiltersToggle={() => setShowFilters(!showFilters)}
                  showFilters={showFilters}
                />
              )}
              
              {viewState.view === 'month' && (
                <CalendarMonthView
                  date={viewState.currentDate}
                  events={processedEvents}
                  onEventClick={handleEventClick}
                  onDateClick={handleDateChange}
                  showWeekends={showWeekends}
                  viewTitle={viewTitle}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                  onToday={handleToday}
                  onViewChange={handleViewChange}
                  currentView={viewState.view}
                  onFiltersToggle={() => setShowFilters(!showFilters)}
                  showFilters={showFilters}
                />
              )}
              
              {viewState.view === 'year' && (
                <CalendarYearView
                  date={viewState.currentDate}
                  events={processedEvents}
                  onEventClick={handleEventClick}
                  onMonthClick={handleDateChange}
                  viewTitle={viewTitle}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                  onToday={handleToday}
                  onViewChange={handleViewChange}
                  currentView={viewState.view}
                  onFiltersToggle={() => setShowFilters(!showFilters)}
                  showFilters={showFilters}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts Help */}
      <div className="flex-none mt-2 text-xs text-muted-foreground text-center">
        <span className="hidden md:inline">
          Press <kbd className="px-1 py-0.5 text-xs bg-muted rounded">←</kbd> <kbd className="px-1 py-0.5 text-xs bg-muted rounded">→</kbd> to navigate, 
          <kbd className="px-1 py-0.5 text-xs bg-muted rounded">T</kbd> for today, 
          <kbd className="px-1 py-0.5 text-xs bg-muted rounded">D</kbd>/<kbd className="px-1 py-0.5 text-xs bg-muted rounded">W</kbd>/<kbd className="px-1 py-0.5 text-xs bg-muted rounded">M</kbd>/<kbd className="px-1 py-0.5 text-xs bg-muted rounded">Y</kbd> for views, 
          <kbd className="px-1 py-0.5 text-xs bg-muted rounded">F</kbd> for filters
        </span>
      </div>
    </div>
  )
}

export default FullCalendar