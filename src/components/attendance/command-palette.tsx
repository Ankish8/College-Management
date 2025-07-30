"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Zap, Clock, ArrowRight, Navigation, Users, BarChart3, Settings, UserCheck, Calendar, Download, Eye, User, Mail, Hash, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle, Heart, AlertCircle, Brain, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Command, SearchResult, CommandPaletteState, AppContext } from '@/types/command-palette'
import type { CommandActions } from '@/utils/command-actions'
import type { AttendanceStatus } from '@/types/attendance'
import { AdvancedSearchEngine } from '@/utils/advanced-search-engine'
import { SearchContext } from '@/utils/search-context'
import { QueryAutocomplete } from '@/utils/query-autocomplete'
import { CommandRegistry } from '@/utils/command-registry'
import { createSimpleCommands } from '@/utils/simple-command-registry'
import type { AutocompleteSuggestion } from '@/utils/query-autocomplete'
import { NaturalLanguageSearch } from '@/utils/natural-language-search'
import type { NaturalSearchResult } from '@/utils/natural-language-search'
import { IntelligentSearchEngine } from '@/utils/intelligent-search-engine'
import type { IntelligentSearchResult } from '@/utils/intelligent-search-engine'
import { AIPoweredSearchEngine } from '@/utils/ai-powered-search-engine'
import type { AISearchResult } from '@/utils/ai-powered-search-engine'
import { StudentInfoCard } from './student-info-card'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  context: AppContext
  actions?: CommandActions
  searchContext?: SearchContext
}

