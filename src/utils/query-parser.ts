import type {
  Token,
  TokenType,
  QueryAST,
  QueryNode,
  FilterNode,
  StudentRefNode,
  CompoundNode,
  TextSearchNode,
  ParseResult,
  ParseError,
  ComparisonOperator,
  LogicalOperator,
  QueryParserConfig,
  FilterField,
  DateRange
} from '@/types/query-parser'

export class QueryParser {
  private tokens: Token[] = []
  private current = 0
  private config: QueryParserConfig

  constructor(config: Partial<QueryParserConfig> = {}) {
    this.config = {
      caseSensitive: false,
      allowFuzzyStudentNames: true,
      defaultOperator: 'AND',
      supportedFields: ['student', 'email', 'session', 'status', 'attendance', 'date', 'time'],
      dateFormats: ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'],
      ...config
    }
  }

  parse(query: string): ParseResult {
    try {
      this.tokens = this.tokenize(query)
      this.current = 0

      // Check if query has advanced syntax
      const hasAdvancedSyntax = this.hasAdvancedSyntax(query)

      if (!hasAdvancedSyntax) {
        // Fallback to simple text search
        return {
          ast: {
            root: {
              type: 'text_search',
              query: query.trim()
            } as TextSearchNode,
            originalQuery: query,
            hasAdvancedSyntax: false
          },
          errors: []
        }
      }

      const root = this.parseExpression()
      
      return {
        ast: {
          root,
          originalQuery: query,
          hasAdvancedSyntax: true
        },
        errors: []
      }
    } catch (error) {
      return {
        errors: [{
          message: error instanceof Error ? error.message : 'Unknown parsing error',
          position: this.current,
          type: 'syntax'
        }]
      }
    }
  }

