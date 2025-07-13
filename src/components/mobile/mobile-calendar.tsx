"use client"

import React, { useState, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, addDays, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight, Clock, MapPin, Users, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CalendarEvent } from '@/types/timetable'
import { MobileCard } from './mobile-navigation'

interface MobileCalendarProps {
  events: CalendarEvent[]
  selectedDate: Date
  onDateChange: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onEventCreate?: (date: Date) => void
  view?: 'day' | 'week'
  className?: string
}

export function MobileCalendar({
  events,
  selectedDate,
  onDateChange,
  onEventClick,
  onEventCreate,
  view = 'day',
  className
}: MobileCalendarProps) {
  const [currentView, setCurrentView] = useState<'day' | 'week'>(view)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // Handle swipe gestures for navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      // Swipe left - next day/week
      if (currentView === 'day') {
        onDateChange(addDays(selectedDate, 1))
      } else {
        onDateChange(addDays(selectedDate, 7))
      }
    }

    if (isRightSwipe) {
      // Swipe right - previous day/week
      if (currentView === 'day') {
        onDateChange(subDays(selectedDate, 1))
      } else {
        onDateChange(subDays(selectedDate, -7))
      }
    }
  }

  if (currentView === 'day') {
    return (
      <div 
        className={cn("h-full flex flex-col", className)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <MobileDayView
          date={selectedDate}
          events={events}
          onDateChange={onDateChange}
          onEventClick={onEventClick}
          onEventCreate={onEventCreate}
          onViewChange={setCurrentView}
        />
      </div>
    )
  }

  return (
    <div 
      className={cn("h-full flex flex-col", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <MobileWeekView
        date={selectedDate}
        events={events}
        onDateChange={onDateChange}
        onEventClick={onEventClick}
        onEventCreate={onEventCreate}
        onViewChange={setCurrentView}
      />
    </div>
  )
}

interface MobileDayViewProps {
  date: Date
  events: CalendarEvent[]
  onDateChange: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onEventCreate?: (date: Date) => void
  onViewChange?: (view: 'day' | 'week') => void
}

function MobileDayView({
  date,
  events,
  onDateChange,
  onEventClick,
  onEventCreate,
  onViewChange
}: MobileDayViewProps) {
  const dayEvents = events.filter(event => isSameDay(event.start, date))
  const sortedEvents = dayEvents.sort((a, b) => a.start.getTime() - b.start.getTime())

  // Generate time slots from 8 AM to 6 PM
  const timeSlots = []
  for (let hour = 8; hour <= 18; hour++) {
    timeSlots.push({
      time: new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0),
      label: format(new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0), 'h:mm a')
    })
  }

  const getEventsForHour = (hour: number) => {
    return sortedEvents.filter(event => {
      const eventHour = event.start.getHours()
      return eventHour === hour
    })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDateChange(subDays(date, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center">
            <div className="text-lg font-semibold">
              {format(date, 'EEEE')}
            </div>
            <div className={cn(
              "text-sm",
              isToday(date) ? "text-primary font-medium" : "text-muted-foreground"
            )}>
              {format(date, 'MMM d, yyyy')}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDateChange(addDays(date, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewChange?.('week')}
          >
            Week
          </Button>
          <Badge variant="secondary">
            {dayEvents.length} classes
          </Badge>
        </div>
      </div>

      {/* Today indicator */}
      {isToday(date) && (
        <div className="px-4 py-2 bg-primary/5 border-b">
          <p className="text-sm text-primary font-medium">Today's Schedule</p>
        </div>
      )}

      {/* Events List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {sortedEvents.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No classes scheduled for this day</p>
              {onEventCreate && (
                <Button
                  onClick={() => onEventCreate(date)}
                  variant="outline"
                  size="sm"
                >
                  Add Class
                </Button>
              )}
            </div>
          ) : (
            sortedEvents.map((event) => (
              <MobileEventCard
                key={event.id}
                event={event}
                onClick={() => onEventClick?.(event)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

interface MobileWeekViewProps extends MobileDayViewProps {}

function MobileWeekView({
  date,
  events,
  onDateChange,
  onEventClick,
  onEventCreate,
  onViewChange
}: MobileWeekViewProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }) // Monday
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDateChange(subDays(date, 7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center">
            <div className="text-lg font-semibold">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
            </div>
            <div className="text-sm text-muted-foreground">
              {format(date, 'yyyy')}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDateChange(addDays(date, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewChange?.('day')}
        >
          Day
        </Button>
      </div>

      {/* Week Days */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {weekDays.slice(0, 5).map((day) => { // Monday to Friday only
            const dayEvents = events.filter(event => isSameDay(event.start, day))
            const isSelected = isSameDay(day, date)
            
            return (
              <MobileCard
                key={day.toISOString()}
                className={cn(
                  "p-4 transition-all duration-200",
                  isSelected && "ring-2 ring-primary bg-primary/5",
                  isToday(day) && "border-primary"
                )}
                onClick={() => onDateChange(day)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className={cn(
                      "font-medium",
                      isToday(day) && "text-primary"
                    )}>
                      {format(day, 'EEEE')}
                    </div>
                    <div className={cn(
                      "text-sm",
                      isToday(day) ? "text-primary" : "text-muted-foreground"
                    )}>
                      {format(day, 'MMM d')}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isToday(day) && (
                      <Badge variant="default" className="text-xs">
                        Today
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {dayEvents.length} classes
                    </Badge>
                  </div>
                </div>
                
                {dayEvents.length > 0 && (
                  <div className="space-y-2">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-2 text-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEventClick?.(event)
                        }}
                      >
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <div className="flex-1 truncate">
                          <span className="font-medium">
                            {event.extendedProps?.subjectName}
                          </span>
                          {' • '}
                          <span className="text-muted-foreground">
                            {format(event.start, 'h:mm a')}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayEvents.length - 3} more classes
                      </div>
                    )}
                  </div>
                )}
                
                {dayEvents.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No classes scheduled
                  </div>
                )}
              </MobileCard>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

interface MobileEventCardProps {
  event: CalendarEvent
  onClick?: () => void
  showDate?: boolean
}

export function MobileEventCard({ event, onClick, showDate = false }: MobileEventCardProps) {
  const duration = Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60))
  const credits = event.extendedProps?.credits || 0
  
  return (
    <MobileCard
      onClick={onClick}
      className="p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        {/* Time indicator */}
        <div className="flex-shrink-0">
          <div className="w-3 h-3 rounded-full bg-blue-500 mt-1" />
          <div className="w-0.5 h-8 bg-blue-200 mx-auto mt-1" />
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Event title */}
          <div className="font-medium text-gray-900 truncate">
            {event.extendedProps?.subjectName || event.title}
          </div>
          
          {/* Faculty name */}
          <div className="text-sm text-gray-600 truncate">
            {event.extendedProps?.facultyName}
          </div>
          
          {/* Time and duration */}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
              </span>
            </div>
            
            {showDate && (
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                <span>{format(event.start, 'MMM d')}</span>
              </div>
            )}
          </div>
          
          {/* Additional info */}
          <div className="flex items-center gap-2 mt-2">
            {event.extendedProps?.batchName && (
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {event.extendedProps.batchName}
              </Badge>
            )}
            
            {credits > 0 && (
              <Badge variant="secondary" className="text-xs">
                {credits} credits
              </Badge>
            )}
            
            <Badge variant="outline" className="text-xs">
              {duration}m
            </Badge>
          </div>
        </div>
      </div>
    </MobileCard>
  )
}

// Mobile-optimized date picker
export function MobileDatePicker({
  selectedDate,
  onDateChange,
  className
}: {
  selectedDate: Date
  onDateChange: (date: Date) => void
  className?: string
}) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate)
  
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  
  return (
    <div className={cn("bg-white border rounded-lg", className)}>
      {/* Month header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Calendar grid */}
      <div className="p-4">
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
            const isSelected = isSameDay(day, selectedDate)
            const isCurrentDay = isToday(day)
            
            return (
              <Button
                key={day.toISOString()}
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-10 w-10 p-0 font-normal",
                  !isCurrentMonth && "text-gray-300",
                  isCurrentDay && !isSelected && "border border-primary text-primary",
                  isSelected && "bg-primary text-primary-foreground"
                )}
                onClick={() => onDateChange(day)}
              >
                {format(day, 'd')}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}