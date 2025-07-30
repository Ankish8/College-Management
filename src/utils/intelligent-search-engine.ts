import { SmartNLPParser, type ParsedQuery, type QueryIntent, type ExtractedEntities } from './smart-nlp-parser'
import { SearchContext } from './search-context'
import type { Student, Session, AttendanceStatus } from '@/types/attendance'
import type { Command } from '@/types/command-palette'
import { User, Users, BarChart3, Calendar, Clock, Mail, TrendingUp, CheckCircle, XCircle, Heart, Search } from 'lucide-react'

export interface IntelligentSearchResult {
  type: 'student' | 'session' | 'statistics' | 'action' | 'insight'
  data: any
  relevance: number
  confidence: number
  command?: Command
  explanation?: string
  intent: QueryIntent
}

export class IntelligentSearchEngine {
  private nlpParser: SmartNLPParser
  private searchContext: SearchContext

  constructor(searchContext: SearchContext) {
    this.searchContext = searchContext
    this.nlpParser = new SmartNLPParser(searchContext)
  }

  search(query: string): IntelligentSearchResult[] {
    if (!query.trim()) return []

    console.log('🔍 Intelligent Search Query:', query)

    // Parse the query with NLP
    const parsedQuery = this.nlpParser.parse(query)
    console.log('📝 Parsed Query:', parsedQuery)
    
    // Execute the parsed query based on intent
    const results = this.executeIntelligentQuery(parsedQuery)
    console.log('🎯 Search Results:', results)
    
    // Sort by relevance and confidence
    return results.sort((a, b) => {
      const scoreA = a.relevance * a.confidence
      const scoreB = b.relevance * b.confidence
      return scoreB - scoreA
    }).slice(0, 8)
  }

  private executeIntelligentQuery(parsedQuery: ParsedQuery): IntelligentSearchResult[] {
    const results: IntelligentSearchResult[] = []

    switch (parsedQuery.intent) {
      case 'find_student':
        results.push(...this.handleFindStudent(parsedQuery))
        break
      
      case 'show_attendance':
        results.push(...this.handleShowAttendance(parsedQuery))
        break
      
      case 'filter_by_status':
        results.push(...this.handleFilterByStatus(parsedQuery))
        break
      
      case 'filter_by_attendance_percentage':
        results.push(...this.handleFilterByPercentage(parsedQuery))
        break
      
      case 'show_session_info':
        results.push(...this.handleShowSession(parsedQuery))
        break
      
      case 'search_by_email':
        results.push(...this.handleSearchByEmail(parsedQuery))
        break
      
      case 'mark_attendance':
        results.push(...this.handleMarkAttendance(parsedQuery))
        break
      
      case 'show_statistics':
        results.push(...this.handleShowStatistics(parsedQuery))
        break
      
      case 'date_range_query':
        results.push(...this.handleDateRangeQuery(parsedQuery))
        break
      
      case 'general_search':
        results.push(...this.handleGeneralSearch(parsedQuery))
        break
    }

    return results
  }

