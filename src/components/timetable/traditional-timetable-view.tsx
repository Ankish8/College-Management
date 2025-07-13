"use client"

import React from 'react'
import { CalendarEvent, CalendarView } from '@/types/timetable'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Clock, User, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TraditionalTimetableViewProps {
  date: Date
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onEventCreate?: (date: Date, timeSlot?: string) => void
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

// Default time slots from 10 AM to 4 PM (1.5 hour sessions)
const DEFAULT_TIME_SLOTS = [
  { time: "10:00", label: "10:00 AM", endTime: "11:30" },
  { time: "11:30", label: "11:30 AM", endTime: "13:00" },
  { time: "13:00", label: "1:00 PM", endTime: "14:30" },
  { time: "14:30", label: "2:30 PM", endTime: "16:00" },
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
  onEventClick,
  onEventCreate,
  className,
  viewTitle,
  onPrevious,
  onNext,
  onToday,
  onViewChange,
  currentView,
  onFiltersToggle,
  showFilters
}: TraditionalTimetableViewProps) {
  // Get events for a specific day and time slot
  const getEventForSlot = (dayKey: string, timeSlot: string) => {
    return events.find(event => 
      event.extendedProps?.dayOfWeek === dayKey &&
      format(event.start, 'HH:mm') === timeSlot
    )
  }

  const handleEventClick = (event: CalendarEvent) => {
    if (onEventClick) {
      onEventClick(event)
    }
  }

  const handleSlotClick = (dayKey: string, timeSlot: string) => {
    if (onEventCreate) {
      // Create a date for the clicked slot
      const dayIndex = WEEKDAYS.findIndex(d => d.key === dayKey)
      const clickDate = new Date(date)
      clickDate.setDate(clickDate.getDate() - clickDate.getDay() + 1 + dayIndex) // Monday = 1
      onEventCreate(clickDate, timeSlot)
    }
  }

  const EventCell = ({ dayKey, timeSlot }: { dayKey: string; timeSlot: string }) => {
    const event = getEventForSlot(dayKey, timeSlot)
    
    if (event) {
      return (
        <div
          className={cn(
            "p-3 h-full cursor-pointer transition-all hover:shadow-md rounded-lg",
            "bg-muted/50 border border-border hover:bg-muted/70"
          )}
          onClick={() => handleEventClick(event)}
        >
          <div className="space-y-1">
            <div className="font-semibold text-sm line-clamp-1">
              {event.extendedProps?.subjectCode || event.extendedProps?.subjectName}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="line-clamp-1">{event.extendedProps?.facultyName}</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}</span>
            </div>
            {event.extendedProps?.credits && (
              <Badge variant="secondary" className="text-xs">
                {event.extendedProps.credits} credits
              </Badge>
            )}
          </div>
        </div>
      )
    }

    return (
      <Button
        variant="ghost"
        className="w-full h-full border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors min-h-[100px]"
        onClick={() => handleSlotClick(dayKey, timeSlot)}
      >
        <Plus className="h-4 w-4 text-muted-foreground" />
      </Button>
    )
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Integrated Header with Navigation */}
      <div className="flex-shrink-0 p-4 bg-background border-b">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Title and Navigation */}
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              {viewTitle || format(date, 'MMMM d, yyyy')}
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
          {WEEKDAYS.map((day) => (
            <div key={day.key} className="bg-muted/50 p-3 text-center font-medium border rounded-lg">
              <div className="text-sm font-semibold">{day.short}</div>
              <div className="text-xs text-muted-foreground">{day.label}</div>
            </div>
          ))}

          {/* Time Slot Rows */}
          {DEFAULT_TIME_SLOTS.map((timeSlot) => (
            <React.Fragment key={timeSlot.time}>
              {/* Time Header */}
              <div className="bg-muted/30 p-3 text-center border rounded-lg">
                <div className="text-sm font-medium">{timeSlot.label}</div>
                <div className="text-xs text-muted-foreground">
                  to {timeSlot.endTime === "13:00" ? "1:00 PM" : 
                      timeSlot.endTime === "14:30" ? "2:30 PM" : 
                      timeSlot.endTime === "16:00" ? "4:00 PM" : 
                      format(new Date(`2000-01-01T${timeSlot.endTime}`), 'h:mm a')}
                </div>
              </div>
              
              {/* Day Cells */}
              {WEEKDAYS.map((day) => (
                <div key={`${day.key}-${timeSlot.time}`} className="border rounded-lg min-h-[100px]">
                  <EventCell dayKey={day.key} timeSlot={timeSlot.time} />
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
  )
}