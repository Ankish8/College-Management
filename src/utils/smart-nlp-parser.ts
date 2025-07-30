import nlp from 'compromise'
import type { Student, Session, AttendanceStatus } from '@/types/attendance'
import type { SearchContext } from './search-context'

// ADVANCED NLP: Extend compromise with comprehensive lexicon
nlp.extend({
  words: {
    // Student names (dynamically populated)
    'aarav': 'Person',
    'diya': 'Person', 
    'arjun': 'Person',
    'ananya': 'Person',
    'vivaan': 'Person',
    'ishika': 'Person',
    'advait': 'Person',
    
    // Enhanced attendance terms with synonyms
    'absent': 'AttendanceStatus',
    'present': 'AttendanceStatus',
    'medical': 'AttendanceStatus',
    'here': 'AttendanceStatus',
    'attending': 'AttendanceStatus',
    'missing': 'AttendanceStatus',
    'away': 'AttendanceStatus',
    'sick': 'AttendanceStatus',
    'ill': 'AttendanceStatus',
    'unwell': 'AttendanceStatus',
    'leave': 'AttendanceStatus',
    
    // Hindi/Hinglish expanded
    'gair': 'AttendanceStatus',        // absent
    'gayr': 'AttendanceStatus',        
    'hazir': 'AttendanceStatus',       // present
    'mojood': 'AttendanceStatus',      
    'bemar': 'AttendanceStatus',       // sick
    'bimari': 'AttendanceStatus',      
    'chutti': 'AttendanceStatus',      // leave/holiday
    
    // Advanced question patterns
    'kaun': 'QuestionWord',           // who
    'kya': 'QuestionWord',            // what  
    'kab': 'QuestionWord',            // when
    'kahan': 'QuestionWord',          // where
    'kaise': 'QuestionWord',          // how
    'kitne': 'QuestionWord',          // how many
    'kyun': 'QuestionWord',           // why
    
    // Time expressions (enhanced)
    'kal': 'RelativeDate',            // yesterday/tomorrow
    'aaj': 'RelativeDate',            // today
    'parso': 'RelativeDate',          // day before yesterday
    'tarso': 'RelativeDate',          // day after tomorrow
    'last': 'TimeModifier',
    'next': 'TimeModifier',
    'this': 'TimeModifier',
    'week': 'TimeUnit',
    'month': 'TimeUnit',
    'semester': 'TimeUnit',
    
    // Negation patterns
    'nahi': 'Negation',               // no/not
    'nahin': 'Negation',
    'mat': 'Negation',
    'never': 'Negation',
    'none': 'Negation',
    'nothing': 'Negation',
    
    // Tense markers
    'tha': 'PastTense',               // was
    'the': 'PastTense',               // were
    'hai': 'PresentTense',            // is
    'hain': 'PresentTense',           // are
    'hoga': 'FutureTense',            // will be
    'honge': 'FutureTense',           // will be (plural)
    
    // Academic terms
    'attendance': 'AttendanceTopic',
    'session': 'SessionTopic',
    'class': 'SessionTopic',
    'lecture': 'SessionTopic',
    'period': 'SessionTopic',
    'email': 'EmailTopic',
    'student': 'StudentTopic',
    'students': 'StudentTopic',
    'percentage': 'MetricTopic',
    'report': 'ReportTopic',
    'statistics': 'StatsTopic',
    'stats': 'StatsTopic',
    
    // Comparative terms
    'above': 'Comparison',
    'below': 'Comparison',
    'more': 'Comparison',
    'less': 'Comparison',
    'than': 'Comparison',
    'greater': 'Comparison',
    'higher': 'Comparison',
    'lower': 'Comparison',
    
    // Action verbs
    'show': 'ActionVerb',
    'display': 'ActionVerb',
    'find': 'ActionVerb',
    'search': 'ActionVerb',
    'mark': 'ActionVerb',
    'update': 'ActionVerb',
    'change': 'ActionVerb',
    'filter': 'ActionVerb',
    'list': 'ActionVerb',
    
    // Sentiment indicators
    'good': 'PositiveSentiment',
    'excellent': 'PositiveSentiment',
    'great': 'PositiveSentiment',
    'perfect': 'PositiveSentiment',
    'bad': 'NegativeSentiment',
    'poor': 'NegativeSentiment',
    'terrible': 'NegativeSentiment',
    'concerning': 'NegativeSentiment',
    'worried': 'NegativeSentiment'
  },
  tags: {
    AttendanceStatus: {
      isA: 'Adjective',
      notA: 'Verb'
    },
    AttendanceTopic: {
      isA: 'Noun',
      color: 'blue'
    },
    SessionTopic: {
      isA: 'Noun',
      color: 'green'
    },
    EmailTopic: {
      isA: 'Noun',
      color: 'purple'
    },
    RelativeDate: {
      isA: 'Date',
      color: 'orange'
    },
    QuestionWord: {
      isA: 'QuestionWord',
      color: 'red'
    },
    TimeModifier: {
      isA: 'Adjective',
      beforeNouns: true
    },
    TimeUnit: {
      isA: 'Noun',
      color: 'cyan'
    },
    Negation: {
      isA: 'Adverb',
      beforeNouns: false
    },
    PastTense: {
      isA: 'Copula',
      tense: 'Past'
    },
    PresentTense: {
      isA: 'Copula',
      tense: 'Present'
    },
    FutureTense: {
      isA: 'Copula',
      tense: 'Future'
    },
    StudentTopic: {
      isA: 'Noun',
      color: 'indigo'
    },
    MetricTopic: {
      isA: 'Noun',
      color: 'pink'
    },
    ReportTopic: {
      isA: 'Noun',
      color: 'yellow'
    },
    StatsTopic: {
      isA: 'Noun',
      color: 'gray'
    },
    Comparison: {
      isA: 'Adjective',
      comparative: true
    },
    ActionVerb: {
      isA: 'Verb',
      canBe: 'imperative'
    },
    PositiveSentiment: {
      isA: 'Adjective',
      sentiment: 'positive'
    },
    NegativeSentiment: {
      isA: 'Adjective',
      sentiment: 'negative'
    }
  }
})

