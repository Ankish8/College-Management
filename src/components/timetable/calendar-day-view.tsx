"use client"

import React from 'react'
import { CalendarEvent, CalendarView } from '@/types/timetable'
import { 
  generateDayTimeSlots, 
  getEventsForTimeSlot, 
  formatDuration,
  mergeConsecutiveTimeSlots
} from '@/lib/utils/calendar-utils'
import { 
  getBreakSlotsForDate,
  generateTimeSlotsWithBreaks,
  getBreakStyling
} from '@/lib/utils/break-utils'
import { BreakTimeRow, BreakSummary } from '@/components/timetable/break-indicator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Clock, Users, BookOpen, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'

interface CalendarDayViewProps {
  date: Date
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onEventCreate?: (date: Date, timeSlot?: string) => void
  viewTitle?: string
  onPrevious?: () => void
  onNext?: () => void
  onToday?: () => void
  onViewChange?: (view: CalendarView) => void
  currentView?: CalendarView
  onFiltersToggle?: () => void
  showFilters?: boolean
  showWeekends?: boolean
  className?: string
}

export function CalendarDayView({
  date,
  events,
  onEventClick,
  onEventCreate,
  showWeekends = true,
  className,
  viewTitle,
  onPrevious,
  onNext,
  onToday,
  onViewChange,
  currentView,
  onFiltersToggle,
  showFilters
}: CalendarDayViewProps) {
  // Filter events for this specific day
  const dayEvents = events.filter(event => isSameDay(event.start, date))
  
  // Generate time slots with breaks for the day (8 AM to 6 PM)
  const timeSlotsWithBreaks = generateTimeSlotsWithBreaks(8, 18, 60)
  
  // Get break slots for this date
  const breakSlots = getBreakSlotsForDate(date, dayEvents)
  
  // Merge consecutive time slots for better display
  const mergedGroups = mergeConsecutiveTimeSlots(dayEvents)
  
  // Separate full-day and regular events
  const fullDayEvents = dayEvents.filter(event => {
    const duration = event.end.getTime() - event.start.getTime()
    return duration >= 6 * 60 * 60 * 1000 // 6+ hours considered full day
  })
  const regularEvents = dayEvents.filter(event => {
    const duration = event.end.getTime() - event.start.getTime()
    return duration < 6 * 60 * 60 * 1000
  })

  const handleTimeSlotClick = (timeSlot: string) => {
    if (onEventCreate) {
      onEventCreate(date, timeSlot)
    }
  }

  const handleEventClick = (event: CalendarEvent) => {
    if (onEventClick) {
      onEventClick(event)
    }
  }

  const EventCard = ({ event }: { event: CalendarEvent }) => {
    const duration = event.end.getTime() - event.start.getTime()
    const isFullDay = duration >= 6 * 60 * 60 * 1000 // 6+ hours
    const durationHours = duration / (1000 * 60 * 60)
    
    return (
      <Card 
        className={cn(
          "cursor-pointer transition-all hover:shadow-md hover:scale-105",
          event.className,
          isFullDay && "border-l-8 border-l-amber-500 bg-gradient-to-r from-amber-50 to-transparent"
        )}
        onClick={() => handleEventClick(event)}
      >
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm leading-tight">
                    {event.extendedProps?.subjectName}
                  </h4>
                  {isFullDay && (
                    <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                      Full Day Module
                    </Badge>
                  )}
                </div>
                <p className="text-xs opacity-90">
                  {event.extendedProps?.facultyName}
                </p>
              </div>
              <Badge variant="secondary" className="text-xs ml-2">
                {event.extendedProps?.entryType}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-xs opacity-75">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                <span className="text-muted-foreground ml-1">
                  ({durationHours.toFixed(1)}h)
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {event.extendedProps?.batchName}
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {event.extendedProps?.credits} credits
              </div>
            </div>

            {isFullDay && (
              <div className="text-xs text-amber-700 bg-amber-100 p-2 rounded border border-amber-200">
                <strong>Module Schedule:</strong> This is a full-day intensive module. 
                Breaks are integrated within the session.
              </div>
            )}

            {event.extendedProps?.notes && (
              <p className="text-xs opacity-75 mt-2">
                {event.extendedProps.notes}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const TimeSlotRow = ({ 
    timeSlot 
  }: { 
    timeSlot: { 
      time: string; 
      label: string; 
      isBreak?: boolean; 
      breakInfo?: any;
      slotType?: 'CLASS' | 'BREAK'
    } 
  }) => {
    // Handle break slots
    if (timeSlot.isBreak && timeSlot.breakInfo) {
      const breakSlot = breakSlots.find(b => b.startTime === timeSlot.time)
      if (breakSlot) {
        return <BreakTimeRow breakSlot={breakSlot} />
      }
    }

    // Handle regular class slots
    const slotEvents = getEventsForTimeSlot(dayEvents, date, timeSlot.time)
    const isEmpty = slotEvents.length === 0

    return (
      <div className="flex min-h-[80px] border-b border-border/50">
        {/* Time Column */}
        <div className="w-20 flex-shrink-0 p-3 bg-muted/30 border-r">
          <div className="text-sm font-medium">{timeSlot.time}</div>
          <div className="text-xs text-muted-foreground">
            {formatDuration(60)}
          </div>
        </div>
        
        {/* Events Column */}
        <div className="flex-1 p-3">
          {isEmpty ? (
            <Button
              variant="ghost"
              className="w-full h-full border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors"
              onClick={() => handleTimeSlotClick(timeSlot.time)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add class
            </Button>
          ) : (
            <div className="space-y-2">
              {slotEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Integrated Header with Navigation */}
      <div className="flex-shrink-0 p-4 bg-muted/30 border-b">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Title and Navigation */}
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              {viewTitle || format(date, 'EEEE, MMMM d, yyyy')}
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
        
        <div className="flex items-center justify-between mt-3">
          <p className="text-sm text-muted-foreground">
            {dayEvents.length} class{dayEvents.length !== 1 ? 'es' : ''} scheduled
          </p>
          
          {/* Day Stats */}
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium">
                {dayEvents.reduce((acc, event) => acc + (event.extendedProps?.credits || 0), 0)}
              </div>
              <div className="text-muted-foreground">Credits</div>
            </div>
            <div className="text-center">
              <div className="font-medium">
                {formatDuration(
                  dayEvents.reduce((acc, event) => {
                    const duration = event.end.getTime() - event.start.getTime()
                    return acc + (duration / (1000 * 60)) // Convert to minutes
                  }, 0)
                )}
              </div>
              <div className="text-muted-foreground">Duration</div>
            </div>
          </div>
        </div>
      </div>

      {/* Merged Time Slots Display */}
      {mergedGroups.length > 0 && (
        <div className="flex-shrink-0 p-4 bg-background">
          <h3 className="text-sm font-medium mb-3">Schedule Overview</h3>
          <div className="flex flex-wrap gap-2">
            {mergedGroups.map((group, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {group.startTime} - {group.endTime}
                {group.isConsecutive && (
                  <span className="ml-1 text-muted-foreground">
                    ({formatDuration(group.duration)})
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Break Summary */}
      {breakSlots.length > 0 && (
        <div className="flex-shrink-0 p-4">
          <BreakSummary breakSlots={breakSlots} />
        </div>
      )}

      <Separator />

      {/* Time Slots Grid */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {timeSlotsWithBreaks.map((timeSlot) => (
            <TimeSlotRow key={`${timeSlot.time}-${timeSlot.slotType}`} timeSlot={timeSlot} />
          ))}
        </div>
      </ScrollArea>

      {/* Day Summary */}
      {dayEvents.length === 0 && (
        <div className="flex-shrink-0 p-8 text-center">
          <div className="text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No classes scheduled</p>
            <p className="text-sm">
              Click on a time slot to add a new class
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function Calendar(props: { className?: string }) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  )
}