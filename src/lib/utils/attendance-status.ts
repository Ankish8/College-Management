import { CalendarEvent, AttendanceStatusResponse, AttendanceStatus } from '@/types/timetable'

/**
 * Fetch attendance status for multiple timetable entries
 */
export async function fetchAttendanceStatus(timetableEntries: CalendarEvent[]): Promise<AttendanceStatus[]> {
  try {
    console.log('🔍 fetchAttendanceStatus called with entries:', timetableEntries.length)
    
    // Prepare data for API call - only entries with required fields
    const validEntries = timetableEntries
      .filter(event => {
        const isValid = event.extendedProps?.batchId && 
          event.extendedProps?.subjectId && 
          event.start
        console.log('📋 Event validation:', {
          id: event.id,
          batchId: event.extendedProps?.batchId,
          subjectId: event.extendedProps?.subjectId,
          start: event.start,
          isValid
        })
        return isValid
      })
      .map(event => ({
        id: event.id,
        batchId: event.extendedProps!.batchId,
        subjectId: event.extendedProps!.subjectId,
        date: event.start.toISOString()
      }))

    console.log('✅ Valid entries for API:', validEntries)

    if (validEntries.length === 0) {
      console.log('⚠️ No valid entries found')
      return []
    }

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
  console.log('🔗 Merging attendance with events:', {
    eventCount: events.length,
    statusCount: attendanceStatus.length
  })

  // Create a map for quick lookup
  const statusMap = new Map<string, AttendanceStatus>()
  attendanceStatus.forEach(status => {
    console.log('📊 Mapping status:', status.timetableEntryId, status)
    statusMap.set(status.timetableEntryId, status)
  })

  // Merge attendance data with events
  return events.map(event => {
    const status = statusMap.get(event.id)
    
    if (status) {
      console.log('✅ Found status for event:', event.id, status)
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
    } else {
      console.log('❌ No status found for event:', event.id)
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