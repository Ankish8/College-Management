"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { CommandPalette } from './command-palette'
import { SearchContext } from '@/utils/search-context'
import type { AppContext } from '@/types/command-palette'
import type { CommandActions } from '@/utils/command-actions'
import type { SearchContextData } from '@/utils/search-context'

interface CommandPaletteContextType {
  isOpen: boolean
  openPalette: () => void
  closePalette: () => void
  togglePalette: () => void
  updateContext: (context: Partial<AppContext>) => void
}

const CommandPaletteContext = createContext<CommandPaletteContextType | null>(null)

interface CommandPaletteProviderProps {
  children: React.ReactNode
  initialContext?: Partial<AppContext>
  actions?: CommandActions
  searchContextData?: SearchContextData
}

export function CommandPaletteProvider({ children, initialContext = {}, actions, searchContextData }: CommandPaletteProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [context, setContext] = useState<AppContext>({
    selectedDate: new Date().toISOString().split('T')[0],
    currentMode: 'detailed',
    selectedStudents: [],
    focusedCell: null,
    hasUnsavedChanges: false,
    currentView: 'attendance',
    ...initialContext
  })

  // Create search context from data
  const searchContext = searchContextData ? new SearchContext(searchContextData) : undefined

  const openPalette = useCallback(() => setIsOpen(true), [])
  const closePalette = useCallback(() => setIsOpen(false), [])
  const togglePalette = useCallback(() => setIsOpen(prev => !prev), [])

  const updateContext = useCallback((newContext: Partial<AppContext>) => {
    setContext(prev => ({ ...prev, ...newContext }))
  }, [])

  // Global keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        console.log('Command palette triggered!') // Debug log
        togglePalette()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [togglePalette])

  // Close palette on Escape when open
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closePalette()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, closePalette])

  const value: CommandPaletteContextType = {
    isOpen,
    openPalette,
    closePalette,
    togglePalette,
    updateContext
  }

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPalette 
        isOpen={isOpen} 
        onClose={closePalette} 
        context={context}
      />
    </CommandPaletteContext.Provider>
  )
}

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext)
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider')
  }
  return context
}