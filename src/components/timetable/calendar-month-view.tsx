"use client"

import React from 'react'
import { CalendarEvent, CalendarView } from '@/types/timetable'
import { getEventsForDate } from '@/lib/utils/calendar-utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isToday,
  isSameDay
} from 'date-fns'
import { cn } from '@/lib/utils'

interface CalendarMonthViewProps {
  date: Date
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onDateClick?: (date: Date) => void
  showWeekends?: boolean
  className?: string
  viewTitle?: string
  onPrevious?: () => void
  onNext?: () => void
  onToday?: () => void
  onViewChange?: (view: CalendarView) => void
  currentView?: CalendarView
  onFiltersToggle?: () => void
  showFilters?: boolean
}

export function CalendarMonthView({
  date,
  events,
  onEventClick,
  onDateClick,
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
}: CalendarMonthViewProps) {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  // Generate all calendar days
  const calendarDays: Date[] = []
  let currentDay = calendarStart
  while (currentDay <= calendarEnd) {
    calendarDays.push(currentDay)
    currentDay = addDays(currentDay, 1)
  }

  const displayDays = showWeekends ? calendarDays : calendarDays.filter(day => {
    const dayOfWeek = day.getDay()
    return dayOfWeek !== 0 && dayOfWeek !== 6 // Exclude Sunday (0) and Saturday (6)
  })

  const handleDateClick = (clickedDate: Date) => {
    if (onDateClick) {
      onDateClick(clickedDate)
    }
  }

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    if (onEventClick) {
      onEventClick(event)
    }
  }

  const EventChip = ({ event }: { event: CalendarEvent }) => (
    <div
      className={cn(
        "text-xs p-1 rounded mb-1 cursor-pointer transition-all hover:shadow-sm truncate",
        event.className
      )}
      onClick={(e) => handleEventClick(event, e)}
      title={`${event.extendedProps?.subjectName} - ${event.extendedProps?.facultyName} at ${format(event.start, 'HH:mm')}`}
    >
      <div className="font-medium truncate">
        {event.extendedProps?.subjectName}
      </div>
      <div className="opacity-90 truncate">
        {event.extendedProps?.credits ? `${event.extendedProps.credits} credits` : format(event.start, 'HH:mm')}
      </div>
    </div>
  )

  const DayCell = ({ day }: { day: Date }) => {
    const dayEvents = getEventsForDate(events, day)
    const isCurrentMonth = isSameMonth(day, date)
    const isCurrentDay = isToday(day)
    const hasEvents = dayEvents.length > 0

    // Limit displayed events to prevent overflow
    const displayEvents = dayEvents.slice(0, 3)
    const hiddenEventsCount = dayEvents.length - displayEvents.length

    return (
      <Card
        className={cn(
          "h-full min-h-[80px] p-1.5 cursor-pointer transition-all hover:shadow-md border",
          !isCurrentMonth && "opacity-50 bg-muted/20",
          isCurrentDay && "ring-2 ring-primary",
          hasEvents && "bg-accent/20"
        )}
        onClick={() => handleDateClick(day)}
      >
        <div className="space-y-1">
          {/* Day Number */}
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-sm font-medium",
              isCurrentDay && "text-primary",
              !isCurrentMonth && "text-muted-foreground"
            )}>
              {format(day, 'd')}
            </span>
            {hasEvents && (
              <Badge variant="secondary" className="text-xs h-4">
                {dayEvents.length}
              </Badge>
            )}
          </div>

          {/* Events */}
          <div className="space-y-1">
            {displayEvents.map((event) => (
              <EventChip key={event.id} event={event} />
            ))}
            
            {hiddenEventsCount > 0 && (
              <div className="text-xs text-muted-foreground text-center py-1">
                +{hiddenEventsCount} more
              </div>
            )}
          </div>
        </div>
      </Card>
    )
  }

  const DayHeader = ({ day }: { day: string }) => (
    <div className="p-2 text-center font-medium text-sm bg-muted/30 border-b">
      {day}
    </div>
  )

  // Get day headers
  const dayHeaders = showWeekends 
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

  // Calculate grid columns and rows based on whether weekends are shown
  const gridCols = showWeekends ? 7 : 5
  const totalDays = displayDays.length
  const headerRows = 1
  const calendarRows = Math.ceil(totalDays / gridCols)
  const totalRows = headerRows + calendarRows

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Integrated Header with Navigation */}
      <div className="flex-shrink-0 p-4 bg-background border-b">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Title and Navigation */}
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              {viewTitle || format(date, 'MMMM yyyy')}
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
            {events.filter(event => isSameMonth(event.start, date)).length} class{events.filter(event => isSameMonth(event.start, date)).length !== 1 ? 'es' : ''} this month
          </p>
          
          {/* Month Stats */}
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium">
                {events
                  .filter(event => isSameMonth(event.start, date))
                  .reduce((acc, event) => acc + (event.extendedProps?.credits || 0), 0)
                }
              </div>
              <div className="text-muted-foreground">Credits</div>
            </div>
            <div className="text-center">
              <div className="font-medium">
                {displayDays.filter(day => 
                  isSameMonth(day, date) && 
                  events.some(event => isSameDay(event.start, day))
                ).length}
              </div>
              <div className="text-muted-foreground">Active Days</div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 p-4 overflow-hidden">
        <div 
          className={cn("grid gap-1 h-full")}
          style={{
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            gridTemplateRows: `auto repeat(${calendarRows}, 1fr)`
          }}
        >
          {/* Day Headers */}
          {dayHeaders.map((day) => (
            <DayHeader key={day} day={day} />
          ))}

          {/* Calendar Days */}
          {displayDays.map((day) => (
            <DayCell key={day.toISOString()} day={day} />
          ))}
        </div>
      </div>

      {/* Month Summary */}
      {events.filter(event => isSameMonth(event.start, date)).length === 0 && (
        <div className="flex-shrink-0 p-8 text-center">
          <div className="text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No classes scheduled this month</p>
            <p className="text-sm">
              Click on any date to add a new class
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