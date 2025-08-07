"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Plus, Filter, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CompactFilterChip } from "@/components/students/compact-filter-chip"
import { 
  FilterCriteria, 
  StudentFilterState, 
  createEmptyFilterCriteria,
  FILTER_FIELD_CONFIG,
  FilterFieldType,
  FilterValueType,
  LogicalOperator
} from "@/types/student-filters"

interface AttendanceSearchFilterProps {
  students: any[]
  onFilteredStudentsChange: (filteredStudents: any[]) => void
  onSearchChange: (searchTerm: string) => void
  searchTerm?: string
}

export function AttendanceSearchFilter({
  students,
  onFilteredStudentsChange,
  onSearchChange,
  searchTerm = ""
}: AttendanceSearchFilterProps) {
  const [filterState, setFilterState] = useState<StudentFilterState>({
    criteria: [],
    searchQuery: searchTerm,
    selectedBatch: "all",
    appliedFilters: [],
    logicalOperator: "AND"
  })

  // Local state for unsaved filter criteria
  const [localCriteria, setLocalCriteria] = useState<FilterCriteria[]>([])

  // Helper to get field value from student object
  const getFieldValue = useCallback((student: any, field: string) => {
    switch (field) {
      case 'name':
        return student.name || ''
      case 'email':
        return student.email || ''
      case 'studentId':
        return student.studentId || ''
      case 'rollNumber':
        return student.rollNumber || ''
      case 'semester':
        return student.batch?.semester
      default:
        return ''
    }
  }, [])

  // Helper to evaluate a single filter
  const evaluateFilter = useCallback((value: any, filter: FilterCriteria) => {
    const { operator, value: filterValue } = filter

    switch (operator) {
      case 'contains':
        return value?.toString().toLowerCase().includes(filterValue?.toString().toLowerCase())
      case 'is':
        return value === filterValue
      case 'isNot':
        return value !== filterValue
      case 'startsWith':
        return value?.toString().toLowerCase().startsWith(filterValue?.toString().toLowerCase())
      case 'endsWith':
        return value?.toString().toLowerCase().endsWith(filterValue?.toString().toLowerCase())
      case 'isEmpty':
        return !value || value.toString().trim() === ''
      case 'isNotEmpty':
        return value && value.toString().trim() !== ''
      default:
        return true
    }
  }, [])

  // Simplified field config for attendance context
  const attendanceFieldConfig = {
    name: {
      ...FILTER_FIELD_CONFIG.name,
      label: "Student Name"
    },
    email: {
      ...FILTER_FIELD_CONFIG.email,
      label: "Email"
    },
    studentId: {
      ...FILTER_FIELD_CONFIG.studentId,
      label: "Student ID"
    },
    rollNumber: {
      ...FILTER_FIELD_CONFIG.rollNumber,
      label: "Roll Number"
    },
    semester: {
      type: "select" as FilterValueType,
      label: "Semester",
      operators: ["is", "isNot"],
      options: Array.from(new Set(
        students.map(s => s.batch?.semester).filter(Boolean)
      )).map(sem => ({
        value: sem?.toString(),
        label: `Semester ${sem}`
      }))
    }
  }

  // Filter students based on search term and applied filters
  const filteredStudents = useMemo(() => {
    let result = students

    // Apply text search
    if (filterState.searchQuery.trim()) {
      const searchLower = filterState.searchQuery.toLowerCase()
      result = result.filter(student => 
        student.name?.toLowerCase().includes(searchLower) ||
        student.email?.toLowerCase().includes(searchLower) ||
        student.studentId?.toLowerCase().includes(searchLower) ||
        student.rollNumber?.toLowerCase().includes(searchLower)
      )
    }

    // Apply advanced filters
    if (filterState.appliedFilters.length > 0) {
      result = result.filter(student => {
        const filterResults = filterState.appliedFilters.map(filter => {
          const fieldValue = getFieldValue(student, filter.field)
          return evaluateFilter(fieldValue, filter)
        })

        return filterState.logicalOperator === 'AND' 
          ? filterResults.every(Boolean)
          : filterResults.some(Boolean)
      })
    }

    return result
  }, [students, filterState.searchQuery, filterState.appliedFilters, filterState.logicalOperator, getFieldValue, evaluateFilter])

  // Notify parent of filtered students using useEffect instead of useMemo
  useEffect(() => {
    onFilteredStudentsChange(filteredStudents)
  }, [filteredStudents, onFilteredStudentsChange])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setFilterState(prev => ({ ...prev, searchQuery: newQuery }))
    onSearchChange(newQuery)
  }, [onSearchChange])

  const toggleLogicalOperator = useCallback(() => {
    const newLogicalOperator: LogicalOperator = filterState.logicalOperator === 'AND' ? 'OR' : 'AND'
    setFilterState(prev => ({ ...prev, logicalOperator: newLogicalOperator }))
  }, [filterState.logicalOperator])

  const addFilter = useCallback(() => {
    const newCriteria = createEmptyFilterCriteria()
    const updatedCriteria = [...localCriteria, newCriteria]
    setLocalCriteria(updatedCriteria)
  }, [localCriteria])

  const removeFilter = useCallback((id: string) => {
    const updatedCriteria = localCriteria.filter(criteria => criteria.id !== id)
    setLocalCriteria(updatedCriteria)
    
    // Auto-apply when removing filters
    setFilterState(prev => ({
      ...prev,
      criteria: updatedCriteria,
      appliedFilters: updatedCriteria.filter(c => c.field && c.operator && c.value)
    }))
  }, [localCriteria])

  const updateFilter = useCallback((id: string, updates: Partial<FilterCriteria>) => {
    const updatedCriteria = localCriteria.map(criteria => 
      criteria.id === id ? { ...criteria, ...updates } : criteria
    )
    setLocalCriteria(updatedCriteria)
    
    // Auto-apply when updating filters
    const validCriteria = updatedCriteria.filter(criteria => {
      const requiresValue = !['isEmpty', 'isNotEmpty'].includes(criteria.operator)
      if (!requiresValue) return true
      return criteria.value !== null && criteria.value !== undefined && criteria.value !== ''
    })

    setFilterState(prev => ({
      ...prev,
      criteria: validCriteria,
      appliedFilters: validCriteria
    }))
  }, [localCriteria])

  const clearAllFilters = useCallback(() => {
    setLocalCriteria([])
    setFilterState(prev => ({
      ...prev,
      criteria: [],
      appliedFilters: [],
      searchQuery: ""
    }))
    onSearchChange("")
  }, [onSearchChange])

  const activeFilterCount = filterState.appliedFilters.length

  return (
    <div className="space-y-3">
      {/* Search Bar and Filter Controls - Horizontal Layout */}
      <div className="flex items-center gap-4">
        {/* Search Bar - Shorter width */}
        <div className="w-80 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search students"
            value={filterState.searchQuery}
            onChange={handleSearchChange}
            className="pl-10 pr-10"
          />
          {filterState.searchQuery && (
            <button
              onClick={() => {
                setFilterState(prev => ({ ...prev, searchQuery: '' }))
                onSearchChange('')
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Controls - Same line */}
        <div className="flex items-center gap-2 flex-wrap flex-1">
        {localCriteria.map((criteria, index) => (
          <div key={criteria.id} className="flex items-center gap-2">
            <CompactFilterChip
              criteria={criteria}
              fieldConfig={attendanceFieldConfig as any}
              onUpdate={(updates) => updateFilter(criteria.id, updates)}
              onRemove={() => removeFilter(criteria.id)}
              students={students}
              batches={[]} // Not needed for attendance context
            />
            
            {/* Show AND/OR toggle between filters */}
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
          className="h-7 px-2 text-xs border-dashed"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Filter
        </Button>

        {/* Clear All Button */}
        {(activeFilterCount > 0 || filterState.searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear All
          </Button>
        )}
        </div>
      </div>

      {/* Results Summary */}
      {(activeFilterCount > 0 || filterState.searchQuery) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>
            Showing {filteredStudents.length} of {students.length} students
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
              </Badge>
            )}
          </span>
        </div>
      )}
    </div>
  )
}