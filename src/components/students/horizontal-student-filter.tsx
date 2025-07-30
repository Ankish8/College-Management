"use client"

import { useState, useCallback } from "react"
import { Plus, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CompactFilterChip } from "./compact-filter-chip"
import { 
  FilterCriteria, 
  StudentFilterState, 
  createEmptyFilterCriteria,
  FILTER_FIELD_CONFIG,
  FilterFieldType,
  LogicalOperator
} from "@/types/student-filters"

interface Student {
  id: string
  studentId: string
  rollNumber: string
  guardianName?: string
  guardianPhone?: string
  address?: string
  dateOfBirth?: string
  attendancePercentage: number
  totalAttendanceRecords: number
  user: {
    id: string
    name: string
    email: string
    phone?: string
    status: string
    createdAt: string
  }
  batch: {
    id: string
    name: string
    semester: number
    startYear: number
    endYear: number
    isActive: boolean
    program: {
      name: string
      shortName: string
    }
    specialization?: {
      name: string
      shortName: string
    }
  }
}

interface Batch {
  id: string
  name: string
  program: {
    name: string
    shortName: string
  }
  specialization?: {
    name: string
    shortName: string
  }
}

interface HorizontalStudentFilterProps {
  students: Student[]
  batches: Batch[]
  filterState: StudentFilterState
  onFilterChange: (newState: StudentFilterState) => void
}

export function HorizontalStudentFilter({
  students,
  batches,
  filterState,
  onFilterChange
}: HorizontalStudentFilterProps) {
  // Local state for unsaved filter criteria
  const [localCriteria, setLocalCriteria] = useState<FilterCriteria[]>(
    filterState.criteria.length > 0 ? [...filterState.criteria] : []
  )

  // Update field configurations with dynamic data
  const updatedFieldConfig = {
    ...FILTER_FIELD_CONFIG,
    batch: {
      ...FILTER_FIELD_CONFIG.batch,
      options: batches.map(batch => ({
        value: batch.id,
        label: batch.name
      }))
    },
    program: {
      ...FILTER_FIELD_CONFIG.program,
      options: Array.from(new Set(batches.map(b => b.program.shortName)))
        .map(program => ({
          value: program,
          label: program
        }))
    },
    specialization: {
      ...FILTER_FIELD_CONFIG.specialization,
      options: Array.from(new Set(
        batches
          .filter(b => b.specialization)
          .map(b => b.specialization!.shortName)
      )).map(spec => ({
        value: spec,
        label: spec
      }))
    }
  }

  const toggleLogicalOperator = useCallback(() => {
    const newLogicalOperator: LogicalOperator = filterState.logicalOperator === 'AND' ? 'OR' : 'AND'
    onFilterChange({
      ...filterState,
      logicalOperator: newLogicalOperator
    })
  }, [filterState, onFilterChange])

  const addFilter = useCallback(() => {
    const newCriteria = createEmptyFilterCriteria()
    const updatedCriteria = [...localCriteria, newCriteria]
    setLocalCriteria(updatedCriteria)
    
    // Auto-apply when adding filters
    const validCriteria = updatedCriteria.filter(criteria => {
      const requiresValue = !['isEmpty', 'isNotEmpty'].includes(criteria.operator)
      if (!requiresValue) return true
      
      if (typeof criteria.value === 'string') {
        return criteria.value.trim() !== ''
      }
      if (Array.isArray(criteria.value)) {
        return criteria.value.length > 0
      }
      if (typeof criteria.value === 'object' && criteria.value !== null) {
        const rangeValue = criteria.value as { from: string | number; to: string | number }
        return rangeValue.from !== '' && rangeValue.to !== ''
      }
      return criteria.value !== null && criteria.value !== undefined && (typeof criteria.value !== 'string' || criteria.value !== '')
    })

    onFilterChange({
      ...filterState,
      criteria: validCriteria,
      appliedFilters: validCriteria
    })
  }, [localCriteria, filterState, onFilterChange])

  const removeFilter = useCallback((id: string) => {
    const updatedCriteria = localCriteria.filter(criteria => criteria.id !== id)
    setLocalCriteria(updatedCriteria)
    
    // Auto-apply when removing filters
    onFilterChange({
      ...filterState,
      criteria: updatedCriteria,
      appliedFilters: updatedCriteria
    })
  }, [localCriteria, filterState, onFilterChange])

  const updateFilter = useCallback((id: string, updates: Partial<FilterCriteria>) => {
    const updatedCriteria = localCriteria.map(criteria => 
      criteria.id === id ? { ...criteria, ...updates } : criteria
    )
    setLocalCriteria(updatedCriteria)
    
    // Auto-apply when updating filters
    const validCriteria = updatedCriteria.filter(criteria => {
      const requiresValue = !['isEmpty', 'isNotEmpty'].includes(criteria.operator)
      if (!requiresValue) return true
      
      if (typeof criteria.value === 'string') {
        return criteria.value.trim() !== ''
      }
      if (Array.isArray(criteria.value)) {
        return criteria.value.length > 0
      }
      if (typeof criteria.value === 'object' && criteria.value !== null) {
        const rangeValue = criteria.value as { from: string | number; to: string | number }
        return rangeValue.from !== '' && rangeValue.to !== ''
      }
      return criteria.value !== null && criteria.value !== undefined && (typeof criteria.value !== 'string' || criteria.value !== '')
    })

    onFilterChange({
      ...filterState,
      criteria: validCriteria,
      appliedFilters: validCriteria
    })
  }, [localCriteria, filterState, onFilterChange])

  const clearAllFilters = useCallback(() => {
    setLocalCriteria([])
    onFilterChange({
      ...filterState,
      criteria: [],
      appliedFilters: []
    })
  }, [filterState, onFilterChange])

  // Show active filter count
  const activeFilterCount = filterState.appliedFilters.length

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Filter Chips with AND/OR logic */}
      {localCriteria.map((criteria, index) => (
        <div key={criteria.id} className="flex items-center gap-2">
          <CompactFilterChip
            criteria={criteria}
            fieldConfig={updatedFieldConfig}
            onUpdate={(updates) => updateFilter(criteria.id, updates)}
            onRemove={() => removeFilter(criteria.id)}
            students={students}
            batches={batches}
          />
          
          {/* Show AND/OR toggle between filters (not after the last one) */}
          {index < localCriteria.length - 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLogicalOperator}
              className="h-7 px-2 text-xs font-medium border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/50"
            >
              {filterState.logicalOperator}
            </Button>
          )}
        </div>
      ))}

      {/* Add Filter Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={addFilter}
        className="h-9 px-3 text-sm border-dashed"
      >
        <Plus className="mr-1 h-3 w-3" />
        Filter
      </Button>

      {/* Clear All Button (show only when there are filters) */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="h-9 px-3 text-sm text-muted-foreground hover:text-foreground"
        >
          Clear
          {activeFilterCount > 1 && (
            <Badge variant="secondary" className="ml-1 h-4 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      )}
    </div>
  )
}