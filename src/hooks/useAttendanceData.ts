import { useState, useEffect, useCallback } from 'react'
import { 
  attendanceApi, 
  AttendanceStudent, 
  AttendanceSession, 
  AttendanceCourse, 
  AttendanceStatus, 
  ApiResponse 
} from '@/services/attendance-api'

// Common error type
interface ApiError {
  message: string
  code?: string
  details?: any
}

// Hook return types
interface UseStudentsReturn {
  students: AttendanceStudent[]
  isLoading: boolean
  error: ApiError | null
  refetch: () => Promise<void>
}

interface UseSessionsReturn {
  sessions: AttendanceSession[]
  isLoading: boolean
  error: ApiError | null
  refetch: () => Promise<void>
}

interface UseCourseReturn {
  course: AttendanceCourse | null
  isLoading: boolean
  error: ApiError | null
  refetch: () => Promise<void>
}

interface UseAttendanceReturn {
  attendanceData: Record<string, Record<string, AttendanceStatus>>
  isLoading: boolean
  error: ApiError | null
  markAttendance: (studentId: string, sessionId: string, status: AttendanceStatus) => Promise<void>
  bulkMarkAttendance: (records: Array<{
    studentId: string
    sessionId: string
    status: AttendanceStatus
  }>) => Promise<void>
  refetch: () => Promise<void>
}

/**
 * Hook for fetching students with attendance data
 */
export function useStudents(filters?: { 
  batchId?: string
  subjectId?: string
  active?: boolean
  date?: string 
}): UseStudentsReturn {
  const [students, setStudents] = useState<AttendanceStudent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const fetchStudents = useCallback(async () => {
    if (!filters || !filters.batchId || !filters.subjectId) {
      setStudents([])
      setIsLoading(false)
      setError(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await attendanceApi.getStudentsWithRetry(filters)
      
      if (response.success && response.data) {
        setStudents(response.data)
      } else {
        setError({
          message: response.error || 'Failed to fetch students',
          code: 'FETCH_STUDENTS_ERROR'
        })
      }
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Unknown error occurred',
        code: 'FETCH_STUDENTS_ERROR'
      })
    } finally {
      setIsLoading(false)
    }
  }, [filters?.batchId, filters?.subjectId, filters?.active, filters?.date])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  return {
    students,
    isLoading,
    error,
    refetch: fetchStudents
  }
}

/**
 * Hook for fetching sessions for a course
 */
