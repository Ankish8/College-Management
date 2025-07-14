export interface TimetablePreferences {
  recentSubjects: string[]
  defaultTimeSlot?: string
  defaultDay?: string
  lastUsedFilters?: {
    department?: string
    program?: string
    batch?: string
  }
  quickCreateSettings?: {
    autoApplyRecent: boolean
    showPreview: boolean
    confirmBeforeCreate: boolean
  }
}

const STORAGE_KEY = 'timetable-preferences'
const MAX_RECENT_SUBJECTS = 5
const MAX_RECENT_SESSIONS = 10

export class AutoSaveManager {
  private static instance: AutoSaveManager
  private preferences: TimetablePreferences
  private saveTimeout: NodeJS.Timeout | null = null

  private constructor() {
    this.preferences = this.loadPreferences()
  }

  static getInstance(): AutoSaveManager {
    if (!AutoSaveManager.instance) {
      AutoSaveManager.instance = new AutoSaveManager()
    }
    return AutoSaveManager.instance
  }

  private loadPreferences(): TimetablePreferences {
    if (typeof window === 'undefined') {
      return {
        recentSubjects: [],
        quickCreateSettings: {
          autoApplyRecent: true,
          showPreview: true,
          confirmBeforeCreate: false
        }
      }
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          recentSubjects: parsed.recentSubjects || [],
          defaultTimeSlot: parsed.defaultTimeSlot,
          defaultDay: parsed.defaultDay,
          lastUsedFilters: parsed.lastUsedFilters,
          quickCreateSettings: {
            autoApplyRecent: true,
            showPreview: true,
            confirmBeforeCreate: false,
            ...parsed.quickCreateSettings
          }
        }
      }
    } catch (error) {
      console.error('Failed to load timetable preferences:', error)
    }

    return {
      recentSubjects: [],
      quickCreateSettings: {
        autoApplyRecent: true,
        showPreview: true,
        confirmBeforeCreate: false
      }
    }
  }

  private savePreferences(): void {
    if (typeof window === 'undefined') return

    // Debounce saves to avoid excessive localStorage writes
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }

    this.saveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences))
      } catch (error) {
        console.error('Failed to save timetable preferences:', error)
      }
    }, 500)
  }

  // Recent subjects management
  addRecentSubject(subjectId: string): void {
    if (!subjectId) return

    const recent = this.preferences.recentSubjects.filter(id => id !== subjectId)
    recent.unshift(subjectId)
    
    this.preferences.recentSubjects = recent.slice(0, MAX_RECENT_SUBJECTS)
    this.savePreferences()
  }

  getRecentSubjects(): string[] {
    return [...this.preferences.recentSubjects]
  }

  clearRecentSubjects(): void {
    this.preferences.recentSubjects = []
    this.savePreferences()
  }

  // Default preferences
  setDefaultTimeSlot(timeSlot: string): void {
    this.preferences.defaultTimeSlot = timeSlot
    this.savePreferences()
  }

  getDefaultTimeSlot(): string | undefined {
    return this.preferences.defaultTimeSlot
  }

  setDefaultDay(day: string): void {
    this.preferences.defaultDay = day
    this.savePreferences()
  }

  getDefaultDay(): string | undefined {
    return this.preferences.defaultDay
  }

  // Filter preferences
  setLastUsedFilters(filters: TimetablePreferences['lastUsedFilters']): void {
    this.preferences.lastUsedFilters = filters
    this.savePreferences()
  }

  getLastUsedFilters(): TimetablePreferences['lastUsedFilters'] {
    return this.preferences.lastUsedFilters
  }

  // Quick create settings
  setQuickCreateSettings(settings: Partial<TimetablePreferences['quickCreateSettings']>): void {
    this.preferences.quickCreateSettings = {
      ...this.preferences.quickCreateSettings,
      ...settings
    }
    this.savePreferences()
  }

  getQuickCreateSettings(): TimetablePreferences['quickCreateSettings'] {
    return this.preferences.quickCreateSettings
  }

  // Auto-save session data
  saveQuickCreateSession(data: {
    subjectId: string
    timeSlot: string
    day: string
    timestamp: number
  }): void {
    const sessions = this.getQuickCreateSessions()
    sessions.unshift(data)
    
    const trimmedSessions = sessions.slice(0, MAX_RECENT_SESSIONS)
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('timetable-quick-create-sessions', JSON.stringify(trimmedSessions))
      } catch (error) {
        console.error('Failed to save quick create session:', error)
      }
    }
  }

  getQuickCreateSessions(): Array<{
    subjectId: string
    timeSlot: string
    day: string
    timestamp: number
  }> {
    if (typeof window === 'undefined') return []

    try {
      const stored = localStorage.getItem('timetable-quick-create-sessions')
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load quick create sessions:', error)
      return []
    }
  }

  // Auto-complete suggestions
  getSuggestedSubjects(query: string, availableSubjects: Array<{ id: string; name: string }>): Array<{ id: string; name: string }> {
    if (!query.trim()) {
      // Return recent subjects first when no query
      const recentIds = this.getRecentSubjects()
      const recentSubjects = recentIds
        .map(id => availableSubjects.find(s => s.id === id))
        .filter(Boolean) as Array<{ id: string; name: string }>
      
      const otherSubjects = availableSubjects.filter(s => !recentIds.includes(s.id))
      
      return [...recentSubjects, ...otherSubjects]
    }

    // Filter and rank subjects by query relevance
    const filtered = availableSubjects.filter(subject =>
      subject.name.toLowerCase().includes(query.toLowerCase())
    )

    // Sort by relevance: exact matches first, then starts with, then contains
    return filtered.sort((a, b) => {
      const aLower = a.name.toLowerCase()
      const bLower = b.name.toLowerCase()
      const queryLower = query.toLowerCase()

      if (aLower === queryLower) return -1
      if (bLower === queryLower) return 1
      if (aLower.startsWith(queryLower)) return -1
      if (bLower.startsWith(queryLower)) return 1
      
      return 0
    })
  }

  // Export/import preferences
  exportPreferences(): string {
    return JSON.stringify(this.preferences, null, 2)
  }

  importPreferences(data: string): boolean {
    try {
      const parsed = JSON.parse(data)
      this.preferences = {
        ...this.preferences,
        ...parsed
      }
      this.savePreferences()
      return true
    } catch (error) {
      console.error('Failed to import preferences:', error)
      return false
    }
  }

  // Clear all data
  clearAllData(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem('timetable-quick-create-sessions')
    }
    
    this.preferences = {
      recentSubjects: [],
      quickCreateSettings: {
        autoApplyRecent: true,
        showPreview: true,
        confirmBeforeCreate: false
      }
    }
  }
}

// Singleton instance
export const autoSaveManager = AutoSaveManager.getInstance()