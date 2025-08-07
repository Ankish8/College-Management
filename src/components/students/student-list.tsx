"use client"

import { useState, useEffect, useMemo, memo, useCallback } from "react"
import { Plus, Search, Settings, RefreshCw, Users, GraduationCap, UserCheck, TrendingUp, Grid, List, X } from "lucide-react"
import { useUserPreferences } from "@/hooks/useUserPreferences"
import type { ViewMode } from "@/types/preferences"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StudentListSkeleton, DashboardStatsSkeleton } from "@/components/ui/skeletons"
import { StudentTable } from "./student-table"
import { VirtualStudentTable } from "./virtual-student-table"
import dynamic from "next/dynamic"

const AddStudentModal = dynamic(() => import("./add-student-modal").then(mod => ({ default: mod.AddStudentModal })), {
  loading: () => <div className="flex items-center justify-center p-4">Loading...</div>,
  ssr: false
})

const BulkUploadModal = dynamic(() => import("./bulk-upload-modal").then(mod => ({ default: mod.BulkUploadModal })), {
  loading: () => <div className="flex items-center justify-center p-4">Loading...</div>,
  ssr: false
})
import { HorizontalStudentFilter } from "./horizontal-student-filter"
import { useToast } from "@/hooks/use-toast"
import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { canCreateStudent, isAdmin } from "@/lib/utils/permissions"
import { StudentFilterState } from "@/types/student-filters"
import { filterStudents, getFilterDescription } from "@/utils/student-filter-utils"
import { Student } from "@/types/student"

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
  _count: {
    students: number
  }
}

// Remove old filter types - now using advanced filtering

// API fetch functions
const fetchBatchesData = async (): Promise<Batch[]> => {
  const response = await fetch("/api/batches", {
    credentials: 'include'
  })
  if (!response.ok) {
    console.error(`Batches API error - Status: ${response.status}, URL: ${response.url}`)
    const text = await response.text()
    console.error('Response text:', text.substring(0, 200))
    
    // Handle 401 specifically
    if (response.status === 401) {
      throw new Error('401: Unauthorized - Please sign in')
    }
    
    throw new Error(`Failed to fetch batches. Status: ${response.status}`)
  }
  
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch (parseError) {
    console.error('JSON parse error on batches:', parseError)
    console.error('Response text:', text.substring(0, 200))
    throw new Error('Batches API returned invalid JSON')
  }
}

const fetchStudentsData = async (params: { searchQuery?: string; selectedBatch?: string; statusFilter?: string }): Promise<Student[]> => {
  const searchParams = new URLSearchParams()
  
  if (params.searchQuery) {
    searchParams.append("search", params.searchQuery)
  }
  
  if (params.statusFilter && params.statusFilter !== "all") {
    searchParams.append("active", params.statusFilter === "active" ? "true" : "false")
  }
  
  if (params.selectedBatch && params.selectedBatch !== "all") {
    searchParams.append("batchId", params.selectedBatch)
  }

  const response = await fetch(`/api/students?${searchParams.toString()}`, {
    credentials: 'include'
  })
  
  if (!response.ok) {
    console.error(`Students API error - Status: ${response.status}, URL: ${response.url}`)
    const text = await response.text()
    console.error('Response text:', text.substring(0, 200))
    
    // Handle 401 specifically
    if (response.status === 401) {
      throw new Error('401: Unauthorized - Please sign in')
    }
    
    try {
      const errorData = JSON.parse(text)
      throw new Error(errorData.error || "Failed to fetch students")
    } catch {
      throw new Error(`API returned HTML instead of JSON. Status: ${response.status}`)
    }
  }
  
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch (parseError) {
    console.error('JSON parse error on students:', parseError)
    console.error('Response text:', text.substring(0, 200))
    throw new Error('API returned invalid JSON')
  }
}

