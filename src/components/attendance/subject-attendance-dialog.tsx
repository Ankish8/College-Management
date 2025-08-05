"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { BookOpen, Users, TrendingUp, TrendingDown, Calendar } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "@tanstack/react-query"
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"

interface SubjectAttendanceDialogProps {
  subjectId: string | null
  batchId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface StudentAttendance {
  studentId: string
  name: string
  rollNumber: string
  present: number
  total: number
  percentage: number
  recentAttendance: {
    date: string
    status: "PRESENT" | "ABSENT" | "LATE" | "MEDICAL"
  }[]
}

interface SubjectDetail {
  id: string
  name: string
  code: string
  credits: number
  totalSessions: number
  averageAttendance: number
  students: StudentAttendance[]
  sessions: {
    id: string
    date: string
    isCompleted: boolean
    presentCount: number
    absentCount: number
  }[]
}

export function SubjectAttendanceDialog({ subjectId, batchId, open, onOpenChange }: SubjectAttendanceDialogProps) {
  const { data: subjectData, isLoading } = useQuery({
    queryKey: ['subject-attendance-detail', subjectId, batchId],
    queryFn: async () => {
      if (!subjectId) return null
      const response = await fetch(`/api/attendance/subjects/${subjectId}?batchId=${batchId}`)
      if (!response.ok) throw new Error('Failed to fetch subject attendance details')
      return response.json()
    },
    enabled: !!subjectId && !!batchId && open
  })

  const subject: SubjectDetail | null = subjectData?.data

  const getStatusColor = (percentage: number) => {
    if (percentage >= 85) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    if (percentage >= 75) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
  }

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 75) return <TrendingUp className="h-3 w-3" />
    return <TrendingDown className="h-3 w-3" />
  }

  const getAttendanceStatusColor = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "LATE":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "ABSENT":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "MEDICAL":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh] overflow-y-auto sm:max-w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <BookOpen className="h-5 w-5" />
            Subject Attendance Details
          </DialogTitle>
          <DialogDescription>
            Detailed attendance information for this subject
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-[300px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          </div>
        ) : !subject ? (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Subject not found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Subject Header */}
            <div className="bg-muted/30 p-6 rounded-lg">
              <h3 className="text-2xl font-semibold">{subject.name}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                <span>{subject.code}</span>
                <span>•</span>
                <span>{subject.credits} credits</span>
                <span>•</span>
                <span>{subject.totalSessions} sessions</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Average Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{subject.averageAttendance}%</div>
                  <Badge variant={subject.averageAttendance >= 75 ? "default" : "destructive"} className="text-xs">
                    {subject.averageAttendance >= 75 ? "Good" : "Below 75%"}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{subject.students.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Enrolled in subject
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Sessions Conducted</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{subject.sessions.filter(s => s.isCompleted).length}</div>
                  <p className="text-xs text-muted-foreground">
                    Out of {subject.totalSessions} planned
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Students Above 75%</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {subject.students.filter(s => s.percentage >= 75).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {subject.students.length > 0 
                      ? Math.round((subject.students.filter(s => s.percentage >= 75).length / subject.students.length) * 100)
                      : 0}% of class
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Students Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Student Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Student</TableHead>
                        <TableHead className="w-[100px]">Roll No.</TableHead>
                        <TableHead className="w-[120px]">Attendance</TableHead>
                        <TableHead className="w-[100px]">Present/Total</TableHead>
                        <TableHead>Recent Sessions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subject.students
                        .sort((a, b) => b.percentage - a.percentage)
                        .map((student) => (
                          <TableRow key={student.studentId}>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {student.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{student.name}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {student.rollNumber}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={cn("font-mono", getStatusColor(student.percentage))}
                              >
                                {getStatusIcon(student.percentage)}
                                <span className="ml-1">{student.percentage}%</span>
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {student.present}/{student.total}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {student.recentAttendance.slice(0, 5).map((attendance, index) => (
                                  <div
                                    key={index}
                                    className={cn(
                                      "w-4 h-4 rounded-sm flex items-center justify-center text-xs",
                                      getAttendanceStatusColor(attendance.status)
                                    )}
                                    title={`${format(parseISO(attendance.date), "MMM dd")} - ${attendance.status}`}
                                  >
                                    {attendance.status === "PRESENT" ? "P" : 
                                     attendance.status === "LATE" ? "L" :
                                     attendance.status === "MEDICAL" ? "M" : "A"}
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Recent Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {subject.sessions
                    .filter(session => session.isCompleted)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 10)
                    .map((session, index) => (
                      <div key={session.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {format(parseISO(session.date), "EEEE, MMM dd, yyyy")}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Session {subject.sessions.length - index}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span>{session.presentCount} present</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span>{session.absentCount} absent</span>
                          </div>
                          <Badge variant="outline">
                            {Math.round((session.presentCount / (session.presentCount + session.absentCount)) * 100)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}