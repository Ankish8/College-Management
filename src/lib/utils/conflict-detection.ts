import { CalendarEvent, ConflictInfo } from '@/types/timetable'
import { isSameDay, areIntervalsOverlapping } from 'date-fns'

export interface EventConflict {
  eventId: string
  conflictType: 'BATCH_DOUBLE_BOOKING' | 'FACULTY_CONFLICT' | 'TIME_OVERLAP' | 'BREAK_CONFLICT'
  conflictingEvents: CalendarEvent[]
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
}

export interface ConflictResult {
  hasConflicts: boolean
  conflicts: EventConflict[]
  conflictCount: number
  criticalCount: number
}

/**
 * Detect conflicts between calendar events
 */
export function detectEventConflicts(events: CalendarEvent[]): ConflictResult {
  const conflicts: EventConflict[] = []
  
  // Group events by date for efficient processing
  const eventsByDate = new Map<string, CalendarEvent[]>()
  events.forEach(event => {
    // Ensure event.start exists and is a valid Date
    if (!event.start) return
    
    const startDate = event.start instanceof Date ? event.start : new Date(event.start)
    if (isNaN(startDate.getTime())) return // Skip invalid dates
    
    const dateKey = startDate.toDateString()
    if (!eventsByDate.has(dateKey)) {
      eventsByDate.set(dateKey, [])
    }
    eventsByDate.get(dateKey)!.push(event)
  })

  eventsByDate.forEach((dayEvents, date) => {
    // Check for batch conflicts (same batch, overlapping time)
    conflicts.push(...detectBatchConflicts(dayEvents))
    
    // Check for faculty conflicts (same faculty, overlapping time)
    conflicts.push(...detectFacultyConflicts(dayEvents))
    
    // Check for general time overlaps
    conflicts.push(...detectTimeOverlaps(dayEvents))
  })

  const criticalCount = conflicts.filter(c => c.severity === 'CRITICAL').length

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    conflictCount: conflicts.length,
    criticalCount
  }
}

/**
 * Detect batch conflicts (same batch scheduled at overlapping times)
 */
function detectBatchConflicts(events: CalendarEvent[]): EventConflict[] {
  const conflicts: EventConflict[] = []
  const batchGroups = new Map<string, CalendarEvent[]>()

  // Group events by batch
  events.forEach(event => {
    const batchId = event.extendedProps?.batchId
    if (batchId) {
      if (!batchGroups.has(batchId)) {
        batchGroups.set(batchId, [])
      }
      batchGroups.get(batchId)!.push(event)
    }
  })

  // Check for overlaps within each batch
  batchGroups.forEach((batchEvents, batchId) => {
    for (let i = 0; i < batchEvents.length; i++) {
      for (let j = i + 1; j < batchEvents.length; j++) {
        const event1 = batchEvents[i]
        const event2 = batchEvents[j]

        // Ensure valid dates before checking overlap
        const event1Start = event1.start instanceof Date ? event1.start : new Date(event1.start)
        const event1End = event1.end instanceof Date ? event1.end : new Date(event1.end)
        const event2Start = event2.start instanceof Date ? event2.start : new Date(event2.start)
        const event2End = event2.end instanceof Date ? event2.end : new Date(event2.end)
        
        if (areIntervalsOverlapping(
          { start: event1Start, end: event1End },
          { start: event2Start, end: event2End }
        )) {
          conflicts.push({
            eventId: event1.id,
            conflictType: 'BATCH_DOUBLE_BOOKING',
            conflictingEvents: [event2],
            severity: 'CRITICAL',
            message: `Batch "${event1.extendedProps?.batchName}" has overlapping classes`
          })
        }
      }
    }
  })

  return conflicts
}

/**
 * Detect faculty conflicts (same faculty teaching multiple classes at overlapping times)
 */
function detectFacultyConflicts(events: CalendarEvent[]): EventConflict[] {
  const conflicts: EventConflict[] = []
  const facultyGroups = new Map<string, CalendarEvent[]>()

  // Group events by faculty
  events.forEach(event => {
    const facultyId = event.extendedProps?.facultyId
    if (facultyId) {
      if (!facultyGroups.has(facultyId)) {
        facultyGroups.set(facultyId, [])
      }
      facultyGroups.get(facultyId)!.push(event)
    }
  })

  // Check for overlaps within each faculty's schedule
  facultyGroups.forEach((facultyEvents, facultyId) => {
    for (let i = 0; i < facultyEvents.length; i++) {
      for (let j = i + 1; j < facultyEvents.length; j++) {
        const event1 = facultyEvents[i]
        const event2 = facultyEvents[j]

        // Ensure valid dates before checking overlap
        const event1Start = event1.start instanceof Date ? event1.start : new Date(event1.start)
        const event1End = event1.end instanceof Date ? event1.end : new Date(event1.end)
        const event2Start = event2.start instanceof Date ? event2.start : new Date(event2.start)
        const event2End = event2.end instanceof Date ? event2.end : new Date(event2.end)
        
        if (areIntervalsOverlapping(
          { start: event1Start, end: event1End },
          { start: event2Start, end: event2End }
        )) {
          conflicts.push({
            eventId: event1.id,
            conflictType: 'FACULTY_CONFLICT',
            conflictingEvents: [event2],
            severity: 'HIGH',
            message: `Faculty "${event1.extendedProps?.facultyName}" has overlapping teaching assignments`
          })
        }
      }
    }
  })

  return conflicts
}

