import { 
  CalendarEvent, 
  TimeSlotMergeGroup, 
  TimetableEntry, 
  DayOfWeek,
  CalendarView 
} from '@/types/timetable'
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  parseISO,
  isEqual,
  isSameDay,
  differenceInMinutes,
  parse,
  startOfDay
} from 'date-fns'

/**
 * Convert timetable entry to calendar event
 */
export function timetableEntryToCalendarEvent(entry: TimetableEntry): CalendarEvent {
  const startTime = parse(entry.timeSlot.startTime, 'HH:mm', new Date())
  const endTime = parse(entry.timeSlot.endTime, 'HH:mm', new Date())
  
  // For specific date entries, use the provided date
  // For recurring entries, use current week's occurrence of the day
  let eventDate: Date
  if (entry.date) {
    eventDate = new Date(entry.date)
  } else {
    // Calculate the date for this week based on dayOfWeek
    const today = new Date()
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday = 1
    const dayIndex = getDayIndex(entry.dayOfWeek)
    eventDate = addDays(weekStart, dayIndex)
  }

  const start = new Date(eventDate)
  start.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0)
  
  const end = new Date(eventDate)
  end.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0)

  return {
    id: entry.id,
    title: `${entry.subject.name} - ${entry.faculty.name}`,
    start,
    end,
    extendedProps: {
      timetableEntryId: entry.id,
      batchId: entry.batchId,
      batchName: entry.batch.name,
      subjectId: entry.subjectId,
      subjectName: entry.subject.name,
      subjectCode: entry.subject.code,
      facultyId: entry.facultyId,
      facultyName: entry.faculty.name,
      timeSlotId: entry.timeSlotId,
      timeSlotName: entry.timeSlot.name,
      dayOfWeek: entry.dayOfWeek,
      entryType: entry.entryType,
      notes: entry.notes,
      credits: entry.subject.credits,
      specialization: entry.batch.specialization,
      program: entry.batch.program
    }
  }
}

/**
 * Convert day of week enum to index (0 = Monday, 6 = Sunday)
 */
export function getDayIndex(dayOfWeek: DayOfWeek): number {
  const dayMap: { [key in DayOfWeek]: number } = {
    MONDAY: 0,
    TUESDAY: 1,
    WEDNESDAY: 2,
    THURSDAY: 3,
    FRIDAY: 4,
    SATURDAY: 5,
    SUNDAY: 6
  }
  return dayMap[dayOfWeek]
}

/**
 * Convert index to day of week enum
 */
export function getIndexDay(index: number): DayOfWeek {
  const days: DayOfWeek[] = [
    'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'
  ]
  return days[index % 7]
}

/**
 * Merge consecutive time slots for the same subject and faculty
 */
export function mergeConsecutiveTimeSlots(events: CalendarEvent[]): TimeSlotMergeGroup[] {
  // Group events by date and sort by start time
  const eventsByDate = new Map<string, CalendarEvent[]>()
  
  events.forEach(event => {
    const dateKey = format(event.start, 'yyyy-MM-dd')
    if (!eventsByDate.has(dateKey)) {
      eventsByDate.set(dateKey, [])
    }
    eventsByDate.get(dateKey)!.push(event)
  })

  const mergedGroups: TimeSlotMergeGroup[] = []

  eventsByDate.forEach(dayEvents => {
    // Sort events by start time
    dayEvents.sort((a, b) => a.start.getTime() - b.start.getTime())

    let currentGroup: CalendarEvent[] = []
    let groupStartTime = ''
    let groupEndTime = ''

    for (let i = 0; i < dayEvents.length; i++) {
      const event = dayEvents[i]
      const nextEvent = dayEvents[i + 1]

      if (currentGroup.length === 0) {
        // Start new group
        currentGroup = [event]
        groupStartTime = format(event.start, 'HH:mm')
        groupEndTime = format(event.end, 'HH:mm')
      } else {
        // Check if this event can be merged with current group
        const lastEvent = currentGroup[currentGroup.length - 1]
        const canMerge = 
          event.extendedProps?.subjectId === lastEvent.extendedProps?.subjectId &&
          event.extendedProps?.facultyId === lastEvent.extendedProps?.facultyId &&
          event.start.getTime() === lastEvent.end.getTime() // Consecutive time slots

        if (canMerge) {
          currentGroup.push(event)
          groupEndTime = format(event.end, 'HH:mm')
        } else {
          // Finalize current group and start new one
          mergedGroups.push({
            startTime: groupStartTime,
            endTime: groupEndTime,
            events: [...currentGroup],
            duration: differenceInMinutes(
              parse(groupEndTime, 'HH:mm', new Date()),
              parse(groupStartTime, 'HH:mm', new Date())
            ),
            isConsecutive: currentGroup.length > 1
          })

          currentGroup = [event]
          groupStartTime = format(event.start, 'HH:mm')
          groupEndTime = format(event.end, 'HH:mm')
        }
      }

      // Handle last event
      if (i === dayEvents.length - 1) {
        mergedGroups.push({
          startTime: groupStartTime,
          endTime: groupEndTime,
          events: [...currentGroup],
          duration: differenceInMinutes(
            parse(groupEndTime, 'HH:mm', new Date()),
            parse(groupStartTime, 'HH:mm', new Date())
          ),
          isConsecutive: currentGroup.length > 1
        })
      }
    }
  })

  return mergedGroups
}

