"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Command, SearchResult, CommandPaletteState, AppContext } from '@/types/command-palette'
import { FuzzySearchEngine } from '@/utils/fuzzy-search'
import { createSimpleCommands } from '@/utils/simple-command-registry'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  context: AppContext
}

export function CommandPalette({ isOpen, onClose, context }: CommandPaletteProps) {
  const [state, setState] = useState<CommandPaletteState>({
    isOpen,
    query: '',
    results: [],
    selectedIndex: 0,
    recentCommands: [],
    context
  })

  const inputRef = useRef<HTMLInputElement>(null)
  const searchEngine = useRef(new FuzzySearchEngine([]))

  // Initialize with working commands
  useEffect(() => {
    const workingCommands = createSimpleCommands()
    searchEngine.current = new FuzzySearchEngine(workingCommands)
  }, [])

  // Update search results when query changes
  useEffect(() => {
    if (!state.query.trim()) {
      setState(prev => ({ ...prev, results: [] }))
      return
    }

    // Simple fuzzy search
    const searchResults = searchEngine.current.search(state.query, 8)
    const results: SearchResult[] = searchResults.map(result => ({
      command: result.command,
      score: result.score,
      matchedText: result.matchedText,
      highlights: result.highlights
    }))
    
    setState(prev => ({ ...prev, results }))
  }, [state.query])

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setState(prev => ({
        ...prev,
        selectedIndex: Math.min(prev.selectedIndex + 1, prev.results.length - 1)
      }))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setState(prev => ({
        ...prev,
        selectedIndex: Math.max(prev.selectedIndex - 1, 0)
      }))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (state.results[state.selectedIndex]) {
        handleResultClick(state.results[state.selectedIndex], state.selectedIndex)
      }
    }
  }, [state.selectedIndex, state.results, onClose])

  const handleResultClick = useCallback((result: SearchResult, index: number) => {
    setState(prev => ({ ...prev, selectedIndex: index }))
    
    try {
      result.command.action()
      onClose()
    } catch (error) {
      console.error('Error executing command:', error)
    }
  }, [onClose])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setState(prev => ({ ...prev, query: newQuery, selectedIndex: 0 }))
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[20vh]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a command or search..."
              value={state.query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="flex-1 outline-none text-lg bg-transparent placeholder-gray-500"
            />
            <Badge variant="outline" className="text-xs">
              ESC to close
            </Badge>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[500px] overflow-y-auto">
          {state.results.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Start typing to search</p>
            </div>
          ) : (
            <div className="py-2">
              {state.results.map((result, index) => {
                const isSelected = index === state.selectedIndex
                return (
                  <div
                    key={`result-${index}`}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                      isSelected 
                        ? "bg-purple-50 border-r-2 border-purple-500" 
                        : "hover:bg-gray-50"
                    )}
                    onClick={() => handleResultClick(result, index)}
                  >
                    {/* Icon */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600">
                      <Search className="h-4 w-4" />
                    </div>

                    {/* Command Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {result.command.label}
                        </span>
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                        >
                          {result.command.category}
                        </Badge>
                      </div>
                      {result.command.description && (
                        <p className="text-sm text-gray-600">
                          {result.command.description}
                        </p>
                      )}
                    </div>

                    {/* Score/Match Quality */}
                    <div className="flex items-center gap-2">
                      {result.score && result.score > 0.8 && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Exact
                        </Badge>
                      )}
                      {result.command.shortcut && (
                        <Badge variant="secondary" className="text-xs font-mono">
                          {result.command.shortcut}
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}