/**
 * Detect general time overlaps between events
 */
function detectTimeOverlaps(events: CalendarEvent[]): EventConflict[] {
  const conflicts: EventConflict[] = []

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const event1 = events[i]
      const event2 = events[j]

      // Skip if same batch or faculty (already handled above)
      if (event1.extendedProps?.batchId === event2.extendedProps?.batchId ||
          event1.extendedProps?.facultyId === event2.extendedProps?.facultyId) {
        continue
      }

      // Ensure valid dates before checking overlap
      const event1Start = event1.start instanceof Date ? event1.start : new Date(event1.start)
      const event1End = event1.end instanceof Date ? event1.end : new Date(event1.end)
      const event2Start = event2.start instanceof Date ? event2.start : new Date(event2.start)
      const event2End = event2.end instanceof Date ? event2.end : new Date(event2.end)
      
      if (areIntervalsOverlapping(
        { start: event1Start, end: event1End },
        { start: event2Start, end: event2End }
      )) {
        conflicts.push({
          eventId: event1.id,
          conflictType: 'TIME_OVERLAP',
          conflictingEvents: [event2],
          severity: 'MEDIUM',
          message: `Time slot overlap detected between different classes`
        })
      }
    }
  }

  return conflicts
}

/**
 * Get conflict styling classes based on severity
 */
export function getConflictStyling(severity: EventConflict['severity']): {
  border: string
  background: string
  text: string
  indicator: string
} {
  switch (severity) {
    case 'CRITICAL':
      return {
        border: 'border-red-500 border-2',
        background: 'bg-red-50',
        text: 'text-red-900',
        indicator: 'bg-red-500'
      }
    case 'HIGH':
      return {
        border: 'border-orange-500 border-2',
        background: 'bg-orange-50',
        text: 'text-orange-900',
        indicator: 'bg-orange-500'
      }
    case 'MEDIUM':
      return {
        border: 'border-yellow-500 border-2',
        background: 'bg-yellow-50',
        text: 'text-yellow-900',
        indicator: 'bg-yellow-500'
      }
    case 'LOW':
      return {
        border: 'border-blue-500 border-2',
        background: 'bg-blue-50',
        text: 'text-blue-900',
        indicator: 'bg-blue-500'
      }
    default:
      return {
        border: 'border-gray-500 border-2',
        background: 'bg-gray-50',
        text: 'text-gray-900',
        indicator: 'bg-gray-500'
      }
  }
}

/**
 * Check if a specific event has conflicts
 */
export function hasEventConflict(eventId: string, conflicts: EventConflict[]): boolean {
  return conflicts.some(conflict => 
    conflict.eventId === eventId || 
    conflict.conflictingEvents.some(event => event.id === eventId)
  )
}

/**
 * Get conflicts for a specific event
 */
export function getEventConflicts(eventId: string, conflicts: EventConflict[]): EventConflict[] {
  return conflicts.filter(conflict => 
    conflict.eventId === eventId || 
    conflict.conflictingEvents.some(event => event.id === eventId)
  )
}

/**
 * Get conflict severity for an event
 */
export function getEventConflictSeverity(eventId: string, conflicts: EventConflict[]): EventConflict['severity'] | null {
  const eventConflicts = getEventConflicts(eventId, conflicts)
  
  if (eventConflicts.length === 0) return null
  
  // Return the highest severity level
  if (eventConflicts.some(c => c.severity === 'CRITICAL')) return 'CRITICAL'
  if (eventConflicts.some(c => c.severity === 'HIGH')) return 'HIGH'
  if (eventConflicts.some(c => c.severity === 'MEDIUM')) return 'MEDIUM'
  return 'LOW'
}

/**
 * Group conflicts by type for summary display
 */
export function groupConflictsByType(conflicts: EventConflict[]): Record<string, EventConflict[]> {
  return conflicts.reduce((acc, conflict) => {
    if (!acc[conflict.conflictType]) {
      acc[conflict.conflictType] = []
    }
    acc[conflict.conflictType].push(conflict)
    return acc
  }, {} as Record<string, EventConflict[]>)
}