/**
 * Attendance API Service
 * 
 * This service provides a unified interface for the attendance system,
 * adapting the main system's API to work with the attendance tracker components.
 */

// Types for the attendance system
export interface AttendanceStudent {
  id: string
  name: string
  email: string
  studentId: string
  photo?: string
  attendanceHistory: AttendanceRecord[]
  sessionAttendanceHistory: SessionAttendanceRecord[]
}

export interface AttendanceRecord {
  date: string
  status: 'present' | 'absent' | 'medical'
}

export interface SessionAttendanceRecord {
  date: string
  sessionId: string
  status: 'present' | 'absent' | 'medical'
}

export interface AttendanceCourse {
  id: string
  name: string
  code: string
  semester: string
  room: string
  sessions: AttendanceSession[]
}

export interface AttendanceSession {
  id: string
  name: string
  startTime: string
  endTime: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: any
}

export type AttendanceStatus = 'present' | 'absent' | 'medical'

class AttendanceApiService {
  private baseURL: string

  constructor() {
    this.baseURL = '/api/attendance'
  }

  private async fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        credentials: 'include', // Include cookies for authentication
        ...options,
      })

      const data = await response.json()

      if (!response.ok) {
        console.error(`API Error ${response.status}:`, {
          endpoint,
          status: response.status,
          statusText: response.statusText,
          data
        })
        
        // alert(`API ERROR ${response.status}: ${JSON.stringify(data, null, 2)}`)
        
        return {
          success: false,
          error: data.error || `HTTP error! status: ${response.status}`,
        }
      }

      return data
    } catch (error) {
      console.error(`API Request Failed:`, {
        endpoint,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Get all students for attendance marking
   */
  async getStudents(filters?: { 
    batchId?: string
    subjectId?: string
    active?: boolean 
  }): Promise<ApiResponse<AttendanceStudent[]>> {
    const params = new URLSearchParams()
    
    if (filters?.batchId) params.append('batchId', filters.batchId)
    if (filters?.subjectId) params.append('subjectId', filters.subjectId)
    if (filters?.active !== undefined) params.append('active', filters.active.toString())

    const queryString = params.toString()
    const endpoint = `/students${queryString ? `?${queryString}` : ''}`

    return this.fetchApi<AttendanceStudent[]>(endpoint)
  }

  /**
   * Get course details by courseId (subjectId)
   */
  async getCourse(courseId: string): Promise<ApiResponse<AttendanceCourse>> {
    return this.fetchApi<AttendanceCourse>(`/courses/${courseId}`)
  }

  /**
   * Get sessions for a specific course
   */
  async getSessions(courseId: string): Promise<ApiResponse<AttendanceSession[]>> {
    return this.fetchApi<AttendanceSession[]>(`/courses/${courseId}/sessions`)
  }

  /**
   * Get attendance data for a specific date
   */
  async getAttendanceByDate(
    courseId: string, 
    date: string
  ): Promise<ApiResponse<Record<string, Record<string, AttendanceStatus>>>> {
    return this.fetchApi(`/courses/${courseId}/attendance?date=${date}`)
  }

  /**
   * Get attendance data for a date range
   */
  async getAttendanceByDateRange(
    courseId: string,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<Record<string, Record<string, AttendanceStatus>>>> {
    return this.fetchApi(
      `/courses/${courseId}/attendance?startDate=${startDate}&endDate=${endDate}`
    )
  }

  /**
   * Mark attendance for a single student
   */
  async markAttendance(
    courseId: string,
    studentId: string,
    sessionId: string,
    date: string,
    status: AttendanceStatus
  ): Promise<ApiResponse<any>> {
    const requestBody = {
      studentId,
      sessionId,
      date,
      status,
      timestamp: new Date().toISOString()
    }
    
    console.log('🔴 MARKING ATTENDANCE REQUEST:', {
      courseId,
      endpoint: `/courses/${courseId}/attendance`,
      requestBody
    })
    
    // alert(`DEBUGGING: Marking attendance for student ${studentId}, session ${sessionId}, status ${status}`)
    
    // Temporarily test with simple endpoint
    // return this.fetchApi(`/test-attendance`, {
    return this.fetchApi(`/courses/${courseId}/attendance`, {
      method: 'POST',
      body: JSON.stringify(requestBody)
    })
  }

  /**
   * Mark attendance for multiple students (bulk operation)
   */
  async bulkMarkAttendance(
    courseId: string,
    records: Array<{
      studentId: string
      sessionId: string
      date: string
      status: AttendanceStatus
    }>
  ): Promise<ApiResponse<any>> {
    return this.fetchApi(`/courses/${courseId}/attendance/bulk`, {
      method: 'POST',
      body: JSON.stringify({ records })
    })
  }

  /**
   * Save/finalize attendance for a specific date
   */
  async saveAttendance(
    courseId: string,
    date: string
  ): Promise<ApiResponse<any>> {
    return this.fetchApi(`/courses/${courseId}/attendance/save`, {
      method: 'POST',
      body: JSON.stringify({ date })
    })
  }

  /**
   * Reset attendance for a specific date - clears all attendance records
   */
  async resetAttendance(
    courseId: string,
    date: string
  ): Promise<ApiResponse<any>> {
    return this.fetchApi(`/courses/${courseId}/attendance/reset`, {
      method: 'POST',
      body: JSON.stringify({ date })
    })
  }

  /**
   * Retry wrapper for network resilience
   */
  private async retryRequest<T>(
    requestFn: () => Promise<ApiResponse<T>>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<ApiResponse<T>> {
    let lastError: any

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await requestFn()
        if (result.success) {
          return result
        }
        lastError = result.error
      } catch (error) {
        lastError = error
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt))
      }
    }

    return {
      success: false,
      error: `Request failed after ${maxRetries} attempts. Last error: ${lastError}`
    }
  }

  /**
   * Get students with retry logic
   */
  async getStudentsWithRetry(filters?: Parameters<typeof this.getStudents>[0]) {
    return this.retryRequest(() => this.getStudents(filters))
  }

  /**
   * Mark attendance with retry logic
   */
  async markAttendanceWithRetry(
    courseId: string,
    studentId: string,
    sessionId: string,
    date: string,
    status: AttendanceStatus
  ) {
    return this.retryRequest(() => 
      this.markAttendance(courseId, studentId, sessionId, date, status)
    )
  }
}

// Export singleton instance
export const attendanceApi = new AttendanceApiService()

// Types are already exported via export interface declarations above