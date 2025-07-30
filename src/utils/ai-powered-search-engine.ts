import { LocalAINLPParser, type AIParseResult, type AIIntent } from './local-ai-nlp-parser'
import { SearchContext } from './search-context'
import type { Student, Session, AttendanceStatus } from '@/types/attendance'
import type { Command } from '@/types/command-palette'
import { User, Users, BarChart3, Calendar, Clock, Mail, TrendingUp, CheckCircle, XCircle, Heart, Search, Brain, Zap } from 'lucide-react'

export interface AISearchResult {
  type: 'student' | 'session' | 'statistics' | 'action' | 'insight'
  data: any
  relevance: number
  confidence: number
  command?: Command
  explanation?: string
  intent: AIIntent
  aiProcessed: boolean
  language: 'en' | 'hi' | 'mixed'
}

export class AIPoweredSearchEngine {
  private aiParser: LocalAINLPParser
  private searchContext: SearchContext
  private isInitializing = false

  constructor(searchContext: SearchContext) {
    this.searchContext = searchContext
    this.aiParser = new LocalAINLPParser(searchContext)
    
    // Start initializing AI models in background
    this.initializeAI()
  }

  private async initializeAI(): Promise<void> {
    if (this.isInitializing) return
    this.isInitializing = true
    
    try {
      await this.aiParser.initialize()
      console.log('🤖 AI-powered search engine ready!')
    } catch (error) {
      console.warn('⚠️ AI initialization failed, using enhanced rule-based parsing:', error)
    }
  }

  async search(query: string): Promise<AISearchResult[]> {
    if (!query.trim()) return []

    console.log('🧠 AI-powered search for:', query)

    try {
      // Parse query with local AI
      const parseResult = await this.aiParser.parse(query)
      console.log('🔍 AI Parse Result:', parseResult)

      // Execute search based on AI understanding
      const results = await this.executeAIQuery(parseResult)
      
      // Sort by relevance and confidence
      return results.sort((a, b) => {
        const scoreA = a.relevance * a.confidence
        const scoreB = b.relevance * b.confidence
        return scoreB - scoreA
      }).slice(0, 8)

    } catch (error) {
      console.error('AI search failed:', error)
      return []
    }
  }

  private async executeAIQuery(parseResult: AIParseResult): Promise<AISearchResult[]> {
    const results: AISearchResult[] = []
    
    console.log(`🎯 Executing AI query for intent: ${parseResult.intent}`)
    console.log(`🎯 Parse result:`, parseResult)

    switch (parseResult.intent) {
      case 'find_student':
        results.push(...this.handleFindStudent(parseResult))
        break
      
      case 'show_attendance':
        results.push(...this.handleShowAttendance(parseResult))
        break
      
      case 'filter_by_status':
        results.push(...this.handleFilterByStatus(parseResult))
        break
      
      case 'filter_by_date_status':
        results.push(...this.handleFilterByDateStatus(parseResult))
        break
      
      case 'show_session_info':
        results.push(...this.handleShowSession(parseResult))
        break
      
      case 'question_who':
        results.push(...this.handleQuestionWho(parseResult))
        break
      
      case 'question_what':
        results.push(...this.handleQuestionWhat(parseResult))
        break
      
      case 'filter_by_attendance_percentage':
        results.push(...this.handleFilterByAttendancePercentage(parseResult))
        break
      
      case 'show_statistics':
        results.push(...this.handleShowStatistics(parseResult))
        break
      
      case 'general_search':
        results.push(...this.handleGeneralSearch(parseResult))
        break
    }

    return results
  }

