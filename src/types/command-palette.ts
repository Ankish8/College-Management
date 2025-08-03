export interface Command {
  id: string
  label: string
  description?: string
  icon?: string
  category: CommandCategory
  keywords: string[]
  action: () => void | Promise<void>
  shortcut?: string
  context?: CommandContext[]
}

export type CommandCategory = 
  | 'navigation'
  | 'attendance'
  | 'analytics' 
  | 'system'
  | 'student'
  | 'session'
  | 'suggestion'

export type CommandContext = 
  | 'detailed-mode'
  | 'fast-mode'
  | 'predictive-mode'
  | 'students-selected'
  | 'cell-focused'
  | 'unsaved-changes'

export interface SearchResult {
  command: Command
  score: number
  matchedText: string
  highlights: number[]
}

export interface CommandPaletteState {
  isOpen: boolean
  query: string
  results: SearchResult[]
  selectedIndex: number
  recentCommands: string[]
  context: AppContext
}

export interface AppContext {
  selectedDate: string
  currentMode: string
  selectedStudents: string[]
  focusedCell: { studentIndex: number; sessionIndex: number } | null
  hasUnsavedChanges: boolean
  currentView: string
}

export interface FuzzySearchOptions {
  threshold: number
  includeScore: boolean
  includeMatches: boolean
  minMatchCharLength: number
  shouldSort: boolean
}

export interface CommandHistory {
  commandId: string
  timestamp: Date
  context: AppContext
  executionTime: number
  success: boolean
}