"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/attendance/theme-toggle"
import { useCommandPalette } from "@/components/attendance/command-palette-provider"
import { EnhancedDateSelector } from "@/components/attendance/enhanced-date-selector"
import { LoadingSpinner, CardLoadingState } from "@/components/ui/loading-spinner"
import { ErrorState } from "@/components/ui/error-state"
import { Calendar, Save, Search, Users, Command, Zap } from "lucide-react"
import type { Student, AttendanceStatus, Course, ApiError } from "@/types/attendance"

interface AttendanceHeaderProps {
  course: Course | null
  selectedDate: string
  onDateChange: (date: string) => void
  overallStats: {
    present: number
    total: number
    percentage: number
  }
  onBulkAction: (action: 'present' | 'absent') => void
  onSaveDay: () => void
  students?: Student[]
  attendanceData?: Record<string, Record<string, AttendanceStatus>>
  isLoading?: boolean
  error?: ApiError | null
  onRetry?: () => void
}

export function AttendanceHeader({
  course,
  selectedDate,
  onDateChange,
  overallStats,
  onBulkAction,
  onSaveDay,
  students = [],
  attendanceData = {},
  isLoading = false,
  error = null,
  onRetry
}: AttendanceHeaderProps) {
  const { openPalette } = useCommandPalette()
  const today = new Date()
  const selectedDateObj = new Date(selectedDate)
  const dayName = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' })

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl font-bold text-primary">
                  Mark Attendance
                </CardTitle>
                <CardDescription className="text-base">
                  Track and manage student attendance across sessions with detailed insights.
                </CardDescription>
              </div>
              <ThemeToggle />
            </div>
          </CardHeader>
        </Card>
        
        <ErrorState
          error={error}
          onRetry={onRetry}
          variant="card"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl font-bold text-primary">
                Mark Attendance
              </CardTitle>
              <CardDescription className="text-base">
                Track and manage student attendance across sessions with detailed insights.
              </CardDescription>
            </div>
            <ThemeToggle />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <CardLoadingState />
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-primary mb-1 flex items-center gap-2">
                  {course?.name || 'Loading Course...'}
                  {isLoading && <LoadingSpinner size="sm" />}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {course ? `${course.code} • ${course.semester} • Room ${course.room}` : 'Loading course details...'}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t">
                <div className="flex items-center">
                  <EnhancedDateSelector
                    selectedDate={selectedDate}
                    onDateChange={onDateChange}
                    students={students}
                    attendanceData={attendanceData}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex-1 min-w-0 w-full lg:w-auto">
              <Button
                variant="outline"
                onClick={openPalette}
                disabled={isLoading}
                className="w-full lg:max-w-md justify-start text-muted-foreground hover:text-foreground"
              >
                <Command className="mr-2 h-4 w-4" />
                <span className="mr-auto">Search students, quick actions...</span>
                <div className="ml-auto flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 text-xs bg-muted border border-border rounded">⌘</kbd>
                  <kbd className="px-1.5 py-0.5 text-xs bg-muted border border-border rounded">K</kbd>
                </div>
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 w-full lg:w-auto">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onBulkAction('present')}
                  disabled={isLoading}
                >
                  Mark All Present
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onBulkAction('absent')}
                  disabled={isLoading}
                >
                  Mark All Absent
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Badge variant="secondary">
                  Overall: {overallStats.present}/{overallStats.total} • {overallStats.percentage}%
                </Badge>
              </div>

              <Button className="gap-2" onClick={onSaveDay} disabled={isLoading}>
                {isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Full Day
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}