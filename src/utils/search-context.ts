import type { Student, Session, AttendanceStatus, AttendanceRecord, SessionAttendanceRecord } from '@/types/attendance'
import type { QueryExecutionContext } from '@/types/query-parser'

export interface SearchContextData {
  students: Student[]
  sessions: Session[]
  attendanceData: Record<string, Record<string, AttendanceStatus>>
  selectedDate: string
  currentMode: string
}

export class SearchContext {
  private data: SearchContextData

  constructor(data: SearchContextData) {
    this.data = data
  }

  // Student operations
  getStudents(): Student[] {
    return this.data.students
  }

  findStudentByName(name: string, fuzzy = true): Student | null {
    if (fuzzy) {
      const normalizedName = name.toLowerCase()
      return this.data.students.find(student => 
        student.name.toLowerCase().includes(normalizedName) ||
        student.studentId.toLowerCase().includes(normalizedName)
      ) || null
    } else {
      return this.data.students.find(student => 
        student.name.toLowerCase() === name.toLowerCase()
      ) || null
    }
  }

  findStudentById(id: string): Student | null {
    return this.data.students.find(student => 
      student.id === id || student.studentId === id
    ) || null
  }

  filterStudentsByEmail(emailPattern: string): Student[] {
    const pattern = emailPattern.toLowerCase()
    return this.data.students.filter(student =>
      student.email.toLowerCase().includes(pattern)
    )
  }

  // Session operations
  getSessions(): Session[] {
    return this.data.sessions
  }

  findSessionByNumber(sessionNumber: number): Session | null {
    if (sessionNumber < 1 || sessionNumber > this.data.sessions.length) {
      return null
    }
    return this.data.sessions[sessionNumber - 1]
  }

  findSessionByName(name: string): Session | null {
    return this.data.sessions.find(session =>
      session.name.toLowerCase().includes(name.toLowerCase())
    ) || null
  }

  filterSessionsByTime(timeOperator: 'before' | 'after' | 'at', time: string): Session[] {
    const targetTime = this.parseTime(time)
    if (!targetTime) return []

    return this.data.sessions.filter(session => {
      const sessionTime = this.parseTime(session.startTime)
      if (!sessionTime) return false

      switch (timeOperator) {
        case 'before':
          return sessionTime < targetTime
        case 'after':
          return sessionTime > targetTime
        case 'at':
          return sessionTime === targetTime
        default:
          return false
      }
    })
  }

  // Attendance operations
  getAttendanceData(): Record<string, Record<string, AttendanceStatus>> {
    return this.data.attendanceData
  }

  getStudentAttendance(studentId: string, sessionId?: string): AttendanceStatus | Record<string, AttendanceStatus> | null {
    const studentData = this.data.attendanceData[studentId]
    if (!studentData) return null

    if (sessionId) {
      return studentData[sessionId] || null
    }

    return studentData
  }

  filterStudentsByAttendanceStatus(status: AttendanceStatus, sessionId?: string): Student[] {
    return this.data.students.filter(student => {
      // First check current day attendance data
      const attendance = this.getStudentAttendance(student.id, sessionId)
      
      if (sessionId) {
        if (attendance === status) return true
      } else {
        // Check if any session has the status
        if (typeof attendance === 'object' && attendance !== null) {
          if (Object.values(attendance).includes(status)) return true
        }
      }
      
      // If not found in current data, check historical attendance
      // This is important for queries like "students with medical leave"
      const hasStatusInHistory = student.attendanceHistory.some(record => record.status === status)
      
      console.log(`🔍 Checking ${student.name} for status '${status}': current=${!!attendance}, history=${hasStatusInHistory}`)
      
      return hasStatusInHistory
    })
  }

  calculateStudentAttendancePercentage(studentId: string, dateRange?: { start: Date, end: Date }): number {
    const student = this.findStudentById(studentId)
    if (!student) return 0

    let relevantHistory = student.attendanceHistory
    
    if (dateRange) {
      relevantHistory = student.attendanceHistory.filter(record => {
        const recordDate = new Date(record.date)
        return recordDate >= dateRange.start && recordDate <= dateRange.end
      })
    }

    if (relevantHistory.length === 0) return 0

    const presentCount = relevantHistory.filter(record => 
      record.status === 'present' || record.status === 'medical'
    ).length

    return Math.round((presentCount / relevantHistory.length) * 100)
  }

