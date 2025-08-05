"use client"

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react'
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
import { Calendar, Users, Clock, TrendingUp, CheckCircle, BarChart3, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useCommandPalette } from '@/components/attendance/command-palette-provider'

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

export const AttendancePageProduction = memo(function AttendancePageProduction({ 
  courseId, 
  batchId,
  initialDate,
  onError,
  onLoadingChange,
  dateSelector,
  batchSelector,
  subjectSelector,
  hasSelection = false,
  availableBatches = [],
  availableSubjects = [],
  subjects = [],
  department
}: AttendanceComponentProps) {
  // State
  const [selectedDate, setSelectedDate] = useState(
    initialDate || new Date().toISOString().split('T')[0]
  )
  const [activeView, setActiveView] = useState<ViewMode>('session')
  const [attendanceMode, setAttendanceMode] = useState<AttendanceMode>('fast')
  const [focusedStudentId, setFocusedStudentId] = useState<string | null>(null)
  
  // Command palette for search functionality
  const { openPalette } = useCommandPalette()

  // Student focusing functionality
  const focusStudent = useCallback((studentId: string) => {
    setFocusedStudentId(studentId)
    // Clear focus after a delay to allow scrolling animation
    setTimeout(() => setFocusedStudentId(null), 2000)
  }, [])

  // This will be moved after API hooks are declared

  // API hooks - conditionally call based on hasSelection
  const { 
    students, 
    isLoading: studentsLoading, 
    error: studentsError, 
    refetch: refetchStudents 
  } = useStudents(hasSelection ? { 
    batchId,
    subjectId: courseId,
    active: true
  } : undefined)

  const { 
    course, 
    isLoading: courseLoading, 
    error: courseError, 
    refetch: refetchCourse 
  } = useCourse(hasSelection ? courseId : '')

  const { 
    sessions, 
    isLoading: sessionsLoading, 
    error: sessionsError, 
    refetch: refetchSessions 
  } = useSessions(hasSelection ? courseId : '')

  const { 
    attendanceData, 
    isLoading: attendanceLoading, 
    error: attendanceError, 
    markAttendance, 
    bulkMarkAttendance, 
    refetch: refetchAttendance 
  } = useAttendance(hasSelection ? courseId : '', selectedDate)

  // Combined loading and error states
  const isLoading = studentsLoading || courseLoading || sessionsLoading || attendanceLoading
  const hasError = studentsError || courseError || sessionsError || attendanceError
  const primaryError = studentsError || courseError || sessionsError || attendanceError

  // Event listeners will be added after all handlers are declared

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
  const handleAttendanceChange = useCallback(async (
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
  }, [markAttendance, onError])

  // Handle bulk actions
  const handleBulkAction = useCallback(async (action: 'present' | 'absent') => {
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
  }, [students, sessions, bulkMarkAttendance, onError])

  // Handle save attendance
  const handleSaveDay = useCallback(async () => {
    if (!hasSelection || !courseId || !selectedDate) {
      console.warn('Cannot save: missing required data', { hasSelection, courseId, selectedDate })
      toast.error('Cannot save attendance', {
        description: 'Please ensure batch and subject are selected'
      })
      return
    }

    try {
      console.log('💾 Saving attendance for', selectedDate, 'courseId:', courseId)
      
      // Import attendanceApi here to avoid circular dependencies
      const { attendanceApi } = await import('@/services/attendance-api')
      
      // Call the proper save endpoint
      const saveResponse = await attendanceApi.saveAttendance(courseId, selectedDate)
      
      if (saveResponse.success && saveResponse.data) {
        const stats = saveResponse.data.statistics
        const totalStudents = stats.totalStudents
        const presentCount = stats.presentCount
        const attendancePercentage = stats.attendancePercentage
        const unmarkedCount = stats.unmarkedCount
        
        console.log('✅ Attendance saved successfully:', saveResponse.data)
        
        // Refresh data to reflect the saved state
        await Promise.all([
          refetchAttendance(),
          refetchStudents(),
          refetchSessions()
        ])
        
        // Show beautiful toast notification with correct statistics
        toast.success("Attendance Saved Successfully!", {
          description: `${presentCount}/${totalStudents} students present (${attendancePercentage}%)${unmarkedCount > 0 ? ` • ${unmarkedCount} not marked` : ''}`,
          duration: 4000,
        })
        
      } else {
        throw new Error(saveResponse.error || 'Failed to save attendance')
      }
      
    } catch (error) {
      console.error('Failed to save attendance:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      if (onError) {
        onError({
          message: `Failed to save attendance: ${errorMessage}`,
          code: 'SAVE_ATTENDANCE_ERROR',
          details: error
        })
      } else {
        toast.error('Failed to save attendance', {
          description: errorMessage
        })
      }
    }
  }, [hasSelection, courseId, selectedDate, refetchAttendance, refetchStudents, refetchSessions, onError])

  // Handle retry
  const handleRetry = useCallback(() => {
    refetchStudents()
    refetchCourse()
    refetchSessions()
    refetchAttendance()
  }, [refetchStudents, refetchCourse, refetchSessions, refetchAttendance])

  // Add event listeners for command palette actions
  useEffect(() => {
    const handleMarkStudentAttendance = (event: CustomEvent) => {
      const { studentId, status, date } = event.detail
      console.log('🎯 Command palette attendance action:', { studentId, status, date })
      
      // Find the student and mark attendance for all sessions
      sessions.forEach(session => {
        handleAttendanceChange(studentId, session.id, status)
      })
      
      // Focus the student
      focusStudent(studentId)
    }

    const handleFocusStudent = (event: CustomEvent) => {
      const { studentId } = event.detail
      focusStudent(studentId)
    }

    const handleBulkAttendanceAction = (event: CustomEvent) => {
      const { action } = event.detail
      handleBulkAction(action)
    }

    const handleDateNavigation = (event: CustomEvent) => {
      const { date } = event.detail
      setSelectedDate(date)
    }

    const handleModeChange = (event: CustomEvent) => {
      const { mode } = event.detail
      setAttendanceMode(mode)
    }

    // Add event listeners
    window.addEventListener('markStudentAttendance', handleMarkStudentAttendance as EventListener)
    window.addEventListener('focusStudent', handleFocusStudent as EventListener)
    window.addEventListener('bulkAttendanceAction', handleBulkAttendanceAction as EventListener)
    window.addEventListener('navigateToDate', handleDateNavigation as EventListener)
    window.addEventListener('changeAttendanceMode', handleModeChange as EventListener)

    return () => {
      window.removeEventListener('markStudentAttendance', handleMarkStudentAttendance as EventListener)
      window.removeEventListener('focusStudent', handleFocusStudent as EventListener)
      window.removeEventListener('bulkAttendanceAction', handleBulkAttendanceAction as EventListener)
      window.removeEventListener('navigateToDate', handleDateNavigation as EventListener)
      window.removeEventListener('changeAttendanceMode', handleModeChange as EventListener)
    }
  }, [sessions, handleAttendanceChange, focusStudent, handleBulkAction])

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

  // Helper function to determine content state
  const getContentState = useCallback(() => {
    if (!hasSelection) return 'no-selection'
    if (isLoading && !course && !students.length) return 'loading'
    if (hasError && !course && !students.length) return 'error'
    if (!students.length || !sessions.length) return 'no-data'
    return 'ready'
  }, [hasSelection, isLoading, course, students.length, hasError, sessions.length])

  const contentState = getContentState()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Clean Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Mark Attendance</h1>
            <p className="text-muted-foreground">Track and manage student attendance across sessions</p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
          {/* Enhanced Top Bar with Required Selectors */}
          <div className="space-y-4">
            {/* Primary Action Bar - Date, Batch and Subject Selection */}
            <div className="flex items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-6">
                <div className="text-sm font-medium text-foreground">Select Course:</div>
                {dateSelector && (
                  <div className="flex items-center gap-3">
                    {dateSelector}
                  </div>
                )}
                {batchSelector && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Batch:</span>
                    {batchSelector}
                  </div>
                )}
                {subjectSelector && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Subject:</span>
                    {subjectSelector}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!hasSelection ? (
                  <div className="text-xs text-muted-foreground px-4 py-2">
                    Choose batch and subject to begin
                  </div>
                ) : (
                  <Button onClick={handleSaveDay} className="bg-black text-white hover:bg-gray-800">
                    Save
                  </Button>
                )}
              </div>
            </div>

          </div>

          {/* Simplified Tabs with Clean Styling */}
          <Tabs value={activeView} onValueChange={(value) => setActiveView(value as ViewMode)}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-6">
                <TabsList className="bg-gray-100 p-1 rounded-lg">
                  <TabsTrigger 
                    value="session" 
                    className="px-4 py-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    Session View
                  </TabsTrigger>
                  <TabsTrigger 
                    value="weekly" 
                    className="px-4 py-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    Weekly View
                  </TabsTrigger>
                </TabsList>
                
                {/* Inline Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div>
                    Students: <span className="font-medium text-foreground">
                      {hasSelection ? students.length : '—'}
                    </span>
                  </div>
                  <div>
                    Sessions: <span className="font-medium text-foreground">
                      {hasSelection ? sessions.length : '—'}
                    </span>
                  </div>
                </div>
                
                {/* Search Button */}
                {hasSelection && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openPalette}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Search className="h-4 w-4" />
                    Search Students
                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                      <span className="text-xs">⌘</span>K
                    </kbd>
                  </Button>
                )}
              </div>

              {/* Mode Toggle (Detailed/Fast only) - Only show for session view */}
              {activeView === 'session' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Mode:</span>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <Button
                      variant={attendanceMode === 'detailed' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setAttendanceMode('detailed')}
                      className="px-3 py-1 text-xs"
                    >
                      Detailed
                    </Button>
                    <Button
                      variant={attendanceMode === 'fast' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setAttendanceMode('fast')}
                      className="px-3 py-1 text-xs"
                    >
                      Fast
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <TabsContent value="session" className="mt-0">
              {contentState === 'no-selection' ? (
                <div className="p-8 text-center bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/20">
                  <div className="mb-4">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <h3 className="text-lg font-medium text-muted-foreground">Ready to Mark Attendance</h3>
                    <p className="text-sm text-muted-foreground/80 mt-1">
                      Select a batch and subject above to begin marking attendance
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-xs text-muted-foreground/60">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3" />
                      <span>Quick marking modes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>Date navigation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-3 w-3" />
                      <span>Real-time analytics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>Session tracking</span>
                    </div>
                  </div>
                </div>
              ) : contentState === 'loading' ? (
                <div className="p-6">
                  <TableLoadingState rows={8} />
                </div>
              ) : contentState === 'error' ? (
                <div className="p-6">
                  <ErrorState
                    error={primaryError!}
                    onRetry={handleRetry}
                    variant="inline"
                  />
                </div>
              ) : contentState === 'no-data' ? (
                <div className="p-6">
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
              ) : attendanceLoading ? (
                <div className="p-6">
                  <TableLoadingState rows={students.length} />
                </div>
              ) : (
                <AttendanceTable
                  students={students}
                  sessions={sessions}
                  searchTerm=""
                  attendanceData={attendanceData}
                  onAttendanceChange={handleAttendanceChange}
                  attendanceMode={attendanceMode}
                  focusedStudentId={focusedStudentId}
                />
              )}
            </TabsContent>

            <TabsContent value="weekly" className="mt-0">
              {contentState === 'no-selection' ? (
                <div className="p-8 text-center bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/20">
                  <div className="mb-4">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <h3 className="text-lg font-medium text-muted-foreground">Weekly Attendance View</h3>
                    <p className="text-sm text-muted-foreground/80 mt-1">
                      Select a batch and subject to view weekly attendance patterns
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-xs text-muted-foreground/60">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-3 w-3" />
                      <span>Attendance trends</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>Weekly overview</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      <span>Student patterns</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-3 w-3" />
                      <span>Visual analytics</span>
                    </div>
                  </div>
                </div>
              ) : contentState === 'loading' ? (
                <div className="p-6">
                  <LoadingState message="Loading weekly view..." />
                </div>
              ) : contentState === 'error' ? (
                <div className="p-6">
                  <ErrorState
                    error={primaryError!}
                    onRetry={handleRetry}
                    variant="inline"
                  />
                </div>
              ) : contentState === 'no-data' ? (
                <div className="p-6">
                  <NoDataState
                    title="No Weekly Data"
                    description="No attendance data available for weekly view"
                    action={{
                      label: "Retry Loading",
                      onClick: handleRetry
                    }}
                  />
                </div>
              ) : (
                <WeeklyAttendanceView
                  students={students}
                  sessions={sessions}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  attendanceData={attendanceData}
                  onAttendanceChange={handleAttendanceChange}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
})