export function CommandPalette({ isOpen, onClose, context, searchContext }: CommandPaletteProps) {
  const [state, setState] = useState<CommandPaletteState>({
    isOpen,
    query: '',
    results: [],
    selectedIndex: 0,
    recentCommands: [],
    context
  })
  
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [inlineCompletion, setInlineCompletion] = useState('')
  const [naturalResults, setNaturalResults] = useState<NaturalSearchResult[]>([])
  const [intelligentResults, setIntelligentResults] = useState<IntelligentSearchResult[]>([])
  const [aiResults, setAiResults] = useState<AISearchResult[]>([])
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'processing' | 'ready' | 'fallback'>('idle')

  const inputRef = useRef<HTMLInputElement>(null)
  const commandRegistry = useRef(new CommandRegistry())
  const searchEngine = useRef(new AdvancedSearchEngine(commandRegistry.current.getAllCommands()))
  const autocomplete = useRef(new QueryAutocomplete())
  const naturalSearch = useRef<NaturalLanguageSearch | null>(null)
  const intelligentSearch = useRef<IntelligentSearchEngine | null>(null)
  const aiSearch = useRef<AIPoweredSearchEngine | null>(null)

  // Initialize with working commands and search context
  useEffect(() => {
    const workingCommands = createSimpleCommands()
    searchEngine.current.updateCommands(workingCommands)
    
    if (searchContext) {
      searchEngine.current.setSearchContext(searchContext)
      autocomplete.current.setSearchContext(searchContext)
      naturalSearch.current = new NaturalLanguageSearch(searchContext)
      intelligentSearch.current = new IntelligentSearchEngine(searchContext)
      aiSearch.current = new AIPoweredSearchEngine(searchContext)
    }
  }, [searchContext])

  // Update search results when query changes
  useEffect(() => {
    if (!state.query.trim()) {
      setState(prev => ({ ...prev, results: [] }))
      setNaturalResults([])
      setIntelligentResults([])
      setAiResults([])
      setAiStatus('idle')
      return
    }

    // Use AI-powered search first (async)
    const performAISearch = async () => {
      if (aiSearch.current) {
        try {
          setAiStatus('processing')
          console.log('🤖 Starting AI search for:', state.query)
          const ai = await aiSearch.current.search(state.query)
          setAiResults(ai)
          
          // Convert AI results to command results
          const commandResults: SearchResult[] = ai
            .filter(r => r.command)
            .map(r => ({
              command: r.command!,
              score: r.relevance * r.confidence,
              matchedText: r.command!.label,
              highlights: []
            }))
          
          // If AI search found good results, use them (lowered threshold)
          console.log('🔍 AI search results:', ai.length, 'results found')
          if (ai.length > 0) {
            console.log('🔍 Top AI result confidence:', ai[0].confidence)
            console.log('🔍 AI results details:', ai)
          } else {
            console.log('❌ No AI results generated')
          }
          
          if (ai.length > 0 && ai[0].confidence > 0.3) {
            setAiStatus('ready')
            console.log('✅ AI search successful with', ai.length, 'results, confidence:', ai[0].confidence)
            setState(prev => ({
              ...prev,
              results: commandResults,
              selectedIndex: 0
            }))
            return
          } else {
            setAiStatus('fallback')
            console.log('⚠️ AI search confidence too low or no results. AI length:', ai.length, 'confidence:', ai[0]?.confidence)
          }
        } catch (error) {
          setAiStatus('fallback')
          console.warn('AI search failed, falling back:', error)
        }
      }

      // Fallback to intelligent NLP search
      if (intelligentSearch.current) {
        const intelligent = intelligentSearch.current.search(state.query)
        setIntelligentResults(intelligent)
        
        // Convert intelligent results to command results
        const commandResults: SearchResult[] = intelligent
          .filter(r => r.command)
          .map(r => ({
            command: r.command!,
            score: r.relevance * r.confidence,
            matchedText: r.command!.label,
            highlights: []
          }))
        
        // If intelligent search found results, use them (much higher threshold to prefer AI)
        if (intelligent.length > 0 && intelligent[0].confidence > 0.8) {
          if (aiStatus === 'fallback') {
            console.log('🔧 Using intelligent NLP fallback')
          }
          setState(prev => ({
            ...prev,
            results: commandResults,
            selectedIndex: 0
          }))
          return
        }
      }

      // Fallback to natural language search
      if (naturalSearch.current) {
        const natural = naturalSearch.current.search(state.query)
        setNaturalResults(natural)
        
        // Convert natural results to command results
        const commandResults: SearchResult[] = natural
          .filter(r => r.command)
          .map(r => ({
            command: r.command!,
            score: r.relevance / 20,
            matchedText: r.command!.label,
            highlights: []
          }))
        
        if (natural.length > 0 && natural[0].relevance > 3) {
          if (aiStatus === 'fallback') {
            console.log('📝 Using natural language fallback')
          }
          setState(prev => ({
            ...prev,
            results: commandResults,
            selectedIndex: 0
          }))
          return
        }
      }
      
      // Final fallback to advanced search
      const results = searchEngine.current.search(state.query, 8)
      if (aiStatus === 'fallback') {
        console.log('🔍 Using basic search fallback')
      }
      setState(prev => ({
        ...prev,
        results,
        selectedIndex: 0
      }))
    }

    performAISearch()
  }, [state.query, aiStatus])

  // Update context when prop changes
  useEffect(() => {
    setState(prev => ({ ...prev, context }))
  }, [context])

  // Update commands based on context
  useEffect(() => {
    const contextualCommands = commandRegistry.current.getContextualCommands(context)
    searchEngine.current.updateCommands(contextualCommands)
  }, [context])

  // Focus input when palette opens and show initial suggestions
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      
      // If there's existing text, select it all (like Spotlight behavior)
      if (state.query.trim()) {
        // Select all text so user can immediately overwrite or continue
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(0, state.query.length)
          }
        }, 0)
      } else {
        // Show initial suggestions when opening empty
        const initialSuggestions = autocomplete.current.getAutocompleteSuggestions('', 0)
        setSuggestions(initialSuggestions.suggestions)
        setShowSuggestions(true)
      }
    }
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        onClose()
        break

      case 'ArrowDown':
        e.preventDefault()
        const maxIndex = Math.max(aiResults.length - 1, intelligentResults.length - 1, naturalResults.length - 1, state.results.length - 1)
        setState(prev => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, maxIndex)
        }))
        break

      case 'ArrowUp':
        e.preventDefault()
        setState(prev => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, 0)
        }))
        break

      case 'Enter':
        e.preventDefault()
        if (aiResults.length > 0 && aiResults[state.selectedIndex]?.command) {
          executeCommand(aiResults[state.selectedIndex].command!)
        } else if (intelligentResults.length > 0 && intelligentResults[state.selectedIndex]?.command) {
          executeCommand(intelligentResults[state.selectedIndex].command!)
        } else if (naturalResults.length > 0 && naturalResults[state.selectedIndex]?.command) {
          executeCommand(naturalResults[state.selectedIndex].command!)
        } else if (state.results[state.selectedIndex]) {
          executeCommand(state.results[state.selectedIndex].command)
        }
        break

      case 'Tab':
        e.preventDefault()
        // Accept inline completion first, then suggestions
        if (inlineCompletion) {
          const newQuery = state.query + inlineCompletion
          setState(prev => ({ ...prev, query: newQuery }))
          setInlineCompletion('')
          
          // Focus back to input and position cursor at end
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.setSelectionRange(newQuery.length, newQuery.length)
              inputRef.current.focus()
            }
          }, 0)
        } else if (showSuggestions && suggestions.length > 0) {
          handleSuggestionClick(suggestions[0])
        } else if (state.results[state.selectedIndex]) {
          setState(prev => ({
            ...prev,
            query: state.results[state.selectedIndex].command.label
          }))
        }
        break
    }
  }, [isOpen, onClose, state.results, state.selectedIndex])

  // Attach keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const executeCommand = useCallback(async (command: Command) => {
    try {
      await command.action()
      
      // Add to recent commands
      setState(prev => ({
        ...prev,
        recentCommands: [command.id, ...prev.recentCommands.filter(id => id !== command.id)].slice(0, 10)
      }))
      
      onClose()
    } catch (error) {
      console.error('Command execution failed:', error)
    }
  }, [onClose])

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    const cursorPos = e.target.selectionStart || 0
    
    setState(prev => ({ ...prev, query: newQuery }))
    setCursorPosition(cursorPos)
    
    // Get autocomplete suggestions
    if (newQuery.trim()) {
      const autocompleteResult = autocomplete.current.getAutocompleteSuggestions(newQuery, cursorPos)
      setSuggestions(autocompleteResult.suggestions)
      setShowSuggestions(autocompleteResult.suggestions.length > 0)
      
      // Set inline completion for the first suggestion
      if (autocompleteResult.suggestions.length > 0) {
        const firstSuggestion = autocompleteResult.suggestions[0]
        const currentToken = newQuery.split(/\s+/).pop() || ''
        
        // Only show inline completion if it starts with current token
        if (firstSuggestion.insertText.toLowerCase().startsWith(currentToken.toLowerCase()) && currentToken.length > 0) {
          const completion = firstSuggestion.insertText.slice(currentToken.length)
          setInlineCompletion(completion)
        } else {
          setInlineCompletion('')
        }
      } else {
        setInlineCompletion('')
      }
    } else {
      setSuggestions([])
      setShowSuggestions(false)
      setInlineCompletion('')
    }
  }, [])

  const handleResultClick = useCallback((result: AISearchResult | IntelligentSearchResult | NaturalSearchResult | SearchResult, index: number) => {
    setState(prev => ({ ...prev, selectedIndex: index }))
    
    // Handle AI search result
    if ('aiProcessed' in result && result.command) {
      executeCommand(result.command)
    }
    // Handle intelligent search result
    else if ('intent' in result && result.command) {
      executeCommand(result.command)
    }
    // Handle natural search result
    else if ('type' in result && result.command) {
      executeCommand(result.command)
    }
    // Handle regular search result
    else if ('command' in result && result.command) {
      executeCommand(result.command)
    }
  }, [executeCommand])

  const handleQuickAction = useCallback((studentId: string, action: AttendanceStatus) => {
    console.log(`🎯 Quick action: Mark ${studentId} as ${action}`)
    
    // Dispatch custom event for attendance update
    window.dispatchEvent(new CustomEvent('markStudentAttendance', { 
      detail: { studentId, status: action, date: new Date().toISOString().split('T')[0] }
    }))
    
    // Close palette after action
    setTimeout(() => {
      onClose()
    }, 500)
  }, [onClose])

  const handleSuggestionClick = useCallback((suggestion: AutocompleteSuggestion) => {
    if (inputRef.current) {
      const currentQuery = state.query
      const cursorPos = inputRef.current.selectionStart || 0
      
      // Insert suggestion at cursor position
      const beforeCursor = currentQuery.slice(0, cursorPosition)
      const afterCursor = currentQuery.slice(cursorPosition)
      
      // Remove current token if replacing
      const currentToken = beforeCursor.match(/(\S+)$/)
      const startPos = currentToken ? cursorPos - currentToken[1].length : cursorPos
      
      const newQuery = currentQuery.slice(0, startPos) + suggestion.insertText + afterCursor
      
      setState(prev => ({ ...prev, query: newQuery }))
      setShowSuggestions(false)
      setInlineCompletion('')
      
      // Focus back to input
      setTimeout(() => {
        if (inputRef.current) {
          const newCursorPos = startPos + suggestion.insertText.length
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos)
          inputRef.current.focus()
        }
      }, 0)
    }
  }, [state.query, cursorPosition])

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'navigation': return <Navigation className="h-4 w-4" />
      case 'attendance': return <UserCheck className="h-4 w-4" />
      case 'analytics': return <BarChart3 className="h-4 w-4" />
      case 'system': return <Settings className="h-4 w-4" />
      case 'student': return <Users className="h-4 w-4" />
      case 'session': return <Clock className="h-4 w-4" />
      default: return <Zap className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'navigation': return 'bg-blue-100 text-blue-800'
      case 'attendance': return 'bg-green-100 text-green-800'
      case 'analytics': return 'bg-purple-100 text-purple-800'
      case 'system': return 'bg-gray-100 text-gray-800'
      case 'student': return 'bg-orange-100 text-orange-800'
      case 'session': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const highlightText = (text: string, highlights: number[]) => {
    if (highlights.length === 0) return text

    const result: React.ReactNode[] = []
    let lastIndex = 0

    const highlightRanges: Array<[number, number]> = []
    let start = -1

    // Convert individual highlight indices to ranges
    highlights.forEach((index, i) => {
      if (start === -1) {
        start = index
      }
      if (i === highlights.length - 1 || highlights[i + 1] !== index + 1) {
        highlightRanges.push([start, index + 1])
        start = -1
      }
    })

    highlightRanges.forEach(([startIdx, endIdx]) => {
      // Add text before highlight
      if (startIdx > lastIndex) {
        result.push(text.slice(lastIndex, startIdx))
      }
      
      // Add highlighted text
      result.push(
        <mark key={`${startIdx}-${endIdx}`} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
          {text.slice(startIdx, endIdx)}
        </mark>
      )
      
      lastIndex = endIdx
    })

    // Add remaining text
    if (lastIndex < text.length) {
      result.push(text.slice(lastIndex))
    }

    return result
  }

  if (!isOpen) {
    console.log('Command palette closed') // Debug log
    return null
  }

  console.log('Command palette rendering with results:', state.results.length) // Debug log

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="fixed top-[20%] left-1/2 transform -translate-x-1/2 w-full max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-100">
            <Search className="h-5 w-5 text-gray-400" />
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a command or search..."
                value={state.query}
                onChange={handleQueryChange}
                className="w-full text-lg placeholder:text-gray-400 border-none outline-none bg-transparent"
              />
              {/* Inline completion overlay */}
              {inlineCompletion && (
                <div className="absolute inset-0 pointer-events-none text-lg text-gray-400">
                  <span className="invisible">{state.query}</span>
                  <span>{inlineCompletion}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Smart Mode
              </Badge>
              {/* AI Status Indicator */}
              {state.query.trim() && (
                <div className="flex items-center gap-1">
                  {aiStatus === 'processing' && (
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      AI Processing
                    </Badge>
                  )}
                  {aiStatus === 'ready' && aiResults.length > 0 && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      <Brain className="h-3 w-3 mr-1" />
                      AI Ready
                    </Badge>
                  )}
                  {aiStatus === 'fallback' && (
                    <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                      <Search className="h-3 w-3 mr-1" />
                      Rule-based
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Compact Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="border-b border-gray-100 bg-gray-50">
              <div className="px-4 py-2">
                <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Press Tab to complete
                </div>
                <div className="flex flex-wrap gap-1">
                  {suggestions.slice(0, 5).map((suggestion, index) => {
                    const IconComponent = suggestion.icon
                    return (
                      <button
                        key={`${suggestion.type}-${index}`}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-1 bg-white border rounded text-xs transition-colors",
                          index === 0 
                            ? "border-blue-200 bg-blue-50 text-blue-700" 
                            : "border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        {IconComponent && <IconComponent className="h-3 w-3" />}
                        <span className="font-mono">{suggestion.label}</span>
                        {index === 0 && <span className="text-blue-500 text-xs">⏎</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="max-h-[500px] overflow-y-auto">
            {state.results.length === 0 && naturalResults.length === 0 && intelligentResults.length === 0 && aiResults.length === 0 && !showSuggestions ? (
              <div className="p-8 text-center text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Start typing to search</p>
                <p className="text-xs text-gray-400 mt-2">
                  Try searching for:
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">aarav</code>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">email patel</code>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">absent students</code>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">attendance &gt; 80</code>
                </div>
              </div>
            ) : (
              <div className="py-2">
                {/* AI-powered results with rich cards */}
                {aiResults.length > 0 ? (
                  <>
                    {aiResults.map((result, index) => {
                      if (result.type === 'student' && result.data) {
                        // Show full card only for first result, compact for others
                        if (index === 0) {
                          return (
                            <div key={`ai-${index}`} className="px-4 py-2">
                              <StudentInfoCard
                                student={result.data}
                                isSelected={index === state.selectedIndex}
                                onClick={() => handleResultClick(result, index)}
                                showFullInfo={true}
                                showQuickActions={true}
                                onQuickAction={handleQuickAction}
                              />
                            </div>
                          )
                        } else {
                          // Compact list item for other results
                          return (
                            <div
                              key={`ai-compact-${index}`}
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                                index === state.selectedIndex 
                                  ? "bg-purple-50 border-r-2 border-purple-500" 
                                  : "hover:bg-gray-50"
                              )}
                              onClick={() => handleResultClick(result, index)}
                            >
                              {/* AI Icon */}
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-blue-100">
                                {result.aiProcessed ? (
                                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                                ) : (
                                  <User className="h-4 w-4 text-purple-600" />
                                )}
                              </div>

                              {/* Student Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">
                                    {result.data.name}
                                  </span>
                                  <span className={cn(
                                    "text-sm font-semibold",
                                    result.data.attendancePercentage >= 80 ? "text-green-600" :
                                    result.data.attendancePercentage >= 75 ? "text-yellow-600" :
                                    "text-red-600"
                                  )}>
                                    {result.data.attendancePercentage}%
                                  </span>
                                  {result.aiProcessed && (
                                    <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded">
                                      AI
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 truncate">
                                  {result.data.studentId} • {result.data.email}
                                </p>
                              </div>

                              {/* Arrow for selected */}
                              {index === state.selectedIndex && (
                                <ArrowRight className="h-4 w-4 text-purple-500" />
                              )}
                            </div>
                          )
                        }
                      }
                      
                      // Regular command result for non-student results
                      else if (result.command) {
                        return (
                          <div
                            key={`ai-cmd-${index}`}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                              index === state.selectedIndex 
                                ? "bg-purple-50 border-r-2 border-purple-500" 
                                : "hover:bg-gray-50"
                            )}
                            onClick={() => handleResultClick(result, index)}
                          >
                            {/* Category Icon */}
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-blue-100">
                              {result.aiProcessed ? (
                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                              ) : (
                                getCategoryIcon(result.command!.category)
                              )}
                            </div>

                            {/* Command Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">
                                  {result.command!.label}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs", getCategoryColor(result.command!.category))}
                                >
                                  {result.command!.category}
                                </Badge>
                                {result.aiProcessed && (
                                  <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded">
                                    AI
                                  </span>
                                )}
                              </div>
                              {result.command!.description && !result.explanation && (
                                <p className="text-sm text-gray-600">
                                  {result.command!.description}
                                </p>
                              )}
                            </div>

                            {/* Confidence and language indicator */}
                            <div className="text-xs text-gray-400 flex flex-col items-end">
                              <span>{Math.round(result.confidence * 100)}%</span>
                              <span className="text-purple-500">{result.language.toUpperCase()}</span>
                            </div>

                            {/* Arrow for selected */}
                            {index === state.selectedIndex && (
                              <ArrowRight className="h-4 w-4 text-purple-500" />
                            )}
                          </div>
                        )
                      }
                      return null
                    })}
                  </>
                ) : intelligentResults.length > 0 ? (
                  <>
                    {intelligentResults.map((result, index) => {
                      if (result.type === 'student' && result.data) {
                        // Show full card only for first result, compact for others
                        if (index === 0) {
                          return (
                            <div key={`intelligent-${index}`} className="px-4 py-2">
                              <StudentInfoCard
                                student={result.data}
                                isSelected={index === state.selectedIndex}
                                onClick={() => handleResultClick(result, index)}
                                showFullInfo={true}
                                showQuickActions={true}
                                onQuickAction={handleQuickAction}
                              />
                            </div>
                          )
                        } else {
                          // Compact list item for other results
                          return (
                            <div
                              key={`intelligent-compact-${index}`}
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                                index === state.selectedIndex 
                                  ? "bg-blue-50 border-r-2 border-blue-500" 
                                  : "hover:bg-gray-50"
                              )}
                              onClick={() => handleResultClick(result, index)}
                            >
                              {/* Student Icon */}
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600">
                                <User className="h-4 w-4" />
                              </div>

                              {/* Student Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">
                                    {result.data.name}
                                  </span>
                                  <span className={cn(
                                    "text-sm font-semibold",
                                    result.data.attendancePercentage >= 80 ? "text-green-600" :
                                    result.data.attendancePercentage >= 75 ? "text-yellow-600" :
                                    "text-red-600"
                                  )}>
                                    {result.data.attendancePercentage}%
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 truncate">
                                  {result.data.studentId} • {result.data.email}
                                </p>
                              </div>

                              {/* Arrow for selected */}
                              {index === state.selectedIndex && (
                                <ArrowRight className="h-4 w-4 text-blue-500" />
                              )}
                            </div>
                          )
                        }
                      }
                      
                      // Regular command result for non-student results
                      else if (result.command) {
                        return (
                          <div
                            key={`intelligent-cmd-${index}`}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                              index === state.selectedIndex 
                                ? "bg-blue-50 border-r-2 border-blue-500" 
                                : "hover:bg-gray-50"
                            )}
                            onClick={() => handleResultClick(result, index)}
                          >
                            {/* Category Icon */}
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600">
                              {getCategoryIcon(result.command!.category)}
                            </div>

                            {/* Command Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">
                                  {result.command!.label}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs", getCategoryColor(result.command!.category))}
                                >
                                  {result.command!.category}
                                </Badge>
                              </div>
                              {result.command!.description && !result.explanation && (
                                <p className="text-sm text-gray-600">
                                  {result.command!.description}
                                </p>
                              )}
                            </div>

                            {/* Confidence indicator */}
                            <div className="text-xs text-gray-400">
                              {Math.round(result.confidence * 100)}%
                            </div>

                            {/* Arrow for selected */}
                            {index === state.selectedIndex && (
                              <ArrowRight className="h-4 w-4 text-blue-500" />
                            )}
                          </div>
                        )
                      }
                      return null
                    })}
                  </>
                ) : naturalResults.length > 0 ? (
                  <>
                    {naturalResults.map((result, index) => {
                      if (result.type === 'student' && result.data) {
                        // Show full card only for first result, compact for others
                        if (index === 0) {
                          return (
                            <div key={`natural-${index}`} className="px-4 py-2">
                              <StudentInfoCard
                                student={result.data}
                                isSelected={index === state.selectedIndex}
                                onClick={() => handleResultClick(result, index)}
                                showFullInfo={true}
                                showQuickActions={true}
                                onQuickAction={handleQuickAction}
                              />
                            </div>
                          )
                        } else {
                          // Compact list item for other results
                          return (
                            <div
                              key={`natural-compact-${index}`}
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                                index === state.selectedIndex 
                                  ? "bg-blue-50 border-r-2 border-blue-500" 
                                  : "hover:bg-gray-50"
                              )}
                              onClick={() => handleResultClick(result, index)}
                            >
                              {/* Student Icon */}
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600">
                                <User className="h-4 w-4" />
                              </div>

                              {/* Student Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">
                                    {result.data.name}
                                  </span>
                                  <span className={cn(
                                    "text-sm font-semibold",
                                    result.data.attendancePercentage >= 80 ? "text-green-600" :
                                    result.data.attendancePercentage >= 75 ? "text-yellow-600" :
                                    "text-red-600"
                                  )}>
                                    {result.data.attendancePercentage}%
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 truncate">
                                  {result.data.studentId} • {result.data.email}
                                </p>
                              </div>

                              {/* Arrow for selected */}
                              {index === state.selectedIndex && (
                                <ArrowRight className="h-4 w-4 text-blue-500" />
                              )}
                            </div>
                          )
                        }
                      }
                      
                      // Regular command result for non-student results
                      else if (result.command) {
                        return (
                          <div
                            key={`natural-cmd-${index}`}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                              index === state.selectedIndex 
                                ? "bg-blue-50 border-r-2 border-blue-500" 
                                : "hover:bg-gray-50"
                            )}
                            onClick={() => handleResultClick(result, index)}
                          >
                            {/* Category Icon */}
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600">
                              {getCategoryIcon(result.command!.category)}
                            </div>

                            {/* Command Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">
                                  {result.command!.label}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs", getCategoryColor(result.command!.category))}
                                >
                                  {result.command!.category}
                                </Badge>
                              </div>
                              {result.command!.description && (
                                <p className="text-sm text-gray-600">
                                  {result.command!.description}
                                </p>
                              )}
                            </div>

                            {/* Arrow for selected */}
                            {index === state.selectedIndex && (
                              <ArrowRight className="h-4 w-4 text-blue-500" />
                            )}
                          </div>
                        )
                      }
                      return null
                    })}
                  </>
                ) : (
                  // Regular search results
                  state.results.map((result, index) => (
                    <div
                      key={result.command.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                        index === state.selectedIndex 
                          ? "bg-blue-50 border-r-2 border-blue-500" 
                          : "hover:bg-gray-50"
                      )}
                      onClick={() => handleResultClick(result, index)}
                    >
                      {/* Category Icon */}
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600">
                        {getCategoryIcon(result.command.category)}
                      </div>

                      {/* Command Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {highlightText(result.command.label, result.highlights)}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getCategoryColor(result.command.category))}
                          >
                            {result.command.category}
                          </Badge>
                        </div>
                        {result.command.description && (
                          <p className="text-sm text-gray-600 truncate">
                            {result.command.description}
                          </p>
                        )}
                      </div>

                      {/* Shortcut */}
                      {result.command.shortcut && (
                        <Badge variant="outline" className="text-xs bg-gray-50">
                          {result.command.shortcut}
                        </Badge>
                      )}

                      {/* Arrow for selected */}
                      {index === state.selectedIndex && (
                        <ArrowRight className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-xs">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-xs">Enter</kbd>
                {aiResults.length > 0 || intelligentResults.length > 0 || naturalResults.length > 0 ? 'View' : 'Execute'}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-xs">Tab</kbd>
                {showSuggestions ? 'Autocomplete' : 'Complete'}
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-xs">Esc</kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}