"use client"

import { Badge } from "@/components/ui/badge"
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
    
    weekDates.push({
      day: weekDays[i],
      date: dateStr,
      attendance: attendanceMap.get(dateStr)
    })
  }

  // Calculate stats only for days with classes
  const daysWithClasses = weekDates.filter(d => d.attendance)
  const presentCount = daysWithClasses.filter(d => 
    d.attendance?.status === 'present' || d.attendance?.status === 'medical'
  ).length
  const totalDays = daysWithClasses.length
  const percentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0

  const getDotColor = (attendance?: AttendanceRecord) => {
    if (!attendance) return 'bg-gray-200' // No class
    switch (attendance.status) {
      case 'present':
        return 'bg-gray-900' // Subtle black for present
      case 'absent':
        return 'bg-gray-400' // Light gray for absent
      case 'medical':
        return 'bg-gray-600' // Medium gray for medical
      default:
        return 'bg-gray-200'
    }
  }

  const getPercentageColor = (pct: number) => {
    if (pct >= 75) return "text-gray-900"
    if (pct >= 50) return "text-gray-700"
    return "text-gray-500"
  }

  return (
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
            <div
              key={index}
              className={cn(
                "w-3 h-3 rounded-full",
                getDotColor(item.attendance)
              )}
              title={item.attendance 
                ? `${item.date}: ${item.attendance.status}` 
                : `${item.date}: No class`}
            />
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
  )
}