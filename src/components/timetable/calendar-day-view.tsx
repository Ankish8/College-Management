"use client"

import { CalendarEvent, CalendarView } from '@/types/timetable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Clock, Users, BookOpen, ChevronLeft, ChevronRight, Filter, Check } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { QuickCreatePopup } from './quick-create-popup'
import { TimetableEntryContextMenu } from './timetable-entry-context-menu'
import { HolidayEventCard } from './holiday-event-card'
import { 
  fetchAttendanceStatus, 
  mergeAttendanceWithEvents, 
  getAttendanceHeatmapColor, 
  getAttendanceDotColor 
} from '@/lib/utils/attendance-status'

interface CalendarDayViewProps {
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
  onCheckConflicts?: (facultyId: string, dayOfWeek: string, timeSlot: string, excludeEventId?: string) => Promise<boolean>
}

export function CalendarDayView({
  date,
  events,
  batchId,
  onEventClick,
  onEventCreate,
  onQuickCreate,
  subjects = [],
  timeSlots = [],
  showWeekends = true,
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
}: CalendarDayViewProps) {
  // State for popup management
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')
  const [eventsWithAttendance, setEventsWithAttendance] = React.useState<CalendarEvent[]>(events)
  const [isLoadingAttendance, setIsLoadingAttendance] = React.useState(false)

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

  // Filter events for this specific day
  const dayEvents = eventsWithAttendance.filter(event => isSameDay(event.start, date))
  
  // Sort events by start time
  const sortedEvents = dayEvents.sort((a, b) => a.start.getTime() - b.start.getTime())
  
  // Get unique time slots from events and database time slots
  const allTimeSlots = new Set<string>()
  
  // Add time slots from database
  timeSlots
    .filter(slot => slot.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .forEach(slot => allTimeSlots.add(slot.name))
  
  // Add time slots from existing events (in case some events use time slots not in the database)
  dayEvents.forEach(event => {
    if (event.extendedProps?.timeSlotName) {
      allTimeSlots.add(event.extendedProps.timeSlotName)
    }
  })
  
  // Convert to array and create time slot objects
  const displayTimeSlots = Array.from(allTimeSlots).map(timeSlotName => {
    // Try to find in database first
    const dbTimeSlot = timeSlots.find(slot => slot.name === timeSlotName)
    if (dbTimeSlot) {
      return {
        name: dbTimeSlot.name,
        startTime: dbTimeSlot.startTime,
        endTime: dbTimeSlot.endTime
      }
    }
    
    // Fallback: parse from name (format: "HH:MM-HH:MM")
    const [startTime, endTime] = timeSlotName.split('-')
    return {
      name: timeSlotName,
      startTime: startTime || timeSlotName,
      endTime: endTime || timeSlotName
    }
  }).sort((a, b) => {
    // Sort by start time
    return a.startTime.localeCompare(b.startTime)
  })

  const handleTimeSlotClick = (timeSlot: string, event: React.MouseEvent) => {
    if (onQuickCreate && subjects.length > 0) {
      // Use the new popup system
      setPopupPosition({ x: event.clientX, y: event.clientY })
      setSelectedTimeSlot(timeSlot)
      setIsPopupOpen(true)
    } else if (onEventCreate) {
      // Fallback to the old modal system
      onEventCreate(date, timeSlot)
    }
  }

  const handlePopupClose = () => {
    setIsPopupOpen(false)
    setSelectedTimeSlot('')
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
    if (onQuickCreate && data.subjectId && data.facultyId) {
      // Handle regular subject creation
      onQuickCreate({
        subjectId: data.subjectId,
        facultyId: data.facultyId,
        date: data.date,
        timeSlot: data.timeSlot
      })
    } else if (data.isCustomEvent || data.isHoliday) {
      // Handle custom events and holidays - these would need different handling
      // For now, we'll log them since the parent onQuickCreate only handles subjects
      console.log('Custom event or holiday creation not handled by this view:', data)
    }
    setIsPopupOpen(false)
    setSelectedTimeSlot('')
  }

  const handleEventClick = (event: CalendarEvent) => {
    if (onEventClick) {
      onEventClick(event)
    }
  }

  const EventCard = ({ event }: { event: CalendarEvent }) => {
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
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            event.className
          )}
          onClick={() => handleEventClick(event)}
        >
          <CardContent className="p-3">
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-medium text-sm leading-tight">
                    {event.extendedProps?.subjectName || event.extendedProps?.subjectCode}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {event.extendedProps?.facultyName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.extendedProps?.subjectCode}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs ml-2">
                  {event.extendedProps?.entryType || 'REGULAR'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {event.extendedProps?.batchName}
                </div>
                {event.extendedProps?.credits && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {event.extendedProps.credits} credits
                  </div>
                )}
              </div>

              {event.extendedProps?.notes && (
                <p className="text-xs text-muted-foreground mt-2">
                  {event.extendedProps.notes}
                </p>
              )}
              
              {/* Attendance Status and Mark Attendance Section */}
              <div className="pt-2 space-y-2">
                {/* Attendance Status Indicators */}
                {event.extendedProps?.attendance?.isMarked && (
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600 opacity-70" />
                    <div 
                      className={cn(
                        "h-2 w-2 rounded-full", 
                        getAttendanceDotColor(event.extendedProps.attendance.attendancePercentage)
                      )}
                      title={`${event.extendedProps.attendance.presentStudents}/${event.extendedProps.attendance.totalStudents} students (${event.extendedProps.attendance.attendancePercentage}%)`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {event.extendedProps.attendance.attendancePercentage}% present
                    </span>
                  </div>
                )}

                {/* Heat map bar */}
                {event.extendedProps?.attendance?.isMarked && (
                  <div className="h-1 rounded overflow-hidden">
                    <div 
                      className={cn(
                        "h-full w-full opacity-80",
                        getAttendanceHeatmapColor(event.extendedProps.attendance.attendancePercentage)
                      )}
                    />
                  </div>
                )}

                {/* Mark Attendance Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleMarkAttendance}
                    className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors cursor-pointer"
                    title="Mark Attendance"
                  >
                    Mark Attendance
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TimetableEntryContextMenu>
    )
  }

  const TimeSlotRow = ({ 
    timeSlot 
  }: { 
    timeSlot: { 
      name: string; 
      startTime: string; 
      endTime: string;
    } 
  }) => {
    // Find events for this specific time slot
    const slotEvents = dayEvents.filter(event => 
      event.extendedProps?.timeSlotName === timeSlot.name
    )
    const isEmpty = slotEvents.length === 0

    return (
      <div className="flex min-h-[100px] border-b border-border/50">
        {/* Time Column */}
        <div className="w-32 flex-shrink-0 p-4 bg-muted/30 border-r">
          <div className="text-sm font-medium">{timeSlot.startTime}</div>
          <div className="text-xs text-muted-foreground">to {timeSlot.endTime}</div>
          <div className="text-xs text-muted-foreground mt-1">
            50 min
          </div>
        </div>
        
        {/* Events Column */}
        <div className="flex-1 p-4">
          {isEmpty ? (
            <Button
              variant="ghost"
              className="w-full h-full border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors"
              onClick={(e) => handleTimeSlotClick(timeSlot.name, e)}
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
                {sortedEvents.filter(event => !event.allDay).length}
              </div>
              <div className="text-muted-foreground">Classes</div>
            </div>
          </div>
        </div>
      </div>

      {/* All-Day Events Section (Holidays, etc.) */}
      {dayEvents.some(event => event.allDay) && (
        <div className="flex-shrink-0 mb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg">
            <div className="p-3 border-b border-red-200 bg-red-100">
              <h3 className="text-sm font-medium text-red-800 flex items-center gap-2">
                🎊 Holiday / All-Day Events
              </h3>
            </div>
            <div className="p-3 space-y-2">
              {dayEvents.filter(event => event.allDay).map((event) => (
                <HolidayEventCard
                  key={event.id}
                  event={event}
                  onClick={onEventClick}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Time Slots Grid */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {displayTimeSlots.map((timeSlot) => (
            <TimeSlotRow key={timeSlot.name} timeSlot={timeSlot} />
          ))}
        </div>
      </ScrollArea>

      {/* Day Summary */}
      {dayEvents.filter(event => !event.allDay).length === 0 && !dayEvents.some(event => event.allDay) && (
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

      {/* Quick Create Popup */}
      <QuickCreatePopup
        isOpen={isPopupOpen}
        onClose={handlePopupClose}
        onCreateEvent={handleQuickCreate}
        position={popupPosition}
        date={date}
        timeSlot={selectedTimeSlot}
        batchId={batchId || eventsWithAttendance[0]?.extendedProps?.batchId || ''}
        dayOfWeek={format(date, 'EEEE').toUpperCase()}
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