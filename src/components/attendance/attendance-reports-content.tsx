"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Download, Eye, Users, BookOpen, TrendingUp } from "lucide-react"
import { AttendanceReportsTable } from "./attendance-reports-table"
import { AttendanceAnalytics } from "./attendance-analytics"
import { BatchOverviewCards } from "./batch-overview-cards"
import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"

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
  currentStrength: number
  maxCapacity?: number
  _count?: {
    students: number
    subjects: number
  }
}

interface AttendanceStats {
  totalStudents: number
  totalSubjects: number
  averageAttendance: number
  activeStudents: number
}

export function AttendanceReportsContent() {
  const [selectedBatch, setSelectedBatch] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [view, setView] = useState<"table" | "analytics">("table")

  // Fetch batches
  const { data: batchesData, isLoading: batchesLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const response = await fetch('/api/batches')
      if (!response.ok) throw new Error('Failed to fetch batches')
      return response.json()
    }
  })

  // Fetch attendance data for selected batch
  const { data: attendanceData, isLoading: attendanceLoading, refetch } = useQuery({
    queryKey: ['attendance-reports', selectedBatch],
    queryFn: async () => {
      if (!selectedBatch) return null
      const response = await fetch(`/api/attendance/reports?batchId=${selectedBatch}`)
      if (!response.ok) throw new Error('Failed to fetch attendance data')
      return response.json()
    },
    enabled: !!selectedBatch
  })

  const batches: Batch[] = batchesData || []

  // Auto-select first batch if only one exists and none selected
  useEffect(() => {
    if (batches.length === 1 && !selectedBatch) {
      setSelectedBatch(batches[0].id)
    }
  }, [batches, selectedBatch])
  const stats: AttendanceStats = attendanceData?.data?.stats || {
    totalStudents: 0,
    totalSubjects: 0,
    averageAttendance: 0,
    activeStudents: 0
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="w-full sm:w-64">
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger>
                <SelectValue placeholder="Select a batch">
                  {selectedBatch ? (
                    <span>{batches.find(b => b.id === selectedBatch)?.name || "Select a batch"}</span>
                  ) : (
                    "Select a batch"
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {batchesLoading ? (
                  <div className="p-2">
                    <Skeleton className="h-4 w-32" />
                  </div>
                ) : batches.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No batches available
                  </div>
                ) : (
                  batches.map((batch) => {
                    const studentCount = batch._count?.students || batch.currentStrength || 0
                    return (
                      <SelectItem key={batch.id} value={batch.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{batch.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {batch.program.shortName}
                            {batch.specialization && ` - ${batch.specialization.shortName}`}
                            {" • "}{studentCount} students
                          </span>
                        </div>
                      </SelectItem>
                    )
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedBatch && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
        </div>

        {selectedBatch && (
          <div className="flex gap-2">
            <Button
              variant={view === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("table")}
            >
              <Users className="h-4 w-4 mr-2" />
              Students
            </Button>
            <Button
              variant={view === "analytics" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("analytics")}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {selectedBatch && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeStudents} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subjects</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSubjects}</div>
              <p className="text-xs text-muted-foreground">
                Active this semester
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Attendance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageAttendance}%</div>
              <Badge variant={stats.averageAttendance >= 75 ? "default" : "destructive"} className="text-xs">
                {stats.averageAttendance >= 75 ? "Good" : "Below 75%"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalStudents > 0 ? Math.round((stats.activeStudents / stats.totalStudents) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Students attending
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      {!selectedBatch ? (
        <BatchOverviewCards 
          batches={batches}
          isLoading={batchesLoading}
          onSelectBatch={setSelectedBatch}
        />
      ) : (
        <div>
          {view === "table" ? (
            <AttendanceReportsTable 
              batchId={selectedBatch}
              searchQuery={searchQuery}
              data={attendanceData?.data}
              isLoading={attendanceLoading}
            />
          ) : (
            <AttendanceAnalytics 
              batchId={selectedBatch}
              data={attendanceData?.data}
              isLoading={attendanceLoading}
            />
          )}
        </div>
      )}
    </div>
  )
}