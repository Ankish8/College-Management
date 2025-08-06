"use client"

import { UserPreferences, DEFAULT_PREFERENCES, DEFAULT_TIMETABLE_PREFERENCES } from "@/types/preferences"

const STORAGE_KEY = 'jlu-user-preferences'

// Client-side preferences storage using localStorage
export class PreferencesStorage {
  static get(userId: string): UserPreferences {
    if (typeof window === 'undefined') {
      // Server-side fallback
      return {
        viewModes: DEFAULT_PREFERENCES,
        timetable: DEFAULT_TIMETABLE_PREFERENCES,
        updatedAt: new Date(),
      }
    }

    try {
      const storageKey = `${STORAGE_KEY}-${userId}`
      const stored = localStorage.getItem(storageKey)
      console.log('📖 Reading from localStorage:', {
        key: storageKey,
        found: !!stored,
        content: stored ? JSON.parse(stored) : null
      })
      
      if (stored) {
        const parsed = JSON.parse(stored)
        const result = {
          viewModes: { ...DEFAULT_PREFERENCES, ...parsed.viewModes },
          timetable: { ...DEFAULT_TIMETABLE_PREFERENCES, ...parsed.timetable },
          updatedAt: new Date(parsed.updatedAt || new Date()),
        }
        console.log('📋 Loaded preferences:', result)
        return result
      }
    } catch (error) {
      console.error('Error reading preferences from localStorage:', error)
    }

    // Return defaults if no stored preferences or error
    return {
      viewModes: DEFAULT_PREFERENCES,
      timetable: DEFAULT_TIMETABLE_PREFERENCES,
      updatedAt: new Date(),
    }
  }

  static set(userId: string, preferences: UserPreferences): void {
    if (typeof window === 'undefined') {
      return // No-op on server-side
    }

    try {
      const toStore = {
        viewModes: preferences.viewModes,
        timetable: preferences.timetable,
        updatedAt: preferences.updatedAt.toISOString(),
      }
      console.log('💾 Saving to localStorage:', {
        key: `${STORAGE_KEY}-${userId}`,
        timetablePrefs: toStore.timetable
      })
      localStorage.setItem(`${STORAGE_KEY}-${userId}`, JSON.stringify(toStore))
    } catch (error) {
      console.error('Error saving preferences to localStorage:', error)
    }
  }

  static clear(userId: string): void {
    if (typeof window === 'undefined') {
      return // No-op on server-side
    }

    try {
      localStorage.removeItem(`${STORAGE_KEY}-${userId}`)
    } catch (error) {
      console.error('Error clearing preferences from localStorage:', error)
    }
  }
}