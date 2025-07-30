"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { AttendanceHeader } from '@/components/attendance/attendance-header'
import { WeeklyAttendanceView } from '@/components/attendance/weekly-attendance-view'
import { AttendanceTable } from '@/components/attendance/attendance-table'
import { AttendanceModeToggle, AttendanceMode } from '@/components/attendance/attendance-mode-toggle'
import { LoadingState, TableLoadingState } from '@/components/ui/loading-spinner'
import { ErrorState, NoDataState } from '@/components/ui/error-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Users, Clock, TrendingUp } from 'lucide-react'

// Custom hooks
import { 
  useStudents, 
  useSessions, 
  useAttendance, 
  useCourse 
} from '@/hooks/useAttendanceData'

// Types
import type { 
  AttendanceComponentProps, 
  AttendanceStatus, 
  ViewMode 
} from '@/types/attendance'

export function AttendancePageProduction({ 
  courseId, 
  batchId,
  initialDate,
  onError,
  onLoadingChange 
}: AttendanceComponentProps) {
  // State
  const [selectedDate, setSelectedDate] = useState(
    initialDate || new Date().toISOString().split('T')[0]
  )
  const [activeView, setActiveView] = useState<ViewMode>('session')
  const [attendanceMode, setAttendanceMode] = useState<AttendanceMode>('detailed')

  // API hooks
  const { 
    students, 
    isLoading: studentsLoading, 
    error: studentsError, 
    refetch: refetchStudents 
  } = useStudents({ 
    batchId,
    subjectId: courseId,
    active: true 
  })

  const { 
    course, 
    isLoading: courseLoading, 
    error: courseError, 
    refetch: refetchCourse 
  } = useCourse(courseId)

  const { 
    sessions, 
    isLoading: sessionsLoading, 
    error: sessionsError, 
    refetch: refetchSessions 
  } = useSessions(courseId)

  const { 
    attendanceData, 
    isLoading: attendanceLoading, 
    error: attendanceError, 
    markAttendance, 
    bulkMarkAttendance, 
    refetch: refetchAttendance 
  } = useAttendance(courseId, selectedDate)

  // Combined loading and error states
  const isLoading = studentsLoading || courseLoading || sessionsLoading || attendanceLoading
  const hasError = studentsError || courseError || sessionsError || attendanceError
  const primaryError = studentsError || courseError || sessionsError || attendanceError

  // Calculate overall stats
  const overallStats = useMemo(() => {
    if (!students.length || !sessions.length) {
      return { present: 0, total: 0, percentage: 0 }
    }

    let totalPresent = 0
    let totalPossible = 0

    students.forEach(student => {
      sessions.forEach(session => {
        totalPossible++
        const status = attendanceData[student.id]?.[session.id]
        if (status === 'present') {
          totalPresent++
        }
      })
    })

    const percentage = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0

    return {
      present: totalPresent,
      total: totalPossible,
      percentage
    }
  }, [students, sessions, attendanceData])

  // Handle attendance change
  const handleAttendanceChange = async (
    studentId: string, 
    sessionId: string, 
    status: AttendanceStatus
  ) => {
    console.log('🟡 HANDLE ATTENDANCE CHANGE:', {
      studentId,
      sessionId,
      status,
      selectedDate,
      courseId
    })
    
    // alert(`DEBUGGING HANDLER: student=${studentId}, session=${sessionId}, status=${status}, date=${selectedDate}`)
    
    try {
      await markAttendance(studentId, sessionId, status)
    } catch (error) {
      console.error('Attendance marking error:', error)
      const errorMessage = error instanceof Error ? error.message : 
                          typeof error === 'string' ? error :
                          'Failed to mark attendance - unknown error'
      
      if (onError) {
        onError({
          message: errorMessage,
          code: 'MARK_ATTENDANCE_ERROR',
          details: error
        })
      }
    }
  }

  // Handle bulk actions
  const handleBulkAction = async (action: 'present' | 'absent') => {
    if (!students.length || !sessions.length) return

    try {
      const records = students.flatMap(student =>
        sessions.map(session => ({
          studentId: student.id,
          sessionId: session.id,
          status: action as AttendanceStatus
        }))
      )

      await bulkMarkAttendance(records)
    } catch (error) {
      if (onError) {
        onError({
          message: `Failed to mark all students as ${action}`,
          code: 'BULK_MARK_ATTENDANCE_ERROR',
          details: error
        })
      }
    }
  }

  // Handle save full day
  const handleSaveDay = async () => {
    // This could trigger a specific API call to finalize the day's attendance
    // For now, we'll just show a success message
    console.log('Saving full day attendance for', selectedDate)
  }

  // Handle retry
  const handleRetry = () => {
    refetchStudents()
    refetchCourse()
    refetchSessions()
    refetchAttendance()
  }

  // Effect to notify parent of loading state changes
  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(isLoading)
    }
  }, [isLoading, onLoadingChange])

  // Effect to notify parent of errors
  useEffect(() => {
    if (primaryError && onError) {
      onError(primaryError)
    }
  }, [primaryError, onError])

  // Render loading state
  if (isLoading && !course && !students.length) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4">
          <LoadingState message="Loading attendance system..." size="lg" />
        </div>
      </div>
    )
  }

  // Render error state
  if (hasError && !course && !students.length) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4">
          <ErrorState
            error={primaryError!}
            onRetry={handleRetry}
            variant="page"
          />
        </div>
      </div>
    )
  }

  // Render no data state
  if (!isLoading && (!students.length || !sessions.length)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4">
          <AttendanceHeader
            course={course}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            overallStats={overallStats}
            onBulkAction={handleBulkAction}
            onSaveDay={handleSaveDay}
            students={students}
            attendanceData={attendanceData}
            isLoading={isLoading}
            error={primaryError}
            onRetry={handleRetry}
          />
          
          <div className="mt-6">
            <NoDataState
              title="No Data Available"
              description={
                !students.length 
                  ? "No students found for this course." 
                  : "No sessions found for this course."
              }
              action={{
                label: "Retry Loading",
                onClick: handleRetry
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <AttendanceHeader
          course={course}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          overallStats={overallStats}
          onBulkAction={handleBulkAction}
          onSaveDay={handleSaveDay}
          students={students}
          attendanceData={attendanceData}
          isLoading={isLoading}
          error={primaryError}
          onRetry={handleRetry}
        />

        <div className="mt-6 space-y-6">
          {/* View Toggle Tabs */}
          <Card>
            <CardContent className="p-4">
              <Tabs value={activeView} onValueChange={(value) => setActiveView(value as ViewMode)}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <TabsList className="grid w-full sm:w-auto grid-cols-2">
                    <TabsTrigger value="session" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Session View
                    </TabsTrigger>
                    <TabsTrigger value="weekly" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Weekly View
                    </TabsTrigger>
                  </TabsList>

                  {/* Attendance Mode Toggle - Only show for session view */}
                  {activeView === 'session' && (
                    <AttendanceModeToggle
                      mode={attendanceMode}
                      onModeChange={setAttendanceMode}
                    />
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{students.length} Students</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{sessions.length} Sessions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <Badge variant={overallStats.percentage >= 80 ? "default" : "secondary"}>
                        {overallStats.percentage}% Overall
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <TabsContent value="session" className="mt-0">
                    {attendanceLoading ? (
                      <Card>
                        <CardContent className="p-6">
                          <TableLoadingState rows={students.length} />
                        </CardContent>
                      </Card>
                    ) : (
                      <AttendanceTable
                        students={students}
                        sessions={sessions}
                        searchTerm=""
                        attendanceData={attendanceData}
                        onAttendanceChange={handleAttendanceChange}
                        attendanceMode={attendanceMode}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="weekly" className="mt-0">
                    <WeeklyAttendanceView
                      students={students}
                      sessions={sessions}
                      selectedDate={selectedDate}
                      onDateChange={setSelectedDate}
                      attendanceData={attendanceData}
                      onAttendanceChange={handleAttendanceChange}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}