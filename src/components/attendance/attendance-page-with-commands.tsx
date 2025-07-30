"use client"

import React, { useEffect } from 'react'
import { useCommandPalette } from '@/components/attendance/command-palette-provider'
import type { AttendanceMode } from '@/components/attendance/attendance-mode-toggle'
import type { AttendanceStatus } from '@/types/attendance'

interface AttendancePageWithCommandsProps {
  selectedDate: string
  setSelectedDate: (date: string) => void
  attendanceMode: AttendanceMode
  setAttendanceMode: (mode: AttendanceMode) => void
  attendanceData: Record<string, Record<string, AttendanceStatus>>
  handleBulkAction: (action: 'present' | 'absent' | 'copy') => void
  calculateOverallStats: () => { present: number; total: number; percentage: number }
  children: React.ReactNode
}

export function AttendancePageWithCommands({
  selectedDate,
  setSelectedDate,
  attendanceMode,
  setAttendanceMode,
  attendanceData,
  handleBulkAction,
  calculateOverallStats,
  children
}: AttendancePageWithCommandsProps) {
  const { updateContext } = useCommandPalette()

  // Update command palette context when app state changes
  useEffect(() => {
    updateContext({
      selectedDate,
      currentMode: attendanceMode,
      selectedStudents: [], // This will be updated by selection logic
      focusedCell: null, // This will be updated by focus logic
      hasUnsavedChanges: Object.keys(attendanceData).length > 0,
      currentView: 'attendance'
    })
  }, [selectedDate, attendanceMode, attendanceData, updateContext])

  // Create and set command actions
  useEffect(() => {
    // We would need to pass actions to the command palette here
    // For now, the commands will use console.log placeholders
  }, [setSelectedDate, setAttendanceMode, handleBulkAction, calculateOverallStats])

  return <>{children}</>
}