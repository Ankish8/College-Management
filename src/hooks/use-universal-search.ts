"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { SearchResponse, SearchResult, SearchFilters } from "@/types/search"

const RECENT_SEARCHES_KEY = "universal-search-recent"
const MAX_RECENT_SEARCHES = 5
const DEBOUNCE_DELAY = 300

interface UseUniversalSearchOptions {
  debounceMs?: number
  enableRecent?: boolean
  filters?: SearchFilters
}

interface UseUniversalSearchReturn {
  // Search state
  query: string
  setQuery: (query: string) => void
  results: SearchResult[]
  isLoading: boolean
  error: string | null
  
  // Search data
  totalCount: number
  categories: SearchResponse["categories"]
  searchTime: number
  
  // Recent searches
  recentSearches: string[]
  addRecentSearch: (query: string) => void
  clearRecentSearches: () => void
  
  // Actions
  search: (searchQuery: string, filters?: SearchFilters) => Promise<void>
  clearResults: () => void
}

export function useUniversalSearch(options: UseUniversalSearchOptions = {}): UseUniversalSearchReturn {
  const { data: session } = useSession()
  const {
    debounceMs = DEBOUNCE_DELAY,
    enableRecent = true,
    filters: defaultFilters
  } = options

  // State
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [categories, setCategories] = useState<SearchResponse["categories"]>({})
  const [searchTime, setSearchTime] = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  // Refs for debouncing
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const abortControllerRef = useRef<AbortController | undefined>(undefined)

  // Load recent searches from localStorage
  useEffect(() => {
    if (enableRecent && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) {
            setRecentSearches(parsed.slice(0, MAX_RECENT_SEARCHES))
          }
        }
      } catch (error) {
        console.error("Error loading recent searches:", error)
      }
    }
  }, [enableRecent])

  // Save recent searches to localStorage
  const saveRecentSearches = useCallback((searches: string[]) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches))
      } catch (error) {
        console.error("Error saving recent searches:", error)
      }
    }
  }, [])

  // Add to recent searches
  const addRecentSearch = useCallback((searchQuery: string) => {
    if (!enableRecent || !searchQuery.trim() || searchQuery.length < 2) return

    setRecentSearches(prev => {
      const filtered = prev.filter(q => q !== searchQuery.trim())
      const updated = [searchQuery.trim(), ...filtered].slice(0, MAX_RECENT_SEARCHES)
      saveRecentSearches(updated)
      return updated
    })
  }, [enableRecent, saveRecentSearches])

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([])
    if (typeof window !== "undefined") {
      localStorage.removeItem(RECENT_SEARCHES_KEY)
    }
  }, [])

  // Main search function
  const search = useCallback(async (searchQuery: string, searchFilters?: SearchFilters) => {
    if (!session?.user) return
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([])
      setTotalCount(0)
      setCategories({})
      setError(null)
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    try {
      const filters = { ...defaultFilters, ...searchFilters }
      const params = new URLSearchParams({
        q: searchQuery.trim(),
        limit: (filters.limit || 20).toString(),
        offset: (filters.offset || 0).toString(),
      })

      if (filters.types && filters.types.length > 0) {
        params.append("types", filters.types.join(","))
      }

      const response = await fetch(`/api/search?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
        credentials: "include"
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`)
      }

      const data: SearchResponse = await response.json()
      
      setResults(data.results)
      setTotalCount(data.totalCount)
      setCategories(data.categories)
      setSearchTime(data.searchTime)
      
      // Add to recent searches if results found
      if (data.results.length > 0) {
        addRecentSearch(searchQuery)
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        // Request was cancelled, ignore
        return
      }
      
      console.error("Search error:", error)
      setError(error.message || "Search failed")
      setResults([])
      setTotalCount(0)
      setCategories({})
    } finally {
      setIsLoading(false)
    }
  }, [session, defaultFilters, addRecentSearch])

  // Debounced search effect
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    if (query.trim().length >= 2) {
      debounceTimeoutRef.current = setTimeout(() => {
        search(query)
      }, debounceMs)
    } else {
      setResults([])
      setTotalCount(0)
      setCategories({})
      setError(null)
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [query, search, debounceMs])

  // Clear results
  const clearResults = useCallback(() => {
    setQuery("")
    setResults([])
    setTotalCount(0)
    setCategories({})
    setError(null)
    setSearchTime(0)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    // Search state
    query,
    setQuery,
    results,
    isLoading,
    error,
    
    // Search data
    totalCount,
    categories,
    searchTime,
    
    // Recent searches
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    
    // Actions
    search,
    clearResults,
  }
}