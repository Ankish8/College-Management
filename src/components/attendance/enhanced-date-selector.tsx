"use client"

import * as React from "react"
import { Calendar, CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react"
import { format, addDays, subDays, isWeekend, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { AttendanceStatus, Student } from "@/types/attendance"

interface AttendanceData {
  date: string
  overallAttendance: number // percentage 0-100
  hasData: boolean
}

interface EnhancedDateSelectorProps {
  selectedDate: string
  onDateChange: (date: string) => void
  className?: string
  students?: Student[]
  attendanceData?: Record<string, Record<string, AttendanceStatus>>
}

export function EnhancedDateSelector({
  selectedDate,
  onDateChange,
  className,
  students = [],
  attendanceData = {}
}: EnhancedDateSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const selectedDateObj = new Date(selectedDate)
  const today = new Date()
  const dayName = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' })

  // Calculate attendance data for calendar dates
  const getAttendanceForDate = React.useMemo(() => {
    const attendanceMap = new Map<string, AttendanceData>()
    
    // Process historical attendance data from students
    students.forEach(student => {
      student.attendanceHistory?.forEach(({ date, status }) => {
        const dateStr = date
        if (!attendanceMap.has(dateStr)) {
          attendanceMap.set(dateStr, {
            date: dateStr,
            overallAttendance: 0,
            hasData: false
          })
        }
        
        const existing = attendanceMap.get(dateStr)!
        if (!existing.hasData) {
          existing.hasData = true
          existing.overallAttendance = 0
        }
        
        // Count present/medical as positive attendance
        if (status === 'present' || status === 'medical') {
          existing.overallAttendance += (1 / students.length) * 100
        }
      })
    })
    
    // Process current day attendance data
    Object.entries(attendanceData).forEach(([studentId, sessions]) => {
      const sessionEntries = Object.entries(sessions)
      if (sessionEntries.length > 0) {
        const dateStr = selectedDate
        if (!attendanceMap.has(dateStr)) {
          attendanceMap.set(dateStr, {
            date: dateStr,
            overallAttendance: 0,
            hasData: false
          })
        }
        
        const existing = attendanceMap.get(dateStr)!
        existing.hasData = true
        
        // Calculate percentage based on session attendance
        const presentSessions = sessionEntries.filter(([_, status]) => 
          status === 'present' || status === 'medical'
        ).length
        const totalSessions = sessionEntries.length
        
        if (totalSessions > 0) {
          existing.overallAttendance = (presentSessions / totalSessions) * 100
        }
      }
    })
    
    return (date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd')
      return attendanceMap.get(dateStr)
    }
  }, [students, attendanceData, selectedDate])

  // Quick date shortcuts
  const handleQuickDate = (shortcut: string) => {
    const today = new Date()
    let targetDate: Date
    
    switch (shortcut) {
      case 'yesterday':
        targetDate = subDays(today, 1)
        break
      case 'last-monday':
        targetDate = subDays(startOfWeek(today, { weekStartsOn: 1 }), 7)
        break
      case 'this-week-start':
        targetDate = startOfWeek(today, { weekStartsOn: 1 })
        break
      case 'last-week-start':
        targetDate = subDays(startOfWeek(today, { weekStartsOn: 1 }), 7)
        break
      default:
        targetDate = today
    }
    
    onDateChange(format(targetDate, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const dateString = format(date, 'yyyy-MM-dd')
      onDateChange(dateString)
      setOpen(false)
    }
  }

  const handlePreviousDay = () => {
    const prevDay = subDays(selectedDateObj, 1)
    onDateChange(format(prevDay, 'yyyy-MM-dd'))
  }

  const handleNextDay = () => {
    const nextDay = addDays(selectedDateObj, 1)
    onDateChange(format(nextDay, 'yyyy-MM-dd'))
  }

  const handleToday = () => {
    onDateChange(format(today, 'yyyy-MM-dd'))
  }

  const isToday = format(selectedDateObj, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Previous Day Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handlePreviousDay}
        className="h-9 w-9 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Calendar Popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal min-w-[200px]",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {selectedDate ? (
              <div className="flex items-center gap-2">
                <span>{format(selectedDateObj, 'PPP')}</span>
                <span className="text-xs text-muted-foreground">({dayName})</span>
              </div>
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="space-y-3">
            <CalendarComponent
              mode="single"
              selected={selectedDateObj}
              onSelect={handleDateSelect}
              initialFocus
              disabled={(date) => {
                // Disable weekends for school attendance
                return isWeekend(date)
              }}
              modifiers={{
                weekend: (date) => isWeekend(date),
                hasAttendance: (date) => {
                  const attendance = getAttendanceForDate(date)
                  return !!attendance?.hasData
                },
                highAttendance: (date) => {
                  const attendance = getAttendanceForDate(date)
                  return !!(attendance?.hasData && attendance.overallAttendance >= 80)
                },
                mediumAttendance: (date) => {
                  const attendance = getAttendanceForDate(date)
                  return !!(attendance?.hasData && attendance.overallAttendance >= 60 && attendance.overallAttendance < 80)
                },
                lowAttendance: (date) => {
                  const attendance = getAttendanceForDate(date)
                  return !!(attendance?.hasData && attendance.overallAttendance < 60)
                }
              }}
              modifiersStyles={{
                weekend: { 
                  opacity: 0.5,
                  color: 'var(--muted-foreground)'
                },
                hasAttendance: {
                  fontWeight: '600'
                },
                highAttendance: {
                  backgroundColor: 'rgb(34 197 94 / 0.2)',
                  border: '1px solid rgb(34 197 94 / 0.3)'
                },
                mediumAttendance: {
                  backgroundColor: 'rgb(251 191 36 / 0.2)',
                  border: '1px solid rgb(251 191 36 / 0.3)'
                },
                lowAttendance: {
                  backgroundColor: 'rgb(239 68 68 / 0.2)',
                  border: '1px solid rgb(239 68 68 / 0.3)'
                }
              }}
            />
            
            {/* Quick Date Shortcuts */}
            <div className="border-t p-3 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground mb-2">Quick Navigation</div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuickDate('yesterday')}
                  className="h-8 text-xs"
                >
                  Yesterday
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuickDate('last-monday')}
                  className="h-8 text-xs"
                >
                  Last Monday
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuickDate('this-week-start')}
                  className="h-8 text-xs"
                >
                  This Week
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuickDate('last-week-start')}
                  className="h-8 text-xs"
                >
                  Last Week
                </Button>
              </div>
            </div>

            {/* Attendance Legend */}
            <div className="border-t p-3 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground mb-2">Attendance Legend</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
                  <span>High (≥80%)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></div>
                  <span>Medium (60-79%)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
                  <span>Low (&lt;60%)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded bg-gray-100"></div>
                  <span className="text-muted-foreground">Weekends (disabled)</span>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Next Day Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleNextDay}
        className="h-9 w-9 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Today Button */}
      {!isToday && (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleToday}
          className="text-xs"
        >
          <CalendarCheck className="mr-1 h-3 w-3" />
          Today
        </Button>
      )}

      {/* Fallback HTML input for direct typing */}
      <Input
        type="date"
        value={selectedDate}
        onChange={(e) => onDateChange(e.target.value)}
        className="w-auto text-xs"
        title="Direct date input"
      />
    </div>
  )
}