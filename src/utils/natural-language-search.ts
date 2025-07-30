import type { Student, Session, AttendanceStatus } from '@/types/attendance'
import type { SearchContext } from './search-context'
import type { Command } from '@/types/command-palette'
import { User, Mail, Hash, BarChart3, Calendar, Clock, CheckCircle, XCircle, Heart, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'

export interface NaturalSearchResult {
  type: 'student' | 'session' | 'stats' | 'action'
  data: any
  relevance: number
  command?: Command
}

export class NaturalLanguageSearch {
  private searchContext: SearchContext

  constructor(searchContext: SearchContext) {
    this.searchContext = searchContext
  }

  search(query: string): NaturalSearchResult[] {
    const normalizedQuery = query.toLowerCase().trim()
    const results: NaturalSearchResult[] = []

    // Parse query intent
    const tokens = normalizedQuery.split(/\s+/)
    
    // Direct student search
    if (this.isStudentQuery(normalizedQuery, tokens)) {
      results.push(...this.searchStudents(normalizedQuery, tokens))
    }

    // Email search
    if (this.isEmailQuery(normalizedQuery, tokens)) {
      results.push(...this.searchByEmail(normalizedQuery, tokens))
    }

    // Session search
    if (this.isSessionQuery(normalizedQuery, tokens)) {
      results.push(...this.searchSessions(normalizedQuery, tokens))
    }

    // Status search
    if (this.isStatusQuery(normalizedQuery, tokens)) {
      results.push(...this.searchByStatus(normalizedQuery, tokens))
    }

    // Attendance percentage search
    if (this.isAttendanceQuery(normalizedQuery, tokens)) {
      results.push(...this.searchByAttendance(normalizedQuery, tokens))
    }

    // If no specific pattern matched, do a general search
    if (results.length === 0 && normalizedQuery.length > 0) {
      results.push(...this.generalSearch(normalizedQuery))
    }

    // Sort by relevance
    return results.sort((a, b) => b.relevance - a.relevance).slice(0, 10)
  }

  private isStudentQuery(query: string, tokens: string[]): boolean {
    // Check if any token matches a student name part
    const students = this.searchContext.getStudents()
    return students.some(student => {
      const nameParts = student.name.toLowerCase().split(' ')
      return tokens.some(token => 
        nameParts.some(part => part.startsWith(token)) ||
        student.studentId.toLowerCase().includes(token)
      )
    })
  }

  private isEmailQuery(query: string, tokens: string[]): boolean {
    return tokens.includes('email') || 
           tokens.includes('mail') || 
           query.includes('@') ||
           tokens.some(t => t.includes('.com') || t.includes('.edu'))
  }

  private isSessionQuery(query: string, tokens: string[]): boolean {
    return tokens.includes('session') || 
           tokens.includes('class') ||
           tokens.some(t => /^[0-9]+$/.test(t) && parseInt(t) <= 10)
  }

  private isStatusQuery(query: string, tokens: string[]): boolean {
    const statusWords = ['present', 'absent', 'medical', 'attendance', 'status']
    return tokens.some(t => statusWords.includes(t))
  }

  private isAttendanceQuery(query: string, tokens: string[]): boolean {
    return tokens.includes('attendance') || 
           tokens.includes('%') ||
           tokens.some(t => /^\d+%?$/.test(t))
  }

  private searchStudents(query: string, tokens: string[]): NaturalSearchResult[] {
    const students = this.searchContext.getStudents()
    const results: NaturalSearchResult[] = []

    students.forEach(student => {
      let relevance = 0
      const nameLower = student.name.toLowerCase()
      const nameParts = nameLower.split(' ')

      // Check each token
      tokens.forEach(token => {
        // Full name match
        if (nameLower.includes(token)) {
          relevance += 10
        }
        
        // First/last name starts with
        if (nameParts.some(part => part.startsWith(token))) {
          relevance += 15
        }

        // Student ID match
        if (student.studentId.toLowerCase().includes(token)) {
          relevance += 8
        }

        // Email match
        if (student.email.toLowerCase().includes(token)) {
          relevance += 5
        }
      })

      if (relevance > 0) {
        // Calculate attendance stats
        const attendancePercentage = this.searchContext.getStudentAttendancePercentage(student.id)
        const recentStatus = this.searchContext.getStudentRecentAttendance(student.id, 5)
        const trend = this.calculateTrend(recentStatus)

        results.push({
          type: 'student',
          data: {
            ...student,
            attendancePercentage,
            recentStatus,
            trend,
            // Add session-wise attendance for today
            todayAttendance: this.searchContext.getStudentSessionAttendance(
              student.id, 
              this.searchContext.getSelectedDate()
            )
          },
          relevance,
          command: {
            id: `student-${student.id}`,
            label: `View ${student.name}`,
            description: `${student.studentId} • ${student.email} • ${attendancePercentage}% attendance`,
            category: 'student',
            keywords: [student.name, student.studentId, student.email],
            action: () => this.focusStudent(student.id),
            icon: 'User'
          }
        })
      }
    })

    return results
  }

  private searchByEmail(query: string, tokens: string[]): NaturalSearchResult[] {
    const students = this.searchContext.getStudents()
    const results: NaturalSearchResult[] = []

    // Find the email-related token
    const emailToken = tokens.find(t => 
      t.includes('@') || 
      t.includes('.com') || 
      t.includes('.edu') ||
      !['email', 'mail'].includes(t)
    )

    if (!emailToken) return results

    students.forEach(student => {
      let relevance = 0
      const emailLower = student.email.toLowerCase()

      if (emailLower.includes(emailToken)) {
        relevance += 20
      }

      // Check domain match
      const domain = emailLower.split('@')[1]
      if (domain && domain.includes(emailToken)) {
        relevance += 15
      }

      if (relevance > 0) {
        const attendancePercentage = this.searchContext.getStudentAttendancePercentage(student.id)
        
        results.push({
          type: 'student',
          data: {
            ...student,
            attendancePercentage,
            highlightEmail: true
          },
          relevance,
          command: {
            id: `email-${student.id}`,
            label: student.name,
            description: `${student.email} • ${attendancePercentage}% attendance`,
            category: 'student',
            keywords: [student.email],
            action: () => this.focusStudent(student.id),
            icon: 'Mail'
          }
        })
      }
    })

    return results
  }

  private searchSessions(query: string, tokens: string[]): NaturalSearchResult[] {
    const sessions = this.searchContext.getSessions()
    const results: NaturalSearchResult[] = []

    sessions.forEach((session, index) => {
      let relevance = 0
      const sessionNumber = (index + 1).toString()

      tokens.forEach(token => {
        if (sessionNumber === token) {
          relevance += 20
        }
        if (session.name.toLowerCase().includes(token)) {
          relevance += 15
        }
        if (session.startTime.includes(token) || session.endTime.includes(token)) {
          relevance += 10
        }
      })

      if (relevance > 0) {
        const stats = this.searchContext.getSessionStatistics(session.id)
        
        results.push({
          type: 'session',
          data: {
            ...session,
            number: index + 1,
            statistics: stats
          },
          relevance,
          command: {
            id: `session-${session.id}`,
            label: `Session ${index + 1}`,
            description: `${session.name} • ${session.startTime}-${session.endTime} • ${stats.presentCount}/${stats.totalStudents} present`,
            category: 'session',
            keywords: [session.name, sessionNumber],
            action: () => this.focusSession(session.id),
            icon: 'Clock'
          }
        })
      }
    })

    return results
  }

  private searchByStatus(query: string, tokens: string[]): NaturalSearchResult[] {
    const results: NaturalSearchResult[] = []
    let status: AttendanceStatus | null = null

    if (tokens.includes('present')) status = 'present'
    else if (tokens.includes('absent')) status = 'absent'
    else if (tokens.includes('medical')) status = 'medical'

    if (!status) return results

    const students = this.searchContext.filterStudentsByAttendanceStatus(status)
    
    if (students.length > 0) {
      results.push({
        type: 'stats',
        data: {
          status,
          students,
          count: students.length
        },
        relevance: 15,
        command: {
          id: `status-${status}`,
          label: `${students.length} students ${status}`,
          description: `View all ${status} students`,
          category: 'analytics',
          keywords: [status],
          action: () => this.showStatusReport(status, students),
          icon: status === 'present' ? 'CheckCircle' : status === 'absent' ? 'XCircle' : 'Heart'
        }
      })

      // Add individual student results
      students.slice(0, 3).forEach(student => {
        const attendancePercentage = this.searchContext.getStudentAttendancePercentage(student.id)
        results.push({
          type: 'student',
          data: {
            ...student,
            attendancePercentage,
            currentStatus: status
          },
          relevance: 10,
          command: {
            id: `status-student-${student.id}`,
            label: student.name,
            description: `${student.studentId} • Currently ${status} • ${attendancePercentage}% overall`,
            category: 'student',
            keywords: [student.name, status],
            action: () => this.focusStudent(student.id),
            icon: 'User'
          }
        })
      })
    }

    return results
  }

  private searchByAttendance(query: string, tokens: string[]): NaturalSearchResult[] {
    const results: NaturalSearchResult[] = []
    
    // Extract percentage
    const percentageMatch = query.match(/(\d+)%?/)
    if (!percentageMatch) return results

    const threshold = parseInt(percentageMatch[1])
    const hasGreater = query.includes('>') || tokens.includes('above') || tokens.includes('greater')
    const hasLess = query.includes('<') || tokens.includes('below') || tokens.includes('less')

    const operator = hasGreater ? 'greater_than' : hasLess ? 'less_than' : 'equals'
    const students = this.searchContext.filterStudentsByAttendancePercentage(operator, threshold)

    if (students.length > 0) {
      results.push({
        type: 'stats',
        data: {
          operator,
          threshold,
          students,
          count: students.length
        },
        relevance: 20,
        command: {
          id: `attendance-${operator}-${threshold}`,
          label: `${students.length} students with attendance ${operator === 'greater_than' ? '>' : operator === 'less_than' ? '<' : '='} ${threshold}%`,
          description: `View students by attendance percentage`,
          category: 'analytics',
          keywords: ['attendance', threshold.toString()],
          action: () => this.showAttendanceReport(students, operator, threshold),
          icon: 'BarChart3'
        }
      })

      // Add top students
      students.slice(0, 3).forEach(student => {
        const percentage = this.searchContext.getStudentAttendancePercentage(student.id)
        results.push({
          type: 'student',
          data: {
            ...student,
            attendancePercentage: percentage,
            meetsThreshold: true
          },
          relevance: 15,
          command: {
            id: `attendance-student-${student.id}`,
            label: student.name,
            description: `${student.studentId} • ${percentage}% attendance`,
            category: 'student',
            keywords: [student.name, 'attendance'],
            action: () => this.focusStudent(student.id),
            icon: 'User'
          }
        })
      })
    }

    return results
  }

  private generalSearch(query: string): NaturalSearchResult[] {
    const results: NaturalSearchResult[] = []
    
    // Search all students
    const students = this.searchContext.getStudents()
    students.forEach(student => {
      const score = this.calculateRelevance(student, query)
      if (score > 0) {
        const attendancePercentage = this.searchContext.getStudentAttendancePercentage(student.id)
        results.push({
          type: 'student',
          data: {
            ...student,
            attendancePercentage
          },
          relevance: score,
          command: {
            id: `general-${student.id}`,
            label: student.name,
            description: `${student.studentId} • ${student.email} • ${attendancePercentage}% attendance`,
            category: 'student',
            keywords: [student.name, student.studentId, student.email],
            action: () => this.focusStudent(student.id),
            icon: 'User'
          }
        })
      }
    })

    return results
  }

  private calculateRelevance(student: Student, query: string): number {
    let score = 0
    const queryLower = query.toLowerCase()

    // Name matching
    if (student.name.toLowerCase().includes(queryLower)) {
      score += 10
    }

    // Email matching
    if (student.email.toLowerCase().includes(queryLower)) {
      score += 5
    }

    // ID matching
    if (student.studentId.toLowerCase().includes(queryLower)) {
      score += 8
    }

    // Fuzzy matching
    const nameParts = student.name.toLowerCase().split(' ')
    const queryParts = queryLower.split(' ')
    
    queryParts.forEach(qPart => {
      nameParts.forEach(nPart => {
        if (nPart.startsWith(qPart)) {
          score += 3
        }
      })
    })

    return score
  }

  private calculateTrend(recentStatus: { date: string; status: AttendanceStatus }[]): 'improving' | 'declining' | 'stable' {
    if (recentStatus.length < 3) return 'stable'

    const recentPresent = recentStatus.slice(0, 3).filter(s => s.status === 'present').length
    const olderPresent = recentStatus.slice(3).filter(s => s.status === 'present').length

    const recentRate = recentPresent / Math.min(3, recentStatus.length)
    const olderRate = olderPresent / Math.max(1, recentStatus.length - 3)

    if (recentRate > olderRate + 0.2) return 'improving'
    if (recentRate < olderRate - 0.2) return 'declining'
    return 'stable'
  }

  // Action methods
  private focusStudent(studentId: string) {
    window.dispatchEvent(new CustomEvent('focusStudent', { detail: studentId }))
  }

  private focusSession(sessionId: string) {
    window.dispatchEvent(new CustomEvent('focusSession', { detail: sessionId }))
  }

  private showStatusReport(status: AttendanceStatus, students: Student[]) {
    window.dispatchEvent(new CustomEvent('showReport', { 
      detail: { type: 'status', status, students } 
    }))
  }

  private showAttendanceReport(students: Student[], operator: string, threshold: number) {
    window.dispatchEvent(new CustomEvent('showReport', { 
      detail: { type: 'attendance', students, operator, threshold } 
    }))
  }
}