function StudentListComponent() {
  const [selectedBatch, setSelectedBatch] = useState<string>("all")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [lastSelectedBatch, setLastSelectedBatch] = useState<string>("")
  // Remove showAdvancedFilters state - now always horizontal
  const { toast } = useToast()
  const { data: session, status } = useSession()
  const router = useRouter()
  const { preferences, updateViewMode } = useUserPreferences()
  const canCreate = canCreateStudent(session?.user as any)

  // Get current view mode from preferences, fallback to "cards"
  const viewMode: ViewMode = preferences?.viewModes?.students || "cards"

  // Handler to update view mode
  const handleViewModeChange = async (newViewMode: ViewMode) => {
    try {
      await updateViewMode("students", newViewMode)
    } catch (error) {
      console.error("Failed to update view mode:", error)
      toast({
        title: "Error",
        description: "Failed to save view preference",
        variant: "destructive",
      })
    }
  }

  // Advanced filter state
  const [filterState, setFilterState] = useState<StudentFilterState>({
    criteria: [],
    searchQuery: "",
    selectedBatch: "all",
    appliedFilters: [],
    logicalOperator: "AND"
  })

  // Use React Query for batches with aggressive caching
  const { data: batches = [] } = useQuery({
    queryKey: ['batches', (session?.user as any)?.id],
    queryFn: fetchBatchesData,
    staleTime: 10 * 60 * 1000, // 10 minutes - batches rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: true, // Always refetch on mount to ensure fresh data
    retry: (failureCount, error) => {
      // Don't retry on 401 errors
      if (error instanceof Error && error.message.includes('401')) {
        return false
      }
      return failureCount < 2
    },
    enabled: status === "authenticated" && !!(session?.user as any)?.id
  })

  // Use React Query for students with optimized caching
  const { data: students = [], isLoading: loading, refetch: refetchStudents, isError } = useQuery({
    queryKey: ['students', filterState.searchQuery, selectedBatch, (session?.user as any)?.id],
    queryFn: () => fetchStudentsData({ 
      searchQuery: filterState.searchQuery, 
      selectedBatch, 
      statusFilter: 'all' // Let advanced filters handle status filtering
    }),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true, // Always refetch on mount to ensure fresh data
    retry: (failureCount, error) => {
      // Don't retry on 401 errors
      if (error instanceof Error && error.message.includes('401')) {
        return false
      }
      return failureCount < 2
    },
    enabled: status === "authenticated" && !!(session?.user as any)?.id // Only fetch when authenticated with user ID
  })

  // Apply advanced filtering using the new filtering system
  const filteredStudents = useMemo(() => {
    return filterStudents(students, filterState.appliedFilters, filterState.searchQuery, filterState.logicalOperator)
  }, [students, filterState.appliedFilters, filterState.searchQuery, filterState.logicalOperator])

  // Update filter state when search query changes
  const handleSearchChange = useCallback((query: string) => {
    setFilterState(prev => ({ ...prev, searchQuery: query }))
  }, [])

  // Handle filter state changes from AdvancedStudentFilter
  const handleFilterChange = useCallback((newFilterState: StudentFilterState) => {
    setFilterState(newFilterState)
  }, [])

  const handleStudentCreated = useCallback((newStudent: Student) => {
    refetchStudents() // Refresh the list to get updated data
    setIsAddModalOpen(false)
    toast({
      title: "Success",
      description: "Student created successfully",
    })
  }, [refetchStudents, toast])

  const handleBulkUploadComplete = useCallback((results: any) => {
    setIsBulkUploadOpen(false)
    refetchStudents() // Refresh the list
    toast({
      title: "Bulk Upload Complete",
      description: `Created ${results.created} students, skipped ${results.skipped}`,
    })
  }, [refetchStudents, toast])

  const handleStudentUpdated = useCallback((updatedStudent: Student) => {
    refetchStudents() // Refresh to get updated data
    toast({
      title: "Success",
      description: "Student updated successfully",
    })
  }, [refetchStudents, toast])

  const handleStudentDeleted = useCallback((studentId: string) => {
    refetchStudents() // Refresh to get updated data
    toast({
      title: "Success",
      description: "Student deleted successfully",
    })
  }, [refetchStudents, toast])

  // Check auth status and redirect if needed
  if (status === "loading") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
            <p className="text-sm text-muted-foreground">
              Manage student records and information
            </p>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    router.push('/auth/signin')
    return null
  }

  // Handle query errors
  if (isError && status === "authenticated") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
            <p className="text-sm text-muted-foreground">
              Manage student records and information
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => refetchStudents()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">Unable to load student data</p>
              <Button 
                variant="outline" 
                onClick={() => refetchStudents()}
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }


  const selectedBatchData = selectedBatch !== "all" 
    ? batches.find(b => b.id === selectedBatch)
    : null

  // Count active filters
  const activeFiltersCount = filterState.appliedFilters.length

  if (loading && students.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
            <p className="text-sm text-muted-foreground">
              Manage student records and information
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        
        {/* Stats skeleton */}
        <DashboardStatsSkeleton />
        
        {/* Filters skeleton */}
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        
        {/* Student list skeleton */}
        <StudentListSkeleton count={8} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground">
            Manage student records and information
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => refetchStudents()}
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
              title="Student Configuration"
            >
              <Link href="/settings/students">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          )}
          {canCreate && (
            <>
              <Button 
                variant="outline"
                onClick={() => setIsBulkUploadOpen(true)}
              >
                <Users className="mr-2 h-4 w-4" />
                Bulk Upload
              </Button>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Batch Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Batch:</span>
        </div>
        <Select value={selectedBatch} onValueChange={setSelectedBatch}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a batch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batches</SelectItem>
            {batches.map((batch) => (
              <SelectItem key={batch.id} value={batch.id}>
                {batch.name} ({batch._count.students} students)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedBatchData && (
          <Badge variant="secondary">
            {selectedBatchData.program?.shortName || 'N/A'}
            {selectedBatchData.specialization && ` ${selectedBatchData.specialization.shortName}`}
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="font-medium text-foreground">{filteredStudents.length}</span>
          <span>Students {selectedBatch !== "all" ? "in batch" : "total"}</span>
        </div>
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          <span className="font-medium text-foreground">
            {filteredStudents.filter(s => s.user.status === "ACTIVE").length}
          </span>
          <span>Active</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          <span className="font-medium text-foreground">
            {filteredStudents.length > 0 
              ? Math.round(
                  filteredStudents.reduce((sum, s) => sum + s.attendancePercentage, 0) / 
                  filteredStudents.length
                )
              : 0
            }%
          </span>
          <span>Avg. Attendance</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={filterState.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8 h-9 w-[300px]"
          />
        </div>
        
        <HorizontalStudentFilter
          students={students}
          batches={batches}
          filterState={filterState}
          onFilterChange={handleFilterChange}
        />

        <div className="flex items-center rounded-md border ml-auto">
          <Button
            variant={viewMode === "cards" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleViewModeChange("cards")}
            className="rounded-r-none h-9"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleViewModeChange("table")}
            className="rounded-l-none h-9"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Student Content */}
      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No students found</p>
            {(filterState.searchQuery || filterState.appliedFilters.length > 0) && (
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
            )}
            {selectedBatch === "all" && !filterState.searchQuery && filterState.appliedFilters.length === 0 && canCreate && (
              <Button 
                className="mt-4"
                onClick={() => setIsAddModalOpen(true)}
              >
                Add Your First Student
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Cards view - to be implemented */}
          {filteredStudents.map((student) => (
            <Card key={student.id} className="p-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{student.user?.name || 'Unknown Student'}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {student.studentId} • {student.batch.name}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant={student.user?.status === "ACTIVE" ? "status" : "status-secondary"}>
                    {student.user?.status || 'Unknown'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {student.attendancePercentage}% attendance
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Use virtual scrolling for large datasets */}
          {filteredStudents.length > 100 ? (
            <VirtualStudentTable
              students={filteredStudents}
              onUpdate={handleStudentUpdated}
              onDelete={handleStudentDeleted}
              loading={loading}
              height={600}
            />
          ) : (
            <StudentTable
              students={filteredStudents}
              onUpdate={handleStudentUpdated}
              onDelete={handleStudentDeleted}
              loading={loading}
            />
          )}
        </>
      )}

      {/* Modals */}
      <AddStudentModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onStudentCreated={handleStudentCreated}
        defaultBatchId={lastSelectedBatch || selectedBatch !== "all" ? selectedBatch : undefined}
        onBatchSelect={setLastSelectedBatch}
      />

      <BulkUploadModal
        open={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        onUploadComplete={handleBulkUploadComplete}
        defaultBatchId={lastSelectedBatch || selectedBatch !== "all" ? selectedBatch : undefined}
      />
    </div>
  )
}

export const StudentList = memo(StudentListComponent)