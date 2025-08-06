"use client"

import React, { useState } from 'react'
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
import { Plus, Clock, Users, Check } from 'lucide-react'
import { format, isSameDay, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import { QuickCreatePopup } from './quick-create-popup'
import { TimetableEntryContextMenu } from './timetable-entry-context-menu'
import { HolidayEventCard } from './holiday-event-card'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { 
  Pencil, 
  Trash2, 
  Calendar as CalendarIcon,
  Info,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { 
  fetchAttendanceStatus, 
  mergeAttendanceWithEvents, 
  getAttendanceHeatmapColor, 
  getAttendanceDotColor 
} from '@/lib/utils/attendance-status'

interface CalendarWeekViewProps {
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
  showWeekends?: boolean
  className?: string
  onCheckConflicts?: (facultyId: string, dayOfWeek: string, timeSlot: string, excludeEventId?: string) => Promise<boolean>
}

export function CalendarWeekView({
  date,
  events,
  batchId,
  onEventClick,
  onEventCreate,
  onQuickCreate,
  subjects = [],
  showWeekends = true,
  className,
  onCheckConflicts
}: CalendarWeekViewProps) {
  const weekDays = getWeekDays(date)
  const displayDays = showWeekends ? weekDays : weekDays.slice(0, 5) // Mon-Fri only
  
  // Generate time slots for the week (10 AM to 4 PM)
  const timeSlots = generateDayTimeSlots(10, 16, 90) // 1.5 hour slots by default
  
  // Detect mobile for responsive layout
  const [isMobile, setIsMobile] = React.useState(false)
  
  // State for popup management
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [eventsWithAttendance, setEventsWithAttendance] = React.useState<CalendarEvent[]>(events)
  const [isLoadingAttendance, setIsLoadingAttendance] = React.useState(false)
  
  const { toast } = useToast()
  const router = useRouter()
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch attendance status when events change
  React.useEffect(() => {
    const loadAttendanceStatus = async () => {
      if (events.length === 0) {
        setEventsWithAttendance([])
        return
      }

      setIsLoadingAttendance(true)
      try {
        const attendanceStatus = await fetchAttendanceStatus(events)
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

  const handleTimeSlotClick = (day: Date, timeSlot: string, event?: React.MouseEvent) => {
    if (onQuickCreate && subjects.length > 0 && event) {
      // Use the new popup system
      setPopupPosition({ x: event.clientX, y: event.clientY })
      setSelectedTimeSlot(timeSlot)
      setSelectedDate(day)
      setIsPopupOpen(true)
    } else if (onEventCreate) {
      // Fallback to the old modal system
      onEventCreate(day, timeSlot)
    }
  }

  const handlePopupClose = () => {
    setIsPopupOpen(false)
    setSelectedTimeSlot('')
    setSelectedDate(new Date())
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
    setSelectedDate(new Date())
  }

  const handleEventClick = (event: CalendarEvent) => {
    if (onEventClick) {
      onEventClick(event)
    }
  }

  const EventChip = ({ event }: { event: CalendarEvent }) => {
    const handleMarkAttendance = (e: React.MouseEvent) => {
      e.stopPropagation() // Prevent card click from triggering
      
      const subjectId = event.extendedProps?.subjectId
      const batchId = event.extendedProps?.batchId
      
      if (subjectId && batchId) {
        const today = new Date().toISOString().split('T')[0]
        const attendanceUrl = `/attendance?batch=${batchId}&subject=${subjectId}&date=${today}`
        window.location.href = attendanceUrl
      }
    }

    return (
      <TimetableEntryContextMenu 
        event={event}
        canMarkAttendance={true}
      >
        <div
          className={cn(
            "p-2 rounded text-xs cursor-pointer transition-all hover:shadow-sm hover:scale-105 mb-1 relative",
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
          <div className="space-y-1 mt-1">
            {/* Time and Attendance Status Row */}
            <div className="flex items-center justify-between gap-1 opacity-75">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                </span>
                {/* Attendance status indicators */}
                {event.extendedProps?.attendance?.isMarked && (
                  <div className="flex items-center gap-1 ml-1">
                    <Check className="h-3 w-3 text-green-600 opacity-70" />
                    <div 
                      className={cn(
                        "h-1.5 w-1.5 rounded-full", 
                        getAttendanceDotColor(event.extendedProps.attendance.attendancePercentage)
                      )}
                      title={`${event.extendedProps.attendance.presentStudents}/${event.extendedProps.attendance.totalStudents} students (${event.extendedProps.attendance.attendancePercentage}%)`}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Mark Attendance Button Row */}
            <div className="flex justify-end">
              <button
                onClick={handleMarkAttendance}
                className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors cursor-pointer"
                title="Mark Attendance"
              >
                Mark Attendance
              </button>
            </div>

            {/* Heat map bar at bottom */}
            {event.extendedProps?.attendance?.isMarked && (
              <div className="h-0.5 rounded overflow-hidden">
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

  const TimeSlotCell = ({ day, timeSlot }: { day: Date; timeSlot: { time: string; label: string } }) => {
    const cellEvents = getEventsForTimeSlot(eventsWithAttendance, day, timeSlot.time)
    const isEmpty = cellEvents.length === 0

    return (
      <div className="min-h-[100px] p-2 border-r border-b border-border/50">
        {isEmpty ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-full border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors text-xs"
            onClick={(e) => handleTimeSlotClick(day, timeSlot.time, e)}
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
    const dayEvents = eventsWithAttendance.filter(event => isSameDay(event.start, day))
    const regularEvents = dayEvents.filter(event => !event.allDay)
    const holidayEvents = dayEvents.filter(event => event.allDay)
    const totalCredits = regularEvents.reduce((acc, event) => acc + (event.extendedProps?.credits || 0), 0)
    const hasHoliday = holidayEvents.length > 0

    return (
      <div className={cn(
        "p-3 border-r border-b text-center",
        hasHoliday ? "bg-red-50 border-red-200" : "bg-muted/30",
        isToday(day) && !hasHoliday && "bg-primary/10 border-primary/30",
        isToday(day) && hasHoliday && "bg-red-100 border-red-300"
      )}>
        <div className="font-medium text-sm">
          {format(day, 'EEE')}
        </div>
        <div className={cn(
          "text-lg font-semibold",
          hasHoliday ? "text-red-700" : isToday(day) ? "text-primary" : ""
        )}>
          {format(day, 'd')}
        </div>
        {hasHoliday ? (
          <div className="text-xs text-red-600 mt-1 font-medium">
            🎊 Holiday
          </div>
        ) : (
          <div className="text-xs text-muted-foreground mt-1">
            {regularEvents.length} class{regularEvents.length !== 1 ? 'es' : ''}
          </div>
        )}
        {totalCredits > 0 && !hasHoliday && (
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
              {eventsWithAttendance.filter(event => !event.allDay).length} class{eventsWithAttendance.filter(event => !event.allDay).length !== 1 ? 'es' : ''}{eventsWithAttendance.some(event => event.allDay) ? ', ' + eventsWithAttendance.filter(event => event.allDay).length + ' holiday' + (eventsWithAttendance.filter(event => event.allDay).length !== 1 ? 's' : '') : ''} this week
            </p>
          </div>
          
          {/* Week Stats */}
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium">
                {eventsWithAttendance.filter(event => !event.allDay).reduce((acc, event) => acc + (event.extendedProps?.credits || 0), 0)}
              </div>
              <div className="text-muted-foreground">Credits</div>
            </div>
            <div className="text-center">
              <div className="font-medium">
                {displayDays.filter(day => 
                  eventsWithAttendance.some(event => !event.allDay && isSameDay(event.start, day))
                ).length}
              </div>
              <div className="text-muted-foreground">Class Days</div>
            </div>
            {eventsWithAttendance.some(event => event.allDay) && (
              <div className="text-center">
                <div className="font-medium text-red-600">
                  {eventsWithAttendance.filter(event => event.allDay).length}
                </div>
                <div className="text-red-600">Holidays</div>
              </div>
            )}
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
                const dayEvents = eventsWithAttendance.filter(event => isSameDay(event.start, day))
                const regularEvents = dayEvents.filter(event => !event.allDay)
                const holidayEvents = dayEvents.filter(event => event.allDay)
                const hasHoliday = holidayEvents.length > 0
                
                return (
                  <Card key={day.toISOString()} className="overflow-hidden">
                    <div className={cn(
                      "p-3 border-b text-center",
                      hasHoliday ? "bg-red-50 border-red-200" : "bg-muted/30",
                      isToday(day) && !hasHoliday && "bg-primary/10 border-primary/30",
                      isToday(day) && hasHoliday && "bg-red-100 border-red-300"
                    )}>
                      <div className="font-medium text-sm">
                        {format(day, 'EEEE')}
                      </div>
                      <div className={cn(
                        "text-xl font-semibold",
                        hasHoliday ? "text-red-700" : isToday(day) ? "text-primary" : ""
                      )}>
                        {format(day, 'MMM d')}
                      </div>
                      {hasHoliday ? (
                        <div className="text-xs text-red-600 mt-1 font-medium">
                          🎊 Holiday
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground mt-1">
                          {regularEvents.length} class{regularEvents.length !== 1 ? 'es' : ''}
                        </div>
                      )}
                    </div>
                    
                    <div className="p-3 space-y-2">
                      {/* Show holidays first */}
                      {holidayEvents.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-red-800 mb-2">🎊 Holiday Events</div>
                          {holidayEvents.map((event) => (
                            <ContextMenu key={event.id}>
                              <ContextMenuTrigger asChild>
                                <div 
                                  className="bg-red-500 text-white rounded px-3 py-2 text-sm font-medium cursor-pointer hover:bg-red-600 transition-colors"
                                  onClick={() => handleEventClick(event)}
                                >
                                  Holiday: {event.title}
                                </div>
                              </ContextMenuTrigger>
                              <ContextMenuContent className="w-56" style={{ zIndex: 99999 }}>
                                <ContextMenuItem 
                                  onClick={() => {
                                    toast({
                                      title: "Holiday Details",
                                      description: event.title || "Holiday",
                                    })
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Info className="h-4 w-4" />
                                  View Details
                                </ContextMenuItem>
                                
                                <ContextMenuSeparator />
                                
                                <ContextMenuItem 
                                  onClick={() => {
                                    toast({
                                      title: "Edit Holiday",
                                      description: "Edit feature coming soon!",
                                    })
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit Holiday
                                </ContextMenuItem>
                                
                                <ContextMenuItem 
                                  onClick={() => {
                                    toast({
                                      title: "Reschedule",
                                      description: "Reschedule feature coming soon!",
                                    })
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <CalendarIcon className="h-4 w-4" />
                                  Reschedule
                                </ContextMenuItem>
                                
                                <ContextMenuSeparator />
                                
                                <ContextMenuItem 
                                  onClick={async () => {
                                    if (!confirm(`Are you sure you want to delete this holiday?`)) {
                                      return
                                    }
                                    
                                    try {
                                      const deleteId = event.extendedProps?.holidayId || event.id
                                      const response = await fetch(`/api/settings/holidays/${deleteId}`, {
                                        method: 'DELETE',
                                      })
                                      
                                      if (!response.ok) {
                                        throw new Error('Failed to delete holiday')
                                      }
                                      
                                      toast({
                                        title: "Holiday Deleted",
                                        description: `${event.title} has been deleted successfully`,
                                      })
                                      
                                      router.refresh()
                                    } catch (error) {
                                      toast({
                                        title: "Error",
                                        description: "Failed to delete holiday. Please try again.",
                                        variant: "destructive"
                                      })
                                    }
                                  }}
                                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete Holiday
                                </ContextMenuItem>
                              </ContextMenuContent>
                            </ContextMenu>
                          ))}
                        </div>
                      )}
                      
                      {/* Show regular events */}
                      {regularEvents.length > 0 && (
                        <div className="space-y-2">
                          {holidayEvents.length > 0 && (
                            <div className="text-xs font-medium text-muted-foreground mb-2">Classes</div>
                          )}
                          {regularEvents.map((event) => (
                            <EventChip key={event.id} event={event} />
                          ))}
                        </div>
                      )}
                      
                      {/* Show add button only if no holidays */}
                      {dayEvents.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                          <Button
                            variant="ghost"
                            className="w-full border-2 border-dashed border-muted-foreground/25"
                            onClick={(e) => handleTimeSlotClick(day, '09:00', e)}
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
            <div className="grid relative" style={{ gridTemplateColumns: `80px repeat(${displayDays.length}, 1fr)`, isolation: 'isolate' }}>
              {/* Header Row */}
              <div className="sticky top-0 bg-background z-10 grid" style={{ gridTemplateColumns: 'subgrid', gridColumn: '1 / -1' }}>
                {/* Empty corner cell */}
                <div className="w-20 border-r border-b bg-muted/50"></div>
                
                {/* Day Headers */}
                {displayDays.map((day) => (
                  <DayHeader key={day.toISOString()} day={day} />
                ))}
              </div>

              {/* All-Day Events Row */}
              {eventsWithAttendance.some(event => event.allDay) && (
                <>
                  {/* All-Day Header */}
                  <div className="w-20 flex-shrink-0 p-3 bg-red-100 border-r border-b text-center border-red-200">
                    <div className="text-xs font-medium text-red-800">
                      All-Day
                    </div>
                    <div className="text-xs text-red-600">
                      Events
                    </div>
                  </div>
                  
                  {/* All-Day Event Cells */}
                  {displayDays.map((day) => {
                    const dayHolidays = eventsWithAttendance.filter(event => event.allDay && isSameDay(event.start, day))
                    
                    return (
                      <div 
                        key={`${day.toISOString()}-allday`} 
                        className="min-h-[60px] p-2 border-r border-b border-red-200 bg-red-50"
                      >
                        {dayHolidays.length > 0 ? (
                          dayHolidays.map((event) => (
                            <ContextMenu key={event.id}>
                              <ContextMenuTrigger asChild>
                                <div 
                                  className="bg-red-500 text-white rounded px-3 py-2 text-sm font-medium cursor-pointer hover:bg-red-600 transition-colors text-center px-2 py-1 text-xs mb-1"
                                  onClick={() => handleEventClick(event)}
                                >
                                  Holiday: {event.title}
                                </div>
                              </ContextMenuTrigger>
                              <ContextMenuContent className="w-56" style={{ zIndex: 99999 }}>
                                <ContextMenuItem 
                                  onClick={() => {
                                    toast({
                                      title: "Holiday Details",
                                      description: event.title || "Holiday",
                                    })
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Info className="h-4 w-4" />
                                  View Details
                                </ContextMenuItem>
                                
                                <ContextMenuSeparator />
                                
                                <ContextMenuItem 
                                  onClick={() => {
                                    toast({
                                      title: "Edit Holiday",
                                      description: "Edit feature coming soon!",
                                    })
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit Holiday
                                </ContextMenuItem>
                                
                                <ContextMenuItem 
                                  onClick={() => {
                                    toast({
                                      title: "Reschedule",
                                      description: "Reschedule feature coming soon!",
                                    })
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <CalendarIcon className="h-4 w-4" />
                                  Reschedule
                                </ContextMenuItem>
                                
                                <ContextMenuSeparator />
                                
                                <ContextMenuItem 
                                  onClick={async () => {
                                    if (!confirm(`Are you sure you want to delete this holiday?`)) {
                                      return
                                    }
                                    
                                    try {
                                      const deleteId = event.extendedProps?.holidayId || event.id
                                      const response = await fetch(`/api/settings/holidays/${deleteId}`, {
                                        method: 'DELETE',
                                      })
                                      
                                      if (!response.ok) {
                                        throw new Error('Failed to delete holiday')
                                      }
                                      
                                      toast({
                                        title: "Holiday Deleted",
                                        description: `${event.title} has been deleted successfully`,
                                      })
                                      
                                      router.refresh()
                                    } catch (error) {
                                      toast({
                                        title: "Error",
                                        description: "Failed to delete holiday. Please try again.",
                                        variant: "destructive"
                                      })
                                    }
                                  }}
                                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete Holiday
                                </ContextMenuItem>
                              </ContextMenuContent>
                            </ContextMenu>
                          ))
                        ) : (
                          <div className="h-full opacity-30"></div>
                        )}
                      </div>
                    )
                  })}
                </>
              )}

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
      {eventsWithAttendance.length === 0 && (
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

      {/* Quick Create Popup */}
      <QuickCreatePopup
        isOpen={isPopupOpen}
        onClose={handlePopupClose}
        onCreateEvent={handleQuickCreate}
        position={popupPosition}
        date={selectedDate}
        timeSlot={selectedTimeSlot}
        batchId={batchId || eventsWithAttendance[0]?.extendedProps?.batchId || ''}
        dayOfWeek={format(selectedDate, 'EEEE').toUpperCase()}
        subjects={subjects}
        onCheckConflicts={onCheckConflicts}
      />
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