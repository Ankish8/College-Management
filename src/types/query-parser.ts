export type ComparisonOperator = 
  | 'equals'
  | 'contains'
  | 'startswith'
  | 'endswith'
  | 'greater_than'
  | 'less_than'
  | 'greater_equal'
  | 'less_equal'
  | 'not_equals'

export type LogicalOperator = 'AND' | 'OR' | 'NOT'

export type QueryNodeType = 
  | 'filter'        // Basic filter: field:value
  | 'student_ref'   // @student reference
  | 'compound'      // Logical combination
  | 'text_search'   // Fallback fuzzy search

export interface BaseQueryNode {
  type: QueryNodeType
}

export interface FilterNode extends BaseQueryNode {
  type: 'filter'
  field: string
  operator: ComparisonOperator
  value: string | number | Date | boolean
}

export interface StudentRefNode extends BaseQueryNode {
  type: 'student_ref'
  studentName: string
  fuzzy: boolean
}

export interface CompoundNode extends BaseQueryNode {
  type: 'compound'
  operator: LogicalOperator
  left: QueryNode
  right?: QueryNode // Optional for NOT operator
}

export interface TextSearchNode extends BaseQueryNode {
  type: 'text_search'
  query: string
}

export type QueryNode = FilterNode | StudentRefNode | CompoundNode | TextSearchNode

// Query AST represents the parsed query structure
export interface QueryAST {
  root: QueryNode
  originalQuery: string
  hasAdvancedSyntax: boolean
}

// Token types for the lexer
export type TokenType = 
  | 'STUDENT_REF'     // @student
  | 'FIELD'           // field:
  | 'VALUE'           // value
  | 'QUOTED_STRING'   // "quoted value"
  | 'OPERATOR'        // AND, OR, NOT
  | 'COMPARISON'      // >, <, >=, <=, !=
  | 'LPAREN'          // (
  | 'RPAREN'          // )
  | 'WHITESPACE'      // space
  | 'EOF'             // end of input

export interface Token {
  type: TokenType
  value: string
  position: number
}

// Supported field types for filtering
export type FilterField = 
  | 'student'         // student:id or student:name
  | 'email'           // email:contains
  | 'session'         // session:1 or session:"Session 1"
  | 'status'          // status:present|absent|medical
  | 'attendance'      // attendance:>80%
  | 'date'            // date:2025-07-20 or date:last-week
  | 'time'            // time:>14:00

// Date range helpers
export type DateRange = 
  | 'today'
  | 'yesterday'
  | 'last-week'
  | 'this-week'
  | 'last-month'
  | 'this-month'

// Parser configuration
export interface QueryParserConfig {
  caseSensitive: boolean
  allowFuzzyStudentNames: boolean
  defaultOperator: LogicalOperator
  supportedFields: FilterField[]
  dateFormats: string[]
}

// Parser result with potential errors
export interface ParseResult {
  ast?: QueryAST
  errors: ParseError[]
  suggestions?: string[]
}

export interface ParseError {
  message: string
  position: number
  type: 'syntax' | 'semantic' | 'field' | 'value'
  suggestion?: string
}

// Runtime query execution context
export interface QueryExecutionContext {
  students: any[]
  sessions: any[]
  attendanceData: Record<string, Record<string, any>>
  selectedDate: string
  currentMode: string
}

// Query execution result
export interface QueryResult {
  students?: any[]
  sessions?: any[]
  attendanceRecords?: any[]
  commands?: any[]
  metadata: {
    matchCount: number
    executionTime: number
    appliedFilters: string[]
  }
}