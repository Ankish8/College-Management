"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AttendanceRecord } from "@/types/attendance"

interface AttendanceHistoryProps {
  history: AttendanceRecord[]
  days?: string[]
}

export function AttendanceHistory({ 
  history, 
  days = ['M', 'T', 'W', 'T', 'F'] 
}: AttendanceHistoryProps) {
  const getDotColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-400'
      case 'absent':
        return 'bg-red-400'
      case 'medical':
        return 'bg-blue-400'
      default:
        return 'bg-gray-300'
    }
  }

  const presentCount = history.filter(record => 
    record.status === 'present' || record.status === 'medical'
  ).length
  
  const totalDays = history.length
  const percentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0

  const getPercentageColor = (pct: number) => {
    if (pct >= 75) return "text-green-600"
    if (pct >= 50) return "text-amber-600"
    return "text-red-600"
  }

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="flex flex-col gap-2">
        <div className="flex justify-center gap-2 text-xs text-muted-foreground">
          {days.map((day, index) => (
            <span key={index} className="w-3 text-center font-medium">
              {day}
            </span>
          ))}
        </div>
        <div className="flex justify-center gap-2">
          {history.slice(-5).map((record, index) => (
            <div
              key={index}
              className={cn(
                "w-3 h-3 rounded-full",
                getDotColor(record.status)
              )}
              title={`${record.date}: ${record.status}`}
            />
          ))}
          {/* Fill empty dots if less than 5 days */}
          {Array.from({ length: Math.max(0, 5 - history.length) }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className="w-3 h-3 rounded-full bg-gray-200"
            />
          ))}
        </div>
      </div>
      
      <Badge 
        variant="outline" 
        className={cn("text-xs", getPercentageColor(percentage))}
      >
        {presentCount}/{totalDays} ({percentage}%)
      </Badge>
    </div>
  )
}