export interface ParsedQuery {
  intent: QueryIntent
  entities: ExtractedEntities
  confidence: number
  originalQuery: string
  normalizedQuery: string
}

export interface ExtractedEntities {
  people?: string[]
  dates?: Date[]
  sessions?: number[]
  status?: AttendanceStatus[]
  values?: number[]
  emailPatterns?: string[]
  timeframes?: string[]
  comparisons?: ComparisonOperator[]
}

export type QueryIntent = 
  | 'find_student'
  | 'show_attendance' 
  | 'filter_by_status'
  | 'filter_by_attendance_percentage'
  | 'show_session_info'
  | 'search_by_email'
  | 'mark_attendance'
  | 'show_statistics'
  | 'date_range_query'
  | 'general_search'

export type ComparisonOperator = 'greater_than' | 'less_than' | 'equals' | 'greater_equal' | 'less_equal' | 'not_equal'

export class SmartNLPParser {
  private searchContext: SearchContext

  constructor(searchContext: SearchContext) {
    this.searchContext = searchContext
  }

  parse(query: string): ParsedQuery {
    console.log('🔬 SmartNLP parsing:', query)
    
    const doc = nlp(query)
    const normalizedQuery = doc.normalize().text()
    
    // Test if our custom tags are working
    const testStatus = doc.match('#AttendanceStatus')
    const testPeople = doc.match('#Person')
    console.log('🔬 Custom tag test - AttendanceStatus:', testStatus ? testStatus.out('array') : 'none')
    console.log('🔬 Custom tag test - Person:', testPeople ? testPeople.out('array') : 'none')
    
    // Extract all entities first
    const entities = this.extractEntities(doc, query)
    
    // Determine intent based on entities and patterns
    const intent = this.determineIntent(doc, entities, query)
    
    // Calculate confidence based on entity matches and patterns
    const confidence = this.calculateConfidence(doc, entities, intent)

    console.log('🔬 SmartNLP result:', { intent, entities, confidence })

    return {
      intent,
      entities,
      confidence,
      originalQuery: query,
      normalizedQuery
    }
  }

