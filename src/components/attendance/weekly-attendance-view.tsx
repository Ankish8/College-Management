"use client"

import { useState, useMemo, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EnhancedDateSelector } from '@/components/attendance/enhanced-date-selector'
import { WeeklyAttendanceProcessor } from '@/utils/weekly-attendance'
import { cn } from '@/lib/utils'
import type { 
  Student, 
  Session, 
  AttendanceStatus, 
  WeeklyViewData, 
  WeeklyDayData, 
  WeeklySessionInfo 
} from '@/types/attendance'

interface WeeklyAttendanceViewProps {
  students: Student[]
  sessions: Session[]
  selectedDate: string
  onDateChange: (date: string) => void
  attendanceData: Record<string, Record<string, AttendanceStatus>>
  onAttendanceChange: (studentId: string, sessionId: string, status: AttendanceStatus) => void
  className?: string
}

interface SessionDotProps {
  session: WeeklySessionInfo
  onClick: () => void
}

function SessionDot({ session, onClick }: SessionDotProps) {
  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return 'bg-green-500 border-green-600'
      case 'absent': return 'bg-red-500 border-red-600 bg-opacity-30 border-opacity-60'
      case 'medical': return 'bg-yellow-500 border-yellow-600'
      default: return 'bg-gray-300 border-gray-400'
    }
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-2 h-2 rounded-full border transition-all hover:scale-125",
        getStatusColor(session.status)
      )}
      title={`${session.sessionName}: ${session.status} (${session.timeSlot})`}
    />
  )
}

interface DayAttendanceCellProps {
  dayData: WeeklyDayData
  studentId: string
  studentName: string
  studentIndex: number
  dayIndex: number
  isFocused: boolean
  attendanceData: Record<string, Record<string, AttendanceStatus>>
  onSessionClick: (session: WeeklySessionInfo, dayData: WeeklyDayData) => void
  onAttendanceChange: (studentId: string, sessionId: string, status: AttendanceStatus) => void
  onCellClick: (studentIndex: number, dayIndex: number) => void
}

