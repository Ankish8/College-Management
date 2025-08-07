"use client"

import { useState, useEffect, useMemo, useCallback, memo } from "react"
import { useSession } from "next-auth/react"
import { canCreateSubject, isAdmin } from "@/lib/utils/permissions"
import { Plus, Search, Grid, List, Filter, Settings, RefreshCw, BookOpen, Trophy, Clock, Award, Calendar, X, ChevronDown } from "lucide-react"
import { useUserPreferences } from "@/hooks/useUserPreferences"
import type { ViewMode } from "@/types/preferences"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent } from "@/components/ui/card"
import { SubjectListSkeleton, DashboardStatsSkeleton } from "@/components/ui/skeletons"
import { SubjectCard } from "./subject-card"
import { SubjectTable } from "./subject-table"
import dynamic from "next/dynamic"

const AddSubjectModal = dynamic(() => import("./add-subject-modal").then(mod => ({ default: mod.AddSubjectModal })), {
  loading: () => <div className="flex items-center justify-center p-4">Loading...</div>,
  ssr: false
})

const EditSubjectModal = dynamic(() => import("./edit-subject-modal").then(mod => ({ default: mod.EditSubjectModal })), {
  loading: () => <div className="flex items-center justify-center p-4">Loading...</div>,
  ssr: false
})
import { useToast } from "@/hooks/use-toast"
import { useQuery } from "@tanstack/react-query"

interface Subject {
  id: string
  name: string
  code: string
  credits: number
  totalHours: number
  examType: string
  subjectType: string
  description?: string
  batch: {
    name: string
    semester: number
    program: {
      name: string
      shortName: string
    }
    specialization?: {
      name: string
      shortName: string
    }
    _count: {
      students: number
    }
  }
  primaryFaculty: {
    name: string
    email: string
  } | null
  coFaculty?: {
    name: string
    email: string
  }
  _count: {
    attendanceSessions: number
  }
}

type FilterType = "all" | "theory" | "practical" | "jury" | "core" | "elective"

interface SubjectFilters {
  examType: FilterType
  subjectType: string[]
  credits: number[]
  batches: string[]
  programs: string[]
  semesters: number[]
  faculty: string[]
  hasClasses: "all" | "active" | "inactive"
}