  private handleFindStudent(parseResult: AIParseResult): AISearchResult[] {
    const results: AISearchResult[] = []
    const { entities } = parseResult

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
          confidence: parseResult.confidence,
          intent: parseResult.intent,
          aiProcessed: parseResult.aiProcessed,
          language: parseResult.language,
          explanation: `${parseResult.aiProcessed ? '🤖 AI' : '🔧 Rules'} found student: ${student.name}`,
          command: {
            id: `ai-student-${student.id}`,
            label: `${student.name}`,
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

  private handleFilterByDateStatus(parseResult: AIParseResult): AISearchResult[] {
    const results: AISearchResult[] = []
    const { entities } = parseResult

    console.log('🎯 Handling date + status filter:', entities)

    if (!entities.status || entities.status.length === 0) return results

    entities.status.forEach(status => {
      let students: Student[] = []
      let dateContext = ''
      
      if (entities.dates && entities.dates.length > 0) {
        // Date-specific status query
        const targetDate = entities.dates[0]
        const dateStr = targetDate.toISOString().split('T')[0]
        dateContext = ` on ${targetDate.toLocaleDateString()}`
        
        console.log(`🔍 Looking for ${status} students on ${dateStr}`)
        console.log(`📅 Target date object:`, targetDate)
        console.log(`📅 Target date string:`, dateStr)
        console.log(`📅 Current date:`, new Date().toISOString().split('T')[0])
        
        // Check historical attendance for that date
        const allStudents = this.searchContext.getStudents()
        console.log(`👥 Total students in database:`, allStudents.length)
        
        // Debug: Show all available dates for the first student
        if (allStudents.length > 0) {
          console.log(`📊 Available dates for ${allStudents[0].name}:`, 
            allStudents[0].attendanceHistory.map(h => `${h.date}: ${h.status}`))
        }
        
        students = allStudents.filter(student => {
          const history = student.attendanceHistory.find(record => record.date === dateStr)
          const hasMatchingStatus = history && history.status === status
          
          if (hasMatchingStatus) {
            console.log(`✅ ${student.name} was ${status} on ${dateStr}`)
          }
          
          return hasMatchingStatus
        })
        
        console.log(`📊 Found ${students.length} students who were ${status} on ${dateStr}`)
        
        if (students.length === 0) {
          console.log(`❌ No students found with status '${status}' on ${dateStr}`)
          console.log(`🔍 Debugging: Checking all student records for ${dateStr}:`)
          allStudents.forEach(student => {
            const historyForDate = student.attendanceHistory.find(record => record.date === dateStr)
            if (historyForDate) {
              console.log(`   ${student.name}: ${historyForDate.status}`)
            } else {
              console.log(`   ${student.name}: No record for ${dateStr}`)
            }
          })
          
          // IMPORTANT: Even if no students found, create a helpful AI result
          console.log(`🤖 Creating helpful AI suggestion for ${status} query on ${dateStr}`)
          results.push({
            type: 'action',
            data: {
              status,
              date: entities.dates[0],
              dateStr,
              action: 'no_records_found',
              suggestion: `No ${status} students found for ${entities.dates[0].toLocaleDateString()}. Start marking attendance?`,
              allStudents: allStudents.length
            },
            relevance: 0.9,
            confidence: parseResult.confidence,
            intent: parseResult.intent,
            aiProcessed: parseResult.aiProcessed,
            language: parseResult.language,
            explanation: `${parseResult.aiProcessed ? '🤖 AI' : '🔧 Rules'} suggests marking attendance for ${entities.dates[0].toLocaleDateString()}`,
            command: {
              id: `ai-suggest-mark-${status}-${dateStr}`,
              label: `No ${status} students found for ${entities.dates[0].toLocaleDateString()}`,
              description: `Start marking attendance? ${allStudents.length} students total`,
              category: 'suggestion',
              keywords: [status, 'mark', 'attendance', dateStr],
              action: () => this.showDateAttendance(dateStr),
              icon: 'Calendar'
            }
          })
        }
      } else {
        // Current status query
        students = this.searchContext.filterStudentsByAttendanceStatus(status)
        console.log(`📊 Found ${students.length} students currently ${status}`)
      }
      
      if (students.length > 0) {
        results.push({
          type: 'statistics',
          data: {
            status,
            students,
            count: students.length,
            date: entities.dates?.[0],
            language: parseResult.language
          },
          relevance: 0.95,
          confidence: parseResult.confidence,
          intent: parseResult.intent,
          aiProcessed: parseResult.aiProcessed,
          language: parseResult.language,
          explanation: `${parseResult.aiProcessed ? '🤖 AI' : '🔧 Rules'} found ${students.length} students who were ${status}${dateContext}`,
          command: {
            id: `ai-filter-status-${status}-${Date.now()}`,
            label: `${students.length} ${status} students${dateContext}`,
            description: `${parseResult.language === 'hi' ? 'छात्र जो' : 'Students who were'} ${status}${dateContext}`,
            category: 'analytics',
            keywords: [status, 'students', parseResult.language],
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
              currentStatus: status,
              contextDate: entities.dates?.[0]
            },
            relevance: 0.8,
            confidence: parseResult.confidence,
            intent: parseResult.intent,
            aiProcessed: parseResult.aiProcessed,
            language: parseResult.language,
            explanation: `${student.name} was ${status}${dateContext}`,
            command: {
              id: `ai-status-student-${student.id}-${index}`,
              label: student.name,
              description: `${parseResult.language === 'hi' ? 'था' : 'Was'} ${status}${dateContext} • ${attendancePercentage}% overall`,
              category: 'student',
              keywords: [student.name, status, parseResult.language],
              action: () => this.focusStudent(student.id),
              icon: 'User'
            }
          })
        })
      }
    })

    return results
  }

