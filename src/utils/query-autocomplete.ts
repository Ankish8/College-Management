import type { SearchContext } from './search-context'
import type { FilterField } from '@/types/query-parser'
import { Search, User, Calendar, Clock, BarChart3, Settings, UserCheck, Mail, Filter, CheckCircle, XCircle, Heart, Users, Hash, Percent, ArrowRight, Plus, Zap } from 'lucide-react'

export interface AutocompleteResult {
  suggestions: AutocompleteSuggestion[]
  currentToken: string
  insertPosition: number
  replaceRange?: { start: number, end: number }
}

export interface AutocompleteSuggestion {
  type: 'field' | 'value' | 'operator' | 'student' | 'example' | 'template'
  label: string
  insertText: string
  description?: string
  category: string
  priority: number
  icon?: React.ComponentType<{ className?: string }>
}

export class QueryAutocomplete {
  private searchContext?: SearchContext

  constructor(searchContext?: SearchContext) {
    this.searchContext = searchContext
  }

  setSearchContext(context: SearchContext) {
    this.searchContext = context
  }

  getAutocompleteSuggestions(query: string, cursorPosition: number): AutocompleteResult {
    const suggestions: AutocompleteSuggestion[] = []
    
    // Parse current context
    const beforeCursor = query.slice(0, cursorPosition)
    const afterCursor = query.slice(cursorPosition)
    const currentToken = this.getCurrentToken(beforeCursor)
    const context = this.analyzeContext(beforeCursor)

    // SMART MATCHING: If user is typing a partial word, find the best matches
    if (currentToken && !currentToken.includes(':') && !currentToken.startsWith('@')) {
      suggestions.push(...this.getSmartFieldMatches(currentToken))
      suggestions.push(...this.getSmartStudentMatches(currentToken))
    }

    // Add suggestions based on context
    if (context.expectingField || query.trim() === '') {
      suggestions.push(...this.getFieldSuggestions())
      suggestions.push(...this.getStudentReferenceSuggestions())
      suggestions.push(...this.getExampleSuggestions())
    }

    if (context.expectingValue && context.currentField) {
      suggestions.push(...this.getValueSuggestions(context.currentField))
    }

    if (context.expectingOperator) {
      suggestions.push(...this.getLogicalOperatorSuggestions())
    }

    // Add student name suggestions for @ prefix
    if (currentToken.startsWith('@')) {
      suggestions.push(...this.getStudentNameSuggestions(currentToken.slice(1)))
    }

    // Add comparison operator suggestions after field:
    if (context.afterFieldColon) {
      suggestions.push(...this.getComparisonOperatorSuggestions())
    }

    // Sort suggestions by relevance score and priority
    suggestions.sort((a, b) => {
      // Calculate relevance score
      const scoreA = this.calculateRelevanceScore(a, currentToken)
      const scoreB = this.calculateRelevanceScore(b, currentToken)
      
      if (scoreA !== scoreB) return scoreB - scoreA
      if (a.priority !== b.priority) return b.priority - a.priority
      return a.label.localeCompare(b.label)
    })

    // Remove duplicates and limit results
    const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
      index === self.findIndex(s => s.insertText === suggestion.insertText)
    )

