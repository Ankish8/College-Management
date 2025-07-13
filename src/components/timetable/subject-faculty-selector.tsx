"use client"

import React, { useState, useMemo, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BookOpen, User, Users, Search, RefreshCw, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

interface SubjectOption {
  id: string
  name: string
  code: string
  credits: number
  totalHours: number
  batchId: string
  primaryFacultyId?: string
  primaryFaculty?: {
    id: string
    name: string
    email: string
  }
  facultySubjects?: {
    facultyId: string
    faculty: {
      id: string
      name: string
      email: string
    }
  }[]
}

interface FacultyOption {
  id: string
  name: string
  email: string
  department?: string
  specialization?: string
  workload?: {
    currentHours: number
    maxHours: number
  }
}

interface SubjectFacultySelectorProps {
  selectedSubjectId?: string
  selectedFacultyId?: string
  batchId?: string
  onSubjectChange: (subjectId: string, subject: SubjectOption | null) => void
  onFacultyChange: (facultyId: string, faculty: FacultyOption | null) => void
  allowFacultyOverride?: boolean
  showWorkload?: boolean
  className?: string
}

// API functions
const fetchSubjects = async (batchId?: string): Promise<SubjectOption[]> => {
  if (!batchId) return []
  const response = await fetch(`/api/subjects?batchId=${batchId}&include=primaryFaculty,facultySubjects`)
  if (!response.ok) throw new Error('Failed to fetch subjects')
  const data = await response.json()
  return data.subjects || data
}

const fetchFaculty = async (): Promise<FacultyOption[]> => {
  const response = await fetch('/api/faculty?include=workload,department')
  if (!response.ok) throw new Error('Failed to fetch faculty')
  const data = await response.json()
  return data.faculty || data
}

const fetchFacultyWorkload = async (facultyId: string): Promise<{ currentHours: number; maxHours: number }> => {
  const response = await fetch(`/api/faculty/${facultyId}/workload`)
  if (!response.ok) throw new Error('Failed to fetch faculty workload')
  return response.json()
}

export function SubjectFacultySelector({
  selectedSubjectId,
  selectedFacultyId,
  batchId,
  onSubjectChange,
  onFacultyChange,
  allowFacultyOverride = true,
  showWorkload = true,
  className = "",
}: SubjectFacultySelectorProps) {
  const [subjectSearchTerm, setSubjectSearchTerm] = useState("")
  const [facultySearchTerm, setFacultySearchTerm] = useState("")
  const [showAllFaculty, setShowAllFaculty] = useState(false)
  const [facultyOverrideMode, setFacultyOverrideMode] = useState(false)

  // Fetch data
  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects', batchId],
    queryFn: () => fetchSubjects(batchId),
    enabled: !!batchId,
  })

  const { data: allFaculty = [], isLoading: loadingFaculty } = useQuery({
    queryKey: ['faculty'],
    queryFn: fetchFaculty,
  })

  const { data: facultyWorkload } = useQuery({
    queryKey: ['faculty-workload', selectedFacultyId],
    queryFn: () => fetchFacultyWorkload(selectedFacultyId!),
    enabled: !!(selectedFacultyId && showWorkload),
  })

  // Filter subjects based on search
  const filteredSubjects = useMemo(() => {
    if (!subjectSearchTerm) return subjects
    
    const term = subjectSearchTerm.toLowerCase()
    return subjects.filter(subject => 
      subject.name.toLowerCase().includes(term) ||
      subject.code.toLowerCase().includes(term) ||
      subject.primaryFaculty?.name.toLowerCase().includes(term)
    )
  }, [subjects, subjectSearchTerm])

  // Get available faculty for selected subject
  const availableFaculty = useMemo(() => {
    const selectedSubject = subjects.find(s => s.id === selectedSubjectId)
    
    if (!selectedSubject) return []
    
    const faculty: FacultyOption[] = []
    
    // Add primary faculty first
    if (selectedSubject.primaryFaculty) {
      const primaryFaculty = allFaculty.find(f => f.id === selectedSubject.primaryFacultyId)
      if (primaryFaculty) {
        faculty.push({ ...primaryFaculty, isPrimary: true } as any)
      }
    }
    
    // Add associated faculty
    if (selectedSubject.facultySubjects) {
      selectedSubject.facultySubjects.forEach(fs => {
        const existingFaculty = faculty.find(f => f.id === fs.facultyId)
        if (!existingFaculty) {
          const facultyMember = allFaculty.find(f => f.id === fs.facultyId)
          if (facultyMember) {
            faculty.push({ ...facultyMember, isAssociated: true } as any)
          }
        }
      })
    }
    
    // Add all other faculty if override mode is enabled
    if (facultyOverrideMode || showAllFaculty) {
      allFaculty.forEach(f => {
        const existing = faculty.find(existing => existing.id === f.id)
        if (!existing) {
          faculty.push(f)
        }
      })
    }
    
    return faculty
  }, [selectedSubjectId, subjects, allFaculty, facultyOverrideMode, showAllFaculty])

  // Filter faculty based on search
  const filteredFaculty = useMemo(() => {
    if (!facultySearchTerm) return availableFaculty
    
    const term = facultySearchTerm.toLowerCase()
    return availableFaculty.filter(faculty =>
      faculty.name.toLowerCase().includes(term) ||
      faculty.email.toLowerCase().includes(term) ||
      faculty.department?.toLowerCase().includes(term)
    )
  }, [availableFaculty, facultySearchTerm])

  // Auto-fill primary faculty when subject is selected
  useEffect(() => {
    if (selectedSubjectId && !facultyOverrideMode) {
      const subject = subjects.find(s => s.id === selectedSubjectId)
      if (subject?.primaryFacultyId && subject.primaryFacultyId !== selectedFacultyId) {
        const primaryFaculty = allFaculty.find(f => f.id === subject.primaryFacultyId)
        if (primaryFaculty) {
          onFacultyChange(subject.primaryFacultyId, primaryFaculty)
        }
      }
    }
  }, [selectedSubjectId, subjects, allFaculty, facultyOverrideMode, onFacultyChange, selectedFacultyId])

  const handleSubjectChange = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId) || null
    onSubjectChange(subjectId, subject)
    setFacultyOverrideMode(false) // Reset override mode when subject changes
  }

  const handleFacultyChange = (facultyId: string) => {
    const faculty = allFaculty.find(f => f.id === facultyId) || null
    onFacultyChange(facultyId, faculty)
  }

  const handleFacultyOverride = () => {
    setFacultyOverrideMode(true)
    setShowAllFaculty(true)
  }

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId)
  const selectedFaculty = allFaculty.find(f => f.id === selectedFacultyId)
  const isPrimaryFaculty = selectedSubject?.primaryFacultyId === selectedFacultyId

  const getWorkloadStatus = (faculty: FacultyOption) => {
    if (!faculty.workload) return null
    
    const percentage = (faculty.workload.currentHours / faculty.workload.maxHours) * 100
    
    if (percentage >= 90) return { color: 'destructive', text: 'Overloaded' }
    if (percentage >= 75) return { color: 'orange', text: 'High Load' }
    if (percentage >= 50) return { color: 'yellow', text: 'Moderate' }
    return { color: 'green', text: 'Available' }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Subject Selection */}
      <div className="space-y-2">
        <Label htmlFor="subject">Subject *</Label>
        
        {/* Subject Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subjects by name, code, or faculty..."
            value={subjectSearchTerm}
            onChange={(e) => setSubjectSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Subject Select */}
        <Select value={selectedSubjectId} onValueChange={handleSubjectChange} disabled={!batchId}>
          <SelectTrigger>
            <SelectValue placeholder={batchId ? "Select subject" : "Select batch first"} />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {filteredSubjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                <div className="flex items-center gap-2 w-full">
                  <BookOpen className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {subject.code} - {subject.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {subject.credits} credits • {subject.totalHours} hours
                      {subject.primaryFaculty && (
                        <span className="ml-2">• {subject.primaryFaculty.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filteredSubjects.length === 0 && subjects.length > 0 && (
          <p className="text-sm text-muted-foreground">No subjects found matching your search.</p>
        )}
      </div>

      {/* Faculty Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="faculty">Faculty *</Label>
          {allowFacultyOverride && selectedSubject && !facultyOverrideMode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFacultyOverride}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Override Faculty
            </Button>
          )}
        </div>

        {facultyOverrideMode && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Faculty override enabled. You can now select any faculty member for this subject.
            </AlertDescription>
          </Alert>
        )}

        {/* Faculty Search */}
        {(facultyOverrideMode || showAllFaculty) && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search faculty by name, email, or department..."
              value={facultySearchTerm}
              onChange={(e) => setFacultySearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Faculty Select */}
        <Select value={selectedFacultyId} onValueChange={handleFacultyChange} disabled={!selectedSubjectId}>
          <SelectTrigger>
            <SelectValue placeholder={selectedSubjectId ? "Select faculty" : "Select subject first"} />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {filteredFaculty.map((faculty) => {
              const workloadStatus = showWorkload ? getWorkloadStatus(faculty) : null
              const isPrimary = (faculty as any).isPrimary
              const isAssociated = (faculty as any).isAssociated
              
              return (
                <SelectItem key={faculty.id} value={faculty.id}>
                  <div className="flex items-center gap-2 w-full">
                    <User className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{faculty.name}</span>
                        {isPrimary && <Badge variant="default" className="text-xs">Primary</Badge>}
                        {isAssociated && !isPrimary && <Badge variant="secondary" className="text-xs">Associated</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {faculty.email}
                        {faculty.department && <span className="ml-2">• {faculty.department}</span>}
                      </div>
                      {workloadStatus && (
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant={workloadStatus.color as any} className="text-xs">
                            {workloadStatus.text}
                          </Badge>
                          {faculty.workload && (
                            <span className="text-xs text-muted-foreground">
                              {faculty.workload.currentHours}/{faculty.workload.maxHours} hrs
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>

        {/* Show All Faculty Button */}
        {selectedSubject && !showAllFaculty && !facultyOverrideMode && availableFaculty.length < allFaculty.length && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAllFaculty(true)}
            className="w-full"
          >
            <Users className="h-4 w-4 mr-2" />
            Show All Faculty ({allFaculty.length} total)
          </Button>
        )}
      </div>

      {/* Selected Subject Info */}
      {selectedSubject && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Subject Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Subject:</span>
                <div className="text-muted-foreground">{selectedSubject.name}</div>
              </div>
              <div>
                <span className="font-medium">Code:</span>
                <div className="text-muted-foreground">{selectedSubject.code}</div>
              </div>
              <div>
                <span className="font-medium">Credits:</span>
                <div className="text-muted-foreground">{selectedSubject.credits}</div>
              </div>
              <div>
                <span className="font-medium">Total Hours:</span>
                <div className="text-muted-foreground">{selectedSubject.totalHours}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Faculty Info */}
      {selectedFaculty && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Faculty Details
              {isPrimaryFaculty && <Badge variant="default">Primary Faculty</Badge>}
              {facultyOverrideMode && <Badge variant="outline">Override</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Name:</span>
                <div className="text-muted-foreground">{selectedFaculty.name}</div>
              </div>
              <div>
                <span className="font-medium">Email:</span>
                <div className="text-muted-foreground">{selectedFaculty.email}</div>
              </div>
              {selectedFaculty.department && (
                <div className="col-span-2">
                  <span className="font-medium">Department:</span>
                  <div className="text-muted-foreground">{selectedFaculty.department}</div>
                </div>
              )}
              {showWorkload && facultyWorkload && (
                <div className="col-span-2">
                  <span className="font-medium">Current Workload:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ 
                          width: `${Math.min((facultyWorkload.currentHours / facultyWorkload.maxHours) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {facultyWorkload.currentHours}/{facultyWorkload.maxHours} hrs
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading States */}
      {(loadingSubjects || loadingFaculty) && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Loading...</p>
        </div>
      )}
    </div>
  )
}