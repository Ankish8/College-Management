"use client"

import { useState } from "react"
import { MoreHorizontal, Mail, Phone, Eye, Edit, Trash2, UserCheck, UserX, GraduationCap, Settings, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { StudentDetailPanel } from "./student-detail-panel"
import { EditStudentModal } from "./edit-student-modal"
import { useToast } from "@/hooks/use-toast"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { useSorting } from "@/hooks/useSorting"

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

interface StudentTableProps {
  students: Student[]
  onUpdate: (student: Student) => void
  onDelete: (studentId: string) => void
  loading?: boolean
}

interface ColumnVisibility {
  student: boolean
  studentId: boolean
  rollNumber: boolean
  batch: boolean
  status: boolean
  attendance: boolean
}

export function StudentTable({ students, onUpdate, onDelete, loading }: StudentTableProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null)
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    student: true,
    studentId: true,
    rollNumber: true,
    batch: true,
    status: true,
    attendance: true,
  })
  const { toast } = useToast()
  const { sortedData, handleSort, getSortDirection } = useSorting({
    data: students,
    defaultSort: { key: 'user.name', direction: 'asc' }
  })

  const toggleColumnVisibility = (column: keyof ColumnVisibility) => {
    setColumnVisibility(prev => ({
      ...prev,
      [column]: !prev[column]
    }))
  }

  const handleViewDetails = (student: Student) => {
    setSelectedStudent(student)
    setIsDetailPanelOpen(true)
  }

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student)
    setIsEditModalOpen(true)
  }

  const handleDeleteStudent = async (student: Student) => {
    try {
      const response = await fetch(`/api/students/${student.id}`, {
        method: "DELETE",
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete student")
      }

      onDelete(student.id)
      setDeletingStudent(null)
    } catch (error) {
      console.error("Error deleting student:", error)
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to delete student",
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(`${fieldName}-${text}`)
      setTimeout(() => setCopiedField(null), 2000)
      toast({
        title: "Copied!",
        description: `${fieldName} copied to clipboard`,
      })
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">Active</Badge>
      case "INACTIVE":
        return <Badge variant="secondary">Inactive</Badge>
      case "SUSPENDED":
        return <Badge variant="destructive">Suspended</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getAttendanceBadge = (percentage: number) => {
    if (percentage >= 85) {
      return <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">{percentage}%</Badge>
    } else if (percentage >= 75) {
      return <Badge variant="default" className="bg-yellow-100 text-yellow-700 border-yellow-200">{percentage}%</Badge>
    } else {
      return <Badge variant="destructive">{percentage}%</Badge>
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    const visibleColumns = Object.values(columnVisibility).filter(Boolean).length
    return (
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {columnVisibility.student && <TableHead>Student</TableHead>}
              {columnVisibility.studentId && <TableHead>Student ID</TableHead>}
              {columnVisibility.rollNumber && <TableHead>Roll Number</TableHead>}
              {columnVisibility.batch && <TableHead>Batch</TableHead>}
              {columnVisibility.status && <TableHead>Status</TableHead>}
              {columnVisibility.attendance && <TableHead>Attendance</TableHead>}
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {[...Array(visibleColumns + 1)].map((_, j) => (
                  <TableCell key={j}>
                    <div className="h-4 bg-muted animate-pulse rounded"></div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <>
      <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columnVisibility.student && (
                  <SortableTableHead
                    sortKey="user.name"
                    sortDirection={getSortDirection('user.name')}
                    onSort={handleSort}
                    className="min-w-[250px]"
                  >
                    Student
                  </SortableTableHead>
                )}
                {columnVisibility.studentId && (
                  <SortableTableHead
                    sortKey="studentId"
                    sortDirection={getSortDirection('studentId')}
                    onSort={handleSort}
                    className="min-w-[120px]"
                  >
                    Student ID
                  </SortableTableHead>
                )}
                {columnVisibility.rollNumber && (
                  <SortableTableHead
                    sortKey="rollNumber"
                    sortDirection={getSortDirection('rollNumber')}
                    onSort={handleSort}
                    className="min-w-[120px]"
                  >
                    Roll Number
                  </SortableTableHead>
                )}
                {columnVisibility.batch && (
                  <SortableTableHead
                    sortKey="batch.name"
                    sortDirection={getSortDirection('batch.name')}
                    onSort={handleSort}
                    className="min-w-[200px]"
                  >
                    Batch
                  </SortableTableHead>
                )}
                {columnVisibility.status && (
                  <SortableTableHead
                    sortKey="user.status"
                    sortDirection={getSortDirection('user.status')}
                    onSort={handleSort}
                    className="min-w-[100px]"
                  >
                    Status
                  </SortableTableHead>
                )}
                {columnVisibility.attendance && (
                  <SortableTableHead
                    sortKey="attendancePercentage"
                    sortDirection={getSortDirection('attendancePercentage')}
                    onSort={handleSort}
                    className="min-w-[120px]"
                  >
                    Attendance
                  </SortableTableHead>
                )}
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {sortedData.map((student) => (
              <TableRow 
                key={student.id} 
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => handleViewDetails(student)}
              >
                {columnVisibility.student && (
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs font-medium">
                          {getInitials(student.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <p className="font-medium leading-none">{student.user.name}</p>
                        <div className="group flex items-center gap-1 text-xs text-muted-foreground relative">
                          <Mail className="h-3 w-3" />
                          <span className="pr-5">{student.user.email}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              copyToClipboard(student.user.email, "Email")
                            }}
                            className="absolute right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-muted rounded-sm"
                            title="Copy email"
                          >
                            {copiedField === `Email-${student.user.email}` ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                        {student.user.phone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {student.user.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                )}
                {columnVisibility.studentId && (
                  <TableCell>
                    <div className="group flex items-center gap-1">
                      <Badge variant="outline" className="font-mono">
                        {student.studentId}
                      </Badge>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(student.studentId, "Student ID")
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-muted rounded-sm"
                        title="Copy Student ID"
                      >
                        {copiedField === `Student ID-${student.studentId}` ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                )}
                {columnVisibility.rollNumber && (
                  <TableCell>
                    <div className="group flex items-center gap-1">
                      <Badge variant="outline" className="font-mono">
                        {student.rollNumber}
                      </Badge>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(student.rollNumber, "Roll Number")
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-muted rounded-sm"
                        title="Copy Roll Number"
                      >
                        {copiedField === `Roll Number-${student.rollNumber}` ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                )}
                {columnVisibility.batch && (
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <GraduationCap className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {student.batch.program.shortName}
                          {student.batch.specialization && ` ${student.batch.specialization.shortName}`}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Semester {student.batch.semester} • {student.batch.startYear}-{student.batch.endYear}
                      </p>
                    </div>
                  </TableCell>
                )}
                {columnVisibility.status && (
                  <TableCell>
                    {getStatusBadge(student.user.status)}
                  </TableCell>
                )}
                {columnVisibility.attendance && (
                  <TableCell>
                    <div className="space-y-1">
                      {getAttendanceBadge(student.attendancePercentage)}
                      {student.totalAttendanceRecords > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {student.totalAttendanceRecords} sessions
                        </p>
                      )}
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        handleViewDetails(student)
                      }}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        handleEditStudent(student)
                      }}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Student
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation()
                          // TODO: View attendance functionality
                        }}
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        View Attendance
                      </DropdownMenuItem>
                      {student.guardianName && (
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation()
                            // TODO: Guardian details functionality
                          }}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Guardian Details
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingStudent(student)
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Student
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Student Detail Panel */}
      <StudentDetailPanel
        student={selectedStudent}
        open={isDetailPanelOpen}
        onOpenChange={setIsDetailPanelOpen}
        onEdit={(student) => {
          setIsDetailPanelOpen(false)
          handleEditStudent(student)
        }}
        onUpdate={onUpdate}
      />

      {/* Edit Student Modal */}
      <EditStudentModal
        student={editingStudent}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onStudentUpdated={onUpdate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingStudent} onOpenChange={() => setDeletingStudent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingStudent?.user.name}</strong>?
              <br /><br />
              <strong>This action cannot be undone.</strong> This will permanently delete:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Student record and user account</li>
                <li>All attendance records ({deletingStudent?.totalAttendanceRecords || 0} sessions)</li>
                <li>Any attendance disputes</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingStudent && handleDeleteStudent(deletingStudent)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Student
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}