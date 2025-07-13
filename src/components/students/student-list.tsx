"use client"

import { useState, useEffect, useMemo, memo, useCallback } from "react"
import { Plus, Search, Filter, Settings, RefreshCw, Users, GraduationCap } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StudentTable } from "./student-table"
import { AddStudentModal } from "./add-student-modal"
import { BulkUploadModal } from "./bulk-upload-modal"
import { useToast } from "@/hooks/use-toast"
import { useQuery } from "@tanstack/react-query"

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
  _count: {
    students: number
  }
}

type FilterType = "all" | "active" | "inactive"
type SpecializationFilter = "all" | "ux" | "gd" | string

// API fetch functions
const fetchBatchesData = async (): Promise<Batch[]> => {
  const response = await fetch("/api/batches", {
    credentials: 'include'
  })
  if (!response.ok) {
    console.error(`Batches API error - Status: ${response.status}, URL: ${response.url}`)
    const text = await response.text()
    console.error('Response text:', text.substring(0, 200))
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
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<FilterType>("all")
  const [specializationFilter, setSpecializationFilter] = useState<SpecializationFilter>("all")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [lastSelectedBatch, setLastSelectedBatch] = useState<string>("")
  const { toast } = useToast()

  // Use React Query for batches with aggressive caching
  const { data: batches = [] } = useQuery({
    queryKey: ['batches'],
    queryFn: fetchBatchesData,
    staleTime: 10 * 60 * 1000, // 10 minutes - batches rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false,
    retry: 0
  })

  // Use React Query for students with optimized caching
  const { data: students = [], isLoading: loading, refetch: refetchStudents } = useQuery({
    queryKey: ['students', searchQuery, selectedBatch, statusFilter],
    queryFn: () => fetchStudentsData({ searchQuery, selectedBatch, statusFilter }),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
    retry: 0,
    enabled: true // Always enabled for immediate data
  })

  // Filter students based on search and filters using useMemo to prevent infinite loops
  const filteredStudents = useMemo(() => {
    let filtered = students

    // Apply status filter
    if (statusFilter === "active") {
      filtered = filtered.filter(student => student.user.status === "ACTIVE")
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter(student => student.user.status !== "ACTIVE")
    }

    // Apply specialization filter
    if (specializationFilter !== "all") {
      if (specializationFilter === "ux") {
        filtered = filtered.filter(student => 
          student.batch.specialization?.shortName.toLowerCase().includes("ux")
        )
      } else if (specializationFilter === "gd") {
        filtered = filtered.filter(student => 
          student.batch.specialization?.shortName.toLowerCase().includes("gd") ||
          student.batch.specialization?.shortName.toLowerCase().includes("graphic")
        )
      }
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(student =>
        student.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.guardianName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.batch.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered
  }, [students, statusFilter, specializationFilter, searchQuery])

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

  // Show loading skeleton for initial load
  if (loading && students.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="space-y-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1 max-w-sm" />
            <Skeleton className="h-10 w-20" />
          </div>
          
          <div className="border rounded-lg">
            <div className="p-4 border-b">
              <Skeleton className="h-4 w-full" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 border-b last:border-b-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const selectedBatchData = selectedBatch !== "all" 
    ? batches.find(b => b.id === selectedBatch)
    : null

  const activeFiltersCount = [
    statusFilter !== "all",
    specializationFilter !== "all",
  ].filter(Boolean).length

  if (loading && students.length === 0) {
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
            {selectedBatchData.program.shortName}
            {selectedBatchData.specialization && ` ${selectedBatchData.specialization.shortName}`}
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{filteredStudents.length}</span>
          <span>Students {selectedBatch !== "all" ? "in batch" : "total"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">
            {filteredStudents.filter(s => s.user.status === "ACTIVE").length}
          </span>
          <span>Active</span>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Filters and Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={statusFilter === "all"}
              onCheckedChange={() => setStatusFilter("all")}
            >
              All Students
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilter === "active"}
              onCheckedChange={() => setStatusFilter("active")}
            >
              Active Only
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilter === "inactive"}
              onCheckedChange={() => setStatusFilter("inactive")}
            >
              Inactive Only
            </DropdownMenuCheckboxItem>
            
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Specialization</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={specializationFilter === "all"}
              onCheckedChange={() => setSpecializationFilter("all")}
            >
              All Specializations
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={specializationFilter === "ux"}
              onCheckedChange={() => setSpecializationFilter("ux")}
            >
              UX Design
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={specializationFilter === "gd"}
              onCheckedChange={() => setSpecializationFilter("gd")}
            >
              Graphic Design
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Student Table */}
      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No students found</p>
            {searchQuery && (
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
            )}
            {selectedBatch === "all" && !searchQuery && (
              <Button 
                className="mt-4"
                onClick={() => setIsAddModalOpen(true)}
              >
                Add Your First Student
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <StudentTable
          students={filteredStudents}
          onUpdate={handleStudentUpdated}
          onDelete={handleStudentDeleted}
          loading={loading}
        />
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