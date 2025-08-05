export type AttendanceStatus = 'present' | 'absent' | 'medical'
export type AttendanceMode = 'detailed' | 'fast' | 'predictive'

export type PredictionConfidence = 'high' | 'medium' | 'low'

export interface Student {
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
  status: AttendanceStatus
}

export interface SessionAttendanceRecord {
  date: string
  sessionId: string
  status: AttendanceStatus
}

export interface AttendancePrediction {
  studentId: string
  sessionId: string
  predictedStatus: AttendanceStatus
  confidence: PredictionConfidence
  reasoning: string
  historicalPattern: {
    consistency: number
    recentTrend: number
    dayOfWeekPattern: number
  }
}

export interface PredictionSummary {
  totalPredictions: number
  highConfidence: number
  mediumConfidence: number
  lowConfidence: number
  predictions: AttendancePrediction[]
}

export interface Session {
  id: string
  name: string
  startTime: string
  endTime: string
}

export interface Course {
  id: string
  name: string
  code: string
  semester: string
  room: string
  sessions: Session[]
}

// Weekly View Types
export type ViewMode = 'session' | 'weekly'

export interface WeeklySessionInfo {
  sessionId: string
  sessionName: string
  status: AttendanceStatus
  timeSlot: string // "09:15-10:05"
}

export interface WeeklyDayData {
  date: string
  dayName: string // "Monday"
  isWeekend: boolean
  isToday: boolean
  overallStatus: AttendanceStatus | null
  sessions: WeeklySessionInfo[]
}

export interface WeeklyStudentData {
  studentId: string
  studentName: string
  studentCode: string
  days: WeeklyDayData[]
  weeklyAttendancePercentage: number
}

export interface WeeklyViewData {
  dateRange: {
    start: string // '2025-07-14'
    end: string   // '2025-07-20' (includes weekend)
    workingDays: string[] // ['2025-07-14', '2025-07-15', '2025-07-16', '2025-07-17', '2025-07-18']
  }
  students: WeeklyStudentData[]
  overallStats: {
    totalWorkingDays: number
    averageAttendance: number
    presentDays: number
    totalPossibleDays: number
  }
}

// API Integration Types
export interface ApiError {
  message: string
  code?: string
  details?: any
}

export interface LoadingState {
  isLoading: boolean
  error: ApiError | null
}

export interface AttendanceComponentProps {
  courseId: string
  batchId?: string
  initialDate?: string
  onError?: (error: ApiError) => void
  onLoadingChange?: (loading: boolean) => void
  dateSelector?: React.ReactNode
  batchSelector?: React.ReactNode
  subjectSelector?: React.ReactNode
  hasSelection?: boolean
  availableBatches?: any[]
  availableSubjects?: any[]
  subjects?: any[]
  department?: {
    id: string
    name: string
    shortName: string
  }
}

// Hook return types
export interface UseStudentsReturn extends LoadingState {
  students: Student[]
  refetch: () => Promise<void>
}

export interface UseSessionsReturn extends LoadingState {
  sessions: Session[]
  refetch: () => Promise<void>
}

export interface UseAttendanceReturn extends LoadingState {
  attendanceData: Record<string, Record<string, AttendanceStatus>>
  markAttendance: (studentId: string, sessionId: string, status: AttendanceStatus) => Promise<void>
  bulkMarkAttendance: (records: Array<{
    studentId: string
    sessionId: string
    status: AttendanceStatus
  }>) => Promise<void>
  refetch: () => Promise<void>
}

export interface UseCourseReturn extends LoadingState {
  course: Course | null
  refetch: () => Promise<void>
}