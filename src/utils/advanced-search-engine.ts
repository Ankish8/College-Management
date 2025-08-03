import { FuzzySearchEngine } from './fuzzy-search'
import { QueryParser } from './query-parser'
import { SearchContext } from './search-context'
import type { Command, SearchResult } from '@/types/command-palette'
import type { 
  QueryAST, 
  QueryNode, 
  FilterNode, 
  StudentRefNode, 
  CompoundNode, 
  TextSearchNode,
  QueryResult,
  ComparisonOperator
} from '@/types/query-parser'
import type { Student, Session, AttendanceStatus } from '@/types/attendance'

export class AdvancedSearchEngine extends FuzzySearchEngine {
  private parser: QueryParser
  private searchContext?: SearchContext

  constructor(commands: Command[] = []) {
    super(commands)
    this.parser = new QueryParser()
  }

  setSearchContext(context: SearchContext) {
    this.searchContext = context
  }

  search(query: string, limit: number = 10): SearchResult[] {
    if (!this.searchContext) {
      // Fallback to basic fuzzy search
      return super.search(query, limit)
    }

    const parseResult = this.parser.parse(query)
    
    if (parseResult.errors.length > 0 || !parseResult.ast) {
      // Fallback to fuzzy search on parse error
      return super.search(query, limit)
    }

    if (!parseResult.ast.hasAdvancedSyntax) {
      // Simple text search - use fuzzy search
      return super.search(query, limit)
    }

    try {
      const queryResult = this.executeQuery(parseResult.ast)
      return this.convertToSearchResults(queryResult, query, limit)
    } catch (error) {
      console.warn('Query execution failed, falling back to fuzzy search:', error)
      return super.search(query, limit)
    }
  }

  private executeQuery(ast: QueryAST): QueryResult {
    const startTime = performance.now()
    
    const result = this.executeNode(ast.root)
    
    const executionTime = performance.now() - startTime
    
    return {
      ...result,
      metadata: {
        matchCount: (result.students?.length || 0) + (result.sessions?.length || 0),
        executionTime,
        appliedFilters: this.extractFilters(ast.root)
      }
    }
  }

  private executeNode(node: QueryNode): Partial<QueryResult> {
    if (!this.searchContext) {
      throw new Error('Search context not available')
    }

    switch (node.type) {
      case 'student_ref':
        return this.executeStudentRef(node as StudentRefNode)
      
      case 'filter':
        return this.executeFilter(node as FilterNode)
      
      case 'compound':
        return this.executeCompound(node as CompoundNode)
      
      case 'text_search':
        return this.executeTextSearch(node as TextSearchNode)
      
      default:
        throw new Error(`Unknown node type: ${(node as any).type}`)
    }
  }

  private executeStudentRef(node: StudentRefNode): Partial<QueryResult> {
    const student = this.searchContext!.findStudentByName(node.studentName, node.fuzzy)
    
    return {
      students: student ? [student] : [],
      commands: student ? this.generateStudentCommands(student) : []
    }
  }

  private executeFilter(node: FilterNode): Partial<QueryResult> {
    const { field, operator, value } = node

    switch (field) {
      case 'student':
        return this.filterByStudent(operator, value as string)
      
      case 'email':
        return this.filterByEmail(operator, value as string)
      
      case 'session':
        return this.filterBySession(operator, value as string)
      
      case 'status':
        return this.filterByStatus(operator, value as string)
      
      case 'attendance':
        return this.filterByAttendance(operator, value as string)
      
      case 'date':
        return this.filterByDate(operator, value as string)
      
      case 'time':
        return this.filterByTime(operator, value as string)
      
      default:
        throw new Error(`Unknown field: ${field}`)
    }
  }

  private executeCompound(node: CompoundNode): Partial<QueryResult> {
    const leftResult = this.executeNode(node.left)
    
    if (node.operator === 'NOT') {
      return this.negateResult(leftResult)
    }
    
    if (!node.right) {
      throw new Error('Compound node missing right operand')
    }
    
    const rightResult = this.executeNode(node.right)
    
    if (node.operator === 'AND') {
      return this.intersectResults(leftResult, rightResult)
    } else if (node.operator === 'OR') {
      return this.unionResults(leftResult, rightResult)
    }
    
    throw new Error(`Unknown compound operator: ${node.operator}`)
  }