  filterStudentsByAttendancePercentage(
    operator: 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'equals',
    threshold: number,
    dateRange?: { start: Date, end: Date }
  ): Student[] {
    return this.data.students.filter(student => {
      const percentage = this.calculateStudentAttendancePercentage(student.id, dateRange)
      
      switch (operator) {
        case 'greater_than':
          return percentage > threshold
        case 'less_than':
          return percentage < threshold
        case 'greater_equal':
          return percentage >= threshold
        case 'less_equal':
          return percentage <= threshold
        case 'equals':
          return Math.abs(percentage - threshold) < 0.1 // Allow small floating point differences
        default:
          return false
      }
    })
  }

  // Date operations
  filterAttendanceByDate(
    date: Date | string,
    operator: 'equals' | 'before' | 'after' | 'on_or_before' | 'on_or_after' = 'equals'
  ): { student: Student, records: AttendanceRecord[] }[] {
    const targetDate = typeof date === 'string' ? new Date(date) : date
    
    return this.data.students.map(student => ({
      student,
      records: student.attendanceHistory.filter(record => {
        const recordDate = new Date(record.date)
        
        switch (operator) {
          case 'equals':
            return this.isSameDate(recordDate, targetDate)
          case 'before':
            return recordDate < targetDate
          case 'after':
            return recordDate > targetDate
          case 'on_or_before':
            return recordDate <= targetDate
          case 'on_or_after':
            return recordDate >= targetDate
          default:
            return false
        }
      })
    })).filter(result => result.records.length > 0)
  }

  // Utility methods
  private parseTime(timeString: string): number | null {
    const match = timeString.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return null
    
    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null
    }
    
    return hours * 60 + minutes // Convert to minutes for easy comparison
  }

  private isSameDate(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate()
  }

  // Get execution context for query engine
  getExecutionContext(): QueryExecutionContext {
    return {
      students: this.data.students,
      sessions: this.data.sessions,
      attendanceData: this.data.attendanceData,
      selectedDate: this.data.selectedDate,
      currentMode: this.data.currentMode
    }
  }

  // Statistical operations
  getOverallStatistics() {
    const totalStudents = this.data.students.length
    const totalSessions = this.data.sessions.length
    let totalMarks = 0
    let presentMarks = 0

    this.data.students.forEach(student => {
      this.data.sessions.forEach(session => {
        totalMarks++
        const status = this.getStudentAttendance(student.id, session.id)
        if (status === 'present' || status === 'medical') {
          presentMarks++
        }
      })
    })

    return {
      totalStudents,
      totalSessions,
      totalMarks,
      presentMarks,
      overallPercentage: totalMarks > 0 ? (presentMarks / totalMarks) * 100 : 0
    }
  }

  // Session-specific statistics
  getSessionStatistics(sessionId: string) {
    const session = this.data.sessions.find(s => s.id === sessionId)
    if (!session) return {
      presentCount: 0,
      totalStudents: 0,
      absentCount: 0,
      medicalCount: 0
    }

    let present = 0
    let absent = 0
    let medical = 0

    this.data.students.forEach(student => {
      const status = this.getStudentAttendance(student.id, sessionId)
      switch (status) {
        case 'present':
          present++
          break
        case 'absent':
          absent++
          break
        case 'medical':
          medical++
          break
      }
    })

    const total = present + absent + medical
    
    return {
      session,
      presentCount: present,
      absentCount: absent,
      medicalCount: medical,
      totalStudents: this.data.students.length,
      presentPercentage: total > 0 ? (present / total) * 100 : 0
    }
  }

  // Get students with irregular patterns
  getIrregularStudents(threshold = 3): Student[] {
    return this.data.students.filter(student => {
      const history = student.attendanceHistory.slice(-7) // Last 7 days
      if (history.length < 3) return false
      
      let irregularityScore = 0
      
      for (let i = 1; i < history.length; i++) {
        if (history[i].status !== history[i - 1].status) {
          irregularityScore++
        }
      }
      
      return irregularityScore >= threshold
    })
  }

  // Methods for natural language search
  getStudentAttendancePercentage(studentId: string): number {
    return Math.round(this.calculateStudentAttendancePercentage(studentId))
  }

  getStudentRecentAttendance(studentId: string, count: number): { date: string; status: AttendanceStatus }[] {
    const student = this.findStudentById(studentId)
    if (!student) return []
    
    return student.attendanceHistory
      .slice(-count)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  getStudentSessionAttendance(studentId: string, date: string): { sessionId: string; status: AttendanceStatus }[] {
    const student = this.findStudentById(studentId)
    if (!student) return []
    
    return student.sessionAttendanceHistory
      .filter(record => record.date === date)
      .map(record => ({
        sessionId: record.sessionId,
        status: record.status
      }))
  }

  getSelectedDate(): string {
    return this.data.selectedDate
  }
}