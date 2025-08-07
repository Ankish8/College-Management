"use client"

import { useState, useMemo } from 'react'
import { VirtualTable } from '@/components/ui/virtual-list'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Copy,
  Phone,
  Mail 
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'

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

interface VirtualStudentTableProps {
  students: Student[]
  onUpdate?: (student: Student) => void
  onDelete?: (studentId: string) => void
  loading?: boolean
  height?: number
}

export function VirtualStudentTable({
  students,
  onUpdate,
  onDelete,
  loading = false,
  height = 600
}: VirtualStudentTableProps) {
  const { toast } = useToast()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Memoize the table header to prevent re-renders
  const renderHeader = useMemo(() => () => (
    <div className="grid grid-cols-8 gap-4 p-4 font-medium text-sm text-muted-foreground">
      <div className="col-span-2">Student</div>
      <div>Student ID</div>
      <div>Batch</div>
      <div>Status</div>
      <div>Attendance</div>
      <div>Contact</div>
      <div className="text-right">Actions</div>
    </div>
  ), [])

  const copyToClipboard = async (text: string, type: string, studentId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(studentId)
      setTimeout(() => setCopiedId(null), 2000)
      
      toast({
        description: `${type} copied to clipboard`,
        duration: 2000,
      })
    } catch (error) {
      console.error('Failed to copy:', error)
      toast({
        description: `Failed to copy ${type.toLowerCase()}`,
        variant: "destructive",
        duration: 2000,
      })
    }
  }

  const renderRow = useMemo(() => (student: Student, index: number) => (
    <div
      key={student.id}
      className={`grid grid-cols-8 gap-4 p-4 border-b hover:bg-muted/50 transition-colors ${
        index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
      }`}
    >
      {/* Student Info */}
      <div className="col-span-2 space-y-1">
        <div className="font-medium">{student.user.name}</div>
        <div 
          className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
          onClick={() => copyToClipboard(student.user.email, 'Email', student.id)}
          title="Click to copy email"
        >
          {student.user.email}
          {copiedId === student.id && (
            <span className="ml-1 text-green-600">✓</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          Roll: {student.rollNumber}
        </div>
      </div>

      {/* Student ID */}
      <div className="flex items-center">
        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
          {student.studentId}
        </code>
      </div>

      {/* Batch */}
      <div className="space-y-1">
        <div className="text-sm font-medium">{student.batch.name}</div>
        <div className="text-xs text-muted-foreground">
          {student.batch.program.shortName}
          {student.batch.specialization && ` - ${student.batch.specialization.shortName}`}
        </div>
        <div className="text-xs text-muted-foreground">
          Sem {student.batch.semester} • {student.batch.startYear}-{student.batch.endYear}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center">
        <Badge 
          variant={student.user.status === "ACTIVE" ? "default" : "secondary"}
        >
          {student.user.status}
        </Badge>
      </div>

      {/* Attendance */}
      <div className="space-y-1">
        <div className={`text-sm font-medium ${
          student.attendancePercentage >= 75 
            ? 'text-green-600' 
            : student.attendancePercentage >= 60 
              ? 'text-yellow-600' 
              : 'text-red-600'
        }`}>
          {student.attendancePercentage}%
        </div>
        <div className="text-xs text-muted-foreground">
          {student.totalAttendanceRecords} records
        </div>
      </div>

      {/* Contact */}
      <div className="space-y-1">
        {student.user.phone && (
          <div 
            className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
            onClick={() => copyToClipboard(student.user.phone!, 'Phone', student.id)}
            title="Click to copy phone"
          >
            <Phone className="h-3 w-3" />
            {student.user.phone}
          </div>
        )}
        {student.guardianPhone && (
          <div 
            className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
            onClick={() => copyToClipboard(student.guardianPhone!, 'Guardian Phone', student.id)}
            title="Click to copy guardian phone"
          >
            <Phone className="h-3 w-3" />
            G: {student.guardianPhone}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => copyToClipboard(student.user.email, 'Email', student.id)}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Email
            </DropdownMenuItem>
            {student.user.phone && (
              <DropdownMenuItem
                onClick={() => copyToClipboard(student.user.phone!, 'Phone', student.id)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Phone
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onUpdate?.(student)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Student
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete?.(student.id)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Student
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  ), [onUpdate, onDelete, copiedId, toast])

  if (loading) {
    return (
      <div className="border rounded-md">
        <div className="border-b bg-muted/50">
          {renderHeader()}
        </div>
        <div className="p-8 text-center text-muted-foreground">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          Loading students...
        </div>
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <div className="border rounded-md">
        <div className="border-b bg-muted/50">
          {renderHeader()}
        </div>
        <div className="p-8 text-center text-muted-foreground">
          No students found
        </div>
      </div>
    )
  }

  return (
    <VirtualTable
      items={students}
      height={height}
      itemHeight={80} // Slightly increased for better readability
      renderHeader={renderHeader}
      renderRow={renderRow}
      className="w-full"
    />
  )
}