/**
 * Get date range for a specific calendar view
 */
export function getViewDateRange(date: Date, view: CalendarView): { start: Date; end: Date } {
  switch (view) {
    case 'day':
      return {
        start: startOfDay(date),
        end: startOfDay(date)
      }
    case 'week':
      return {
        start: startOfWeek(date, { weekStartsOn: 1 }),
        end: endOfWeek(date, { weekStartsOn: 1 })
      }
    case 'month':
      return {
        start: startOfMonth(date),
        end: endOfMonth(date)
      }
    case 'year':
      return {
        start: startOfYear(date),
        end: endOfYear(date)
      }
    default:
      return {
        start: startOfWeek(date, { weekStartsOn: 1 }),
        end: endOfWeek(date, { weekStartsOn: 1 })
      }
  }
}

/**
 * Navigate date based on view and direction
 */
export function navigateDate(date: Date, view: CalendarView, direction: 'previous' | 'next'): Date {
  const multiplier = direction === 'next' ? 1 : -1

  switch (view) {
    case 'day':
      return addDays(date, multiplier)
    case 'week':
      return addWeeks(date, multiplier)
    case 'month':
      return addMonths(date, multiplier)
    case 'year':
      return addYears(date, multiplier)
    default:
      return addWeeks(date, multiplier)
  }
}

/**
 * Generate time slots for a day view
 */
export function generateDayTimeSlots(
  startHour: number = 8,
  endHour: number = 18,
  intervalMinutes: number = 60
): Array<{ time: string; label: string }> {
  const slots: Array<{ time: string; label: string }> = []
  
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      const nextHour = minute + intervalMinutes >= 60 ? hour + 1 : hour
      const nextMinute = (minute + intervalMinutes) % 60
      const endTime = `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`
      
      slots.push({
        time,
        label: `${time} - ${endTime}`
      })
    }
  }
  
  return slots
}

/**
 * Get events for a specific date
 */
export function getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
  return events.filter(event => isSameDay(event.start, date))
}

/**
 * Get events for a specific time slot
 */
export function getEventsForTimeSlot(
  events: CalendarEvent[], 
  date: Date, 
  timeSlot: string
): CalendarEvent[] {
  const [hour, minute] = timeSlot.split(':').map(Number)
  const slotTime = new Date(date)
  slotTime.setHours(hour, minute, 0, 0)

  return events.filter(event => {
    const eventDate = new Date(event.start)
    return isSameDay(eventDate, date) && 
           eventDate.getHours() === hour && 
           eventDate.getMinutes() === minute
  })
}

/**
 * Check if a time slot is available (no conflicts)
 */
export function isTimeSlotAvailable(
  events: CalendarEvent[],
  date: Date,
  startTime: string,
  endTime: string,
  batchId?: string
): boolean {
  const startDateTime = parse(startTime, 'HH:mm', date)
  const endDateTime = parse(endTime, 'HH:mm', date)

  return !events.some(event => {
    // If batchId is provided, only check conflicts for the same batch
    if (batchId && event.extendedProps?.batchId !== batchId) {
      return false
    }

    const eventStart = new Date(event.start)
    const eventEnd = new Date(event.end)

    // Check for time overlap
    return (
      isSameDay(eventStart, date) &&
      ((startDateTime >= eventStart && startDateTime < eventEnd) ||
       (endDateTime > eventStart && endDateTime <= eventEnd) ||
       (startDateTime <= eventStart && endDateTime >= eventEnd))
    )
  })
}

/**
 * Format duration in a human-readable way
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  
  return `${hours}h ${remainingMinutes}m`
}

/**
 * Get current week days for week view
 */
export function getWeekDays(date: Date): Date[] {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

/**
 * Generate calendar view title
 */
export function getCalendarViewTitle(date: Date, view: CalendarView): string {
  switch (view) {
    case 'day':
      return format(date, 'EEEE, MMMM d, yyyy')
    case 'week':
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
    case 'month':
      return format(date, 'MMMM yyyy')
    case 'year':
      return format(date, 'yyyy')
    default:
      return format(date, 'MMMM yyyy')
  }
}