"use client"

import React, { useState, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Users, GraduationCap, BookOpen } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

interface BatchOption {
  id: string
  name: string
  semester: number
  program: { 
    id: string
    name: string
    shortName: string 
  }
  specialization: { 
    id: string
    name: string
    shortName: string 
  }
  studentCount?: number
}

interface SpecializationOption {
  id: string
  name: string
  shortName: string
  programId: string
  program: {
    id: string
    name: string
    shortName: string
  }
  batchCount?: number
}

interface BatchSpecializationSelectorProps {
  selectedBatchId?: string
  selectedSpecializationId?: string
  onBatchChange: (batchId: string, batch: BatchOption | null) => void
  onSpecializationChange: (specializationId: string, specialization: SpecializationOption | null) => void
  filterBySpecialization?: boolean
  showStats?: boolean
  className?: string
}

// API functions
const fetchBatches = async (): Promise<BatchOption[]> => {
  const response = await fetch('/api/batches?include=program,specialization,students')
  if (!response.ok) throw new Error('Failed to fetch batches')
  const data = await response.json()
  return data.batches || data
}

const fetchSpecializations = async (): Promise<SpecializationOption[]> => {
  const response = await fetch('/api/specializations?include=program,batches')
  if (!response.ok) throw new Error('Failed to fetch specializations')
  const data = await response.json()
  return data.specializations || data
}