export function useSessions(courseId: string): UseSessionsReturn {
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const fetchSessions = useCallback(async () => {
    if (!courseId) {
      setSessions([])
      setIsLoading(false)
      setError(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await attendanceApi.getSessions(courseId)
      
      if (response.success && response.data) {
        setSessions(response.data)
      } else {
        setError({
          message: response.error || 'Failed to fetch sessions',
          code: 'FETCH_SESSIONS_ERROR'
        })
      }
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Unknown error occurred',
        code: 'FETCH_SESSIONS_ERROR'
      })
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  return {
    sessions,
    isLoading,
    error,
    refetch: fetchSessions
  }
}

/**
 * Hook for fetching course details
 */
export function useCourse(courseId: string): UseCourseReturn {
  const [course, setCourse] = useState<AttendanceCourse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const fetchCourse = useCallback(async () => {
    if (!courseId) {
      setCourse(null)
      setIsLoading(false)
      setError(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await attendanceApi.getCourse(courseId)
      
      if (response.success && response.data) {
        setCourse(response.data)
      } else {
        setError({
          message: response.error || 'Failed to fetch course',
          code: 'FETCH_COURSE_ERROR'
        })
      }
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Unknown error occurred',
        code: 'FETCH_COURSE_ERROR'
      })
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    fetchCourse()
  }, [fetchCourse])

  return {
    course,
    isLoading,
    error,
    refetch: fetchCourse
  }
}

/**
 * Hook for attendance data management with marking capabilities
 */
export function useAttendance(courseId: string, selectedDate: string): UseAttendanceReturn {
  const [attendanceData, setAttendanceData] = useState<Record<string, Record<string, AttendanceStatus>>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const fetchAttendance = useCallback(async () => {
    if (!courseId || !selectedDate) {
      setAttendanceData({})
      setIsLoading(false)
      setError(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await attendanceApi.getAttendanceByDate(courseId, selectedDate)
      
      if (response.success && response.data) {
        // Calculate full-day status for each student if not already present
        const dataWithFullDay = { ...response.data }
        
        Object.keys(dataWithFullDay).forEach(studentId => {
          const studentData = dataWithFullDay[studentId]
          const sessionIds = Object.keys(studentData).filter(id => id !== 'full-day')
          
          // Always recalculate full-day status from sessions to ensure mixed status is detected
          if (sessionIds.length > 0) {
            dataWithFullDay[studentId] = {
              ...studentData,
              'full-day': calculateFullDayStatus(studentData, sessionIds)
            }
          }
        })
        
        setAttendanceData(dataWithFullDay)
      } else {
        setError({
          message: response.error || 'Failed to fetch attendance data',
          code: 'FETCH_ATTENDANCE_ERROR'
        })
      }
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Unknown error occurred',
        code: 'FETCH_ATTENDANCE_ERROR'
      })
    } finally {
      setIsLoading(false)
    }
  }, [courseId, selectedDate])

  // Helper function to calculate full-day status from individual sessions
  const calculateFullDayStatus = (studentAttendance: Record<string, AttendanceStatus>, sessions: string[]): AttendanceStatus => {
    if (!sessions.length) return 'absent'
    
    const sessionStatuses = sessions
      .map(sessionId => studentAttendance[sessionId])
      .filter(status => status !== undefined)
    
    if (sessionStatuses.length === 0) return 'absent'
    
    // Get unique statuses to check for mixed attendance
    const uniqueStatuses = [...new Set(sessionStatuses)]
    
    // If only one unique status, return it (all sessions have same status)
    if (uniqueStatuses.length === 1) {
      return uniqueStatuses[0]
    }
    
    // If there are multiple different statuses, return mixed
    // Exception: If any session is medical and others are different, prioritize medical
    if (sessionStatuses.some(status => status === 'medical')) {
      // If medical is mixed with other statuses, still return medical as priority
      const nonMedicalStatuses = sessionStatuses.filter(status => status !== 'medical')
      const uniqueNonMedical = [...new Set(nonMedicalStatuses)]
      
      // If medical is the only status, return medical
      if (nonMedicalStatuses.length === 0) return 'medical'
      
      // If medical is mixed with only one other status type, could still be mixed
      // But for UX purposes, prioritize medical for full day
      return 'medical'
    }
    
    // For other mixed combinations (present/absent, present/unmarked, etc.), return mixed
    return 'mixed'
  }

  const markAttendance = useCallback(async (
    studentId: string, 
    sessionId: string, 
    status: AttendanceStatus
  ) => {
    try {
      // Special handling for full-day marking
      if (sessionId === 'full-day') {
        const response = await attendanceApi.markAttendanceWithRetry(
          courseId, 
          studentId, 
          sessionId, 
          selectedDate, 
          status
        )
        
        if (response.success) {
          // Update full-day status directly
          setAttendanceData(prev => ({
            ...prev,
            [studentId]: {
              ...prev[studentId],
              'full-day': status
            }
          }))
        } else {
          throw new Error(response.error || 'Failed to mark full-day attendance')
        }
        return
      }

      // Regular session marking
      const response = await attendanceApi.markAttendanceWithRetry(
        courseId, 
        studentId, 
        sessionId, 
        selectedDate, 
        status
      )
      
      if (response.success) {
        // Update session status and recalculate full-day status
        setAttendanceData(prev => {
          const updatedStudentData = {
            ...prev[studentId],
            [sessionId]: status
          }
          
          // Get all session IDs (excluding 'full-day')
          const allSessionIds = Object.keys(updatedStudentData).filter(id => id !== 'full-day')
          
          // Calculate new full-day status
          const fullDayStatus = calculateFullDayStatus(updatedStudentData, allSessionIds)
          
          return {
            ...prev,
            [studentId]: {
              ...updatedStudentData,
              'full-day': fullDayStatus
            }
          }
        })
      } else {
        throw new Error(response.error || 'Failed to mark attendance')
      }
    } catch (err) {
      console.error('Mark attendance error:', err)
      const errorMessage = err instanceof Error ? err.message : 
                          typeof err === 'string' ? err :
                          'Failed to mark attendance'
      setError({
        message: errorMessage,
        code: 'MARK_ATTENDANCE_ERROR'
      })
      throw err
    }
  }, [courseId, selectedDate])

  const bulkMarkAttendance = useCallback(async (
    records: Array<{
      studentId: string
      sessionId: string
      status: AttendanceStatus
    }>
  ) => {
    try {
      const recordsWithDate = records.map(record => ({
        ...record,
        date: selectedDate
      }))

      const response = await attendanceApi.bulkMarkAttendance(courseId, recordsWithDate)
      
      if (response.success) {
        // Optimistically update local state with full-day calculations
        setAttendanceData(prev => {
          const updated = { ...prev }
          const affectedStudents = new Set<string>()
          
          records.forEach(({ studentId, sessionId, status }) => {
            if (!updated[studentId]) {
              updated[studentId] = {}
            }
            updated[studentId][sessionId] = status
            affectedStudents.add(studentId)
          })
          
          // Recalculate full-day status for affected students
          affectedStudents.forEach(studentId => {
            const studentData = updated[studentId]
            const sessionIds = Object.keys(studentData).filter(id => id !== 'full-day')
            
            if (sessionIds.length > 0) {
              updated[studentId]['full-day'] = calculateFullDayStatus(studentData, sessionIds)
            }
          })
          
          return updated
        })
      } else {
        throw new Error(response.error || 'Failed to bulk mark attendance')
      }
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Failed to bulk mark attendance',
        code: 'BULK_MARK_ATTENDANCE_ERROR'
      })
      throw err
    }
  }, [courseId, selectedDate])

  useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

  return {
    attendanceData,
    isLoading,
    error,
    markAttendance,
    bulkMarkAttendance,
    refetch: fetchAttendance
  }
}

/**
 * Hook for weekly attendance data
 */
export function useWeeklyAttendance(courseId: string, startDate: string, endDate: string) {
  const [attendanceData, setAttendanceData] = useState<Record<string, Record<string, AttendanceStatus>>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  const fetchWeeklyAttendance = useCallback(async () => {
    if (!courseId || !startDate || !endDate) return

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await attendanceApi.getAttendanceByDateRange(courseId, startDate, endDate)
      
      if (response.success && response.data) {
        setAttendanceData(response.data)
      } else {
        setError({
          message: response.error || 'Failed to fetch weekly attendance data',
          code: 'FETCH_WEEKLY_ATTENDANCE_ERROR'
        })
      }
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Unknown error occurred',
        code: 'FETCH_WEEKLY_ATTENDANCE_ERROR'
      })
    } finally {
      setIsLoading(false)
    }
  }, [courseId, startDate, endDate])

  useEffect(() => {
    fetchWeeklyAttendance()
  }, [fetchWeeklyAttendance])

  return {
    attendanceData,
    isLoading,
    error,
    refetch: fetchWeeklyAttendance
  }
}

// Export the error type
export type { ApiError }