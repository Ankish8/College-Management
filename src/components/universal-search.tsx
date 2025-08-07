"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from "next/navigation"
import { 
  Search, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Calendar,
  History,
  ArrowRight,
  Clock,
  Badge as BadgeIcon,
  User,
  Loader2
} from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useUniversalSearch } from "@/hooks/use-universal-search"
import { SearchResult, SearchResultType } from "@/types/search"

interface UniversalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  placeholder?: string
}

const SEARCH_TYPE_CONFIG = {
  student: {
    icon: Users,
    label: "Students",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
  },
  faculty: {
    icon: User,
    label: "Faculty",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
  },
  subject: {
    icon: BookOpen,
    label: "Subjects",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
  },
  batch: {
    icon: GraduationCap,
    label: "Batches",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
  },
  timetable: {
    icon: Calendar,
    label: "Timetable",
    color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
  },
  program: {
    icon: BadgeIcon,
    label: "Programs",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
  },
  specialization: {
    icon: GraduationCap,
    label: "Specializations",
    color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200"
  }
} as const

export function UniversalSearch({ open, onOpenChange, placeholder = "Search students, subjects, batches..." }: UniversalSearchProps) {
  const router = useRouter()
  const {
    query,
    setQuery,
    results,
    isLoading,
    error,
    categories,
    totalCount,
    searchTime,
    recentSearches,
    clearRecentSearches,
  } = useUniversalSearch()

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [cmmdInputValue, setCmmdInputValue] = useState("")

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      const maxIndex = results.length + recentSearches.length - 1
      setSelectedIndex(prev => Math.min(prev + 1, maxIndex))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const totalItems = recentSearches.length + results.length
      if (selectedIndex < recentSearches.length) {
        // Selected a recent search
        setQuery(recentSearches[selectedIndex])
      } else if (selectedIndex < totalItems) {
        // Selected a search result
        const resultIndex = selectedIndex - recentSearches.length
        handleResultSelect(results[resultIndex])
      }
    }
  }, [results.length, recentSearches.length, selectedIndex, recentSearches, results, setQuery, router])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results, recentSearches])

  // Handle result selection
  const handleResultSelect = useCallback((result: SearchResult) => {
    onOpenChange(false)
    router.push(result.url)
  }, [onOpenChange, router])

  // Handle recent search selection
  const handleRecentSearchSelect = useCallback((searchQuery: string) => {
    setQuery(searchQuery)
  }, [setQuery])

  // Get icon for search result type
  const getResultIcon = (type: SearchResultType) => {
    const IconComponent = SEARCH_TYPE_CONFIG[type]?.icon || Search
    return IconComponent
  }

  // Get badge color for search result type
  const getResultBadgeColor = (type: SearchResultType) => {
    return SEARCH_TYPE_CONFIG[type]?.color || "bg-gray-100 text-gray-800"
  }

  // Group results by type for better organization
  const groupedResults = Object.entries(categories).map(([type, categoryData]) => ({
    type: type as SearchResultType,
    label: SEARCH_TYPE_CONFIG[type as SearchResultType]?.label || type,
    results: categoryData?.results || [],
    count: categoryData?.count || 0
  }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <DialogTitle className="sr-only">Universal Search</DialogTitle>
        <DialogDescription className="sr-only">
          Search for students, faculty, subjects, and batches across the system
        </DialogDescription>
        {/* Custom input outside of Command */}
        <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        
        <Command 
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
        >
          
          <CommandList className="max-h-[400px]">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Searching...</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex items-center justify-center py-6">
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        {/* Recent searches */}
        {!query && recentSearches.length > 0 && (
          <>
            <CommandGroup heading="Recent Searches">
              {recentSearches.map((recentQuery, index) => (
                <CommandItem
                  key={`recent-${index}`}
                  value={`recent-${recentQuery}`}
                  onSelect={() => handleRecentSearchSelect(recentQuery)}
                  className={selectedIndex === index ? "bg-accent" : ""}
                >
                  <History className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{recentQuery}</span>
                </CommandItem>
              ))}
              <div className="px-2 py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearRecentSearches}
                  className="h-6 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear recent searches
                </Button>
              </div>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Search results */}
        {query && !isLoading && results.length === 0 && !error && (
          <CommandEmpty>
            <div className="text-center py-6">
              <Search className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting your search terms
              </p>
            </div>
          </CommandEmpty>
        )}

        {/* Grouped results */}
        {query && groupedResults.map((group, groupIndex) => (
          group.results.length > 0 && (
            <React.Fragment key={group.type}>
              <CommandGroup 
                heading={
                  <div className="flex items-center justify-between">
                    <span>{group.label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {group.count}
                    </Badge>
                  </div>
                }
              >
                {group.results.map((result, resultIndex) => {
                  const Icon = getResultIcon(result.type)
                  
                  return (
                    <div
                      key={result.id}
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                      onClick={() => handleResultSelect(result)}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{result.title}</span>
                          <Badge variant="secondary" className="text-xs">
                            {SEARCH_TYPE_CONFIG[result.type]?.label || result.type}
                          </Badge>
                        </div>
                        {result.subtitle && (
                          <div className="text-sm text-muted-foreground">{result.subtitle}</div>
                        )}
                        {result.description && (
                          <div className="text-xs text-muted-foreground">{result.description}</div>
                        )}
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )
                })}
              </CommandGroup>
              {groupIndex < groupedResults.length - 1 && <CommandSeparator />}
            </React.Fragment>
          )
        ))}

        {/* Search stats */}
        {query && totalCount > 0 && (
          <div className="border-t p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {totalCount} result{totalCount !== 1 ? "s" : ""} found
              </span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{searchTime}ms</span>
              </div>
            </div>
          </div>
        )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}