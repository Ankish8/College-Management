import { CalendarEvent } from '@/types/timetable'
import { format, parse, addMinutes, isBefore, isAfter } from 'date-fns'

export interface BreakTime {
  id: string
  name: string
  startTime: string
  endTime: string
  duration: number
  type: 'SHORT' | 'LUNCH' | 'CUSTOM'
  isDefault: boolean
}

export interface BreakSlot {
  id: string
  name: string
  startTime: string
  endTime: string
  duration: number
  type: 'SHORT' | 'LUNCH' | 'CUSTOM'
  date: Date
  isEmpty: boolean
  isOverridden: boolean
  conflictingEvents?: CalendarEvent[]
}

// Default break times
export const DEFAULT_BREAKS: BreakTime[] = [
  {
    id: 'morning-break',
    name: 'Morning Break',
    startTime: '10:30',
    endTime: '10:45',
    duration: 15,
    type: 'SHORT',
    isDefault: true
  },
  {
    id: 'lunch-break',
    name: 'Lunch Break',
    startTime: '12:30',
    endTime: '13:15',
    duration: 45,
    type: 'LUNCH',
    isDefault: true
  },
  {
    id: 'afternoon-break',
    name: 'Afternoon Break',
    startTime: '15:30',
    endTime: '15:45',
    duration: 15,
    type: 'SHORT',
    isDefault: true
  }
]

/**
 * Get break slots for a specific date
 */
export function getBreakSlotsForDate(
  date: Date, 
  events: CalendarEvent[], 
  customBreaks: BreakTime[] = []
): BreakSlot[] {
  const allBreaks = [...DEFAULT_BREAKS, ...customBreaks]
  
  return allBreaks.map(breakTime => {
    const startDateTime = parse(breakTime.startTime, 'HH:mm', date)
    const endDateTime = parse(breakTime.endTime, 'HH:mm', date)
    
    // Check if any events conflict with this break time
    const conflictingEvents = events.filter(event => {
      const eventStart = new Date(event.start)
      const eventEnd = new Date(event.end)
      
      // Check for time overlap
      return (
        (startDateTime >= eventStart && startDateTime < eventEnd) ||
        (endDateTime > eventStart && endDateTime <= eventEnd) ||
        (startDateTime <= eventStart && endDateTime >= eventEnd)
      )
    })
    
    return {
      id: `${breakTime.id}-${format(date, 'yyyy-MM-dd')}`,
      name: breakTime.name,
      startTime: breakTime.startTime,
      endTime: breakTime.endTime,
      duration: breakTime.duration,
      type: breakTime.type,
      date,
      isEmpty: conflictingEvents.length === 0,
      isOverridden: conflictingEvents.length > 0,
      conflictingEvents
    }
  })
}

/**
 * Check if a time slot conflicts with break times
 */
export function isConflictingWithBreak(
  startTime: string,
  endTime: string,
  date: Date,
  breaks: BreakTime[] = DEFAULT_BREAKS
): { hasConflict: boolean; conflictingBreaks: BreakTime[] } {
  const startDateTime = parse(startTime, 'HH:mm', date)
  const endDateTime = parse(endTime, 'HH:mm', date)
  
  const conflictingBreaks = breaks.filter(breakTime => {
    const breakStart = parse(breakTime.startTime, 'HH:mm', date)
    const breakEnd = parse(breakTime.endTime, 'HH:mm', date)
    
    // Check for time overlap
    return (
      (startDateTime >= breakStart && startDateTime < breakEnd) ||
      (endDateTime > breakStart && endDateTime <= breakEnd) ||
      (startDateTime <= breakStart && endDateTime >= breakEnd)
    )
  })
  
  return {
    hasConflict: conflictingBreaks.length > 0,
    conflictingBreaks
  }
}

/**
 * Generate time slots with break indicators
 */
export function generateTimeSlotsWithBreaks(
  startHour: number = 8,
  endHour: number = 18,
  intervalMinutes: number = 60,
  breaks: BreakTime[] = DEFAULT_BREAKS
): Array<{ 
  time: string; 
  label: string; 
  isBreak: boolean; 
  breakInfo?: BreakTime;
  slotType: 'CLASS' | 'BREAK' 
}> {
  const slots: Array<{ 
    time: string; 
    label: string; 
    isBreak: boolean; 
    breakInfo?: BreakTime;
    slotType: 'CLASS' | 'BREAK' 
  }> = []
  
  // First, generate all class time slots
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      const nextHour = minute + intervalMinutes >= 60 ? hour + 1 : hour
      const nextMinute = (minute + intervalMinutes) % 60
      const endTime = `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`
      
      slots.push({
        time,
        label: `${time} - ${endTime}`,
        isBreak: false,
        slotType: 'CLASS'
      })
    }
  }
  
  // Insert break slots in the appropriate positions
  const allSlots = [...slots]
  
  breaks.forEach(breakTime => {
    const breakTimeSlot = {
      time: breakTime.startTime,
      label: `${breakTime.name} (${breakTime.startTime} - ${breakTime.endTime})`,
      isBreak: true,
      breakInfo: breakTime,
      slotType: 'BREAK' as const
    }
    
    // Find the correct position to insert the break
    const insertIndex = allSlots.findIndex(slot => slot.time > breakTime.startTime)
    if (insertIndex !== -1) {
      allSlots.splice(insertIndex, 0, breakTimeSlot)
    } else {
      allSlots.push(breakTimeSlot)
    }
  })
  
  // Sort all slots by time
  return allSlots.sort((a, b) => {
    const timeA = parse(a.time, 'HH:mm', new Date())
    const timeB = parse(b.time, 'HH:mm', new Date())
    return timeA.getTime() - timeB.getTime()
  })
}

/**
 * Get break time styling classes
 */
export function getBreakStyling(breakType: 'SHORT' | 'LUNCH' | 'CUSTOM'): {
  background: string;
  text: string;
  border: string;
  icon: string;
} {
  switch (breakType) {
    case 'SHORT':
      return {
        background: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-300',
        icon: '☕'
      }
    case 'LUNCH':
      return {
        background: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-300',
        icon: '🍽️'
      }
    case 'CUSTOM':
      return {
        background: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-300',
        icon: '⏸️'
      }
    default:
      return {
        background: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-300',
        icon: '⏸️'
      }
  }
}

/**
 * Calculate total break time for a day
 */
export function calculateTotalBreakTime(breaks: BreakTime[]): number {
  return breaks.reduce((total, breakTime) => total + breakTime.duration, 0)
}

/**
 * Check if a class spans across a break time
 */
export function checkClassSpansBreak(
  classStart: string,
  classEnd: string,
  date: Date,
  breaks: BreakTime[] = DEFAULT_BREAKS
): { spansBreak: boolean; affectedBreaks: BreakTime[] } {
  const classStartTime = parse(classStart, 'HH:mm', date)
  const classEndTime = parse(classEnd, 'HH:mm', date)
  
  const affectedBreaks = breaks.filter(breakTime => {
    const breakStart = parse(breakTime.startTime, 'HH:mm', date)
    const breakEnd = parse(breakTime.endTime, 'HH:mm', date)
    
    // Check if the class completely contains the break
    return classStartTime <= breakStart && classEndTime >= breakEnd
  })
  
  return {
    spansBreak: affectedBreaks.length > 0,
    affectedBreaks
  }
}