  private handleFindStudent(parsedQuery: ParsedQuery): IntelligentSearchResult[] {
    const results: IntelligentSearchResult[] = []
    const { entities } = parsedQuery

    if (!entities.people || entities.people.length === 0) return results

    entities.people.forEach(personName => {
      const student = this.searchContext.findStudentByName(personName, true)
      if (student) {
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
            todayAttendance: this.searchContext.getStudentSessionAttendance(
              student.id, 
              this.searchContext.getSelectedDate()
            )
          },
          relevance: 1.0,
          confidence: parsedQuery.confidence,
          intent: parsedQuery.intent,
          explanation: `Found student: ${student.name}`,
          command: {
            id: `intelligent-student-${student.id}`,
            label: `View ${student.name}`,
            description: `${student.studentId} • ${attendancePercentage}% attendance`,
            category: 'student',
            keywords: [student.name, student.studentId],
            action: () => this.focusStudent(student.id),
            icon: 'User'
          }
        })
      }
    })

    return results
  }

  private handleShowAttendance(parsedQuery: ParsedQuery): IntelligentSearchResult[] {
    const results: IntelligentSearchResult[] = []
    const { entities } = parsedQuery

    if (entities.people && entities.people.length > 0) {
      // Show attendance for specific students
      entities.people.forEach(personName => {
        const student = this.searchContext.findStudentByName(personName, true)
        if (student) {
          const attendancePercentage = this.searchContext.getStudentAttendancePercentage(student.id)
          const history = this.searchContext.getStudentRecentAttendance(student.id, 14)
          
          results.push({
            type: 'student',
            data: {
              ...student,
              attendancePercentage,
              detailedHistory: history,
              trend: this.calculateTrend(history)
            },
            relevance: 0.9,
            confidence: parsedQuery.confidence,
            intent: parsedQuery.intent,
            explanation: `Attendance details for ${student.name}: ${attendancePercentage}%`,
            command: {
              id: `attendance-${student.id}`,
              label: `${student.name}: ${attendancePercentage}% attendance`,
              description: `View detailed attendance history`,
              category: 'analytics',
              keywords: ['attendance', student.name],
              action: () => this.showAttendanceDetails(student.id),
              icon: 'BarChart3'
            }
          })
        }
      })
    } else {
      // Show overall attendance statistics
      const stats = this.searchContext.getOverallStatistics()
      results.push({
        type: 'statistics',
        data: stats,
        relevance: 0.8,
        confidence: parsedQuery.confidence,
        intent: parsedQuery.intent,
        explanation: `Overall class attendance: ${Math.round(stats.overallPercentage)}%`,
        command: {
          id: 'overall-attendance',
          label: `Class Attendance: ${Math.round(stats.overallPercentage)}%`,
          description: `${stats.presentMarks}/${stats.totalMarks} sessions attended`,
          category: 'analytics',
          keywords: ['attendance', 'statistics'],
          action: () => this.showOverallStats(),
          icon: 'BarChart3'
        }
      })
    }

    return results
  }

  private handleFilterByStatus(parsedQuery: ParsedQuery): IntelligentSearchResult[] {
    const results: IntelligentSearchResult[] = []
    const { entities } = parsedQuery

    console.log('🎯 Filter by status - entities:', entities)

    if (!entities.status || entities.status.length === 0) {
      console.log('❌ No status found in entities')
      return results
    }

    entities.status.forEach(status => {
      console.log(`🔍 Looking for ${status} students...`)
      
      // For date-specific queries, we need to look at historical data
      let students: any[] = []
      
      if (entities.dates && entities.dates.length > 0) {
        // Date-specific status query
        const targetDate = entities.dates[0]
        const dateStr = targetDate.toISOString().split('T')[0]
        console.log(`📅 Looking for ${status} students on ${dateStr}`)
        
        // Check historical attendance for that date
        const allStudents = this.searchContext.getStudents()
        students = allStudents.filter(student => {
          const history = student.attendanceHistory.find(record => record.date === dateStr)
          return history && history.status === status
        })
        
        console.log(`📊 Found ${students.length} students who were ${status} on ${dateStr}`)
      } else {
        // Current status query
        students = this.searchContext.filterStudentsByAttendanceStatus(status)
        console.log(`📊 Found ${students.length} students currently ${status}`)
      }
      
      if (students.length > 0) {
        const dateContext = entities.dates && entities.dates.length > 0 
          ? ` on ${entities.dates[0].toLocaleDateString()}` 
          : ''
        
        results.push({
          type: 'statistics',
          data: {
            status,
            students,
            count: students.length,
            date: entities.dates?.[0]
          },
          relevance: 0.9,
          confidence: parsedQuery.confidence,
          intent: parsedQuery.intent,
          explanation: `Found ${students.length} students who were ${status}${dateContext}`,
          command: {
            id: `filter-status-${status}-${Date.now()}`,
            label: `${students.length} ${status} students${dateContext}`,
            description: `View all students marked as ${status}${dateContext}`,
            category: 'analytics',
            keywords: [status, 'students'],
            action: () => this.showStatusReport(status, students),
            icon: status === 'present' ? 'CheckCircle' : status === 'absent' ? 'XCircle' : 'Heart'
          }
        })

        // Add individual students (up to 3)
        students.slice(0, 3).forEach((student, index) => {
          const attendancePercentage = this.searchContext.getStudentAttendancePercentage(student.id)
          results.push({
            type: 'student',
            data: {
              ...student,
              attendancePercentage,
              currentStatus: status
            },
            relevance: 0.7,
            confidence: parsedQuery.confidence,
            intent: parsedQuery.intent,
            explanation: `${student.name} was ${status}${dateContext}`,
            command: {
              id: `status-student-${student.id}-${index}`,
              label: student.name,
              description: `Was ${status}${dateContext} • ${attendancePercentage}% overall`,
              category: 'student',
              keywords: [student.name, status],
              action: () => this.focusStudent(student.id),
              icon: 'User'
            }
          })
        })
      }
    })

    console.log('✅ Filter by status results:', results)
    return results
  }

  private handleFilterByPercentage(parsedQuery: ParsedQuery): IntelligentSearchResult[] {
    const results: IntelligentSearchResult[] = []
    const { entities } = parsedQuery

    if (!entities.values || !entities.comparisons) return results

    const threshold = entities.values[0]
    const operator = entities.comparisons[0]

    const students = this.searchContext.filterStudentsByAttendancePercentage(operator, threshold)

    if (students.length > 0) {
      results.push({
        type: 'statistics',
        data: {
          operator,
          threshold,
          students,
          count: students.length
        },
        relevance: 0.9,
        confidence: parsedQuery.confidence,
        intent: parsedQuery.intent,
        explanation: `${students.length} students with attendance ${this.operatorToText(operator)} ${threshold}%`,
        command: {
          id: `filter-percentage-${operator}-${threshold}`,
          label: `${students.length} students ${this.operatorToText(operator)} ${threshold}%`,
          description: `Students matching attendance criteria`,
          category: 'analytics',
          keywords: ['attendance', 'percentage'],
          action: () => this.showPercentageReport(students, operator, threshold),
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
            attendancePercentage: percentage
          },
          relevance: 0.8,
          confidence: parsedQuery.confidence,
          intent: parsedQuery.intent,
          explanation: `${student.name}: ${percentage}% attendance`,
          command: {
            id: `percentage-student-${student.id}`,
            label: student.name,
            description: `${percentage}% attendance`,
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

  private handleShowSession(parsedQuery: ParsedQuery): IntelligentSearchResult[] {
    const results: IntelligentSearchResult[] = []
    const { entities } = parsedQuery

    if (!entities.sessions || entities.sessions.length === 0) return results

    entities.sessions.forEach(sessionNumber => {
      const session = this.searchContext.findSessionByNumber(sessionNumber)
      if (session) {
        const stats = this.searchContext.getSessionStatistics(session.id)
        
        results.push({
          type: 'session',
          data: {
            ...session,
            number: sessionNumber,
            statistics: stats
          },
          relevance: 0.9,
          confidence: parsedQuery.confidence,
          intent: parsedQuery.intent,
          explanation: `Session ${sessionNumber}: ${stats.presentCount}/${stats.totalStudents} present`,
          command: {
            id: `session-${session.id}`,
            label: `Session ${sessionNumber}`,
            description: `${session.name} • ${session.startTime}-${session.endTime} • ${stats.presentCount}/${stats.totalStudents} present`,
            category: 'session',
            keywords: ['session', sessionNumber.toString()],
            action: () => this.focusSession(session.id),
            icon: 'Clock'
          }
        })
      }
    })

    return results
  }

  private handleSearchByEmail(parsedQuery: ParsedQuery): IntelligentSearchResult[] {
    const results: IntelligentSearchResult[] = []
    const { entities } = parsedQuery

    if (!entities.emailPatterns || entities.emailPatterns.length === 0) return results

    entities.emailPatterns.forEach(pattern => {
      const students = this.searchContext.filterStudentsByEmail(pattern)
      
      students.forEach(student => {
        const attendancePercentage = this.searchContext.getStudentAttendancePercentage(student.id)
        
        results.push({
          type: 'student',
          data: {
            ...student,
            attendancePercentage,
            highlightEmail: true
          },
          relevance: 0.8,
          confidence: parsedQuery.confidence,
          intent: parsedQuery.intent,
          explanation: `Found ${student.name} with email containing "${pattern}"`,
          command: {
            id: `email-${student.id}`,
            label: student.name,
            description: `${student.email} • ${attendancePercentage}% attendance`,
            category: 'student',
            keywords: [student.email, pattern],
            action: () => this.focusStudent(student.id),
            icon: 'Mail'
          }
        })
      })
    })

    return results
  }

  private handleMarkAttendance(parsedQuery: ParsedQuery): IntelligentSearchResult[] {
    const results: IntelligentSearchResult[] = []
    const { entities } = parsedQuery

    if (!entities.people || !entities.status) return results

    entities.people.forEach(personName => {
      const student = this.searchContext.findStudentByName(personName, true)
      if (student && entities.status) {
        const status = entities.status[0]
        
        results.push({
          type: 'action',
          data: {
            student,
            status,
            action: 'mark_attendance'
          },
          relevance: 0.9,
          confidence: parsedQuery.confidence,
          intent: parsedQuery.intent,
          explanation: `Mark ${student.name} as ${status}`,
          command: {
            id: `mark-${student.id}-${status}`,
            label: `Mark ${student.name} as ${status}`,
            description: `Update attendance status`,
            category: 'attendance',
            keywords: ['mark', student.name, status],
            action: () => this.markStudentStatus(student.id, status),
            icon: 'CheckCircle'
          }
        })
      }
    })

    return results
  }

  private handleShowStatistics(parsedQuery: ParsedQuery): IntelligentSearchResult[] {
    const results: IntelligentSearchResult[] = []
    const stats = this.searchContext.getOverallStatistics()

    results.push({
      type: 'statistics',
      data: {
        ...stats,
        insights: this.generateInsights(stats)
      },
      relevance: 0.9,
      confidence: parsedQuery.confidence,
      intent: parsedQuery.intent,
      explanation: `Class statistics: ${Math.round(stats.overallPercentage)}% average attendance`,
      command: {
        id: 'class-statistics',
        label: `Class Statistics`,
        description: `${Math.round(stats.overallPercentage)}% avg attendance • ${stats.totalStudents} students`,
        category: 'analytics',
        keywords: ['statistics', 'class', 'overview'],
        action: () => this.showClassStatistics(),
        icon: 'BarChart3'
      }
    })

    return results
  }

  private handleDateRangeQuery(parsedQuery: ParsedQuery): IntelligentSearchResult[] {
    const results: IntelligentSearchResult[] = []
    const { entities } = parsedQuery

    if (!entities.dates || entities.dates.length === 0) return results

    const date = entities.dates[0]
    const dateStr = date.toISOString().split('T')[0]
    
    // Find attendance for that specific date
    const attendanceResults = this.searchContext.filterAttendanceByDate(date, 'equals')
    
    if (attendanceResults.length > 0) {
      results.push({
        type: 'statistics',
        data: {
          date: dateStr,
          results: attendanceResults,
          totalStudents: attendanceResults.length
        },
        relevance: 0.9,
        confidence: parsedQuery.confidence,
        intent: parsedQuery.intent,
        explanation: `Attendance for ${date.toLocaleDateString()}: ${attendanceResults.length} students`,
        command: {
          id: `date-${dateStr}`,
          label: `Go to ${date.toLocaleDateString()}`,
          description: `${attendanceResults.length} students with records`,
          category: 'navigation',
          keywords: ['date', 'navigate'],
          action: () => this.navigateToDate(dateStr),
          icon: 'Navigation'
        }
      })
    }

    return results
  }

  private handleGeneralSearch(parsedQuery: ParsedQuery): IntelligentSearchResult[] {
    const results: IntelligentSearchResult[] = []
    
    console.log('🔍 General search fallback for query:', parsedQuery.originalQuery)
    
    // Fallback to fuzzy search on all students
    const students = this.searchContext.getStudents()
    const queryLower = parsedQuery.originalQuery.toLowerCase()

    students.forEach(student => {
      const score = this.calculateFuzzyScore(student, queryLower)
      if (score > 0.2) { // Lower threshold for general search
        const attendancePercentage = this.searchContext.getStudentAttendancePercentage(student.id)
        
        results.push({
          type: 'student',
          data: {
            ...student,
            attendancePercentage,
            recentStatus: this.searchContext.getStudentRecentAttendance(student.id, 5),
            trend: this.calculateTrend(this.searchContext.getStudentRecentAttendance(student.id, 5))
          },
          relevance: score,
          confidence: Math.max(0.6, parsedQuery.confidence * 0.8), // Minimum confidence for display
          intent: parsedQuery.intent,
          explanation: `Found ${student.name} (${score > 0.7 ? 'exact' : 'fuzzy'} match)`,
          command: {
            id: `general-${student.id}`,
            label: student.name,
            description: `${student.studentId} • ${student.email} • ${attendancePercentage}% attendance`,
            category: 'student',
            keywords: [student.name, student.studentId],
            action: () => this.focusStudent(student.id),
            icon: 'User'
          }
        })
      }
    })

    console.log(`📊 General search found ${results.length} results`)
    return results
  }

  // Helper methods
  private calculateTrend(recentStatus: { date: string; status: AttendanceStatus }[]): 'improving' | 'declining' | 'stable' {
    if (recentStatus.length < 3) return 'stable'

    const recent = recentStatus.slice(0, 3).filter(s => s.status === 'present').length
    const older = recentStatus.slice(3).filter(s => s.status === 'present').length

    const recentRate = recent / 3
    const olderRate = older / Math.max(1, recentStatus.length - 3)

    if (recentRate > olderRate + 0.2) return 'improving'
    if (recentRate < olderRate - 0.2) return 'declining'
    return 'stable'
  }

  private calculateFuzzyScore(student: Student, query: string): number {
    let score = 0
    const name = student.name.toLowerCase()
    const email = student.email.toLowerCase()
    const id = student.studentId.toLowerCase()

    if (name.includes(query)) score += 0.8
    if (email.includes(query)) score += 0.6
    if (id.includes(query)) score += 0.7

    // Fuzzy matching for typos
    const nameParts = name.split(' ')
    nameParts.forEach(part => {
      if (this.levenshteinDistance(part, query) <= 2) {
        score += 0.5
      }
    })

    return Math.min(score, 1.0)
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    return matrix[str2.length][str1.length]
  }

  private operatorToText(operator: string): string {
    const map = {
      'greater_than': 'above',
      'less_than': 'below',
      'greater_equal': 'at least',
      'less_equal': 'at most',
      'equals': 'exactly',
      'not_equal': 'not'
    }
    return map[operator as keyof typeof map] || operator
  }

  private generateInsights(stats: any): string[] {
    const insights: string[] = []
    
    if (stats.overallPercentage > 85) {
      insights.push('Excellent class attendance overall')
    } else if (stats.overallPercentage < 70) {
      insights.push('Class attendance needs improvement')
    }
    
    return insights
  }

  // Action methods
  private focusStudent(studentId: string) {
    window.dispatchEvent(new CustomEvent('focusStudent', { detail: studentId }))
  }

  private focusSession(sessionId: string) {
    window.dispatchEvent(new CustomEvent('focusSession', { detail: sessionId }))
  }

  private markStudentStatus(studentId: string, status: AttendanceStatus) {
    window.dispatchEvent(new CustomEvent('markStudent', { detail: { studentId, status } }))
  }

  private showAttendanceDetails(studentId: string) {
    window.dispatchEvent(new CustomEvent('showAttendanceDetails', { detail: studentId }))
  }

  private showStatusReport(status: AttendanceStatus, students: Student[]) {
    window.dispatchEvent(new CustomEvent('showReport', { detail: { type: 'status', status, students } }))
  }

  private showPercentageReport(students: Student[], operator: string, threshold: number) {
    window.dispatchEvent(new CustomEvent('showReport', { detail: { type: 'percentage', students, operator, threshold } }))
  }

  private showClassStatistics() {
    window.dispatchEvent(new CustomEvent('showClassStatistics'))
  }

  private showDateReport(date: Date) {
    window.dispatchEvent(new CustomEvent('showDateReport', { detail: date }))
  }

  private showOverallStats() {
    window.dispatchEvent(new CustomEvent('showOverallStats'))
  }

  private navigateToDate(dateStr: string) {
    console.log('🔗 Dispatching navigation to date:', dateStr)
    window.dispatchEvent(new CustomEvent('showDateAttendance', { detail: dateStr }))
  }
}