  private extractEntities(doc: any, originalQuery: string): ExtractedEntities {
    const entities: ExtractedEntities = {}

    // Extract people (student names)
    const people = this.extractPeople(doc, originalQuery)
    if (people.length > 0) entities.people = people

    // Extract dates and time references
    const dates = this.extractDates(doc, originalQuery)
    if (dates.length > 0) entities.dates = dates

    // Extract session numbers
    const sessions = this.extractSessions(doc, originalQuery)
    if (sessions.length > 0) entities.sessions = sessions

    // Extract attendance status
    const status = this.extractAttendanceStatus(doc, originalQuery)
    if (status.length > 0) entities.status = status

    // Extract numerical values (percentages, counts)
    const values = this.extractValues(doc, originalQuery)
    if (values.length > 0) entities.values = values

    // Extract email patterns
    const emailPatterns = this.extractEmailPatterns(doc, originalQuery)
    if (emailPatterns.length > 0) entities.emailPatterns = emailPatterns

    // Extract timeframes
    const timeframes = this.extractTimeframes(doc, originalQuery)
    if (timeframes.length > 0) entities.timeframes = timeframes

    // Extract comparison operators
    const comparisons = this.extractComparisons(doc, originalQuery)
    if (comparisons.length > 0) entities.comparisons = comparisons

    return entities
  }

  private extractPeople(doc: any, query: string): string[] {
    const people: string[] = []
    
    // Try to use compromise's built-in people detection
    try {
      const nlpPeople = doc.match('#Person')
      if (nlpPeople && nlpPeople.length > 0) {
        nlpPeople.forEach((person: any) => {
          const personText = person.text()
          if (personText) {
            people.push(...personText.split(' and ').map((name: string) => name.trim()))
          }
        })
      }
    } catch (e) {
      // Fallback to manual parsing if compromise people detection fails
    }

    // Also check against known student names for fuzzy matching
    const students = this.searchContext.getStudents()
    const queryLower = query.toLowerCase()
    
    students.forEach(student => {
      const firstName = student.name.split(' ')[0].toLowerCase()
      const lastName = student.name.split(' ').slice(-1)[0].toLowerCase()
      const fullName = student.name.toLowerCase()
      
      // Check if query contains any part of the name
      if (queryLower.includes(firstName) || 
          queryLower.includes(lastName) || 
          queryLower.includes(fullName) ||
          queryLower.includes(student.studentId.toLowerCase())) {
        if (!people.some(p => p.toLowerCase() === student.name.toLowerCase())) {
          people.push(student.name)
        }
      }
    })

    return people
  }

  private extractDates(doc: any, query: string): Date[] {
    const dates: Date[] = []
    const today = new Date()

    // Try to use compromise's date detection if available
    try {
      const nlpDates = doc.match('#Date')
      if (nlpDates && nlpDates.length > 0) {
        nlpDates.forEach((datePhrase: any) => {
          const dateText = datePhrase.text().toLowerCase()
          const parsedDate = this.parseRelativeDate(dateText, today)
          if (parsedDate) dates.push(parsedDate)
        })
      }
    } catch (e) {
      // Fallback to manual parsing if compromise date detection fails
    }

    // Manual patterns for common relative dates (English + Hindi)
    const datePatterns = [
      // English patterns - order matters, check longer phrases first
      { pattern: /day before yesterday/i, offset: -2 },
      { pattern: /day after tomorrow/i, offset: 2 },
      { pattern: /yesterday/i, offset: -1 },
      { pattern: /today/i, offset: 0 },
      { pattern: /tomorrow/i, offset: 1 },
      { pattern: /last (week|monday|tuesday|wednesday|thursday|friday)/i, offset: -7 },
      { pattern: /this (week|monday|tuesday|wednesday|thursday|friday)/i, offset: 0 },
      { pattern: /next (week|monday|tuesday|wednesday|thursday|friday)/i, offset: 7 },
      // Hindi patterns
      { pattern: /\bkal\b/i, offset: -1 },  // kal = yesterday (context dependent)
      { pattern: /\baaj\b/i, offset: 0 },   // aaj = today
      { pattern: /\bparso\b/i, offset: -2 }, // parso = day before yesterday
      { pattern: /pichle (hafta|week)/i, offset: -7 }, // last week
      { pattern: /is (hafta|week)/i, offset: 0 },      // this week
      { pattern: /agle (hafta|week)/i, offset: 7 }     // next week
    ]

    datePatterns.forEach(({ pattern, offset }) => {
      if (pattern.test(query)) {
        const date = new Date(today)
        date.setDate(date.getDate() + offset)
        dates.push(date)
      }
    })

    return dates
  }

