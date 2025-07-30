import type { Student, Session, Course, AttendanceStatus } from '@/types/attendance'

// Validation utilities for API responses
export class ApiValidationError extends Error {
  constructor(message: string, public field?: string, public received?: any) {
    super(message)
    this.name = 'ApiValidationError'
  }
}

// Validation functions
export const validateStudent = (data: any): Student => {
  if (!data || typeof data !== 'object') {
    throw new ApiValidationError('Student data must be an object', 'student', data)
  }

  if (!data.id || typeof data.id !== 'string') {
    throw new ApiValidationError('Student ID is required and must be a string', 'id', data.id)
  }

  if (!data.name || typeof data.name !== 'string') {
    throw new ApiValidationError('Student name is required and must be a string', 'name', data.name)
  }

  if (!data.email || typeof data.email !== 'string') {
    throw new ApiValidationError('Student email is required and must be a string', 'email', data.email)
  }

  if (!data.studentId || typeof data.studentId !== 'string') {
    throw new ApiValidationError('Student ID is required and must be a string', 'studentId', data.studentId)
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(data.email)) {
    throw new ApiValidationError('Invalid email format', 'email', data.email)
  }

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    studentId: data.studentId,
    photo: data.photo || undefined,
    attendanceHistory: [], // Will be populated separately
    sessionAttendanceHistory: [] // Will be populated separately
  }
}

export const validateSession = (data: any): Session => {
  if (!data || typeof data !== 'object') {
    throw new ApiValidationError('Session data must be an object', 'session', data)
  }

  if (!data.id || typeof data.id !== 'string') {
    throw new ApiValidationError('Session ID is required and must be a string', 'id', data.id)
  }

  if (!data.name || typeof data.name !== 'string') {
    throw new ApiValidationError('Session name is required and must be a string', 'name', data.name)
  }

  if (!data.startTime || typeof data.startTime !== 'string') {
    throw new ApiValidationError('Session start time is required and must be a string', 'startTime', data.startTime)
  }

  if (!data.endTime || typeof data.endTime !== 'string') {
    throw new ApiValidationError('Session end time is required and must be a string', 'endTime', data.endTime)
  }

  // Time format validation (HH:MM)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  if (!timeRegex.test(data.startTime)) {
    throw new ApiValidationError('Invalid start time format. Expected HH:MM', 'startTime', data.startTime)
  }

  if (!timeRegex.test(data.endTime)) {
    throw new ApiValidationError('Invalid end time format. Expected HH:MM', 'endTime', data.endTime)
  }

  return {
    id: data.id,
    name: data.name,
    startTime: data.startTime,
    endTime: data.endTime
  }
}

export const validateCourse = (data: any): Course => {
  if (!data || typeof data !== 'object') {
    throw new ApiValidationError('Course data must be an object', 'course', data)
  }

  if (!data.id || typeof data.id !== 'string') {
    throw new ApiValidationError('Course ID is required and must be a string', 'id', data.id)
  }

  if (!data.name || typeof data.name !== 'string') {
    throw new ApiValidationError('Course name is required and must be a string', 'name', data.name)
  }

  if (!data.code || typeof data.code !== 'string') {
    throw new ApiValidationError('Course code is required and must be a string', 'code', data.code)
  }

  if (!data.semester || typeof data.semester !== 'string') {
    throw new ApiValidationError('Course semester is required and must be a string', 'semester', data.semester)
  }

  if (!data.room || typeof data.room !== 'string') {
    throw new ApiValidationError('Course room is required and must be a string', 'room', data.room)
  }

  if (!Array.isArray(data.sessions)) {
    throw new ApiValidationError('Course sessions must be an array', 'sessions', data.sessions)
  }

  const sessions = data.sessions.map((session: any, index: number) => {
    try {
      return validateSession(session)
    } catch (error) {
      throw new ApiValidationError(
        `Invalid session at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        `sessions[${index}]`,
        session
      )
    }
  })

  return {
    id: data.id,
    name: data.name,
    code: data.code,
    semester: data.semester,
    room: data.room,
    sessions
  }
}

export const validateAttendanceStatus = (status: any): AttendanceStatus => {
  const validStatuses: AttendanceStatus[] = ['present', 'absent', 'medical']
  
  if (!validStatuses.includes(status)) {
    throw new ApiValidationError(
      `Invalid attendance status. Must be one of: ${validStatuses.join(', ')}`,
      'status',
      status
    )
  }

  return status
}

export const validateAttendanceRecord = (data: any) => {
  if (!data || typeof data !== 'object') {
    throw new ApiValidationError('Attendance record must be an object', 'attendanceRecord', data)
  }

  if (!data.studentId || typeof data.studentId !== 'string') {
    throw new ApiValidationError('Student ID is required and must be a string', 'studentId', data.studentId)
  }

  if (!data.sessionId || typeof data.sessionId !== 'string') {
    throw new ApiValidationError('Session ID is required and must be a string', 'sessionId', data.sessionId)
  }

  if (!data.date || typeof data.date !== 'string') {
    throw new ApiValidationError('Date is required and must be a string', 'date', data.date)
  }

  // Date format validation (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(data.date)) {
    throw new ApiValidationError('Invalid date format. Expected YYYY-MM-DD', 'date', data.date)
  }

  const status = validateAttendanceStatus(data.status)

  if (data.timestamp && typeof data.timestamp !== 'string') {
    throw new ApiValidationError('Timestamp must be a string if provided', 'timestamp', data.timestamp)
  }

  return {
    studentId: data.studentId,
    sessionId: data.sessionId,
    date: data.date,
    status,
    timestamp: data.timestamp
  }
}

// API Response validation
export const validateApiResponse = <T>(response: any, dataValidator?: (data: any) => T) => {
  if (!response || typeof response !== 'object') {
    throw new ApiValidationError('API response must be an object', 'response', response)
  }

  if (typeof response.success !== 'boolean') {
    throw new ApiValidationError('API response must include success boolean', 'success', response.success)
  }

  if (!response.success) {
    const errorMessage = response.error || response.message || 'Unknown API error'
    throw new ApiValidationError(errorMessage, 'api_error', response)
  }

  if (dataValidator && response.data !== undefined) {
    try {
      if (Array.isArray(response.data)) {
        return response.data.map((item: any, index: number) => {
          try {
            return dataValidator(item)
          } catch (error) {
            throw new ApiValidationError(
              `Invalid data at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              `data[${index}]`,
              item
            )
          }
        })
      } else {
        return dataValidator(response.data)
      }
    } catch (error) {
      if (error instanceof ApiValidationError) {
        throw error
      }
      throw new ApiValidationError(
        `Data validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'data',
        response.data
      )
    }
  }

  return response.data
}

// Utility functions for common validations
export const isValidCourseId = (courseId: string): boolean => {
  return typeof courseId === 'string' && courseId.length > 0
}

export const isValidDate = (date: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) return false
  
  const parsedDate = new Date(date)
  return parsedDate instanceof Date && !isNaN(parsedDate.getTime())
}

export const isValidDateRange = (startDate: string, endDate: string): boolean => {
  if (!isValidDate(startDate) || !isValidDate(endDate)) return false
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  return start <= end
}

// Error formatter for user-friendly messages
export const formatValidationError = (error: ApiValidationError): string => {
  if (error.field) {
    return `${error.field}: ${error.message}`
  }
  return error.message
}

// Retry logic for API calls
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      if (i === maxRetries) {
        throw lastError
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
    }
  }

  throw lastError!
}