function DayAttendanceCell({ 
  dayData, 
  studentId, 
  studentName, 
  studentIndex, 
  dayIndex, 
  isFocused, 
  attendanceData,
  onSessionClick, 
  onAttendanceChange,
  onCellClick 
}: DayAttendanceCellProps) {
  const handleCellClick = (e: React.MouseEvent) => {
    if (dayData.isWeekend || !dayData.sessions.length) return
    
    e.preventDefault()
    e.stopPropagation()
    
    // Set focus first
    onCellClick(studentIndex, dayIndex)
    
    // Get the overall status for the day first, then apply to all sessions
    const firstSession = dayData.sessions[0]
    const currentDayStatus = attendanceData[studentId]?.[firstSession.sessionId] || 'absent'
    const nextDayStatus: AttendanceStatus = currentDayStatus === 'present' ? 'absent' : 'present'
    
    // Apply the same status to all sessions for this day
    dayData.sessions.forEach(session => {
      onAttendanceChange(studentId, session.sessionId, nextDayStatus)
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (dayData.isWeekend || !dayData.sessions.length) return
    
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      handleCellClick(e as any)
    }
    
    // Direct keyboard shortcuts
    if (e.key === 'p' || e.key === 'P') {
      e.preventDefault()
      dayData.sessions.forEach(session => {
        onAttendanceChange(studentId, session.sessionId, 'present')
      })
    } else if (e.key === 'a' || e.key === 'A') {
      e.preventDefault()
      dayData.sessions.forEach(session => {
        onAttendanceChange(studentId, session.sessionId, 'absent')
      })
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault()
      dayData.sessions.forEach(session => {
        onAttendanceChange(studentId, session.sessionId, 'medical')
      })
    }
  }

  const getStatusBadge = (status: AttendanceStatus | null) => {
    if (!status) {
      return <span className="text-gray-400 text-xs">-</span>
    }

    const variants = {
      'present': 'bg-green-100 text-green-800 border-green-200',
      'absent': 'bg-red-100 text-red-800 border-red-200',
      'medical': 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }

    return (
      <Badge 
        variant="outline" 
        className={cn("text-xs font-medium border", variants[status])}
      >
        {status === 'present' ? 'P' : status === 'absent' ? 'A' : 'M'}
      </Badge>
    )
  }

  const cellWidth = dayData.isWeekend ? 'w-16' : 'w-24'

  // Weekend merged cell
  if (dayData.isWeekend) {
    const weekendSpan = (dayData as any).weekendSpan || 1
    return (
      <td 
        colSpan={weekendSpan}
        className={cn(
          "text-center p-2 border-r bg-gray-50",
          cellWidth
        )}
      >
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-xs text-gray-500 whitespace-nowrap">
            Weekend
          </div>
          <div className="text-xs text-gray-400 mt-1">
            No Classes
          </div>
        </div>
      </td>
    )
  }

  // Working day - clickable cell
  return (
    <td 
      className={cn(
        "text-center p-2 border-r space-y-1 cursor-pointer select-none transition-all duration-200",
        cellWidth,
        dayData.isToday && "bg-blue-50 border-blue-200",
        isFocused && "bg-primary/15 ring-2 ring-primary/50 ring-inset shadow-lg border-primary/30",
        !isFocused && "hover:bg-muted/30 hover:border-muted-foreground/20"
      )}
      tabIndex={isFocused ? 0 : -1}
      onClick={handleCellClick}
      onKeyDown={handleKeyPress}
      data-cell-position={`${studentIndex}-${dayIndex}`}
      title={`Click to focus. Use arrow keys to navigate. Space=Toggle P/A, P=Present, A=Absent, M=Medical`}
    >
      {getStatusBadge(dayData.overallStatus)}
      
      <div className="flex justify-center gap-1 mt-1">
        {dayData.sessions.map((session) => (
          <SessionDot
            key={session.sessionId}
            session={session}
            onClick={() => onSessionClick(session, dayData)}
          />
        ))}
      </div>
    </td>
  )
}

interface FocusedCell {
  studentIndex: number
  dayIndex: number
}

export function WeeklyAttendanceView({
  students,
  sessions,
  selectedDate,
  onDateChange,
  attendanceData,
  onAttendanceChange,
  className
}: WeeklyAttendanceViewProps) {
  const [selectedSession, setSelectedSession] = useState<{
    session: WeeklySessionInfo
    dayData: WeeklyDayData
    studentName: string
  } | null>(null)
  
  const [focusedCell, setFocusedCell] = useState<FocusedCell | null>(null)

  const processor = useMemo(() => new WeeklyAttendanceProcessor(students, sessions), [students, sessions])
  const weeklyData = useMemo(() => {
    return processor.generateWeeklyData(selectedDate, attendanceData)
  }, [processor, selectedDate, attendanceData])
  
  // Debug removed

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!focusedCell) return

    // Prevent default for all navigation keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'p', 'P', 'a', 'A', 'm', 'M', 'Escape'].includes(event.key)) {
      event.preventDefault()
    }

    const maxStudentIndex = weeklyData.students.length - 1
    const workingDays = weeklyData.students[0]?.days.filter(day => !day.isWeekend) || []
    const maxDayIndex = workingDays.length - 1

    switch (event.key) {
      case 'ArrowUp':
        setFocusedCell(prev => prev ? {
          ...prev,
          studentIndex: Math.max(0, prev.studentIndex - 1)
        } : null)
        break
      case 'ArrowDown':
        setFocusedCell(prev => prev ? {
          ...prev,
          studentIndex: Math.min(maxStudentIndex, prev.studentIndex + 1)
        } : null)
        break
      case 'ArrowLeft':
        setFocusedCell(prev => prev ? {
          ...prev,
          dayIndex: Math.max(0, prev.dayIndex - 1)
        } : null)
        break
      case 'ArrowRight':
        setFocusedCell(prev => prev ? {
          ...prev,
          dayIndex: Math.min(maxDayIndex, prev.dayIndex + 1)
        } : null)
        break
      case ' ':
        event.preventDefault()
        if (focusedCell) {
          const student = weeklyData.students[focusedCell.studentIndex]
          const workingDays = student.days.filter(day => !day.isWeekend)
          const dayData = workingDays[focusedCell.dayIndex]
          
          if (dayData && !dayData.isWeekend) {
            // Get the overall status for the day first, then apply to all sessions
            const firstSession = dayData.sessions[0]
            const currentDayStatus = attendanceData[student.studentId]?.[firstSession.sessionId] || 'absent'
            const nextDayStatus: AttendanceStatus = currentDayStatus === 'present' ? 'absent' : 'present'
            
            // Apply the same status to all sessions for this day
            dayData.sessions.forEach(session => {
              onAttendanceChange(student.studentId, session.sessionId, nextDayStatus)
            })
          }
        }
        break
      case 'p':
      case 'P':
        event.preventDefault()
        if (focusedCell) {
          const student = weeklyData.students[focusedCell.studentIndex]
          const workingDays = student.days.filter(day => !day.isWeekend)
          const dayData = workingDays[focusedCell.dayIndex]
          
          if (dayData && !dayData.isWeekend) {
            dayData.sessions.forEach(session => {
              onAttendanceChange(student.studentId, session.sessionId, 'present')
            })
          }
        }
        break
      case 'a':
      case 'A':
        event.preventDefault()
        if (focusedCell) {
          const student = weeklyData.students[focusedCell.studentIndex]
          const workingDays = student.days.filter(day => !day.isWeekend)
          const dayData = workingDays[focusedCell.dayIndex]
          
          if (dayData && !dayData.isWeekend) {
            dayData.sessions.forEach(session => {
              onAttendanceChange(student.studentId, session.sessionId, 'absent')
            })
          }
        }
        break
      case 'm':
      case 'M':
        event.preventDefault()
        if (focusedCell) {
          const student = weeklyData.students[focusedCell.studentIndex]
          const workingDays = student.days.filter(day => !day.isWeekend)
          const dayData = workingDays[focusedCell.dayIndex]
          
          if (dayData && !dayData.isWeekend) {
            dayData.sessions.forEach(session => {
              onAttendanceChange(student.studentId, session.sessionId, 'medical')
            })
          }
        }
        break
      case 'Escape':
        event.preventDefault()
        setFocusedCell(null)
        break
    }
  }, [focusedCell, weeklyData.students, onAttendanceChange])

  // Add keyboard event listener - only when component is active and focused
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard events when weekly view has focus
      const isWeeklyViewActive = document.querySelector('[data-weekly-view]')
      const activeElement = document.activeElement
      
      // Don't interfere with inputs, textareas, etc.
      if (activeElement?.tagName === 'INPUT' || 
          activeElement?.tagName === 'TEXTAREA' || 
          (activeElement as HTMLElement)?.contentEditable === 'true') {
        return
      }
      
      if (isWeeklyViewActive || focusedCell) {
        handleKeyDown(event)
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown, { capture: true })
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, { capture: true })
    }
  }, [handleKeyDown, focusedCell])

  // Auto-scroll focused cell into view
  useEffect(() => {
    if (focusedCell) {
      // Find the focused cell element and scroll it into view
      const cellElement = document.querySelector(
        `[data-cell-position="${focusedCell.studentIndex}-${focusedCell.dayIndex}"]`
      )
      if (cellElement) {
        cellElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        })
        // Focus the element for keyboard access
        ;(cellElement as HTMLElement).focus()
      }
    }
  }, [focusedCell])

  // Initialize focus on first cell when component mounts
  useEffect(() => {
    if (!focusedCell && weeklyData.students.length > 0) {
      // Auto-focus first working day cell
      const workingDays = weeklyData.students[0]?.days.filter(day => !day.isWeekend)
      if (workingDays && workingDays.length > 0) {
        setFocusedCell({ studentIndex: 0, dayIndex: 0 })
      }
    }
  }, [weeklyData.students, focusedCell])

  const handleSessionClick = (session: WeeklySessionInfo, dayData: WeeklyDayData, studentName: string) => {
    setSelectedSession({ session, dayData, studentName })
    // Auto-clear after 3 seconds
    setTimeout(() => setSelectedSession(null), 3000)
  }

  const handlePreviousWeek = () => {
    const dates = WeeklyAttendanceProcessor.getNavigationDates(selectedDate)
    onDateChange(dates.previousWeek)
  }

  const handleNextWeek = () => {
    const dates = WeeklyAttendanceProcessor.getNavigationDates(selectedDate)
    onDateChange(dates.nextWeek)
  }

  const handleToday = () => {
    const dates = WeeklyAttendanceProcessor.getNavigationDates(selectedDate)
    onDateChange(dates.today)
  }

  return (
    <div className={cn("space-y-4", className)} data-weekly-view>
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-muted-foreground mb-2">
              Weekly View
            </h2>
            <p className="text-lg text-muted-foreground">
              Coming Soon
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}