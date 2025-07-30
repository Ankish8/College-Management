import type { Command, SearchResult, FuzzySearchOptions } from '@/types/command-palette'

export class FuzzySearchEngine {
  private commands: Command[] = []
  private options: FuzzySearchOptions = {
    threshold: 0.3,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 1,
    shouldSort: true
  }

  constructor(commands: Command[] = [], options: Partial<FuzzySearchOptions> = {}) {
    this.commands = commands
    this.options = { ...this.options, ...options }
  }

  updateCommands(commands: Command[]) {
    this.commands = commands
  }

  search(query: string, limit: number = 10): SearchResult[] {
    if (!query.trim()) {
      return this.getRecentCommands(limit)
    }

    const results: SearchResult[] = []
    const queryLower = query.toLowerCase()

    for (const command of this.commands) {
      const score = this.calculateScore(command, queryLower)
      
      if (score > this.options.threshold) {
        results.push({
          command,
          score,
          matchedText: command.label,
          highlights: this.getHighlights(command.label, queryLower)
        })
      }
    }

    // Sort by score (higher is better)
    if (this.options.shouldSort) {
      results.sort((a, b) => b.score - a.score)
    }

    return results.slice(0, limit)
  }

  private calculateScore(command: Command, query: string): number {
    let score = 0
    const label = command.label.toLowerCase()
    const description = command.description?.toLowerCase() || ''
    const keywords = command.keywords.map(k => k.toLowerCase())

    // Exact match gets highest score
    if (label === query) {
      return 1.0
    }

    // Label starts with query
    if (label.startsWith(query)) {
      score += 0.9
    }

    // Label contains query
    if (label.includes(query)) {
      score += 0.7
    }

    // Description contains query
    if (description.includes(query)) {
      score += 0.5
    }

    // Keywords match
    for (const keyword of keywords) {
      if (keyword.includes(query)) {
        score += 0.6
        break
      }
    }

    // Fuzzy matching for typos
    const fuzzyScore = this.fuzzyMatch(label, query)
    score += fuzzyScore * 0.4

    // Abbreviation matching (e.g., "msp" for "mark students present")
    const abbreviationScore = this.abbreviationMatch(label, query)
    score += abbreviationScore * 0.3

    return Math.min(score, 1.0)
  }

  private fuzzyMatch(text: string, query: string): number {
    const textLen = text.length
    const queryLen = query.length
    
    if (queryLen > textLen) return 0
    if (queryLen === textLen) return text === query ? 1 : 0
    
    let score = 0
    let textIndex = 0
    let queryIndex = 0
    let matches = 0

    while (textIndex < textLen && queryIndex < queryLen) {
      if (text[textIndex] === query[queryIndex]) {
        matches++
        queryIndex++
        score += 1 / textLen // Position-independent scoring
      }
      textIndex++
    }

    return queryIndex === queryLen ? matches / queryLen : 0
  }

  private abbreviationMatch(text: string, query: string): number {
    const words = text.split(' ')
    const firstLetters = words.map(word => word[0]?.toLowerCase()).join('')
    
    if (firstLetters.includes(query)) {
      return query.length / firstLetters.length
    }
    
    return 0
  }

  private getHighlights(text: string, query: string): number[] {
    const highlights: number[] = []
    const textLower = text.toLowerCase()
    
    let index = textLower.indexOf(query)
    while (index !== -1) {
      for (let i = index; i < index + query.length; i++) {
        highlights.push(i)
      }
      index = textLower.indexOf(query, index + 1)
    }
    
    return highlights
  }

  private getRecentCommands(limit: number): SearchResult[] {
    // For now, return top commands with perfect score
    return this.commands.slice(0, limit).map(command => ({
      command,
      score: 1.0,
      matchedText: command.label,
      highlights: []
    }))
  }
}