  private executeTextSearch(node: TextSearchNode): Partial<QueryResult> {
    // Use fuzzy search for text queries
    const fuzzyResults = super.search(node.query, 50)
    
    // Also search through students
    const students = this.searchContext!.getStudents().filter(student =>
      student.name.toLowerCase().includes(node.query.toLowerCase()) ||
      student.email.toLowerCase().includes(node.query.toLowerCase()) ||
      student.studentId.toLowerCase().includes(node.query.toLowerCase())
    )
    
    return {
      students,
      commands: fuzzyResults.map(r => r.command)
    }
  }

  // Filter implementations
  private filterByStudent(operator: ComparisonOperator, value: string | number): Partial<QueryResult> {
    const valueStr = String(value)
    let students: Student[] = []

    switch (operator) {
      case 'equals':
        const student = this.searchContext!.findStudentById(valueStr) || 
                       this.searchContext!.findStudentByName(valueStr, false)
        students = student ? [student] : []
        break
      
      case 'contains':
        students = this.searchContext!.getStudents().filter(s =>
          s.name.toLowerCase().includes(valueStr.toLowerCase()) ||
          s.studentId.toLowerCase().includes(valueStr.toLowerCase())
        )
        break
      
      default:
        throw new Error(`Unsupported operator for student field: ${operator}`)
    }

    return {
      students,
      commands: students.flatMap((s, index) => this.generateStudentCommands(s, `student-${index}`))
    }
  }

  private filterByEmail(operator: ComparisonOperator, value: string | number): Partial<QueryResult> {
    const valueStr = String(value)
    let students: Student[] = []

    switch (operator) {
      case 'contains':
        // Search for pattern in email
        students = this.searchContext!.filterStudentsByEmail(valueStr)
        break
        
      case 'equals':
        // Exact domain match or email match
        if (valueStr.includes('@')) {
          // Full email search
          students = this.searchContext!.getStudents().filter(s => 
            s.email.toLowerCase() === valueStr.toLowerCase()
          )
        } else {
          // Domain search  
          students = this.searchContext!.getStudents().filter(s => 
            s.email.toLowerCase().includes(valueStr.toLowerCase())
          )
        }
        break
      
      default:
        throw new Error(`Unsupported operator for email field: ${operator}`)
    }

    return {
      students,
      commands: students.flatMap((s, index) => this.generateStudentCommands(s, `email-${index}`))
    }
  }

  private filterBySession(operator: ComparisonOperator, value: string | number): Partial<QueryResult> {
    let sessions: Session[] = []

    if (typeof value === 'number') {
      // Session by number
      const session = this.searchContext!.findSessionByNumber(value)
      sessions = session ? [session] : []
    } else {
      // Session by name
      const session = this.searchContext!.findSessionByName(String(value))
      sessions = session ? [session] : []
    }

    return {
      sessions,
      commands: sessions.flatMap((s, index) => this.generateSessionCommands(s, `session-${index}`))
    }
  }

  private filterByStatus(operator: ComparisonOperator, value: string | number): Partial<QueryResult> {
    const status = String(value) as AttendanceStatus
    
    if (!['present', 'absent', 'medical'].includes(status)) {
      throw new Error(`Invalid status: ${status}`)
    }

    const students = this.searchContext!.filterStudentsByAttendanceStatus(status)

    return {
      students,
      commands: this.generateBulkCommands(students, status)
    }
  }

  private filterByAttendance(operator: ComparisonOperator, value: string | number): Partial<QueryResult> {
    const threshold = typeof value === 'number' ? value : parseFloat(String(value))
    
    if (isNaN(threshold)) {
      throw new Error(`Invalid attendance percentage: ${value}`)
    }

    const students = this.searchContext!.filterStudentsByAttendancePercentage(
      operator === 'greater_than' ? 'greater_than' :
      operator === 'less_than' ? 'less_than' :
      operator === 'greater_equal' ? 'greater_equal' :
      operator === 'less_equal' ? 'less_equal' :
      'equals',
      threshold
    )

    return {
      students,
      commands: this.generateAttendanceCommands(students, operator, threshold)
    }
  }

