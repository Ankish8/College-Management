"use client"

import React from 'react'
import { CalendarEvent } from '@/types/timetable'
import { 
  getWeekDays, 
  generateDayTimeSlots, 
  getEventsForTimeSlot,
  formatDuration
} from '@/lib/utils/calendar-utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Clock, Users } from 'lucide-react'
import { format, isSameDay, isToday } from 'date-fns'
import { cn } from '@/lib/utils'

interface CalendarWeekViewProps {
  date: Date
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onEventCreate?: (date: Date, timeSlot?: string) => void
  showWeekends?: boolean
  className?: string
}

export function CalendarWeekView({
  date,
  events,
  onEventClick,
  onEventCreate,
  showWeekends = true,
  className
}: CalendarWeekViewProps) {
  const weekDays = getWeekDays(date)
  const displayDays = showWeekends ? weekDays : weekDays.slice(0, 5) // Mon-Fri only
  
  // Generate time slots for the week (10 AM to 4 PM)
  const timeSlots = generateDayTimeSlots(10, 16, 90) // 1.5 hour slots by default
  
  // Detect mobile for responsive layout
  const [isMobile, setIsMobile] = React.useState(false)
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleTimeSlotClick = (day: Date, timeSlot: string) => {
    if (onEventCreate) {
      onEventCreate(day, timeSlot)
    }
  }

  const handleEventClick = (event: CalendarEvent) => {
    if (onEventClick) {
      onEventClick(event)
    }
  }

  const EventChip = ({ event }: { event: CalendarEvent }) => (
    <div
      className={cn(
        "p-2 rounded text-xs cursor-pointer transition-all hover:shadow-sm hover:scale-105 mb-1",
        event.className
      )}
      onClick={() => handleEventClick(event)}
    >
      <div className="font-medium truncate">
        {event.extendedProps?.subjectName || event.extendedProps?.subjectCode}
      </div>
      <div className="opacity-90 truncate">
        {event.extendedProps?.facultyName}
      </div>
      <div className="flex items-center gap-1 mt-1 opacity-75">
        <Clock className="h-3 w-3" />
        <span>
          {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
        </span>
      </div>
    </div>
  )

  const TimeSlotCell = ({ day, timeSlot }: { day: Date; timeSlot: { time: string; label: string } }) => {
    const cellEvents = getEventsForTimeSlot(events, day, timeSlot.time)
    const isEmpty = cellEvents.length === 0

    return (
      <div className="min-h-[100px] p-2 border-r border-b border-border/50">
        {isEmpty ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-full border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors text-xs"
            onClick={() => handleTimeSlotClick(day, timeSlot.time)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        ) : (
          <div className="space-y-1">
            {cellEvents.map((event) => (
              <EventChip key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const DayHeader = ({ day }: { day: Date }) => {
    const dayEvents = events.filter(event => isSameDay(event.start, day))
    const totalCredits = dayEvents.reduce((acc, event) => acc + (event.extendedProps?.credits || 0), 0)

    return (
      <div className={cn(
        "p-3 border-r border-b bg-muted/30 text-center",
        isToday(day) && "bg-primary/10 border-primary/30"
      )}>
        <div className="font-medium text-sm">
          {format(day, 'EEE')}
        </div>
        <div className={cn(
          "text-lg font-semibold",
          isToday(day) && "text-primary"
        )}>
          {format(day, 'd')}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {dayEvents.length} class{dayEvents.length !== 1 ? 'es' : ''}
        </div>
        {totalCredits > 0 && (
          <Badge variant="secondary" className="text-xs mt-1">
            {totalCredits} credits
          </Badge>
        )}
      </div>
    )
  }

  const TimeHeader = ({ timeSlot }: { timeSlot: { time: string; label: string } }) => (
    <div className="w-20 flex-shrink-0 p-3 bg-muted/30 border-r border-b text-center">
      <div className="text-sm font-medium">{timeSlot.time}</div>
      <div className="text-xs text-muted-foreground">
        {formatDuration(90)}
      </div>
    </div>
  )

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Week Header */}
      <div className="flex-shrink-0 p-4 bg-background border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {events.length} total class{events.length !== 1 ? 'es' : ''} this week
            </p>
          </div>
          
          {/* Week Stats */}
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium">
                {events.reduce((acc, event) => acc + (event.extendedProps?.credits || 0), 0)}
              </div>
              <div className="text-muted-foreground">Credits</div>
            </div>
            <div className="text-center">
              <div className="font-medium">
                {displayDays.filter(day => 
                  events.some(event => isSameDay(event.start, day))
                ).length}
              </div>
              <div className="text-muted-foreground">Active Days</div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid - Responsive Layout */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {isMobile ? (
            // Mobile: Vertical scrolling layout
            <div className="space-y-4 p-4">
              {displayDays.map((day) => {
                const dayEvents = events.filter(event => isSameDay(event.start, day))
                return (
                  <Card key={day.toISOString()} className="overflow-hidden">
                    <div className={cn(
                      "p-3 border-b bg-muted/30 text-center",
                      isToday(day) && "bg-primary/10 border-primary/30"
                    )}>
                      <div className="font-medium text-sm">
                        {format(day, 'EEEE')}
                      </div>
                      <div className={cn(
                        "text-xl font-semibold",
                        isToday(day) && "text-primary"
                      )}>
                        {format(day, 'MMM d')}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {dayEvents.length} class{dayEvents.length !== 1 ? 'es' : ''}
                      </div>
                    </div>
                    
                    <div className="p-3 space-y-2">
                      {dayEvents.length > 0 ? (
                        dayEvents.map((event) => (
                          <EventChip key={event.id} event={event} />
                        ))
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          <Button
                            variant="ghost"
                            className="w-full border-2 border-dashed border-muted-foreground/25"
                            onClick={() => handleTimeSlotClick(day, '09:00')}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add class
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            // Desktop: Grid layout
            <div className="grid" style={{ gridTemplateColumns: `80px repeat(${displayDays.length}, 1fr)` }}>
              {/* Header Row */}
              <div className="sticky top-0 bg-background z-10 grid" style={{ gridTemplateColumns: 'subgrid', gridColumn: '1 / -1' }}>
                {/* Empty corner cell */}
                <div className="w-20 border-r border-b bg-muted/50"></div>
                
                {/* Day Headers */}
                {displayDays.map((day) => (
                  <DayHeader key={day.toISOString()} day={day} />
                ))}
              </div>

              {/* Time Slot Rows */}
              {timeSlots.map((timeSlot) => (
                <React.Fragment key={timeSlot.time}>
                  {/* Time Header */}
                  <TimeHeader timeSlot={timeSlot} />
                  
                  {/* Day Cells */}
                  {displayDays.map((day) => (
                    <TimeSlotCell 
                      key={`${day.toISOString()}-${timeSlot.time}`}
                      day={day}
                      timeSlot={timeSlot}
                    />
                  ))}
                </React.Fragment>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Week Summary */}
      {events.length === 0 && (
        <div className="flex-shrink-0 p-8 text-center">
          <div className="text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
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