"use client"

import { useState, useEffect } from "react"
import { X, Edit, Mail, Phone, User, GraduationCap, Calendar, MapPin, Users, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

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

interface DetailedStudent extends Student {
  attendanceStats?: {
    total: number
    present: number
    absent: number
    excused: number
    percentage: number
  }
  attendanceRecords?: any[]
  attendanceDisputes?: any[]
}

interface StudentDetailPanelProps {
  student: Student | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (student: Student) => void
  onUpdate: (student: Student) => void
}

export function StudentDetailPanel({ 
  student, 
  open, 
  onOpenChange, 
  onEdit, 
  onUpdate 
}: StudentDetailPanelProps) {
  const [detailedStudent, setDetailedStudent] = useState<DetailedStudent | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && student) {
      fetchStudentDetails(student.id)
    }
  }, [open, student])

  const fetchStudentDetails = async (studentId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/students/${studentId}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error("Failed to fetch student details")
      }

      const data = await response.json()
      setDetailedStudent(data)
    } catch (error) {
      console.error("Error fetching student details:", error)
      toast({
        title: "Error",
        description: "Failed to fetch student details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (!student) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[500px] overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Student Details</SheetTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(student)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
          <SheetDescription>
            Complete information for {student.user.name}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-6 mt-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded w-1/3"></div>
                <div className="h-8 bg-muted animate-pulse rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Student Overview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="text-sm font-medium">
                      {getInitials(student.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h3 className="font-semibold">{student.user.name}</h3>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(student.user.status)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm">{student.user.email}</p>
                  </div>
                  {student.user.phone && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <p className="text-sm">{student.user.phone}</p>
                    </div>
                  )}
                  {student.address && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Address</label>
                      <p className="text-sm">{student.address}</p>
                    </div>
                  )}
                  {student.dateOfBirth && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                      <p className="text-sm">{formatDate(student.dateOfBirth)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Academic Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Academic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Student ID</label>
                    <Badge variant="outline" className="font-mono mt-1">
                      {student.studentId}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Roll Number</label>
                    <Badge variant="outline" className="font-mono mt-1">
                      {student.rollNumber}
                    </Badge>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Batch</label>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm font-medium">{student.batch.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{student.batch.program.name}</span>
                      {student.batch.specialization && (
                        <>
                          <span>•</span>
                          <span>{student.batch.specialization.name}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Semester {student.batch.semester}</span>
                      <span>•</span>
                      <span>{student.batch.startYear}-{student.batch.endYear}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Guardian Information */}
            {(student.guardianName || student.guardianPhone) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Guardian Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {student.guardianName && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Guardian Name</label>
                      <p className="text-sm">{student.guardianName}</p>
                    </div>
                  )}
                  {student.guardianPhone && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Guardian Phone</label>
                      <p className="text-sm">{student.guardianPhone}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Attendance Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Attendance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detailedStudent?.attendanceStats ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {detailedStudent.attendanceStats.percentage}%
                        </div>
                        <div className="text-xs text-muted-foreground">Overall</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {detailedStudent.attendanceStats.total}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Sessions</div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-3 gap-3 text-center text-sm">
                      <div>
                        <div className="font-medium text-green-600">
                          {detailedStudent.attendanceStats.present}
                        </div>
                        <div className="text-xs text-muted-foreground">Present</div>
                      </div>
                      <div>
                        <div className="font-medium text-red-600">
                          {detailedStudent.attendanceStats.absent}
                        </div>
                        <div className="text-xs text-muted-foreground">Absent</div>
                      </div>
                      <div>
                        <div className="font-medium text-blue-600">
                          {detailedStudent.attendanceStats.excused}
                        </div>
                        <div className="text-xs text-muted-foreground">Excused</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-2xl font-bold">
                      {student.attendancePercentage}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {student.totalAttendanceRecords} total sessions
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Enrolled On</label>
                  <p className="text-sm">{formatDate(student.user.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User ID</label>
                  <Badge variant="outline" className="font-mono text-xs">
                    {student.user.id}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}