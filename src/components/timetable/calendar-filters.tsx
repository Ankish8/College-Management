"use client"

import { CalendarFiltersProps, DayOfWeek, EntryType } from '@/types/timetable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'

const DAY_OPTIONS: { value: DayOfWeek; label: string }[] = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' }
]

const ENTRY_TYPE_OPTIONS: { value: EntryType; label: string }[] = [
  { value: 'REGULAR', label: 'Regular' },
  { value: 'MAKEUP', label: 'Makeup' },
  { value: 'EXTRA', label: 'Extra' },
  { value: 'EXAM', label: 'Exam' }
]

export function CalendarFilters({
  filters,
  onFiltersChange,
  onReset,
  availableOptions
}: CalendarFiltersProps) {
  const handleFilterChange = (key: keyof typeof filters, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value === "all" ? undefined : value || undefined
    })
  }

  const removeFilter = (key: keyof typeof filters) => {
    const newFilters = { ...filters }
    delete newFilters[key]
    onFiltersChange(newFilters)
  }

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value !== undefined && value !== '').length
  }

  const getFilterDisplayValue = (key: keyof typeof filters, value: string) => {
    switch (key) {
      case 'batchId':
        return availableOptions.batches.find(b => b.id === value)?.name || value
      case 'specializationId':
        return availableOptions.specializations.find(s => s.id === value)?.name || value
      case 'facultyId':
        return availableOptions.faculty.find(f => f.id === value)?.name || value
      case 'subjectId':
        const subject = availableOptions.subjects.find(s => s.id === value)
        return subject ? `${subject.code} - ${subject.name}` : value
      case 'dayOfWeek':
        return DAY_OPTIONS.find(d => d.value === value)?.label || value
      case 'entryType':
        return ENTRY_TYPE_OPTIONS.find(e => e.value === value)?.label || value
      case 'dateFrom':
        return `From: ${format(new Date(value), 'MMM d, yyyy')}`
      case 'dateTo':
        return `To: ${format(new Date(value), 'MMM d, yyyy')}`
      default:
        return value
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Filters</h3>
          {getActiveFiltersCount() > 0 && (
            <Badge variant="secondary" className="text-xs">
              {getActiveFiltersCount()} active
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={getActiveFiltersCount() === 0}
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Clear All
        </Button>
      </div>

      {/* Active Filters */}
      {getActiveFiltersCount() > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(filters).map(([key, value]) => {
            if (!value) return null
            return (
              <Badge key={key} variant="secondary" className="text-xs">
                {getFilterDisplayValue(key as keyof typeof filters, value)}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => removeFilter(key as keyof typeof filters)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )
          })}
        </div>
      )}

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Batch Filter */}
        <div className="space-y-2">
          <Label htmlFor="batch-filter">Batch</Label>
          <Select
            value={filters.batchId || ''}
            onValueChange={(value) => handleFilterChange('batchId', value)}
          >
            <SelectTrigger id="batch-filter">
              <SelectValue placeholder="Select batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {availableOptions.batches.map((batch) => (
                <SelectItem key={batch.id} value={batch.id}>
                  {batch.name}
                  {batch.specialization && (
                    <span className="text-muted-foreground ml-1">
                      ({batch.specialization.name})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Specialization Filter */}
        <div className="space-y-2">
          <Label htmlFor="specialization-filter">Specialization</Label>
          <Select
            value={filters.specializationId || ''}
            onValueChange={(value) => handleFilterChange('specializationId', value)}
          >
            <SelectTrigger id="specialization-filter">
              <SelectValue placeholder="Select specialization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specializations</SelectItem>
              {availableOptions.specializations.map((spec) => (
                <SelectItem key={spec.id} value={spec.id}>
                  {spec.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Faculty Filter */}
        <div className="space-y-2">
          <Label htmlFor="faculty-filter">Faculty</Label>
          <Select
            value={filters.facultyId || ''}
            onValueChange={(value) => handleFilterChange('facultyId', value)}
          >
            <SelectTrigger id="faculty-filter">
              <SelectValue placeholder="Select faculty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Faculty</SelectItem>
              {availableOptions.faculty.map((faculty) => (
                <SelectItem key={faculty.id} value={faculty.id}>
                  {faculty.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subject Filter */}
        <div className="space-y-2">
          <Label htmlFor="subject-filter">Subject</Label>
          <Select
            value={filters.subjectId || ''}
            onValueChange={(value) => handleFilterChange('subjectId', value)}
          >
            <SelectTrigger id="subject-filter">
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {availableOptions.subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.code} - {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Day of Week Filter */}
        <div className="space-y-2">
          <Label htmlFor="day-filter">Day of Week</Label>
          <Select
            value={filters.dayOfWeek || ''}
            onValueChange={(value) => handleFilterChange('dayOfWeek', value)}
          >
            <SelectTrigger id="day-filter">
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Days</SelectItem>
              {DAY_OPTIONS.map((day) => (
                <SelectItem key={day.value} value={day.value}>
                  {day.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Entry Type Filter */}
        <div className="space-y-2">
          <Label htmlFor="entry-type-filter">Entry Type</Label>
          <Select
            value={filters.entryType || ''}
            onValueChange={(value) => handleFilterChange('entryType', value)}
          >
            <SelectTrigger id="entry-type-filter">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ENTRY_TYPE_OPTIONS.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date Range Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date-from">From Date</Label>
          <Input
            id="date-from"
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date-to">To Date</Label>
          <Input
            id="date-to"
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}