  private extractSessions(doc: any, query: string): number[] {
    const sessions: number[] = []
    
    // Look for "session X" patterns
    const sessionMatch = query.match(/session\s+(\d+)/i)
    if (sessionMatch) {
      sessions.push(parseInt(sessionMatch[1]))
    }

    // Look for standalone numbers that could be sessions (1-10)
    try {
      const numbers = doc.match('#Value')
      if (numbers && numbers.length > 0) {
        numbers.forEach((num: any) => {
          const value = parseInt(num.text())
          if (value >= 1 && value <= 10) {
            sessions.push(value)
          }
        })
      }
    } catch (e) {
      // Fallback: extract numbers manually
      const numberMatches = query.match(/\d+/g)
      if (numberMatches) {
        numberMatches.forEach(match => {
          const value = parseInt(match)
          if (value >= 1 && value <= 10) {
            sessions.push(value)
          }
        })
      }
    }

    return sessions
  }

  private extractAttendanceStatus(doc: any, query: string): AttendanceStatus[] {
    const statuses: AttendanceStatus[] = []
    const queryLower = query.toLowerCase()

    const statusMap = [
      { 
        patterns: [
          // English
          'absent', 'not present', 'missing', 'away',
          // Hindi/Hinglish
          'gair', 'gayr', 'nahi tha', 'nahi the', 'absent tha', 'gair hazir'
        ], 
        status: 'absent' as AttendanceStatus 
      },
      { 
        patterns: [
          // English
          'present', 'here', 'attending',
          // Hindi/Hinglish
          'hazir', 'mojood', 'tha', 'the', 'present tha', 'hazir tha'
        ], 
        status: 'present' as AttendanceStatus 
      },
      { 
        patterns: [
          // English
          'medical', 'sick', 'ill', 'doctor',
          // Hindi/Hinglish
          'bemar', 'bimari', 'medical tha', 'bemar tha'
        ], 
        status: 'medical' as AttendanceStatus 
      }
    ]

    statusMap.forEach(({ patterns, status }) => {
      if (patterns.some(pattern => queryLower.includes(pattern))) {
        statuses.push(status)
      }
    })

    return statuses
  }

  private extractValues(doc: any, query: string): number[] {
    const values: number[] = []
    
    // Extract percentages
    const percentageMatch = query.match(/(\d+)%?/g)
    if (percentageMatch) {
      percentageMatch.forEach(match => {
        const num = parseInt(match.replace('%', ''))
        values.push(num)
      })
    }

    // Try to use compromise's value detection
    try {
      const nlpValues = doc.match('#Value')
      if (nlpValues && nlpValues.length > 0) {
        nlpValues.forEach((value: any) => {
          const num = parseFloat(value.text())
          if (!isNaN(num)) {
            values.push(num)
          }
        })
      }
    } catch (e) {
      // Fallback: extract numbers from query manually
      const numberMatches = query.match(/\d+/g)
      if (numberMatches) {
        numberMatches.forEach(match => {
          const num = parseInt(match)
          if (!isNaN(num) && !values.includes(num)) {
            values.push(num)
          }
        })
      }
    }

    return values
  }

  private extractEmailPatterns(doc: any, query: string): string[] {
    const patterns: string[] = []
    
    // Look for email domains
    const emailMatch = query.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)
    if (emailMatch) {
      patterns.push(...emailMatch)
    }

    // Look for @ mentions
    const atMatch = query.match(/@([a-zA-Z0-9.-]+)/g)
    if (atMatch) {
      patterns.push(...atMatch.map(match => match.substring(1)))
    }

