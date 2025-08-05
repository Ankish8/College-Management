"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Eye, User, TrendingDown, TrendingUp, Minus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { StudentAttendanceDialog } from "./student-attendance-dialog"
import { SubjectAttendanceDialog } from "./subject-attendance-dialog"

interface Subject {
  id: string
  name: string
  code: string
  credits: number
}

interface StudentAttendanceData {
  studentId: string
  name: string
  rollNumber: string
  email: string
  overallAttendance: number
  subjects: {
    subjectId: string
    present: number
    total: number
    percentage: number
  }[]
  isActive: boolean
}

interface AttendanceReportsTableProps {
  batchId: string
  searchQuery: string
  data: any
  isLoading: boolean
}

export function AttendanceReportsTable({ batchId, searchQuery, data, isLoading }: AttendanceReportsTableProps) {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<"name" | "overall" | "rollNumber">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[100px]" />
                </div>
                <div className="flex space-x-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-8 w-12" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || !data.students || data.students.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <User className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Active Students Found</h3>
          <div className="space-y-2 max-w-md">
            <p className="text-muted-foreground">
              This batch either has no active students or no attendance sessions have been created yet.
            </p>
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              <strong>Possible reasons:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>No students are enrolled in this batch</li>
                <li>All students are marked as inactive</li>
                <li>No attendance sessions have been conducted</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const students: StudentAttendanceData[] = data.students || []
  const subjects: Subject[] = data.subjects || []

  // Filter and sort students
  const filteredStudents = students
    .filter(student => 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortBy) {
        case "name":
          aValue = a.name
          bValue = b.name
          break
        case "rollNumber":
          aValue = a.rollNumber
          bValue = b.rollNumber
          break
        case "overall":
          aValue = a.overallAttendance
          bValue = b.overallAttendance
          break
        default:
          aValue = a.name
          bValue = b.name
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      } else {
        return sortOrder === "asc" 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number)
      }
    })

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 85) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    if (percentage >= 75) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
  }

  const getAttendanceIcon = (percentage: number) => {
    if (percentage >= 85) return <TrendingUp className="h-3 w-3" />
    if (percentage >= 75) return <Minus className="h-3 w-3" />
    return <TrendingDown className="h-3 w-3" />
  }

  const handleSort = (field: "name" | "overall" | "rollNumber") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Student Attendance Overview</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{filteredStudents.length} students</span>
              <span>•</span>
              <span>{subjects.length} subjects</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold"
                      onClick={() => handleSort("name")}
                    >
                      Student
                      {sortBy === "name" && (
                        sortOrder === "asc" ? " ↑" : " ↓"
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[100px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold"
                      onClick={() => handleSort("rollNumber")}
                    >
                      Roll No.
                      {sortBy === "rollNumber" && (
                        sortOrder === "asc" ? " ↑" : " ↓"
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[120px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold"
                      onClick={() => handleSort("overall")}
                    >
                      Overall
                      {sortBy === "overall" && (
                        sortOrder === "asc" ? " ↑" : " ↓"
                      )}
                    </Button>
                  </TableHead>
                  {subjects.map((subject) => (
                    <TableHead key={subject.id} className="text-center min-w-[100px]">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-semibold text-xs"
                        onClick={() => setSelectedSubject(subject.id)}
                      >
                        {subject.code}
                      </Button>
                    </TableHead>
                  ))}
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.studentId} className={cn(!student.isActive && "opacity-60")}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {student.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {student.rollNumber}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("font-mono", getAttendanceColor(student.overallAttendance))}>
                        {getAttendanceIcon(student.overallAttendance)}
                        <span className="ml-1">{student.overallAttendance}%</span>
                      </Badge>
                    </TableCell>
                    {subjects.map((subject) => {
                      const subjectData = student.subjects.find(s => s.subjectId === subject.id)
                      const percentage = subjectData?.percentage || 0
                      const present = subjectData?.present || 0
                      const total = subjectData?.total || 0

                      return (
                        <TableCell key={subject.id} className="text-center">
                          <div className="flex flex-col items-center space-y-1">
                            <Badge 
                              variant="secondary" 
                              className={cn("text-xs font-mono", getAttendanceColor(percentage))}
                            >
                              {percentage}%
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              {present}/{total}
                            </div>
                          </div>
                        </TableCell>
                      )
                    })}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedStudent(student.studentId)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Student Detail Dialog */}
      <StudentAttendanceDialog
        studentId={selectedStudent}
        batchId={batchId}
        open={!!selectedStudent}
        onOpenChange={(open) => !open && setSelectedStudent(null)}
      />

      {/* Subject Detail Dialog */}
      <SubjectAttendanceDialog
        subjectId={selectedSubject}
        batchId={batchId}
        open={!!selectedSubject}
        onOpenChange={(open) => !open && setSelectedSubject(null)}
      />
    </div>
  )
}