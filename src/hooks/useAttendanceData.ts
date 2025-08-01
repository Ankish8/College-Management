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
}): UseStudentsReturn {
  const [students, setStudents] = useState<AttendanceStudent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  const fetchStudents = useCallback(async () => {
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
  }, [filters?.batchId, filters?.subjectId, filters?.active])

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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  const fetchSessions = useCallback(async () => {
    if (!courseId) return

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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  const fetchCourse = useCallback(async () => {
    if (!courseId) return

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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  const fetchAttendance = useCallback(async () => {
    if (!courseId || !selectedDate) return

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await attendanceApi.getAttendanceByDate(courseId, selectedDate)
      
      if (response.success && response.data) {
        setAttendanceData(response.data)
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

  const markAttendance = useCallback(async (
    studentId: string, 
    sessionId: string, 
    status: AttendanceStatus
  ) => {
    try {
      const response = await attendanceApi.markAttendanceWithRetry(
        courseId, 
        studentId, 
        sessionId, 
        selectedDate, 
        status
      )
      
      if (response.success) {
        // Optimistically update local state
        setAttendanceData(prev => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            [sessionId]: status
          }
        }))
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
        // Optimistically update local state
        setAttendanceData(prev => {
          const updated = { ...prev }
          records.forEach(({ studentId, sessionId, status }) => {
            if (!updated[studentId]) {
              updated[studentId] = {}
            }
            updated[studentId][sessionId] = status
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