  private handleFilterByStatus(parseResult: AIParseResult): AISearchResult[] {
    const results: AISearchResult[] = []
    const { entities } = parseResult

    if (!entities.status || entities.status.length === 0) return results

    entities.status.forEach(status => {
      const students = this.searchContext.filterStudentsByAttendanceStatus(status)
      
      if (students.length > 0) {
        results.push({
          type: 'statistics',
          data: {
            status,
            students,
            count: students.length
          },
          relevance: 0.9,
          confidence: parseResult.confidence,
          intent: parseResult.intent,
          aiProcessed: parseResult.aiProcessed,
          language: parseResult.language,
          explanation: `${parseResult.aiProcessed ? '🤖 AI' : '🔧 Rules'} found ${students.length} ${status} students`,
          command: {
            id: `ai-current-status-${status}`,
            label: `${students.length} ${status} students`,
            description: `Currently marked as ${status}`,
            category: 'analytics',
            keywords: [status, 'current'],
            action: () => {
              console.log('🔗 Status filter clicked:', status, students.length, 'students')
              this.showStatusReport(status, students)
            },
            icon: status === 'present' ? 'CheckCircle' : status === 'absent' ? 'XCircle' : 'Heart'
          }
        })
      }
    })

    return results
  }

  private handleFilterByAttendancePercentage(parseResult: AIParseResult): AISearchResult[] {
    const results: AISearchResult[] = []
    const { entities } = parseResult

    console.log('🎯 Handling percentage filter:', entities)

    if (!entities.numbers || entities.numbers.length === 0) {
      console.log('❌ No numbers found in percentage query')
      return results
    }

    const allStudents = this.searchContext.getStudents()
    console.log(`👥 Total students to check: ${allStudents.length}`)

    entities.numbers.forEach(threshold => {
      console.log(`🔍 Checking for students with attendance ${threshold}%`)
      
      // Determine comparison operator from the query
      let operator = 'above' // default
      const queryLower = parseResult.originalQuery.toLowerCase()
      
      if (queryLower.includes('above') || queryLower.includes('more than') || queryLower.includes('greater') || queryLower.includes('>')) {
        operator = 'above'
      } else if (queryLower.includes('below') || queryLower.includes('less than') || queryLower.includes('under') || queryLower.includes('<')) {
        operator = 'below'
      } else if (queryLower.includes('equal') || queryLower.includes('exactly') || queryLower.includes('=')) {
        operator = 'equal'
      }

      const filteredStudents = allStudents.filter(student => {
        const percentage = this.searchContext.getStudentAttendancePercentage(student.id)
        console.log(`📊 ${student.name}: ${percentage}% (threshold: ${threshold}%, operator: ${operator})`)
        
        switch (operator) {
          case 'above':
            return percentage > threshold
          case 'below':
            return percentage < threshold
          case 'equal':
            return Math.abs(percentage - threshold) <= 2 // Allow ±2% tolerance
          default:
            return percentage > threshold
        }
      }).map(student => ({
        ...student,
        attendancePercentage: this.searchContext.getStudentAttendancePercentage(student.id),
        recentStatus: this.searchContext.getStudentRecentAttendance(student.id, 5),
        trend: this.calculateTrend(this.searchContext.getStudentRecentAttendance(student.id, 5))
      }))

      console.log(`📈 Found ${filteredStudents.length} students with attendance ${operator} ${threshold}%`)

      if (filteredStudents.length > 0) {
        // Add summary result
        results.push({
          type: 'statistics',
          data: {
            threshold,
            operator,
            students: filteredStudents,
            count: filteredStudents.length,
            averagePercentage: Math.round(filteredStudents.reduce((sum, s) => sum + s.attendancePercentage, 0) / filteredStudents.length)
          },
          relevance: 0.95,
          confidence: parseResult.confidence,
          intent: parseResult.intent,
          aiProcessed: parseResult.aiProcessed,
          language: parseResult.language,
          explanation: `${parseResult.aiProcessed ? '🤖 AI' : '🔧 Rules'} found ${filteredStudents.length} students with attendance ${operator} ${threshold}%`,
          command: {
            id: `ai-percentage-filter-${operator}-${threshold}`,
            label: `${filteredStudents.length} students with attendance ${operator} ${threshold}%`,
            description: `Average: ${Math.round(filteredStudents.reduce((sum, s) => sum + s.attendancePercentage, 0) / filteredStudents.length)}% • Click to view all`,
            category: 'analytics',
            keywords: ['attendance', 'percentage', operator, threshold.toString()],
            action: () => this.showPercentageReport(operator, threshold, filteredStudents),
            icon: 'TrendingUp'
          }
        })

        // Add individual students (up to 5)
        filteredStudents.slice(0, 5).forEach((student, index) => {
          results.push({
            type: 'student',
            data: student,
            relevance: 0.8 - (index * 0.05), // Slightly lower relevance for individual students
            confidence: parseResult.confidence,
            intent: parseResult.intent,
            aiProcessed: parseResult.aiProcessed,
            language: parseResult.language,
            explanation: `${student.name}: ${student.attendancePercentage}% attendance`,
            command: {
              id: `ai-percentage-student-${student.id}-${index}`,
              label: student.name,
              description: `${student.attendancePercentage}% attendance • ${student.studentId}`,
              category: 'student',
              keywords: [student.name, 'percentage'],
              action: () => this.focusStudent(student.id),
              icon: 'User'
            }
          })
        })
      } else {
        // No students found matching criteria
        results.push({
          type: 'action',
          data: {
            threshold,
            operator,
            action: 'no_students_found',
            suggestion: `No students found with attendance ${operator} ${threshold}%. Try a different threshold?`
          },
          relevance: 0.7,
          confidence: parseResult.confidence,
          intent: parseResult.intent,
          aiProcessed: parseResult.aiProcessed,
          language: parseResult.language,
          explanation: `${parseResult.aiProcessed ? '🤖 AI' : '🔧 Rules'} found no students with attendance ${operator} ${threshold}%`,
          command: {
            id: `ai-no-percentage-match-${threshold}`,
            label: `No students with attendance ${operator} ${threshold}%`,
            description: `Try different criteria or view all students`,
            category: 'suggestion',
            keywords: ['attendance', 'percentage', 'none'],
            action: () => this.showClassStatistics(),
            icon: 'Search'
          }
        })
      }
    })

    return results
  }

