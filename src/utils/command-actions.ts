import type { AttendanceMode } from '@/types/attendance'
import type { AttendanceStatus } from '@/types/attendance'
import { format, subDays, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

export interface CommandActions {
  // Navigation
  navigateToToday: () => void
  navigateToDate: (date: string) => void
  navigateToYesterday: () => void
  navigateToTomorrow: () => void
  navigateToLastMonday: () => void
  navigateToThisWeekStart: () => void
  navigateToLastWeekStart: () => void
  navigateToThisMonth: () => void
  navigateToLastMonth: () => void
  
  // Mode switching
  setAttendanceMode: (mode: AttendanceMode) => void
  
  // Attendance operations
  markAllStudents: (status: AttendanceStatus) => void
  copyPreviousDay: () => void
  
  // System operations
  saveChanges: () => void
  exportData: () => void
  undoLastAction: () => void
  
  // Analytics
  showAbsentStudents: () => void
  showAttendanceSummary: () => void
  
  // Student search
  focusStudent: (studentId: string) => void
  filterByAttendance: (status: AttendanceStatus) => void
}

export function createCommandActions(
  setSelectedDate: (date: string) => void,
  setAttendanceMode: (mode: AttendanceMode) => void,
  handleBulkAction: (action: 'present' | 'absent' | 'copy') => void,
  calculateOverallStats: () => { present: number; total: number; percentage: number },
  focusStudentCallback?: (studentId: string) => void,
  filterStudentsCallback?: (status: AttendanceStatus) => void
): CommandActions {
  
  const today = new Date()
  
  return {
    navigateToToday: () => {
      const todayStr = format(today, 'yyyy-MM-dd')
      setSelectedDate(todayStr)
    },
    
    navigateToDate: (date: string) => {
      setSelectedDate(date)
    },
    
    navigateToYesterday: () => {
      const yesterday = subDays(today, 1)
      setSelectedDate(format(yesterday, 'yyyy-MM-dd'))
    },
    
    navigateToTomorrow: () => {
      const tomorrow = addDays(today, 1)
      setSelectedDate(format(tomorrow, 'yyyy-MM-dd'))
    },
    
    navigateToLastMonday: () => {
      const lastMonday = subDays(startOfWeek(today, { weekStartsOn: 1 }), 7)
      setSelectedDate(format(lastMonday, 'yyyy-MM-dd'))
    },
    
    navigateToThisWeekStart: () => {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 })
      setSelectedDate(format(weekStart, 'yyyy-MM-dd'))
    },
    
    navigateToLastWeekStart: () => {
      const lastWeekStart = subDays(startOfWeek(today, { weekStartsOn: 1 }), 7)
      setSelectedDate(format(lastWeekStart, 'yyyy-MM-dd'))
    },
    
    navigateToThisMonth: () => {
      const monthStart = startOfMonth(today)
      setSelectedDate(format(monthStart, 'yyyy-MM-dd'))
    },
    
    navigateToLastMonth: () => {
      const lastMonth = subDays(startOfMonth(today), 1)
      const lastMonthStart = startOfMonth(lastMonth)
      setSelectedDate(format(lastMonthStart, 'yyyy-MM-dd'))
    },
    
    setAttendanceMode: (mode: AttendanceMode) => {
      setAttendanceMode(mode)
    },
    
    markAllStudents: (status: AttendanceStatus) => {
      if (status === 'present' || status === 'absent') {
        handleBulkAction(status)
      }
    },
    
    copyPreviousDay: () => {
      handleBulkAction('copy')
    },
    
    saveChanges: () => {
      // In a real app, this would save to backend
      console.log('Changes saved!')
      // You could show a toast notification here
    },
    
    exportData: () => {
      const stats = calculateOverallStats()
      const csvContent = `Total Students,Present,Absent,Percentage\n${stats.total},${stats.present},${stats.total - stats.present},${stats.percentage}%`
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    },
    
    undoLastAction: () => {
      // In a real app, this would implement undo functionality
      console.log('Undo last action')
    },
    
    showAbsentStudents: () => {
      // This would filter the view to show only absent students
      console.log('Showing absent students')
    },
    
    showAttendanceSummary: () => {
      const stats = calculateOverallStats()
      alert(`Attendance Summary:\nPresent: ${stats.present}/${stats.total} (${stats.percentage}%)`)
    },
    
    focusStudent: (studentId: string) => {
      if (focusStudentCallback) {
        focusStudentCallback(studentId)
      }
    },
    
    filterByAttendance: (status: AttendanceStatus) => {
      if (filterStudentsCallback) {
        filterStudentsCallback(status)
      }
    }
  }
}