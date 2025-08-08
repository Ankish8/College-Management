import { CalendarEvent, AttendanceStatusResponse, AttendanceStatus } from '@/types/timetable'

/**
 * Fetch attendance status for multiple timetable entries
 */
export async function fetchAttendanceStatus(timetableEntries: CalendarEvent[]): Promise<AttendanceStatus[]> {
  try {
    // Prepare data for API call - only entries with required fields
    const validEntries = timetableEntries
      .filter(event => 
        event.extendedProps?.batchId && 
        event.extendedProps?.subjectId && 
        event.start
      )
      .map(event => ({
        id: event.id,
        batchId: event.extendedProps!.batchId,
        subjectId: event.extendedProps!.subjectId,
        timeSlotId: event.extendedProps!.timeSlotId, // Add timeSlotId for session-specific lookup
        date: (() => {
          const eventDate = event.start instanceof Date ? event.start : new Date(event.start);
          return `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
        })()
      }))

    if (validEntries.length === 0) {
      return []
    }
    
    console.log('📅 Fetching attendance status for entries:', validEntries.map(e => ({
      id: e.id,
      date: e.date,
      batchId: e.batchId?.slice(-8) || '',
      subjectId: e.subjectId?.slice(-8) || ''
    })));

    const response = await fetch('/api/timetable/attendance-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timetableEntries: validEntries
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch attendance status: ${response.statusText}`)
    }

    const data: AttendanceStatusResponse = await response.json()
    return data.attendanceStatus || []

  } catch (error) {
    console.error('Error fetching attendance status:', error)
    return []
  }
}

/**
 * Merge attendance status data with timetable events
 */
export function mergeAttendanceWithEvents(
  events: CalendarEvent[], 
  attendanceStatus: AttendanceStatus[]
): CalendarEvent[] {
  // Create a map for quick lookup
  const statusMap = new Map<string, AttendanceStatus>()
  attendanceStatus.forEach(status => {
    statusMap.set(status.timetableEntryId, status)
  })

  // Merge attendance data with events
  return events.map(event => {
    const status = statusMap.get(event.id)
    
    if (status) {
      return {
        ...event,
        extendedProps: {
          ...event.extendedProps,
          attendance: {
            isMarked: status.isMarked,
            attendancePercentage: status.attendancePercentage,
            totalStudents: status.totalStudents,
            presentStudents: status.presentStudents
          }
        }
      }
    }

    return event
  })
}

/**
 * Get color class for attendance percentage heat map
 */
export function getAttendanceHeatmapColor(percentage: number): string {
  if (percentage >= 76) return 'bg-green-400/60'      // 76-100%: Green
  if (percentage >= 51) return 'bg-yellow-400/60'     // 51-75%: Yellow  
  if (percentage >= 26) return 'bg-orange-400/60'     // 26-50%: Orange
  return 'bg-red-400/60'                              // 0-25%: Red
}

/**
 * Get color class for attendance percentage indicator dot
 */
export function getAttendanceDotColor(percentage: number): string {
  if (percentage >= 76) return 'bg-green-500'         // 76-100%: Green
  if (percentage >= 51) return 'bg-yellow-500'        // 51-75%: Yellow  
  if (percentage >= 26) return 'bg-orange-500'        // 26-50%: Orange
  return 'bg-red-500'                                 // 0-25%: Red
}

/**
 * Get attendance status summary text
 */
export function getAttendanceSummary(attendance?: {
  isMarked: boolean
  attendancePercentage: number
  totalStudents: number
  presentStudents: number
}): string {
  if (!attendance || !attendance.isMarked) {
    return 'Attendance not marked'
  }

  return `${attendance.presentStudents}/${attendance.totalStudents} students (${attendance.attendancePercentage}%)`
}