// API fetch function with better error handling
const fetchSubjectsData = async (): Promise<Subject[]> => {
  const response = await fetch("/api/subjects", {
    credentials: 'include'
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to fetch subjects`)
  }
  return response.json()
}

export const SubjectList = memo(function SubjectList() {
  const { data: session, status } = useSession()
  const { preferences, updateViewMode } = useUserPreferences()
  const canCreate = canCreateSubject(session?.user as any)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBatch, setSelectedBatch] = useState<string>("all")
  const [filters, setFilters] = useState<SubjectFilters>({
    examType: "all",
    subjectType: [],
    credits: [],
    batches: [],
    programs: [],
    semesters: [],
    faculty: [],
    hasClasses: "all"
  })
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [showFilterSheet, setShowFilterSheet] = useState(false)
  const { toast } = useToast()

  // Get current view mode from preferences, fallback to "cards"
  const viewMode: ViewMode = preferences?.viewModes?.subjects || "cards"

  // Handler to update view mode
  const handleViewModeChange = useCallback(async (newViewMode: ViewMode) => {
    try {
      await updateViewMode("subjects", newViewMode)
    } catch (error) {
      console.error("Failed to update view mode:", error)
    }
  }, [updateViewMode])

  // Use React Query for subjects with proper caching and deduplication
  const { data: subjects = [], isLoading: loading, refetch: refetchSubjects, error } = useQuery({
    queryKey: ['subjects'],
    queryFn: fetchSubjectsData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnReconnect: false, // Prevent refetch on reconnect
    retry: (failureCount, error) => {
      // Don't retry on 401 errors
      if (error instanceof Error && error.message.includes('401')) {
        return false
      }
      return failureCount < 1 // Reduce retry attempts
    },
    enabled: status === "authenticated",
    // Add network mode to prevent excessive requests
    networkMode: 'online'
  })

  // Handle query errors
  useEffect(() => {
    if (error) {
      console.error('Subject query error:', error)
      toast({
        title: "Error",
        description: "Failed to load subjects",
        variant: "destructive",
      })
    }
  }, [error, toast])

  // Remove focus listener to reduce unnecessary API calls
  // useEffect(() => {
  //   const handleFocus = () => {
  //     fetchSubjects()
  //   }
  //   window.addEventListener('focus', handleFocus)
  //   return () => window.removeEventListener('focus', handleFocus)
  // }, [])

  // Memoize filtered subjects to prevent unnecessary recalculations
  const filteredSubjects = useMemo(() => {
    let filtered = subjects

    // Apply batch dropdown filter first
    if (selectedBatch !== "all") {
      filtered = filtered.filter(subject => subject.batch.name === selectedBatch)
    }

    // Apply exam type filter
    if (filters.examType === "theory") {
      filtered = filtered.filter(subject => subject.examType === "THEORY")
    } else if (filters.examType === "practical") {
      filtered = filtered.filter(subject => subject.examType === "PRACTICAL")
    } else if (filters.examType === "jury") {
      filtered = filtered.filter(subject => ["JURY", "PROJECT"].includes(subject.examType))
    } else if (filters.examType === "core") {
      filtered = filtered.filter(subject => subject.subjectType === "CORE")
    } else if (filters.examType === "elective") {
      filtered = filtered.filter(subject => subject.subjectType === "ELECTIVE")
    }

    // Apply subject type filter
    if (filters.subjectType.length > 0) {
      filtered = filtered.filter(subject =>
        filters.subjectType.includes(subject.subjectType)
      )
    }

    // Apply credits filter
    if (filters.credits.length > 0) {
      filtered = filtered.filter(subject =>
        filters.credits.includes(subject.credits)
      )
    }

    // Apply batch filter
    if (filters.batches.length > 0) {
      filtered = filtered.filter(subject =>
        filters.batches.includes(subject.batch.name)
      )
    }

    // Apply program filter
    if (filters.programs.length > 0) {
      filtered = filtered.filter(subject =>
        filters.programs.includes(subject.batch.program.shortName)
      )
    }

    // Apply semester filter
    if (filters.semesters.length > 0) {
      filtered = filtered.filter(subject =>
        filters.semesters.includes(subject.batch.semester)
      )
    }

    // Apply faculty filter
    if (filters.faculty.length > 0) {
      filtered = filtered.filter(subject =>
        (subject.primaryFaculty && filters.faculty.includes(subject.primaryFaculty.name)) ||
        (subject.coFaculty && filters.faculty.includes(subject.coFaculty.name))
      )
    }

    // Apply classes filter
    if (filters.hasClasses === "active") {
      filtered = filtered.filter(subject => subject._count.attendanceSessions > 0)
    } else if (filters.hasClasses === "inactive") {
      filtered = filtered.filter(subject => subject._count.attendanceSessions === 0)
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(subject =>
        subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (subject.primaryFaculty?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.batch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.batch.program.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered
  }, [subjects, filters, searchQuery, selectedBatch])

  const handleSubjectCreated = useCallback((newSubject: Subject) => {
    refetchSubjects() // Refresh data from server
    setIsAddModalOpen(false)
    toast({
      title: "Success",
      description: "Subject created successfully",
    })
  }, [refetchSubjects, toast])

  const handleSubjectUpdated = useCallback((updatedSubject: Subject) => {
    refetchSubjects() // Refresh data from server
    toast({
      title: "Success",
      description: "Subject updated successfully",
    })
  }, [refetchSubjects, toast])

  const handleSubjectDeleted = useCallback((subjectId: string) => {
    refetchSubjects() // Refresh data from server
    toast({
      title: "Success",
      description: "Subject deleted successfully",
    })
  }, [refetchSubjects, toast])

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject)
  }

  // Calculate stats
  const totalCredits = subjects.reduce((sum, s) => sum + s.credits, 0)
  const totalHours = subjects.reduce((sum, s) => sum + s.totalHours, 0)
  const coreSubjects = subjects.filter(s => s.subjectType === "CORE").length
  const activeClasses = subjects.reduce((sum, s) => sum + s._count.attendanceSessions, 0)

  // Extract unique values for filters
  const uniqueSubjectTypes = Array.from(new Set(subjects.map(s => s.subjectType))).sort()
  const uniqueCredits = Array.from(new Set(subjects.map(s => s.credits))).sort((a, b) => a - b)
  const uniqueBatches = Array.from(new Set(subjects.map(s => s.batch.name))).sort()
  const uniquePrograms = Array.from(new Set(subjects.map(s => s.batch.program.shortName))).sort()
  const uniqueSemesters = Array.from(new Set(subjects.map(s => s.batch.semester))).sort((a, b) => a - b)
  const uniqueFaculty = Array.from(new Set(subjects.flatMap(s => [
    s.primaryFaculty?.name,
    s.coFaculty?.name
  ].filter(Boolean)))).sort()

  // Count active filters
  const activeFilterCount = 
    (filters.examType !== "all" ? 1 : 0) +
    filters.subjectType.length +
    filters.credits.length +
    filters.batches.length +
    filters.programs.length +
    filters.semesters.length +
    filters.faculty.length +
    (filters.hasClasses !== "all" ? 1 : 0)

  if (status === "loading" || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Subjects</h1>
            <p className="text-sm text-muted-foreground">
              Manage academic subjects and faculty assignments
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-10 w-24 bg-muted animate-pulse rounded"></div>
            <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>
          </div>
        </div>
        
        {/* Stats skeleton */}
        <DashboardStatsSkeleton />
        
        {/* Filters skeleton */}
        <div className="flex items-center space-x-4">
          <div className="h-10 w-64 bg-muted animate-pulse rounded"></div>
          <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>
          <div className="h-10 w-24 bg-muted animate-pulse rounded"></div>
        </div>
        
        {/* Subject list skeleton */}
        <SubjectListSkeleton count={6} />
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Subjects</h1>
          <p className="text-sm text-muted-foreground">
            Manage academic subjects and faculty assignments
          </p>
        </div>
        <div className="text-center py-12">Please sign in to access this page.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Subjects</h1>
          <p className="text-sm text-muted-foreground">
            Manage academic subjects and faculty assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => refetchSubjects()}
            title="Refresh"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {isAdmin(session?.user as any) && (
            <Button 
              variant="outline" 
              size="icon"
              asChild
              title="Subject Configuration"
            >
              <Link href="/settings/subjects">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          )}
          {canCreate && (
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Subject
            </Button>
          )}
        </div>
      </div>

      {/* Compact Stats */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          <span className="font-medium text-foreground">{subjects.length}</span>
          <span>Total Subjects</span>
        </div>
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          <span className="font-medium text-foreground">{totalCredits}</span>
          <span>Credits</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="font-medium text-foreground">{totalHours}</span>
          <span>Hours</span>
        </div>
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4" />
          <span className="font-medium text-foreground">{coreSubjects}</span>
          <span>Core Subjects</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span className="font-medium text-foreground">{activeClasses}</span>
          <span>Classes Conducted</span>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center space-x-4">
          {/* Batch Filter Dropdown */}
          <div className="flex-none" style={{ width: '178px' }}>
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="All Batches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {uniqueBatches.map(batch => (
                  <SelectItem key={batch} value={batch}>
                    <span className="truncate">{batch}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <div className="flex items-center gap-2">
            {/* Unified Filter Panel */}
            <Sheet open={showFilterSheet} onOpenChange={setShowFilterSheet}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[480px] flex flex-col">
                <SheetHeader className="px-6 py-4 border-b">
                  <SheetTitle className="text-lg">Filter Subjects</SheetTitle>
                  <SheetDescription className="text-sm">
                    Apply multiple filters to find specific subjects
                  </SheetDescription>
                </SheetHeader>
                <div className="px-6 space-y-6 py-6 flex-1 overflow-y-auto">
                  {/* Exam Type Filter */}
                  <div className="bg-muted/30 rounded-md border p-3 space-y-3">
                    <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Exam Type
                    </Label>
                    <RadioGroup
                      value={filters.examType}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, examType: value as FilterType }))}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="examtype-all" />
                        <Label htmlFor="examtype-all" className="font-normal cursor-pointer text-sm">
                          All
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="theory" id="examtype-theory" />
                        <Label htmlFor="examtype-theory" className="font-normal cursor-pointer text-sm">
                          Theory
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="practical" id="examtype-practical" />
                        <Label htmlFor="examtype-practical" className="font-normal cursor-pointer text-sm">
                          Practical
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="jury" id="examtype-jury" />
                        <Label htmlFor="examtype-jury" className="font-normal cursor-pointer text-sm">
                          Jury
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="core" id="examtype-core" />
                        <Label htmlFor="examtype-core" className="font-normal cursor-pointer text-sm">
                          Core Subjects
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="elective" id="examtype-elective" />
                        <Label htmlFor="examtype-elective" className="font-normal cursor-pointer text-sm">
                          Elective Subjects
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Subject Type Filter */}
                  <div className="bg-muted/30 rounded-md border p-3 space-y-3">
                    <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Subject Type
                    </Label>
                    <div className="space-y-2">
                      {uniqueSubjectTypes.map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`subjecttype-${type}`}
                            checked={filters.subjectType.includes(type)}
                            onCheckedChange={(checked) => {
                              setFilters(prev => ({
                                ...prev,
                                subjectType: checked 
                                  ? [...prev.subjectType, type]
                                  : prev.subjectType.filter(t => t !== type)
                              }))
                            }}
                          />
                          <Label 
                            htmlFor={`subjecttype-${type}`} 
                            className="font-normal cursor-pointer text-sm"
                          >
                            {type}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Credits Filter */}
                  <div className="bg-muted/30 rounded-md border p-3 space-y-3">
                    <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Credits
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {uniqueCredits.map(credit => (
                        <div key={credit} className="flex items-center space-x-2">
                          <Checkbox
                            id={`credit-${credit}`}
                            checked={filters.credits.includes(credit)}
                            onCheckedChange={(checked) => {
                              setFilters(prev => ({
                                ...prev,
                                credits: checked 
                                  ? [...prev.credits, credit]
                                  : prev.credits.filter(c => c !== credit)
                              }))
                            }}
                          />
                          <Label 
                            htmlFor={`credit-${credit}`} 
                            className="font-normal cursor-pointer text-sm"
                          >
                            {credit} Credit{credit !== 1 ? 's' : ''}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Program Filter */}
                  <div className="bg-muted/30 rounded-md border p-3 space-y-3">
                    <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Programs
                    </Label>
                    <div className="space-y-2">
                      {uniquePrograms.map(program => (
                        <div key={program} className="flex items-center space-x-2">
                          <Checkbox
                            id={`program-${program}`}
                            checked={filters.programs.includes(program)}
                            onCheckedChange={(checked) => {
                              setFilters(prev => ({
                                ...prev,
                                programs: checked 
                                  ? [...prev.programs, program]
                                  : prev.programs.filter(p => p !== program)
                              }))
                            }}
                          />
                          <Label 
                            htmlFor={`program-${program}`} 
                            className="font-normal cursor-pointer text-sm"
                          >
                            {program}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Semester Filter */}
                  <div className="bg-muted/30 rounded-md border p-3 space-y-3">
                    <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Semesters
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {uniqueSemesters.map(semester => (
                        <div key={semester} className="flex items-center space-x-2">
                          <Checkbox
                            id={`semester-${semester}`}
                            checked={filters.semesters.includes(semester)}
                            onCheckedChange={(checked) => {
                              setFilters(prev => ({
                                ...prev,
                                semesters: checked 
                                  ? [...prev.semesters, semester]
                                  : prev.semesters.filter(s => s !== semester)
                              }))
                            }}
                          />
                          <Label 
                            htmlFor={`semester-${semester}`} 
                            className="font-normal cursor-pointer text-sm"
                          >
                            Semester {semester}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Batch Filter */}
                  <div className="bg-muted/30 rounded-md border p-3 space-y-3">
                    <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Batches
                    </Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {uniqueBatches.map(batch => (
                        <div key={batch} className="flex items-center space-x-2">
                          <Checkbox
                            id={`batch-${batch}`}
                            checked={filters.batches.includes(batch)}
                            onCheckedChange={(checked) => {
                              setFilters(prev => ({
                                ...prev,
                                batches: checked 
                                  ? [...prev.batches, batch]
                                  : prev.batches.filter(b => b !== batch)
                              }))
                            }}
                          />
                          <Label 
                            htmlFor={`batch-${batch}`} 
                            className="font-normal cursor-pointer text-sm"
                          >
                            {batch}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Faculty Filter */}
                  <div className="bg-muted/30 rounded-md border p-3 space-y-3">
                    <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Faculty
                    </Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {uniqueFaculty.map(faculty => (
                        <div key={faculty} className="flex items-center space-x-2">
                          <Checkbox
                            id={`faculty-${faculty}`}
                            checked={faculty ? filters.faculty.includes(faculty) : false}
                            onCheckedChange={(checked) => {
                              if (!faculty) return
                              setFilters(prev => ({
                                ...prev,
                                faculty: checked 
                                  ? [...prev.faculty, faculty]
                                  : prev.faculty.filter(f => f !== faculty)
                              }))
                            }}
                          />
                          <Label 
                            htmlFor={`faculty-${faculty}`} 
                            className="font-normal cursor-pointer text-sm"
                          >
                            {faculty}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Classes Filter */}
                  <div className="bg-muted/30 rounded-md border p-3 space-y-3">
                    <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Classes Status
                    </Label>
                    <RadioGroup
                      value={filters.hasClasses}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, hasClasses: value as "all" | "active" | "inactive" }))}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="classes-all" />
                        <Label htmlFor="classes-all" className="font-normal cursor-pointer text-sm">
                          All
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="active" id="classes-active" />
                        <Label htmlFor="classes-active" className="font-normal cursor-pointer text-sm">
                          Has Classes
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="inactive" id="classes-inactive" />
                        <Label htmlFor="classes-inactive" className="font-normal cursor-pointer text-sm">
                          No Classes
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                
                {/* Fixed Action Buttons */}
                <div className="px-6 py-4 border-t bg-background">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setFilters({
                        examType: "all",
                        subjectType: [],
                        credits: [],
                        batches: [],
                        programs: [],
                        semesters: [],
                        faculty: [],
                        hasClasses: "all"
                      })}
                      className="flex-1"
                    >
                      Clear All
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={() => setShowFilterSheet(false)}
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({
                  examType: "all",
                  subjectType: [],
                  credits: [],
                  batches: [],
                  programs: [],
                  semesters: [],
                  faculty: [],
                  hasClasses: "all"
                })}
              >
                Clear filters
                <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center rounded-md border">
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewModeChange("cards")}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewModeChange("table")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Active Filter Badges */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.examType !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Exam Type: {filters.examType}
                <button
                  onClick={() => setFilters(prev => ({ ...prev, examType: "all" }))}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.subjectType.map(type => (
              <Badge key={type} variant="secondary" className="gap-1">
                Type: {type}
                <button
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    subjectType: prev.subjectType.filter(t => t !== type)
                  }))}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.credits.map(credit => (
              <Badge key={credit} variant="secondary" className="gap-1">
                Credits: {credit}
                <button
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    credits: prev.credits.filter(c => c !== credit)
                  }))}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.programs.map(program => (
              <Badge key={program} variant="secondary" className="gap-1">
                Program: {program}
                <button
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    programs: prev.programs.filter(p => p !== program)
                  }))}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.semesters.map(semester => (
              <Badge key={semester} variant="secondary" className="gap-1">
                Semester: {semester}
                <button
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    semesters: prev.semesters.filter(s => s !== semester)
                  }))}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.batches.map(batch => (
              <Badge key={batch} variant="secondary" className="gap-1">
                Batch: {batch}
                <button
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    batches: prev.batches.filter(b => b !== batch)
                  }))}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.faculty.map(faculty => (
              <Badge key={faculty} variant="secondary" className="gap-1">
                Faculty: {faculty}
                <button
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    faculty: prev.faculty.filter(f => f !== faculty)
                  }))}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.hasClasses !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Classes: {filters.hasClasses}
                <button
                  onClick={() => setFilters(prev => ({ ...prev, hasClasses: "all" }))}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {filteredSubjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No subjects found</p>
            {(searchQuery || activeFilterCount > 0) && (
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject as any}
              onUpdate={handleSubjectUpdated}
              onDelete={handleSubjectDeleted}
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        <SubjectTable
          subjects={filteredSubjects}
          onUpdate={handleSubjectUpdated}
          onDelete={handleSubjectDeleted}
          onEdit={handleEdit}
        />
      )}

      {/* Add Subject Modal */}
      <AddSubjectModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSubjectCreated={handleSubjectCreated as any}
      />

      {/* Edit Subject Modal */}
      <EditSubjectModal
        open={!!editingSubject}
        onOpenChange={(open) => !open && setEditingSubject(null)}
        subject={editingSubject as any}
        onSubjectUpdated={handleSubjectUpdated as any}
      />
    </div>
  )
})