    // Common email patterns
    if (query.toLowerCase().includes('gmail')) patterns.push('gmail.com')
    if (query.toLowerCase().includes('jlu')) patterns.push('jlu.edu.in')

    return patterns
  }

  private extractTimeframes(doc: any, query: string): string[] {
    const timeframes: string[] = []
    
    const timeframePatterns = [
      'this week', 'last week', 'next week',
      'this month', 'last month', 'next month',
      'this semester', 'last semester', 'next semester',
      'this year', 'last year', 'next year'
    ]

    timeframePatterns.forEach(pattern => {
      if (query.toLowerCase().includes(pattern)) {
        timeframes.push(pattern)
      }
    })

    return timeframes
  }

  private extractComparisons(doc: any, query: string): ComparisonOperator[] {
    const comparisons: ComparisonOperator[] = []
    
    const comparisonMap = [
      { patterns: ['>', 'greater than', 'more than', 'above', 'over'], op: 'greater_than' as ComparisonOperator },
      { patterns: ['<', 'less than', 'under', 'below', 'fewer than'], op: 'less_than' as ComparisonOperator },
      { patterns: ['>=', 'greater than or equal', 'at least'], op: 'greater_equal' as ComparisonOperator },
      { patterns: ['<=', 'less than or equal', 'at most', 'no more than'], op: 'less_equal' as ComparisonOperator },
      { patterns: ['=', 'equals', 'equal to', 'exactly'], op: 'equals' as ComparisonOperator },
      { patterns: ['!=', 'not equal', 'not equals', 'different from'], op: 'not_equal' as ComparisonOperator }
    ]

    comparisonMap.forEach(({ patterns, op }) => {
      if (patterns.some(pattern => query.toLowerCase().includes(pattern))) {
        comparisons.push(op)
      }
    })

    return comparisons
  }

  private determineIntent(doc: any, entities: ExtractedEntities, query: string): QueryIntent {
    const queryLower = query.toLowerCase()
    
    // Action words detection (English + Hindi/Hinglish)
    const actionWords = {
      mark: [
        // English
        'mark', 'set', 'update', 'change',
        // Hindi/Hinglish
        'mark kar', 'set kar', 'lagao', 'daalo'
      ],
      show: [
        // English
        'show', 'display', 'view', 'see', 'find', 'get',
        // Hindi/Hinglish
        'dikhao', 'dekho', 'batao', 'kaun', 'kya', 'dekhna hai'
      ],
      filter: [
        // English
        'filter', 'where', 'with', 'having',
        // Hindi/Hinglish
        'jo', 'jinke', 'wale', 'filter kar'
      ],
      search: [
        // English
        'search', 'look for', 'find',
        // Hindi/Hinglish
        'dhundho', 'search kar', 'mil gaya'
      ]
    }

    // Hindi question patterns
    const hindiQuestionPatterns = {
      who_was: /kaun.*?(tha|the|hai|hain)/i,  // "kaun absent tha"
      what_is: /kya.*?(hai|hain)/i,           // "kya attendance hai"
      show_me: /(dikhao|batao|dekho)/i        // "dikhao absent students"
    }

    // Check Hindi question patterns first
    if (hindiQuestionPatterns.who_was.test(queryLower) || hindiQuestionPatterns.show_me.test(queryLower)) {
      if (entities.status && entities.status.length > 0) {
        return 'filter_by_status'
      }
      if (entities.people && entities.people.length > 0) {
        return 'find_student'
      }
    }

    // Determine intent based on entities and action words
    if (actionWords.mark.some(word => queryLower.includes(word))) {
      return 'mark_attendance'
    }

    if (entities.people && entities.people.length > 0) {
      if (queryLower.includes('attendance') || entities.values) {
        return 'show_attendance'
      }
      return 'find_student'
    }

    if (entities.status && entities.status.length > 0) {
      return 'filter_by_status'
    }

    if (entities.values && entities.comparisons) {
      return 'filter_by_attendance_percentage'
    }

    if (entities.sessions && entities.sessions.length > 0) {
      return 'show_session_info'
    }

    if (entities.emailPatterns && entities.emailPatterns.length > 0) {
      return 'search_by_email'
    }

    if (entities.dates && entities.dates.length > 0) {
      return 'date_range_query'
    }

    if (queryLower.includes('statistics') || queryLower.includes('stats') || queryLower.includes('summary')) {
      return 'show_statistics'
    }

    return 'general_search'
  }

  private calculateConfidence(doc: any, entities: ExtractedEntities, intent: QueryIntent): number {
    let confidence = 0.3 // Base confidence
    
    // Add confidence for each entity type found
    if (entities.people && entities.people.length > 0) confidence += 0.2
    if (entities.dates && entities.dates.length > 0) confidence += 0.15
    if (entities.sessions && entities.sessions.length > 0) confidence += 0.15
    if (entities.status && entities.status.length > 0) confidence += 0.15
    if (entities.values && entities.values.length > 0) confidence += 0.1
    if (entities.comparisons && entities.comparisons.length > 0) confidence += 0.1

    // Boost confidence for clear intent patterns
    const intentBoosts = {
      'find_student': entities.people ? 0.2 : 0,
      'filter_by_status': entities.status ? 0.2 : 0,
      'show_session_info': entities.sessions ? 0.2 : 0,
      'search_by_email': entities.emailPatterns ? 0.2 : 0
    }

    confidence += intentBoosts[intent as keyof typeof intentBoosts] || 0

    return Math.min(confidence, 1.0)
  }

  private parseRelativeDate(dateText: string, baseDate: Date): Date | null {
    const today = new Date(baseDate)
    const text = dateText.toLowerCase().trim()
    
    // English date patterns
    switch (text) {
      case 'yesterday':
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        return yesterday
      case 'today':
        return new Date(today)
      case 'tomorrow':
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        return tomorrow
      case 'last week':
        const lastWeek = new Date(today)
        lastWeek.setDate(lastWeek.getDate() - 7)
        return lastWeek
      case 'next week':
        const nextWeek = new Date(today)
        nextWeek.setDate(nextWeek.getDate() + 7)
        return nextWeek
    }
    
    // Hindi date patterns
    switch (text) {
      case 'kal':
        // Context-dependent: could be yesterday or tomorrow
        // Default to yesterday for past tense queries
        const kal = new Date(today)
        kal.setDate(kal.getDate() - 1)
        return kal
      case 'aaj':
        return new Date(today)
      case 'parso':
        const parso = new Date(today)
        parso.setDate(parso.getDate() - 2)
        return parso
    }
    
    return null
  }

  // Advanced NLP Features
  
  // Sentiment Analysis
  analyzeSentiment(query: string): { sentiment: 'positive' | 'negative' | 'neutral', confidence: number, keywords: string[] } {
    const doc = nlp(query)
    const positiveWords = doc.match('#PositiveSentiment')
    const negativeWords = doc.match('#NegativeSentiment')
    
    const positive = positiveWords ? positiveWords.text().split(' ').filter(w => w.trim()) : []
    const negative = negativeWords ? negativeWords.text().split(' ').filter(w => w.trim()) : []
    
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral'
    let confidence = 0.5
    
    if (positive.length > negative.length) {
      sentiment = 'positive'
      confidence = 0.6 + (positive.length * 0.1)
    } else if (negative.length > positive.length) {
      sentiment = 'negative' 
      confidence = 0.6 + (negative.length * 0.1)
    }
    
    // Check for explicit concern patterns
    if (/worried|concerning|problem|issue|bad|poor|terrible/.test(query.toLowerCase())) {
      sentiment = 'negative'
      confidence = Math.max(confidence, 0.8)
    }
    
    return {
      sentiment,
      confidence: Math.min(confidence, 1.0),
      keywords: [...positive, ...negative]
    }
  }
  
  // Advanced Entity Extraction with Relationships
  extractAdvancedEntities(query: string): {
    numbers: { value: number, context: string, type: 'percentage' | 'count' | 'session' }[],
    dateRanges: { start?: Date, end?: Date, type: 'range' | 'single' | 'relative' }[],
    relationships: { entity1: string, relation: string, entity2: string }[],
    comparisons: { operator: string, value: number, unit?: string }[]
  } {
    const doc = nlp(query)
    const results = {
      numbers: [] as any[],
      dateRanges: [] as any[],
      relationships: [] as any[],
      comparisons: [] as any[]
    }
    
    // Extract numbers with context
    const numbers = doc.match('#Value')
    if (numbers && numbers.length > 0) {
      numbers.forEach((num: any) => {
        const value = parseFloat(num.text())
        if (!isNaN(value)) {
          let context = ''
          let type: 'percentage' | 'count' | 'session' = 'count'
          
          // Look for context around the number
          const beforeText = num.before().text().toLowerCase()
          const afterText = num.after().text().toLowerCase()
          
          if (afterText.includes('%') || beforeText.includes('percent')) {
            type = 'percentage'
            context = 'attendance percentage'
          } else if (beforeText.includes('session') || afterText.includes('session')) {
            type = 'session'
            context = 'session number'
          } else if (value >= 1 && value <= 10) {
            type = 'session'
            context = 'possible session'
          }
          
          results.numbers.push({ value, context, type })
        }
      })
    }
    
    // Extract date ranges
    const dateWords = doc.match('#RelativeDate')
    if (dateWords && dateWords.length > 0) {
      const today = new Date()
      dateWords.forEach((dateWord: any) => {
        const text = dateWord.text().toLowerCase()
        let start: Date | undefined
        let end: Date | undefined
        let type: 'range' | 'single' | 'relative' = 'single'
        
        if (text.includes('week')) {
          type = 'range'
          start = new Date(today)
          start.setDate(start.getDate() - 7)
          end = new Date(today)
        } else {
          const parsed = this.parseRelativeDate(text, today)
          if (parsed) {
            start = parsed
            type = 'relative'
          }
        }
        
        if (start) {
          results.dateRanges.push({ start, end, type })
        }
      })
    }
    
    // Extract relationships (student-status, date-status, etc.)
    const people = doc.match('#Person')
    const status = doc.match('#AttendanceStatus')
    const dates = doc.match('#Date')
    
    if (people && status) {
      people.forEach((person: any) => {
        status.forEach((stat: any) => {
          results.relationships.push({
            entity1: person.text(),
            relation: 'has_status',
            entity2: stat.text()
          })
        })
      })
    }
    
    if (dates && status) {
      dates.forEach((date: any) => {
        status.forEach((stat: any) => {
          results.relationships.push({
            entity1: date.text(),
            relation: 'on_date',
            entity2: stat.text()
          })
        })
      })
    }
    
    // Extract comparisons
    const comparisons = doc.match('#Comparison')
    if (comparisons && results.numbers.length > 0) {
      comparisons.forEach((comp: any) => {
        results.numbers.forEach(num => {
          let operator = 'equals'
          const compText = comp.text().toLowerCase()
          
          if (compText.includes('above') || compText.includes('greater') || compText.includes('more')) {
            operator = 'greater_than'
          } else if (compText.includes('below') || compText.includes('less') || compText.includes('under')) {
            operator = 'less_than'
          }
          
          results.comparisons.push({
            operator,
            value: num.value,
            unit: num.type === 'percentage' ? '%' : undefined
          })
        })
      })
    }
    
    return results
  }
  
  // Smart Query Expansion
  expandQuery(query: string): {
    original: string,
    expanded: string[],
    synonyms: Record<string, string[]>,
    suggestions: string[]
  } {
    const doc = nlp(query)
    const expanded: string[] = []
    const synonyms: Record<string, string[]> = {}
    
    // Define synonym mappings
    const synonymMap = {
      'absent': ['missing', 'away', 'not present', 'gair hazir'],
      'present': ['here', 'attending', 'hazir'],
      'medical': ['sick', 'ill', 'bemar', 'doctor'],
      'yesterday': ['kal', 'previous day'],
      'today': ['aaj', 'current day'],
      'student': ['pupil', 'learner', 'bachha'],
      'attendance': ['presence', 'haziri']
    }
    
    // Extract key terms and find synonyms
    const words = doc.terms().out('array')
    words.forEach(word => {
      const lowerWord = word.toLowerCase()
      if (synonymMap[lowerWord]) {
        synonyms[word] = synonymMap[lowerWord]
        
        // Create expanded queries with synonyms
        synonymMap[lowerWord].forEach(synonym => {
          const expandedQuery = query.replace(new RegExp(word, 'gi'), synonym)
          if (expandedQuery !== query) {
            expanded.push(expandedQuery)
          }
        })
      }
    })
    
    // Generate contextual suggestions
    const suggestions = this.getSmartSuggestions(this.parse(query))
    
    return {
      original: query,
      expanded,
      synonyms,
      suggestions
    }
  }
  
  // Enhanced pattern matching for complex queries
  matchComplexPatterns(query: string): {
    patterns: string[],
    confidence: number,
    matchedRules: string[]
  } {
    const patterns: string[] = []
    const matchedRules: string[] = []
    let confidence = 0
    
    const queryLower = query.toLowerCase()
    
    // Complex pattern rules
    const patternRules = [
      {
        name: 'student_status_date',
        pattern: /(\w+)\s+(?:was|is|tha|hai)\s+(present|absent|medical)\s+(?:on|yesterday|today|kal|aaj)/i,
        confidence: 0.9
      },
      {
        name: 'who_question_with_status',
        pattern: /(?:who|kaun)\s+(?:was|were|is|are|tha|the|hai|hain)\s+(present|absent|medical)/i,
        confidence: 0.85
      },
      {
        name: 'attendance_percentage_query',
        pattern: /(?:attendance|haziri)\s+(?:percentage|percent|%)\s+(?:above|below|more|less)\s+(\d+)/i,
        confidence: 0.8
      },
      {
        name: 'date_attendance_query',
        pattern: /(?:show|dikhao|batao)\s+(?:attendance|haziri)\s+(?:for|on|ke liye)\s+(yesterday|today|tomorrow|kal|aaj|parso)/i,
        confidence: 0.85
      },
      {
        name: 'session_specific_query',
        pattern: /session\s+(\d+)\s+(?:attendance|present|absent)/i,
        confidence: 0.9
      }
    ]
    
    patternRules.forEach(rule => {
      if (rule.pattern.test(queryLower)) {
        patterns.push(rule.name)
        matchedRules.push(`Matched ${rule.name} with confidence ${rule.confidence}`)
        confidence = Math.max(confidence, rule.confidence)
      }
    })
    
    return {
      patterns,
      confidence,
      matchedRules
    }
  }
  
  // Helper method to get contextual suggestions based on parsed intent
  getSmartSuggestions(parsedQuery: ParsedQuery): string[] {
    const suggestions: string[] = []
    
    switch (parsedQuery.intent) {
      case 'find_student':
        suggestions.push(
          'Show attendance percentage',
          'View recent attendance',
          'Mark as present/absent'
        )
        break
      case 'filter_by_status':
        suggestions.push(
          'Show in specific session',
          'Filter by date range',
          'Export list'
        )
        break
      case 'show_attendance':
        suggestions.push(
          'Compare with class average',
          'Show trend analysis',
          'View by session'
        )
        break
      case 'filter_by_attendance_percentage':
        suggestions.push(
          'Show students below 75%',
          'Show students above 85%',
          'Generate improvement report'
        )
        break
      case 'date_range_query':
        suggestions.push(
          'Show weekly summary',
          'Compare with previous week',
          'Generate date range report'
        )
        break
    }
    
    // Add entity-specific suggestions
    if (parsedQuery.entities.people && parsedQuery.entities.people.length > 0) {
      suggestions.push(`View ${parsedQuery.entities.people[0]}'s attendance history`)
      suggestions.push(`Send email to ${parsedQuery.entities.people[0]}`)
    }
    
    if (parsedQuery.entities.dates && parsedQuery.entities.dates.length > 0) {
      suggestions.push('Show class summary for this date')
      suggestions.push('Compare with previous day')
    }
    
    return suggestions.slice(0, 6) // Limit to 6 suggestions
  }
}