  private tokenize(query: string): Token[] {
    const tokens: Token[] = []
    let position = 0

    while (position < query.length) {
      const char = query[position]

      // Skip whitespace
      if (/\s/.test(char)) {
        position++
        continue
      }

      // Student reference: @student
      if (char === '@') {
        const match = query.slice(position).match(/^@(\w+)/)
        if (match) {
          tokens.push({
            type: 'STUDENT_REF',
            value: match[1],
            position
          })
          position += match[0].length
          continue
        }
      }

      // Quoted strings: "quoted value"
      if (char === '"') {
        const endQuote = query.indexOf('"', position + 1)
        if (endQuote !== -1) {
          tokens.push({
            type: 'QUOTED_STRING',
            value: query.slice(position + 1, endQuote),
            position
          })
          position = endQuote + 1
          continue
        }
      }

      // Field:value patterns
      const fieldMatch = query.slice(position).match(/^(\w+):([\w\-\%\.\"]+|\"[^\"]*\")/)
      if (fieldMatch) {
        tokens.push({
          type: 'FIELD',
          value: fieldMatch[1],
          position
        })
        
        let value = fieldMatch[2]
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1)
        }
        
        tokens.push({
          type: 'VALUE',
          value,
          position: position + fieldMatch[1].length + 1
        })
        position += fieldMatch[0].length
        continue
      }

      // Comparison operators: >, <, >=, <=, !=
      const comparisonMatch = query.slice(position).match(/^(>=|<=|!=|>|<)/)
      if (comparisonMatch) {
        tokens.push({
          type: 'COMPARISON',
          value: comparisonMatch[1],
          position
        })
        position += comparisonMatch[0].length
        continue
      }

      // Logical operators: AND, OR, NOT
      const logicalMatch = query.slice(position).match(/^(AND|OR|NOT)\b/i)
      if (logicalMatch) {
        tokens.push({
          type: 'OPERATOR',
          value: logicalMatch[1].toUpperCase(),
          position
        })
        position += logicalMatch[0].length
        continue
      }

      // Parentheses
      if (char === '(') {
        tokens.push({ type: 'LPAREN', value: '(', position })
        position++
        continue
      }

      if (char === ')') {
        tokens.push({ type: 'RPAREN', value: ')', position })
        position++
        continue
      }

      // Regular words/values
      const wordMatch = query.slice(position).match(/^(\w+)/)
      if (wordMatch) {
        tokens.push({
          type: 'VALUE',
          value: wordMatch[1],
          position
        })
        position += wordMatch[0].length
        continue
      }

      // Skip unknown characters
      position++
    }

    tokens.push({ type: 'EOF', value: '', position })
    return tokens
  }

  private hasAdvancedSyntax(query: string): boolean {
    // Check for advanced syntax patterns
    const patterns = [
      /@\w+/,                    // @student
      /\w+:/,                    // field:
      /\b(AND|OR|NOT)\b/i,       // logical operators
      /[><]=?/,                  // comparison operators
      /\(/,                      // parentheses
    ]

    return patterns.some(pattern => pattern.test(query))
  }

  private parseExpression(): QueryNode {
    return this.parseOr()
  }

  private parseOr(): QueryNode {
    let left = this.parseAnd()

    while (this.match('OPERATOR') && this.previous().value === 'OR') {
      const right = this.parseAnd()
      left = {
        type: 'compound',
        operator: 'OR',
        left,
        right
      } as CompoundNode
    }

    return left
  }

  private parseAnd(): QueryNode {
    let left = this.parseNot()

    while (this.match('OPERATOR') && this.previous().value === 'AND') {
      const right = this.parseNot()
      left = {
        type: 'compound',
        operator: 'AND',
        left,
        right
      } as CompoundNode
    }

    return left
  }

  private parseNot(): QueryNode {
    if (this.match('OPERATOR') && this.previous().value === 'NOT') {
      const operand = this.parsePrimary()
      return {
        type: 'compound',
        operator: 'NOT',
        left: operand
      } as CompoundNode
    }

    return this.parsePrimary()
  }

  private parsePrimary(): QueryNode {
    // Parentheses
    if (this.match('LPAREN')) {
      const expr = this.parseExpression()
      this.consume('RPAREN', 'Expected ")" after expression')
      return expr
    }

    // Student reference: @student
    if (this.check('STUDENT_REF')) {
      const token = this.advance()
      return {
        type: 'student_ref',
        studentName: token.value,
        fuzzy: this.config.allowFuzzyStudentNames
      } as StudentRefNode
    }

    // Field filters: field:value
    if (this.check('FIELD')) {
      return this.parseFilter()
    }

    // Fallback to text search
    if (this.check('VALUE') || this.check('QUOTED_STRING')) {
      const token = this.advance()
      return {
        type: 'text_search',
        query: token.value
      } as TextSearchNode
    }

    throw new Error(`Unexpected token: ${this.peek().value}`)
  }

  private parseFilter(): FilterNode {
    const fieldToken = this.consume('FIELD', 'Expected field name')
    const field = fieldToken.value

    // Check for comparison operator
    let operator: ComparisonOperator = 'equals'
    if (this.check('COMPARISON')) {
      const compToken = this.advance()
      operator = this.mapComparisonOperator(compToken.value)
    }

    // Get value
    let value: string | number | Date | boolean
    if (this.check('VALUE') || this.check('QUOTED_STRING')) {
      const valueToken = this.advance()
      value = this.parseValue(field, valueToken.value)
    } else {
      throw new Error('Expected value after field')
    }

    return {
      type: 'filter',
      field,
      operator,
      value
    } as FilterNode
  }

  private parseValue(field: string, rawValue: string): string | number | Date | boolean {
    // Handle percentage values
    if (rawValue.endsWith('%')) {
      return parseFloat(rawValue.slice(0, -1))
    }

    // Handle date values
    if (field === 'date') {
      return this.parseDate(rawValue)
    }

    // Handle numeric values
    if (!isNaN(Number(rawValue))) {
      return Number(rawValue)
    }

    // Handle boolean values
    if (rawValue.toLowerCase() === 'true') return true
    if (rawValue.toLowerCase() === 'false') return false

    // Default to string
    return rawValue
  }

  private parseDate(value: string): Date {
    // Handle relative dates
    const relativeDates: Record<string, () => Date> = {
      'today': () => new Date(),
      'yesterday': () => {
        const date = new Date()
        date.setDate(date.getDate() - 1)
        return date
      },
      'last-week': () => {
        const date = new Date()
        date.setDate(date.getDate() - 7)
        return date
      },
      'this-week': () => {
        const date = new Date()
        const day = date.getDay()
        date.setDate(date.getDate() - day)
        return date
      }
    }

    if (relativeDates[value]) {
      return relativeDates[value]()
    }

    // Try parsing as ISO date
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${value}`)
    }

    return date
  }

  private mapComparisonOperator(op: string): ComparisonOperator {
    const mapping: Record<string, ComparisonOperator> = {
      '>': 'greater_than',
      '<': 'less_than',
      '>=': 'greater_equal',
      '<=': 'less_equal',
      '!=': 'not_equals'
    }
    
    return mapping[op] || 'equals'
  }

  // Parser utility methods
  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance()
        return true
      }
    }
    return false
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false
    return this.peek().type === type
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++
    return this.previous()
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF'
  }

  private peek(): Token {
    return this.tokens[this.current]
  }

  private previous(): Token {
    return this.tokens[this.current - 1]
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance()
    throw new Error(message)
  }
}