    return {
      suggestions: uniqueSuggestions.slice(0, 8),
      currentToken,
      insertPosition: cursorPosition - currentToken.length
    }
  }

  private getCurrentToken(text: string): string {
    // Find the current token being typed
    const match = text.match(/(\S+)$/)
    return match ? match[1] : ''
  }

  private analyzeContext(beforeCursor: string): {
    expectingField: boolean
    expectingValue: boolean
    expectingOperator: boolean
    currentField?: string
    afterFieldColon: boolean
    hasLogicalOperator: boolean
  } {
    const tokens = beforeCursor.trim().split(/\s+/)
    const lastToken = tokens[tokens.length - 1] || ''
    const secondLastToken = tokens[tokens.length - 2] || ''

    // Check if we're after a field colon
    const afterFieldColon = lastToken.includes(':') && !lastToken.split(':')[1]

    // Check if we just finished a complete expression
    const hasCompleteExpression = /(@\w+|\w+:\w+|\w+:[><=!]+\w+)$/.test(beforeCursor.trim())

    // Check for logical operators
    const hasLogicalOperator = /\b(AND|OR|NOT)\b/i.test(beforeCursor)

    return {
      expectingField: tokens.length === 0 || 
                     ['AND', 'OR', 'NOT', '('].includes(lastToken.toUpperCase()) ||
                     (hasCompleteExpression && !hasLogicalOperator),
      expectingValue: afterFieldColon,
      expectingOperator: hasCompleteExpression && !afterFieldColon,
      currentField: afterFieldColon ? lastToken.split(':')[0] : undefined,
      afterFieldColon,
      hasLogicalOperator
    }
  }

  private getFieldSuggestions(): AutocompleteSuggestion[] {
    const fields: { field: FilterField, description: string, examples: string[] }[] = [
      {
        field: 'student',
        description: 'Filter by student ID or name',
        examples: ['student:UX23001', 'student:contains']
      },
      {
        field: 'email',
        description: 'Filter by email pattern',
        examples: ['email:gmail.com', 'email:contains']
      },
      {
        field: 'session',
        description: 'Filter by session number or name',
        examples: ['session:1', 'session:"Session 1"']
      },
      {
        field: 'status',
        description: 'Filter by attendance status',
        examples: ['status:absent', 'status:present', 'status:medical']
      },
      {
        field: 'attendance',
        description: 'Filter by attendance percentage',
        examples: ['attendance:>80%', 'attendance:<75%']
      },
      {
        field: 'date',
        description: 'Filter by specific date',
        examples: ['date:2025-07-20', 'date:today', 'date:last-week']
      },
      {
        field: 'time',
        description: 'Filter by session time',
        examples: ['time:>14:00', 'time:<12:00']
      }
    ]

    return fields.map(({ field, description, examples }) => ({
      type: 'field' as const,
      label: `${field}:`,
      insertText: `${field}:`,
      description: `${description} • ${examples[0]}`,
      category: 'Field',
      priority: 8,
      icon: this.getFieldIcon(field)
    }))
  }

  private getFieldIcon(field: string) {
    switch (field) {
      case 'student': return User
      case 'email': return Mail
      case 'session': return Clock
      case 'status': return UserCheck
      case 'attendance': return BarChart3
      case 'date': return Calendar
      case 'time': return Clock
      default: return Search
    }
  }

  private getStudentReferenceSuggestions(): AutocompleteSuggestion[] {
    return [{
      type: 'student' as const,
      label: '@student',
      insertText: '@',
      description: 'Reference student by name • @aarav',
      category: 'Student',
      priority: 9,
      icon: Users
    }]
  }

  private getValueSuggestions(field: string): AutocompleteSuggestion[] {
    const suggestions: AutocompleteSuggestion[] = []

    switch (field) {
      case 'status':
        ['present', 'absent', 'medical'].forEach(status => {
          suggestions.push({
            type: 'value',
            label: status,
            insertText: status,
            description: `Mark as ${status}`,
            category: 'Status',
            priority: 7,
            icon: status === 'present' ? CheckCircle : status === 'absent' ? XCircle : Heart
          })
        })
        break

      case 'session':
        if (this.searchContext) {
          const sessions = this.searchContext.getSessions()
          sessions.forEach((session, index) => {
            suggestions.push({
              type: 'value',
              label: `${index + 1}`,
              insertText: `${index + 1}`,
              description: `${session.name} (${session.startTime}-${session.endTime})`,
              category: 'Session',
              priority: 7,
              icon: Clock
            })
          })
        }
        break

      case 'attendance':
        ['>80%', '<75%', '>=90%', '<=50%', '=100%'].forEach(op => {
          suggestions.push({
            type: 'value',
            label: op,
            insertText: op,
            description: `Attendance percentage ${op}`,
            category: 'Percentage',
            priority: 6,
            icon: BarChart3
          })
        })
        break

      case 'date':
        ['today', 'yesterday', 'last-week', 'this-week', 'last-month'].forEach(date => {
          suggestions.push({
            type: 'value',
            label: date,
            insertText: date,
            description: `Relative date: ${date}`,
            category: 'Date',
            priority: 6,
            icon: Calendar
          })
        })
        break

      case 'email':
        // Get actual email domains from students
        if (this.searchContext) {
          const students = this.searchContext.getStudents()
          const emailDomains = [...new Set(students.map(s => s.email.split('@')[1]))]
          const emailPatterns = ['contains', ...emailDomains]
          
          emailPatterns.forEach(value => {
            suggestions.push({
              type: 'value',
              label: value,
              insertText: value,
              description: value === 'contains' ? 'Contains text in email' : `Email domain: ${value}`,
              category: 'Email',
              priority: value === 'contains' ? 7 : 6,
              icon: Mail
            })
          })
        } else {
          ['contains', 'gmail.com', 'jlu.edu.in'].forEach(value => {
            suggestions.push({
              type: 'value',
              label: value,
              insertText: value,
              description: `Email filter: ${value}`,
              category: 'Email',
              priority: 6,
              icon: Mail
            })
          })
        }
        break
    }

    return suggestions
  }

  private getLogicalOperatorSuggestions(): AutocompleteSuggestion[] {
    return [
      {
        type: 'operator',
        label: 'AND',
        insertText: ' AND ',
        description: 'Both conditions must be true',
        category: 'Logic',
        priority: 7,
        icon: Plus
      },
      {
        type: 'operator',
        label: 'OR',
        insertText: ' OR ',
        description: 'Either condition can be true',
        category: 'Logic',
        priority: 7,
        icon: ArrowRight
      },
      {
        type: 'operator',
        label: 'NOT',
        insertText: ' NOT ',
        description: 'Exclude this condition',
        category: 'Logic',
        priority: 6,
        icon: XCircle
      }
    ]
  }

  private getStudentNameSuggestions(partial: string): AutocompleteSuggestion[] {
    if (!this.searchContext) return []

    const students = this.searchContext.getStudents()
    const normalizedPartial = partial.toLowerCase()

    return students
      .filter(student => 
        student.name.toLowerCase().includes(normalizedPartial) ||
        student.studentId.toLowerCase().includes(normalizedPartial)
      )
      .slice(0, 5)
      .map(student => ({
        type: 'student' as const,
        label: `@${student.name}`,
        insertText: student.name,
        description: `${student.studentId} • ${student.email}`,
        category: 'Student',
        priority: 8,
        icon: Users
      }))
  }

  private getComparisonOperatorSuggestions(): AutocompleteSuggestion[] {
    return [
      {
        type: 'operator',
        label: '>',
        insertText: '>',
        description: 'Greater than',
        category: 'Comparison',
        priority: 6,
        icon: ArrowRight
      },
      {
        type: 'operator',
        label: '<',
        insertText: '<',
        description: 'Less than',
        category: 'Comparison',
        priority: 6,
        icon: ArrowRight
      },
      {
        type: 'operator',
        label: '>=',
        insertText: '>=',
        description: 'Greater than or equal',
        category: 'Comparison',
        priority: 5,
        icon: ArrowRight
      },
      {
        type: 'operator',
        label: '<=',
        insertText: '<=',
        description: 'Less than or equal',
        category: 'Comparison',
        priority: 5,
        icon: ArrowRight
      },
      {
        type: 'operator',
        label: '!=',
        insertText: '!=',
        description: 'Not equal to',
        category: 'Comparison',
        priority: 5,
        icon: XCircle
      }
    ]
  }

  private getExampleSuggestions(): AutocompleteSuggestion[] {
    const examples = [
      {
        type: 'example',
        label: '@Aarav Patel',
        insertText: '@Aarav Patel',
        description: 'Find student by name',
        category: 'Example',
        priority: 5,
        icon: Users
      },
      {
        type: 'example',
        label: 'email:jlu.edu.in',
        insertText: 'email:jlu.edu.in',
        description: 'Find by email domain',
        category: 'Example',
        priority: 5,
        icon: Mail
      },
      {
        type: 'example',
        label: 'status:absent',
        insertText: 'status:absent',
        description: 'Find all absent students',
        category: 'Example',
        priority: 4,
        icon: XCircle
      },
      {
        type: 'example',
        label: 'attendance:>80%',
        insertText: 'attendance:>80%',
        description: 'Students with good attendance',
        category: 'Example',
        priority: 4,
        icon: BarChart3
      },
      {
        type: 'template',
        label: '@student AND status:absent',
        insertText: '@student AND status:absent',
        description: 'Student with specific status',
        category: 'Template',
        priority: 3,
        icon: Filter
      },
      {
        type: 'template',
        label: 'email:contains AND session:1',
        insertText: 'email:contains AND session:1',
        description: 'Email pattern in session',
        category: 'Template',
        priority: 3,
        icon: Filter
      }
    ]

    // Add contextual suggestions based on search context
    if (this.searchContext) {
      const students = this.searchContext.getStudents()
      if (students.length > 0) {
        // Add real student name example
        const firstStudent = students[0]
        examples.unshift({
          type: 'example',
          label: `@${firstStudent.name}`,
          insertText: `@${firstStudent.name}`,
          description: `Find ${firstStudent.name}`,
          category: 'Example',
          priority: 6,
          icon: Users
        })
      }
    }

    return examples
  }

  // Helper method to get smart suggestions based on query patterns
  getSmartSuggestions(query: string): AutocompleteSuggestion[] {
    const suggestions: AutocompleteSuggestion[] = []

    // If query contains student reference but no status, suggest adding status
    if (query.includes('@') && !query.includes('status:')) {
      suggestions.push({
        type: 'template',
        label: 'Add status filter',
        insertText: ' AND status:absent',
        description: 'Check attendance status for this student',
        category: 'Smart',
        priority: 8,
        icon: Zap
      })
    }

    // If query has status but no session, suggest adding session
    if (query.includes('status:') && !query.includes('session:')) {
      suggestions.push({
        type: 'template',
        label: 'Add session filter',
        insertText: ' AND session:1',
        description: 'Filter by specific session',
        category: 'Smart',
        priority: 8,
        icon: Zap
      })
    }

    // If query looks incomplete, suggest completing it
    if (query.endsWith(':')) {
      const field = query.split(' ').pop()?.replace(':', '')
      if (field) {
        suggestions.push(...this.getValueSuggestions(field))
      }
    }

    return suggestions
  }

  // Smart field matching for partial input like "em" -> "email:"
  private getSmartFieldMatches(partial: string): AutocompleteSuggestion[] {
    const fields = [
      { field: 'email', description: 'Filter by email pattern', priority: 10 },
      { field: 'student', description: 'Filter by student ID or name', priority: 9 },
      { field: 'status', description: 'Filter by attendance status', priority: 9 },
      { field: 'session', description: 'Filter by session number', priority: 8 },
      { field: 'attendance', description: 'Filter by attendance percentage', priority: 8 },
      { field: 'date', description: 'Filter by specific date', priority: 7 },
      { field: 'time', description: 'Filter by session time', priority: 7 }
    ]

    return fields
      .filter(({ field }) => {
        const partialLower = partial.toLowerCase()
        const fieldLower = field.toLowerCase()
        
        // Exact start match gets highest priority
        if (fieldLower.startsWith(partialLower)) return true
        
        // Fuzzy match for typos (like "emai" for "email")
        if (this.fuzzyMatch(fieldLower, partialLower) > 0.7) return true
        
        // Abbreviation match (like "st" for "status" or "student")
        if (this.abbreviationMatch(fieldLower, partialLower) > 0.5) return true
        
        return false
      })
      .map(({ field, description, priority }) => ({
        type: 'field' as const,
        label: `${field}:`,
        insertText: `${field}:`,
        description,
        category: 'Field',
        priority: priority + this.calculateMatchBonus(field, partial),
        icon: this.getFieldIcon(field)
      }))
  }

  // Smart student matching for partial names
  private getSmartStudentMatches(partial: string): AutocompleteSuggestion[] {
    if (!this.searchContext || partial.length < 2) return []

    const students = this.searchContext.getStudents()
    const partialLower = partial.toLowerCase()

    return students
      .filter(student => {
        const nameLower = student.name.toLowerCase()
        const idLower = student.studentId.toLowerCase()
        
        // Name starts with partial
        if (nameLower.startsWith(partialLower)) return true
        
        // Any word in name starts with partial
        if (nameLower.split(' ').some(word => word.startsWith(partialLower))) return true
        
        // Student ID contains partial
        if (idLower.includes(partialLower)) return true
        
        // Fuzzy match for typos
        if (this.fuzzyMatch(nameLower, partialLower) > 0.6) return true
        
        return false
      })
      .slice(0, 3) // Limit to top 3 students
      .map(student => ({
        type: 'student' as const,
        label: `@${student.name}`,
        insertText: `@${student.name}`,
        description: `${student.studentId} • ${student.email}`,
        category: 'Student',
        priority: 9 + this.calculateMatchBonus(student.name, partial),
        icon: Users
      }))
  }

  // Calculate relevance score for sorting
  private calculateRelevanceScore(suggestion: AutocompleteSuggestion, currentToken: string): number {
    if (!currentToken) return suggestion.priority

    const label = suggestion.label.toLowerCase()
    const token = currentToken.toLowerCase()
    let score = suggestion.priority

    // Exact start match gets highest boost
    if (label.startsWith(token)) {
      score += 20
    }
    
    // Contains match gets medium boost
    else if (label.includes(token)) {
      score += 10
    }
    
    // Fuzzy match gets small boost
    else if (this.fuzzyMatch(label, token) > 0.5) {
      score += 5
    }

    // Length penalty for very long suggestions when token is short
    if (token.length < 3 && label.length > 8) {
      score -= 2
    }

    return score
  }

  // Calculate bonus points for exact matches
  private calculateMatchBonus(text: string, partial: string): number {
    const textLower = text.toLowerCase()
    const partialLower = partial.toLowerCase()
    
    if (textLower.startsWith(partialLower)) {
      return Math.max(5, 10 - (textLower.length - partialLower.length))
    }
    
    return 0
  }

  // Simple fuzzy matching algorithm
  private fuzzyMatch(text: string, query: string): number {
    if (query.length === 0) return 1
    if (text.length === 0) return 0
    
    let score = 0
    let queryIndex = 0
    
    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
      if (text[i] === query[queryIndex]) {
        score += 1
        queryIndex++
      }
    }
    
    return queryIndex === query.length ? score / text.length : 0
  }

  // Abbreviation matching (e.g., "st" matches "status")
  private abbreviationMatch(text: string, query: string): number {
    const words = text.split(/\s+/)
    const firstLetters = words.map(word => word[0]).join('').toLowerCase()
    
    if (firstLetters.startsWith(query.toLowerCase())) {
      return query.length / firstLetters.length
    }
    
    // Also check if query matches start of first word
    if (words[0] && words[0].toLowerCase().startsWith(query.toLowerCase())) {
      return query.length / words[0].length
    }
    
    return 0
  }
}