  private filterByDate(operator: ComparisonOperator, value: string | number | Date): Partial<QueryResult> {
    const date = value instanceof Date ? value : new Date(String(value))
    
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${value}`)
    }

    const results = this.searchContext!.filterAttendanceByDate(
      date,
      operator === 'equals' ? 'equals' :
      operator === 'greater_than' ? 'after' :
      operator === 'less_than' ? 'before' :
      operator === 'greater_equal' ? 'on_or_after' :
      operator === 'less_equal' ? 'on_or_before' :
      'equals'
    )

    const students = results.map(r => r.student)

    return {
      students,
      commands: this.generateDateCommands(students, date)
    }
  }

  private filterByTime(operator: ComparisonOperator, value: string | number): Partial<QueryResult> {
    const timeStr = String(value)
    
    const sessions = this.searchContext!.filterSessionsByTime(
      operator === 'greater_than' ? 'after' :
      operator === 'less_than' ? 'before' :
      'at',
      timeStr
    )

    return {
      sessions,
      commands: sessions.flatMap((s, index) => this.generateSessionCommands(s, `session-${index}`))
    }
  }

  // Result combination methods
  private intersectResults(left: Partial<QueryResult>, right: Partial<QueryResult>): Partial<QueryResult> {
    const students = this.intersectArrays(left.students || [], right.students || [], 'id')
    const sessions = this.intersectArrays(left.sessions || [], right.sessions || [], 'id')
    
    return {
      students,
      sessions,
      commands: [...(left.commands || []), ...(right.commands || [])]
    }
  }

  private unionResults(left: Partial<QueryResult>, right: Partial<QueryResult>): Partial<QueryResult> {
    const students = this.unionArrays(left.students || [], right.students || [], 'id')
    const sessions = this.unionArrays(left.sessions || [], right.sessions || [], 'id')
    
    return {
      students,
      sessions,
      commands: [...(left.commands || []), ...(right.commands || [])]
    }
  }

  private negateResult(result: Partial<QueryResult>): Partial<QueryResult> {
    const allStudents = this.searchContext!.getStudents()
    const excludedIds = new Set((result.students || []).map(s => s.id))
    const students = allStudents.filter(s => !excludedIds.has(s.id))
    
    return {
      students,
      commands: students.flatMap((s, index) => this.generateStudentCommands(s, `negate-${index}`))
    }
  }

  // Utility methods
  private intersectArrays<T>(arr1: T[], arr2: T[], keyProp: keyof T): T[] {
    const set2 = new Set(arr2.map(item => item[keyProp]))
    return arr1.filter(item => set2.has(item[keyProp]))
  }

  private unionArrays<T>(arr1: T[], arr2: T[], keyProp: keyof T): T[] {
    const seen = new Set(arr1.map(item => item[keyProp]))
    const result = [...arr1]
    
    for (const item of arr2) {
      if (!seen.has(item[keyProp])) {
        result.push(item)
        seen.add(item[keyProp])
      }
    }
    
    return result
  }

  private extractFilters(node: QueryNode): string[] {
    const filters: string[] = []
    
    if (node.type === 'filter') {
      const filterNode = node as FilterNode
      filters.push(`${filterNode.field}:${filterNode.value}`)
    } else if (node.type === 'compound') {
      const compoundNode = node as CompoundNode
      filters.push(...this.extractFilters(compoundNode.left))
      if (compoundNode.right) {
        filters.push(...this.extractFilters(compoundNode.right))
      }
    }
    
    return filters
  }

  // Command generation methods
  private generateStudentCommands(student: Student, suffix = ''): Command[] {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    const uniqueSuffix = suffix ? `-${suffix}-${timestamp}-${random}` : `-${timestamp}-${random}`
    
    return [
      {
        id: `adv-focus-${student.id}${uniqueSuffix}`,
        label: `Focus on ${student.name}`,
        description: `Scroll to and highlight ${student.name}`,
        category: 'student',
        keywords: [student.name, 'focus', 'highlight'],
        action: () => this.focusOnStudent(student.id)
      },
      {
        id: `adv-mark-present-${student.id}${uniqueSuffix}`,
        label: `Mark ${student.name} Present`,
        description: `Mark ${student.name} as present`,
        category: 'attendance',
        keywords: [student.name, 'present', 'mark'],
        action: () => this.markStudentStatus(student.id, 'present')
      }
    ]
  }

  private generateSessionCommands(session: Session, suffix = ''): Command[] {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    const uniqueSuffix = suffix ? `-${suffix}-${timestamp}-${random}` : `-${timestamp}-${random}`
    
    return [
      {
        id: `adv-focus-session-${session.id}${uniqueSuffix}`,
        label: `Focus on ${session.name}`,
        description: `Jump to ${session.name} column`,
        category: 'session',
        keywords: [session.name, 'session', 'focus'],
        action: () => this.focusOnSession(session.id)
      }
    ]
  }

  private generateBulkCommands(students: Student[], status: AttendanceStatus): Command[] {
    if (students.length === 0) return []
    
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    const uniqueSuffix = `-${timestamp}-${random}`
    
    return [
      {
        id: `adv-bulk-mark-${status}${uniqueSuffix}`,
        label: `Mark ${students.length} students ${status}`,
        description: `Bulk mark filtered students as ${status}`,
        category: 'attendance',
        keywords: ['bulk', 'mark', status],
        action: () => this.bulkMarkStudents(students.map(s => s.id), status)
      }
    ]
  }

  private generateAttendanceCommands(students: Student[], operator: ComparisonOperator, threshold: number): Command[] {
    if (students.length === 0) return []
    
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    const uniqueSuffix = `-${timestamp}-${random}`
    
    return [
      {
        id: `adv-attendance-filtered${uniqueSuffix}`,
        label: `${students.length} students with attendance ${operator} ${threshold}%`,
        description: `View students matching attendance criteria`,
        category: 'analytics',
        keywords: ['attendance', 'filter', 'percentage'],
        action: () => this.showAttendanceReport(students)
      }
    ]
  }

  private generateDateCommands(students: Student[], date: Date): Command[] {
    if (students.length === 0) return []
    
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    const uniqueSuffix = `-${timestamp}-${random}`
    
    return [
      {
        id: `adv-date-filtered${uniqueSuffix}`,
        label: `${students.length} students for ${date.toLocaleDateString()}`,
        description: `View attendance for specific date`,
        category: 'analytics',
        keywords: ['date', 'filter', 'attendance'],
        action: () => this.showDateReport(students, date)
      }
    ]
  }

  // Action implementations (these would trigger events or call parent methods)
  private focusOnStudent(studentId: string) {
    window.dispatchEvent(new CustomEvent('focusStudent', { detail: studentId }))
  }

  private markStudentStatus(studentId: string, status: AttendanceStatus) {
    window.dispatchEvent(new CustomEvent('markStudent', { detail: { studentId, status } }))
  }

  private focusOnSession(sessionId: string) {
    window.dispatchEvent(new CustomEvent('focusSession', { detail: sessionId }))
  }

  private bulkMarkStudents(studentIds: string[], status: AttendanceStatus) {
    window.dispatchEvent(new CustomEvent('bulkMark', { detail: { studentIds, status } }))
  }

  private showAttendanceReport(students: Student[]) {
    window.dispatchEvent(new CustomEvent('showReport', { detail: { type: 'attendance', students } }))
  }

  private showDateReport(students: Student[], date: Date) {
    window.dispatchEvent(new CustomEvent('showReport', { detail: { type: 'date', students, date } }))
  }

  // Convert query results to search results for command palette
  private convertToSearchResults(queryResult: QueryResult, originalQuery: string, limit: number): SearchResult[] {
    const results: SearchResult[] = []
    
    // Add commands from query execution
    if (queryResult.commands) {
      queryResult.commands.forEach(command => {
        results.push({
          command,
          score: 1.0,
          matchedText: command.label,
          highlights: []
        })
      })
    }
    
    // Add student results as commands
    if (queryResult.students) {
      queryResult.students.slice(0, 5).forEach((student, index) => {
        const commands = this.generateStudentCommands(student, `result-${index}`)
        commands.forEach(command => {
          results.push({
            command,
            score: 0.9,
            matchedText: command.label,
            highlights: []
          })
        })
      })
    }
    
    // Add session results as commands
    if (queryResult.sessions) {
      queryResult.sessions.slice(0, 3).forEach((session, index) => {
        const commands = this.generateSessionCommands(session, `result-${index}`)
        commands.forEach(command => {
          results.push({
            command,
            score: 0.8,
            matchedText: command.label,
            highlights: []
          })
        })
      })
    }
    
    return results.slice(0, limit)
  }
}