  private handleQuestionWho(parseResult: AIParseResult): AISearchResult[] {
    // Handle "who was absent" type questions
    return this.handleFilterByDateStatus(parseResult)
  }

  private handleQuestionWhat(parseResult: AIParseResult): AISearchResult[] {
    const results: AISearchResult[] = []
    
    // Handle "what is attendance" type questions
    if (parseResult.entities.people && parseResult.entities.people.length > 0) {
      // "What is Aarav's attendance?"
      return this.handleShowAttendance(parseResult)
    } else {
      // "What is the attendance?"
      return this.handleShowStatistics(parseResult)
    }
  }

  private handleShowAttendance(parseResult: AIParseResult): AISearchResult[] {
    const results: AISearchResult[] = []
    const { entities } = parseResult

    // Handle date-only queries (e.g., "date: 18th", "day before yesterday")
    if (entities.dates && entities.dates.length > 0 && (!entities.people || entities.people.length === 0)) {
      const targetDate = entities.dates[0]
      const dateStr = targetDate.toISOString().split('T')[0]
      const allStudents = this.searchContext.getStudents()
      
      // Get all attendance records for that date
      const attendanceForDate = allStudents.map(student => {
        const record = student.attendanceHistory.find(h => h.date === dateStr)
        return {
          student,
          status: record?.status || 'unknown',
          hasRecord: !!record
        }
      }).filter(entry => entry.hasRecord)

      if (attendanceForDate.length > 0) {
        const presentCount = attendanceForDate.filter(e => e.status === 'present').length
        const absentCount = attendanceForDate.filter(e => e.status === 'absent').length
        const medicalCount = attendanceForDate.filter(e => e.status === 'medical').length
        const totalCount = attendanceForDate.length
        const percentage = Math.round((presentCount / totalCount) * 100)

        results.push({
          type: 'statistics',
          data: {
            date: targetDate,
            dateStr,
            totalStudents: totalCount,
            presentCount,
            absentCount,
            medicalCount,
            percentage,
            students: attendanceForDate
          },
          relevance: 0.95,
          confidence: parseResult.confidence,
          intent: parseResult.intent,
          aiProcessed: parseResult.aiProcessed,
          language: parseResult.language,
          explanation: `${parseResult.aiProcessed ? '🤖 AI' : '🔧 Rules'} suggests navigating to ${targetDate.toLocaleDateString()}`,
          command: {
            id: `ai-date-attendance-${dateStr}`,
            label: `Go to ${targetDate.toLocaleDateString()}`,
            description: `${percentage}% attendance • ${presentCount}/${totalCount} present • ${absentCount} absent • ${medicalCount} medical`,
            category: 'navigation',
            keywords: ['attendance', 'date', dateStr],
            action: () => this.showDateAttendance(dateStr),
            icon: 'Navigation'
          }
        })
      } else {
        // No attendance data for this date, but still offer navigation
        results.push({
          type: 'action',
          data: {
            date: targetDate,
            dateStr,
            action: 'navigate'
          },
          relevance: 0.9,
          confidence: parseResult.confidence,
          intent: parseResult.intent,
          aiProcessed: parseResult.aiProcessed,
          language: parseResult.language,
          explanation: `${parseResult.aiProcessed ? '🤖 AI' : '🔧 Rules'} suggests navigating to ${targetDate.toLocaleDateString()}`,
          command: {
            id: `ai-navigate-${dateStr}`,
            label: `Go to ${targetDate.toLocaleDateString()}`,
            description: `Navigate to ${targetDate.toLocaleDateString()}`,
            category: 'navigation',
            keywords: ['navigate', 'date', dateStr],
            action: () => this.showDateAttendance(dateStr),
            icon: 'Navigation'
          }
        })
      }
    }

    // Handle student-specific queries
    if (entities.people && entities.people.length > 0) {
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
            confidence: parseResult.confidence,
            intent: parseResult.intent,
            aiProcessed: parseResult.aiProcessed,
            language: parseResult.language,
            explanation: `${parseResult.aiProcessed ? '🤖 AI' : '🔧 Rules'} found attendance for ${student.name}: ${attendancePercentage}%`,
            command: {
              id: `ai-attendance-${student.id}`,
              label: `${student.name}: ${attendancePercentage}% attendance`,
              description: `Detailed attendance history and analytics`,
              category: 'analytics',
              keywords: ['attendance', student.name],
              action: () => this.showAttendanceDetails(student.id),
              icon: 'BarChart3'
            }
          })
        }
      })
    }

    return results
  }

  private handleShowSession(parseResult: AIParseResult): AISearchResult[] {
    const results: AISearchResult[] = []
    const { entities } = parseResult

    if (!entities.numbers || entities.numbers.length === 0) return results

    entities.numbers.forEach(sessionNumber => {
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
          confidence: parseResult.confidence,
          intent: parseResult.intent,
          aiProcessed: parseResult.aiProcessed,
          language: parseResult.language,
          explanation: `${parseResult.aiProcessed ? '🤖 AI' : '🔧 Rules'} found Session ${sessionNumber}`,
          command: {
            id: `ai-session-${session.id}`,
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

  private handleShowStatistics(parseResult: AIParseResult): AISearchResult[] {
    const results: AISearchResult[] = []
    const stats = this.searchContext.getOverallStatistics()

    results.push({
      type: 'statistics',
      data: {
        ...stats,
        insights: this.generateInsights(stats)
      },
      relevance: 0.9,
      confidence: parseResult.confidence,
      intent: parseResult.intent,
      aiProcessed: parseResult.aiProcessed,
      language: parseResult.language,
      explanation: `${parseResult.aiProcessed ? '🤖 AI' : '🔧 Rules'} generated class statistics`,
      command: {
        id: 'ai-class-statistics',
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

  private handleGeneralSearch(parseResult: AIParseResult): AISearchResult[] {
    const results: AISearchResult[] = []
    
    // Fuzzy search on all students
    const students = this.searchContext.getStudents()
    const queryLower = parseResult.originalQuery.toLowerCase()

    students.forEach(student => {
      const score = this.calculateFuzzyScore(student, queryLower)
      if (score > 0.2) {
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
          confidence: parseResult.confidence,
          intent: parseResult.intent,
          aiProcessed: parseResult.aiProcessed,
          language: parseResult.language,
          explanation: `${parseResult.aiProcessed ? '🤖 AI' : '🔧 Rules'} fuzzy match for ${student.name}`,
          command: {
            id: `ai-general-${student.id}`,
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
    console.log('🔗 Dispatching focusStudent event for:', studentId)
    window.dispatchEvent(new CustomEvent('focusStudent', { detail: studentId }))
    
    // Also filter table to show just this student
    const student = this.searchContext.findStudentById(studentId)
    if (student) {
      this.applySmartFilter([student], `Focus on ${student.name}`)
    }
  }

  private focusSession(sessionId: string) {
    console.log('🔗 Dispatching focusSession event for:', sessionId)
    window.dispatchEvent(new CustomEvent('focusSession', { detail: sessionId }))
  }

  private showStatusReport(status: AttendanceStatus, students: Student[]) {
    console.log('🔗 Dispatching showReport event for:', status, students.length, 'students')
    console.log('🔗 Student list:', students.map(s => s.name))
    window.dispatchEvent(new CustomEvent('showReport', { detail: { type: 'status', status, students } }))
    
    // Also trigger smart table filter
    console.log('🔍 Triggering smart filter for status:', status)
    this.applySmartFilter(students, `Students with ${status} status`)
  }

  private applySmartFilter(students: Student[], filterDescription: string) {
    console.log('🔍 Applying smart filter to table:', filterDescription, students.length, 'students')
    window.dispatchEvent(new CustomEvent('applySmartFilter', { 
      detail: { 
        students, 
        description: filterDescription,
        studentIds: students.map(s => s.id)
      } 
    }))
  }

  private showAttendanceDetails(studentId: string) {
    console.log('🔗 Dispatching showAttendanceDetails event for:', studentId)
    window.dispatchEvent(new CustomEvent('showAttendanceDetails', { detail: studentId }))
  }

  private showClassStatistics() {
    window.dispatchEvent(new CustomEvent('showClassStatistics'))
  }

  private showDateAttendance(dateStr: string) {
    console.log('🔗 Dispatching showDateAttendance event for:', dateStr)
    window.dispatchEvent(new CustomEvent('showDateAttendance', { detail: dateStr }))
  }

  private showPercentageReport(operator: string, threshold: number, students: any[]) {
    console.log('🔗 Dispatching showPercentageReport event for:', operator, threshold, students.length, 'students')
    window.dispatchEvent(new CustomEvent('showReport', { 
      detail: { 
        type: 'percentage', 
        operator, 
        threshold, 
        students,
        title: `Students with attendance ${operator} ${threshold}%`
      } 
    }))
    
    // Also trigger smart table filter
    this.applySmartFilter(students, `Attendance ${operator} ${threshold}%`)
  }
}