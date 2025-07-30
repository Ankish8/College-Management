import type { Command } from '@/types/command-palette'

// Mock students data for search
const mockStudents = [
  { id: 'student-1', name: 'Aarav Patel', email: 'aarav.patel@jlu.edu.in', studentId: 'UX23001' },
  { id: 'student-2', name: 'Diya Sharma', email: 'diya.sharma@jlu.edu.in', studentId: 'UX23002' },
  { id: 'student-3', name: 'Arjun Singh', email: 'arjun.singh@jlu.edu.in', studentId: 'UX23003' },
  { id: 'student-4', name: 'Ananya Gupta', email: 'ananya.gupta@jlu.edu.in', studentId: 'UX23004' },
  { id: 'student-5', name: 'Vivaan Verma', email: 'vivaan.verma@jlu.edu.in', studentId: 'UX23005' },
  { id: 'student-6', name: 'Ishika Reddy', email: 'ishika.reddy@jlu.edu.in', studentId: 'UX23006' },
  { id: 'student-7', name: 'Advait Kumar', email: 'advait.kumar@jlu.edu.in', studentId: 'UX23007' }
]

// Simple registry with working actions
export function createSimpleCommands(): Command[] {
  // Create student commands dynamically
  const studentCommands: Command[] = mockStudents.map(student => ({
    id: `student-${student.id}`,
    label: student.name,
    description: `${student.studentId} • ${student.email}`,
    category: 'student',
    keywords: [student.name.toLowerCase(), student.email, student.studentId.toLowerCase(), 'student', 'find', 'search'],
    action: () => {
      // Focus on student row in table
      const studentRow = document.querySelector(`[data-student-id="${student.id}"]`)
      if (studentRow) {
        studentRow.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Add highlight effect
        studentRow.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50')
        setTimeout(() => {
          studentRow.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50')
        }, 2000)
      }
    }
  }))

  const systemCommands: Command[] = [
    {
      id: 'nav-today',
      label: 'Go to Today',
      description: 'Navigate to current date',
      category: 'navigation',
      keywords: ['today', 'current', 'now'],
      action: () => {
        const today = new Date().toISOString().split('T')[0]
        // Trigger a page reload with today's date
        const url = new URL(window.location.href)
        url.searchParams.set('date', today)
        window.history.pushState({}, '', url)
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    },
    {
      id: 'mode-fast',
      label: 'Switch to Fast Mode',
      description: 'Switch to fast attendance mode',
      category: 'system',
      keywords: ['fast', 'mode', 'switch', 'quick'],
      action: () => {
        // Dispatch a custom event to switch modes
        window.dispatchEvent(new CustomEvent('switchMode', { detail: 'fast' }))
      }
    },
    {
      id: 'mode-predictive',
      label: 'Switch to Predictive Mode',
      description: 'Switch to AI-powered predictive mode',
      category: 'system',
      keywords: ['predictive', 'mode', 'switch', 'ai', 'predict', 'smart'],
      action: () => {
        window.dispatchEvent(new CustomEvent('switchMode', { detail: 'predictive' }))
      }
    },
    {
      id: 'attendance-mark-all-present',
      label: 'Mark All Present',
      description: 'Mark all students as present for current session',
      category: 'attendance',
      keywords: ['mark', 'all', 'present', 'bulk', 'everyone'],
      action: () => {
        window.dispatchEvent(new CustomEvent('bulkAction', { detail: 'present' }))
      }
    },
    {
      id: 'attendance-mark-all-absent',
      label: 'Mark All Absent',
      description: 'Mark all students as absent for current session',
      category: 'attendance',
      keywords: ['mark', 'all', 'absent', 'bulk', 'everyone'],
      action: () => {
        window.dispatchEvent(new CustomEvent('bulkAction', { detail: 'absent' }))
      }
    },
    {
      id: 'analytics-attendance-summary',
      label: 'Attendance Summary',
      description: 'Show overall attendance statistics',
      category: 'analytics',
      keywords: ['summary', 'stats', 'statistics', 'overview', 'total'],
      action: () => {
        window.dispatchEvent(new CustomEvent('showSummary'))
      }
    },
    {
      id: 'system-export',
      label: 'Export Attendance',
      description: 'Export attendance data to CSV',
      category: 'system',
      keywords: ['export', 'download', 'csv', 'data'],
      action: () => {
        // Simple CSV export
        const csvContent = 'Student,Status\nSample Student,Present\n'
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    }
  ]

  return [...studentCommands, ...systemCommands]
}