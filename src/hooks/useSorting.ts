"use client"

import { useState, useMemo } from 'react'

export type SortDirection = 'asc' | 'desc' | null

export interface SortConfig {
  key: string
  direction: SortDirection
}

export interface UseSortingOptions<T> {
  data: T[]
  defaultSort?: SortConfig
}

export function useSorting<T>({ data, defaultSort }: UseSortingOptions<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(
    defaultSort || { key: '', direction: null }
  )

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return data
    }

    return [...data].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key)
      const bValue = getNestedValue(b, sortConfig.key)

      if (aValue == null && bValue == null) return 0
      if (aValue == null) return 1
      if (bValue == null) return -1

      let comparison = 0

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase())
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime()
      } else {
        // Fallback to string comparison
        comparison = String(aValue).toLowerCase().localeCompare(String(bValue).toLowerCase())
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
  }, [data, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig((prevConfig) => {
      if (prevConfig.key === key) {
        // Cycle through: asc -> desc -> null -> asc
        if (prevConfig.direction === 'asc') {
          return { key, direction: 'desc' }
        } else if (prevConfig.direction === 'desc') {
          return { key: '', direction: null }
        } else {
          return { key, direction: 'asc' }
        }
      } else {
        // New key, start with asc
        return { key, direction: 'asc' }
      }
    })
  }

  const getSortDirection = (key: string): SortDirection => {
    return sortConfig.key === key ? sortConfig.direction : null
  }

  const clearSort = () => {
    setSortConfig({ key: '', direction: null })
  }

  return {
    sortedData,
    sortConfig,
    handleSort,
    getSortDirection,
    clearSort,
  }
}

// Helper function to get nested object values using dot notation
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current?.[key]
  }, obj)
}