export function BatchSpecializationSelector({
  selectedBatchId,
  selectedSpecializationId,
  onBatchChange,
  onSpecializationChange,
  filterBySpecialization = true,
  showStats = true,
  className = "",
}: BatchSpecializationSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  // Fetch data
  const { data: batches = [], isLoading: loadingBatches } = useQuery({
    queryKey: ['batches'],
    queryFn: fetchBatches,
  })

  const { data: specializations = [], isLoading: loadingSpecializations } = useQuery({
    queryKey: ['specializations'],
    queryFn: fetchSpecializations,
  })

  // Filter batches based on specialization selection and search
  const filteredBatches = useMemo(() => {
    let filtered = batches

    // Filter by specialization if selected
    if (filterBySpecialization && selectedSpecializationId) {
      filtered = filtered.filter(batch => batch.specialization?.id === selectedSpecializationId)
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(batch => 
        batch.name.toLowerCase().includes(term) ||
        batch.program.name.toLowerCase().includes(term) ||
        batch.program.shortName.toLowerCase().includes(term) ||
        (batch.specialization?.name?.toLowerCase().includes(term)) ||
        (batch.specialization?.shortName?.toLowerCase().includes(term)) ||
        batch.semester.toString().includes(term)
      )
    }

    return filtered.sort((a, b) => {
      // Sort by program, then specialization, then semester
      const programCompare = a.program.shortName.localeCompare(b.program.shortName)
      if (programCompare !== 0) return programCompare
      
      const aSpecName = a.specialization?.shortName || ''
      const bSpecName = b.specialization?.shortName || ''
      const specializationCompare = aSpecName.localeCompare(bSpecName)
      if (specializationCompare !== 0) return specializationCompare
      
      return a.semester - b.semester
    })
  }, [batches, selectedSpecializationId, searchTerm, filterBySpecialization])

  // Group batches by program and specialization for better organization
  const groupedBatches = useMemo(() => {
    const groups: { [key: string]: BatchOption[] } = {}
    
    filteredBatches.forEach(batch => {
      const specName = batch.specialization?.shortName || 'No Specialization'
      const key = `${batch.program.shortName} - ${specName}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(batch)
    })
    
    return groups
  }, [filteredBatches])

  const handleBatchChange = (batchId: string) => {
    const batch = batches.find(b => b.id === batchId) || null
    onBatchChange(batchId, batch)
  }

  const handleSpecializationChange = (specializationId: string) => {
    // Handle "all" selection by treating it as no specialization filter
    if (specializationId === "all") {
      onSpecializationChange("", null)
      return
    }
    
    const specialization = specializations.find(s => s.id === specializationId) || null
    onSpecializationChange(specializationId, specialization)
    
    // Auto-select first batch in specialization if available
    if (filterBySpecialization && specialization) {
      const firstBatch = batches.find(b => b.specialization?.id === specializationId)
      if (firstBatch) {
        onBatchChange(firstBatch.id, firstBatch)
      }
    }
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId)
  const selectedSpecialization = specializations.find(s => s.id === selectedSpecializationId)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Specialization Selector */}
      <div className="space-y-2">
        <Label htmlFor="specialization">Specialization</Label>
        <Select value={selectedSpecializationId || "all"} onValueChange={handleSpecializationChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select specialization to filter batches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Specializations</SelectItem>
            {specializations.map((specialization) => (
              <SelectItem key={specialization.id} value={specialization.id}>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>{specialization.name} ({specialization.shortName})</span>
                  {showStats && specialization.batchCount && (
                    <Badge variant="secondary" className="ml-auto">
                      {specialization.batchCount} batches
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedSpecialization && (
          <div className="text-sm text-muted-foreground">
            Program: {selectedSpecialization.program.name} ({selectedSpecialization.program.shortName})
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="space-y-2">
        <Label htmlFor="batch-search">Search Batches</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="batch-search"
            placeholder="Search by batch name, program, or semester..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Batch Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="batch">Batch *</Label>
          {filteredBatches.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {filteredBatches.length} batch{filteredBatches.length !== 1 ? 'es' : ''} available
            </div>
          )}
        </div>

        {/* Standard Select for single selection */}
        <Select value={selectedBatchId} onValueChange={handleBatchChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select batch" />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {Object.entries(groupedBatches).map(([groupName, groupBatches]) => (
              <div key={groupName}>
                {/* Group Header */}
                <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground border-b">
                  {groupName}
                </div>
                
                {/* Group Items */}
                {groupBatches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    <div className="flex items-center gap-2 w-full">
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{batch.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Semester {batch.semester}
                          {showStats && batch.studentCount && (
                            <span className="ml-2">• {batch.studentCount} students</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selected Batch Info Card */}
      {selectedBatch && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Selected Batch Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Batch:</span>
                <div className="text-muted-foreground">{selectedBatch.name}</div>
              </div>
              <div>
                <span className="font-medium">Semester:</span>
                <div className="text-muted-foreground">{selectedBatch.semester}</div>
              </div>
              <div>
                <span className="font-medium">Program:</span>
                <div className="text-muted-foreground">
                  {selectedBatch.program.name} ({selectedBatch.program.shortName})
                </div>
              </div>
              <div>
                <span className="font-medium">Specialization:</span>
                <div className="text-muted-foreground">
                  {selectedBatch.specialization?.name || 'No Specialization'} ({selectedBatch.specialization?.shortName || 'N/A'})
                </div>
              </div>
              {showStats && selectedBatch.studentCount && (
                <div className="col-span-2">
                  <span className="font-medium">Students:</span>
                  <Badge variant="secondary" className="ml-2">
                    {selectedBatch.studentCount} enrolled
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results Message */}
      {filteredBatches.length === 0 && !loadingBatches && (
        <Card>
          <CardContent className="text-center py-6">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <div className="text-muted-foreground">
              {searchTerm || selectedSpecializationId ? 
                'No batches found matching your criteria.' : 
                'No batches available.'}
            </div>
            {(searchTerm || selectedSpecializationId) && (
              <div className="mt-2">
                <button
                  onClick={() => {
                    setSearchTerm("")
                    if (selectedSpecializationId) {
                      onSpecializationChange("", null)
                    }
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {(loadingBatches || loadingSpecializations) && (
        <Card>
          <CardContent className="text-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <div className="text-muted-foreground">Loading batches and specializations...</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}