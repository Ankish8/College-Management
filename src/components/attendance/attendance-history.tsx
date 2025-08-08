"use client"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { AttendanceRecord, DailyAttendanceRecord, SessionAttendanceRecord, AttendanceStatus } from "@/types/attendance"

interface AttendanceHistoryProps {
  history: (AttendanceRecord | DailyAttendanceRecord)[]
  sessionHistory?: SessionAttendanceRecord[]
  currentDate?: string
}

export function AttendanceHistory({ 
  history,
  sessionHistory = [],
  currentDate
}: AttendanceHistoryProps) {
  // If no history, show empty state
  if (!history || history.length === 0) {
    return (
      <TooltipProvider>
        <div className="flex flex-col items-center space-y-3">
        <div className="flex flex-col gap-2">
          <div className="flex justify-center gap-2 text-xs text-gray-500">
            {['M', 'T', 'W', 'T', 'F'].map((day, index) => (
              <span key={index} className="w-3 text-center font-medium">
                {day}
              </span>
            ))}
          </div>
          <div className="flex justify-center gap-2">
            {[...Array(5)].map((_, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <div className="w-3 h-3 rounded-full bg-gray-200 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">No attendance data available</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
        <Badge variant="outline" className="text-xs border-gray-300 text-gray-500">
          No data
        </Badge>
        </div>
      </TooltipProvider>
    )
  }

  // Create a map of dates to attendance records for quick lookup
  const attendanceMap = new Map<string, AttendanceRecord>()
  history.forEach(record => {
    attendanceMap.set(record.date, record)
  })

  // Create a map of dates to session attendance records for gradient display
  const sessionMap = new Map<string, SessionAttendanceRecord[]>()
  sessionHistory.forEach(record => {
    if (!sessionMap.has(record.date)) {
      sessionMap.set(record.date, [])
    }
    sessionMap.get(record.date)!.push(record)
  })

  // Get the current week based on currentDate or today
  const baseDate = currentDate ? new Date(currentDate) : new Date()
  const dayOfWeek = baseDate.getDay()
  const startOfWeek = new Date(baseDate)
  
  // Adjust to get Monday as start of week
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  startOfWeek.setDate(baseDate.getDate() + daysToMonday)
  
  // Generate weekdays (Mon-Fri) with their dates
  const weekDays = ['M', 'T', 'W', 'T', 'F']
  const weekDates: { day: string; date: string; attendance?: AttendanceRecord }[] = []
  
  for (let i = 0; i < 5; i++) {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    
    // Only add attendance if we have a record for this date
    const attendanceRecord = attendanceMap.get(dateStr)
    const sessionsForDate = sessionMap.get(dateStr) || []
    
    // If we have session-level data, create a DailyAttendanceRecord
    let combinedRecord: AttendanceRecord | DailyAttendanceRecord | undefined
    
    if (sessionsForDate.length > 0) {
      // Calculate overall status from sessions
      const uniqueStatuses = [...new Set(sessionsForDate.map(s => s.status))]
      let overallStatus: AttendanceStatus
      
      if (uniqueStatuses.length === 1) {
        overallStatus = uniqueStatuses[0]
      } else if (sessionsForDate.some(s => s.status === 'medical')) {
        overallStatus = 'medical'
      } else {
        overallStatus = 'mixed'
      }
      
      combinedRecord = {
        date: dateStr,
        status: overallStatus,
        sessions: sessionsForDate
      }
    } else if (attendanceRecord) {
      combinedRecord = attendanceRecord
    }
    
    weekDates.push({
      day: weekDays[i],
      date: dateStr,
      attendance: combinedRecord
    })
  }

  // Calculate stats only for days with classes that have been marked
  const daysWithClasses = weekDates.filter(d => d.attendance)
  const markedDays = daysWithClasses.filter(d => d.attendance?.status !== 'unmarked')
  const presentCount = markedDays.filter(d => {
    const status = d.attendance?.status?.toLowerCase()
    return status === 'present' || status === 'medical' || status === 'excused'
  }).length
  const totalDays = markedDays.length // Only count marked days for percentage
  const percentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0

  // Helper function to check if attendance record has session details
  const isDailyRecord = (record: AttendanceRecord | DailyAttendanceRecord): record is DailyAttendanceRecord => {
    return 'sessions' in record && Array.isArray((record as DailyAttendanceRecord).sessions)
  }

  // Generate gradient style for multiple sessions
  const getGradientStyle = (sessions: { status: string }[]) => {
    if (sessions.length <= 1) return null
    
    const colors = sessions.map(session => {
      const status = session.status?.toLowerCase()
      switch (status) {
        case 'present': return '#22c55e' // green-500
        case 'absent': return '#ef4444' // red-500
        case 'medical': return '#3b82f6' // blue-500
        case 'unmarked': return '#fbbf24' // yellow-400
        default: return '#9ca3af' // gray-400
      }
    })
    
    const gradientStops = colors.map((color, index) => {
      const percentage = (index / (colors.length - 1)) * 100
      return `${color} ${percentage}%`
    }).join(', ')
    
    return `linear-gradient(90deg, ${gradientStops})`
  }

  const getDotColor = (attendance?: AttendanceRecord | DailyAttendanceRecord) => {
    if (!attendance) return 'bg-gray-200' // Grey for no class scheduled
    
    // Check if this is a DailyAttendanceRecord with sessions
    if (isDailyRecord(attendance) && attendance.sessions.length > 1) {
      // Multiple sessions - return gradient style
      const gradient = getGradientStyle(attendance.sessions)
      return gradient ? '' : 'bg-gray-200' // Empty class for gradient, will be handled with inline style
    }
    
    // Single session or simple record - use solid color
    const status = attendance.status?.toLowerCase()
    
    switch (status) {
      case 'present':
        return 'bg-green-500' // Green for present
      case 'absent':
        return 'bg-red-500' // Red for absent
      case 'medical':
      case 'excused':
        return 'bg-blue-500' // Blue for medical leave or excused
      case 'unmarked':
        return 'bg-yellow-300' // Light yellow for class scheduled but attendance not marked
      case 'mixed':
        return 'bg-gradient-to-r from-green-500 to-red-500' // Mixed gradient
      default:
        return 'bg-gray-200'
    }
  }

  // Helper function to format time from 24-hour to 12-hour format
  const formatTime = (time: string | undefined) => {
    if (!time) return 'N/A'
    const parts = time.split(':')
    if (parts.length < 2) return time
    const [hours, minutes] = parts
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const getTooltipText = (date: string, attendance?: AttendanceRecord | DailyAttendanceRecord) => {
    if (!attendance) {
      return `${date}: No class scheduled`
    }
    
    // Check if this is a DailyAttendanceRecord with session details
    if (isDailyRecord(attendance) && attendance.sessions.length > 0) {
      const dateStr = `${date}:`
      const sessionDetails = attendance.sessions.map(session => {
        const statusMap = {
          'present': 'Present',
          'absent': 'Absent',
          'medical': 'Medical',
          'excused': 'Excused',
          'unmarked': 'Not marked'
        }
        const statusText = statusMap[session.status.toLowerCase() as keyof typeof statusMap] || session.status
        return `  • ${session.sessionName || 'Session'} (${formatTime(session.startTime)}-${formatTime(session.endTime)}) - ${statusText}`
      }).join('\n')
      
      const overallStatusMap = {
        'present': 'Overall: Present',
        'absent': 'Overall: Absent',
        'medical': 'Overall: Medical',
        'mixed': 'Overall: Mixed attendance',
        'unmarked': 'Overall: Not marked'
      }
      const overallText = overallStatusMap[attendance.status.toLowerCase() as keyof typeof overallStatusMap] || `Overall: ${attendance.status}`
      
      return `${dateStr}\n${sessionDetails}\n\n${overallText}`
    }
    
    // Simple attendance record - show basic status
    const status = attendance.status?.toLowerCase()
    const statusMap = {
      'present': 'Present',
      'absent': 'Absent',
      'medical': 'Medical Leave',
      'excused': 'Excused',
      'unmarked': 'Class scheduled but attendance not marked',
      'mixed': 'Mixed attendance'
    }
    
    const statusText = statusMap[status as keyof typeof statusMap] || attendance.status
    return `${date}: ${statusText}`
  }

  const getPercentageColor = (pct: number) => {
    if (pct >= 75) return "text-green-600"
    if (pct >= 50) return "text-amber-600"
    return "text-red-600"
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col items-center space-y-3">
      <div className="flex flex-col gap-2">
        <div className="flex justify-center gap-2 text-xs text-gray-500">
          {weekDates.map((item, index) => (
            <span key={index} className="w-3 text-center font-medium">
              {item.day}
            </span>
          ))}
        </div>
        <div className="flex justify-center gap-2">
          {weekDates.map((item, index) => {
            const dotColor = getDotColor(item.attendance)
            const isGradient = item.attendance && isDailyRecord(item.attendance) && item.attendance.sessions.length > 1
            const gradientStyle = isGradient && item.attendance && isDailyRecord(item.attendance) ? getGradientStyle(item.attendance.sessions) : null
            
            return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full cursor-help",
                      gradientStyle ? '' : dotColor
                    )}
                    style={gradientStyle ? { background: gradientStyle } : undefined}
                  />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <div className="text-sm whitespace-pre-line">
                    {getTooltipText(item.date, item.attendance)}
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
      
      <Badge 
        variant="outline" 
        className={cn("text-xs border-gray-300", getPercentageColor(percentage))}
      >
        {presentCount}/{totalDays} ({percentage}%)
      </Badge>
      </div>
    </TooltipProvider>
  )
}