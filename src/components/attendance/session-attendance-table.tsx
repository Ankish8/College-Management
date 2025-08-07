"use client"

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { TableLoadingState } from '@/components/ui/loading-spinner'
import { ErrorState, NoDataState } from '@/components/ui/error-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, User, Clock, CheckCircle, XCircle, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Student, Session, AttendanceStatus, ApiError } from '@/types/attendance'

interface SessionAttendanceTableProps {
  students: Student[]
  sessions: Session[]
  selectedDate: string
  attendanceData: Record<string, Record<string, AttendanceStatus>>
  onAttendanceChange: (studentId: string, sessionId: string, status: AttendanceStatus) => void
  isLoading?: boolean
  error?: ApiError | null
  onRetry?: () => void
  className?: string
}

interface AttendanceButtonProps {
  status: AttendanceStatus | undefined
  onClick: (status: AttendanceStatus) => void
  disabled?: boolean
}

function AttendanceButton({ status, onClick, disabled }: AttendanceButtonProps) {
  const getStatusIcon = (statusType: AttendanceStatus) => {
    switch (statusType) {
      case 'present':
        return <CheckCircle className="h-4 w-4" />
      case 'absent':
        return <XCircle className="h-4 w-4" />
      case 'medical':
        return <Heart className="h-4 w-4" />
      default:
        return null
    }
  }

  const getStatusVariant = (statusType: AttendanceStatus, isActive: boolean) => {
    if (!isActive) {
      return "outline"
    }
    
    switch (statusType) {
      case 'present':
        return "default"
      case 'absent':
        return "destructive"
      case 'medical':
        return "secondary"
      default:
        return "outline"
    }
  }

  const getStatusLabel = (statusType: AttendanceStatus) => {
    switch (statusType) {
      case 'present':
        return 'P'
      case 'absent':
        return 'A'
      case 'medical':
        return 'M'
      default:
        return ''
    }
  }

  return (
    <div className="flex gap-1">
      {(['present', 'absent', 'medical'] as AttendanceStatus[]).map((statusType) => (
        <Button
          key={statusType}
          size="sm"
          variant={getStatusVariant(statusType, status === statusType)}
          onClick={() => onClick(statusType)}
          disabled={disabled}
          className={cn(
            "h-8 w-8 p-0 flex items-center justify-center",
            status === statusType && statusType === 'present' && "bg-green-600 hover:bg-green-700",
            status === statusType && statusType === 'absent' && "bg-red-600 hover:bg-red-700",
            status === statusType && statusType === 'medical' && "bg-yellow-600 hover:bg-yellow-700"
          )}
          title={`Mark as ${statusType}`}
        >
          {getStatusIcon(statusType)}
        </Button>
      ))}
    </div>
  )
}

export function SessionAttendanceTable({
  students,
  sessions,
  selectedDate,
  attendanceData,
  onAttendanceChange,
  isLoading = false,
  error = null,
  onRetry,
  className
}: SessionAttendanceTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSession, setSelectedSession] = useState<string>('all')

  // Filter students based on search term
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students

    return students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [students, searchTerm])

  // Filter sessions based on selected session
  const filteredSessions = useMemo(() => {
    if (selectedSession === 'all') return sessions
    return sessions.filter(session => session.id === selectedSession)
  }, [sessions, selectedSession])

  // Calculate stats for filtered data
  const stats = useMemo(() => {
    let totalPresent = 0
    let totalPossible = 0

    filteredStudents.forEach(student => {
      filteredSessions.forEach(session => {
        totalPossible++
        const status = attendanceData[student.id]?.[session.id]
        if (status === 'present') {
          totalPresent++
        }
      })
    })

    return {
      present: totalPresent,
      total: totalPossible,
      percentage: totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0
    }
  }, [filteredStudents, filteredSessions, attendanceData])

  const formatTime = (time: string) => {
    // Convert 24hr format to 12hr format
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const getSessionTimeSlot = (session: Session) => {
    return `${formatTime(session.startTime)}-${formatTime(session.endTime)}`
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <ErrorState
            error={error}
            onRetry={onRetry}
            variant="inline"
          />
        </CardContent>
      </Card>
    )
  }

  if (!students.length || !sessions.length) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <NoDataState
            title="No Data Available"
            description={
              !students.length 
                ? "No students found for this course."
                : "No sessions scheduled for today."
            }
            action={onRetry ? {
              label: "Refresh",
              onClick: onRetry
            } : undefined}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Session Attendance
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {stats.present}/{stats.total} Present ({stats.percentage}%)
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by session" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              {sessions.map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {session.name} ({getSessionTimeSlot(session)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6">
            <TableLoadingState rows={filteredStudents.length} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium sticky left-0 bg-muted/50 min-w-[250px]">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Student
                    </div>
                  </th>
                  {filteredSessions.map((session) => (
                    <th key={session.id} className="text-center p-4 font-medium min-w-[150px]">
                      <div className="space-y-1">
                        <div className="font-medium">{session.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {getSessionTimeSlot(session)}
                        </div>
                      </div>
                    </th>
                  ))}
                  <th className="text-center p-4 font-medium w-24">
                    Overall
                  </th>
                </tr>
              </thead>
              
              <tbody>
                {filteredStudents.map((student) => {
                  const studentPresent = filteredSessions.filter(session => 
                    attendanceData[student.id]?.[session.id] === 'present'
                  ).length
                  const studentTotal = filteredSessions.length
                  const studentPercentage = studentTotal > 0 ? Math.round((studentPresent / studentTotal) * 100) : 0

                  return (
                    <tr key={student.id} className="border-b hover:bg-muted/20">
                      <td className="p-4 sticky left-0 bg-background border-r">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={student.photo} alt={student.name} />
                            <AvatarFallback>
                              {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{student.name}</div>
                            <div className="text-sm text-muted-foreground truncate">
                              {student.studentId}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      {filteredSessions.map((session) => (
                        <td key={session.id} className="p-4 text-center">
                          <AttendanceButton
                            status={attendanceData[student.id]?.[session.id]}
                            onClick={(status) => onAttendanceChange(student.id, session.id, status)}
                            disabled={isLoading}
                          />
                        </td>
                      ))}
                      
                      <td className="p-4 text-center">
                        <Badge 
                          variant={studentPercentage >= 80 ? "default" : 
                                  studentPercentage >= 60 ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {studentPercentage}%
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {filteredStudents.length === 0 && searchTerm && (
              <div className="p-8 text-center">
                <div className="text-muted-foreground">
                  No students found matching "{searchTerm}"
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}