"use client"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { AttendanceRecord } from "@/types/attendance"

interface AttendanceHistoryProps {
  history: AttendanceRecord[]
  currentDate?: string
}

export function AttendanceHistory({ 
  history,
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
    
    weekDates.push({
      day: weekDays[i],
      date: dateStr,
      attendance: attendanceRecord // Will be undefined if no class that day
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

  const getDotColor = (attendance?: AttendanceRecord) => {
    if (!attendance) return 'bg-gray-200' // Grey for no class scheduled
    
    // Convert to lowercase for case-insensitive comparison
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
      default:
        return 'bg-gray-200'
    }
  }

  const getTooltipText = (date: string, attendance?: AttendanceRecord) => {
    if (!attendance) {
      return `${date}: No class scheduled`
    }
    
    const status = attendance.status?.toLowerCase()
    const statusMap = {
      'present': 'Present',
      'absent': 'Absent',
      'medical': 'Medical Leave',
      'excused': 'Excused',
      'unmarked': 'Class scheduled but attendance not marked'
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
          {weekDates.map((item, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "w-3 h-3 rounded-full cursor-help",
                    getDotColor(item.attendance)
                  )}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">{getTooltipText(item.date, item.attendance)}</p>
              </TooltipContent>
            </Tooltip>
          ))}
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