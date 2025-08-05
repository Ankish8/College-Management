"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, User, BookOpen, TrendingUp, TrendingDown, Clock } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "@tanstack/react-query"
import { format, parseISO, isToday, isYesterday, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns"
import { cn } from "@/lib/utils"

interface StudentAttendanceDialogProps {
  studentId: string | null
  batchId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface AttendanceRecord {
  date: string
  subject: {
    id: string
    name: string
    code: string
  }
  status: "PRESENT" | "ABSENT" | "LATE" | "MEDICAL"
  session: {
    id: string
    notes?: string
  }
}

interface StudentDetail {
  id: string
  name: string
  email: string
  rollNumber: string
  batch: {
    name: string
    program: { name: string }
  }
  overallAttendance: number
  subjectWiseAttendance: {
    subject: { id: string; name: string; code: string }
    present: number
    total: number
    percentage: number
  }[]
  attendanceRecords: AttendanceRecord[]
}

export function StudentAttendanceDialog({ studentId, batchId, open, onOpenChange }: StudentAttendanceDialogProps) {
  const [view, setView] = useState<"calendar" | "subjects">("calendar")
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date())

  const { data: studentData, isLoading } = useQuery({
    queryKey: ['student-attendance-detail', studentId, batchId],
    queryFn: async () => {
      if (!studentId) return null
      const response = await fetch(`/api/attendance/students/${studentId}?batchId=${batchId}`)
      if (!response.ok) throw new Error('Failed to fetch student attendance details')
      return response.json()
    },
    enabled: !!studentId && !!batchId && open
  })

  const student: StudentDetail | null = studentData?.data

  const getStatusColor = (status: string) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PRESENT":
        return <TrendingUp className="h-3 w-3" />
      case "LATE":
        return <Clock className="h-3 w-3" />
      case "ABSENT":
        return <TrendingDown className="h-3 w-3" />
      case "MEDICAL":
        return <BookOpen className="h-3 w-3" />
      default:
        return null
    }
  }

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr)
    if (isToday(date)) return "Today"
    if (isYesterday(date)) return "Yesterday"
    return format(date, "MMM dd, yyyy")
  }

  const getWeekDays = (week: Date) => {
    const start = startOfWeek(week, { weekStartsOn: 1 }) // Monday
    const end = endOfWeek(week, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }

  const groupAttendanceByDate = (records: AttendanceRecord[]) => {
    const grouped: { [key: string]: AttendanceRecord[] } = {}
    records.forEach(record => {
      if (!grouped[record.date]) {
        grouped[record.date] = []
      }
      grouped[record.date].push(record)
    })
    return grouped
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh] overflow-y-auto sm:max-w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <User className="h-5 w-5" />
            Student Attendance Details
          </DialogTitle>
          <DialogDescription>
            Detailed attendance information and analytics
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-3 w-[150px]" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          </div>
        ) : !student ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Student not found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Student Header */}
            <div className="flex items-center justify-between bg-muted/30 p-6 rounded-lg">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {student.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{student.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {student.rollNumber} • {student.batch.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {student.email}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={view === "calendar" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView("calendar")}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendar
                </Button>
                <Button
                  variant={view === "subjects" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView("subjects")}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Subjects
                </Button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Overall Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{student.overallAttendance}%</div>
                  <Badge variant={student.overallAttendance >= 75 ? "default" : "destructive"} className="text-xs">
                    {student.overallAttendance >= 75 ? "Good Standing" : "Below Required"}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {student.subjectWiseAttendance.reduce((sum, subject) => sum + subject.total, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Across {student.subjectWiseAttendance.length} subjects
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Classes Attended</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {student.subjectWiseAttendance.reduce((sum, subject) => sum + subject.present, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Present in classes
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            {view === "calendar" ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium">Calendar View</h4>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
                    >
                      Previous Week
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedWeek(new Date())}
                    >
                      This Week
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
                    >
                      Next Week
                    </Button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-3">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                    <div key={day} className="p-2 text-center font-medium text-sm bg-muted rounded-md">
                      {day}
                    </div>
                  ))}
                  
                  {getWeekDays(selectedWeek).map(day => {
                    const dateStr = format(day, "yyyy-MM-dd")
                    const dayRecords = student.attendanceRecords.filter(record => record.date === dateStr)
                    
                    return (
                      <div key={dateStr} className={cn(
                        "min-h-[120px] p-3 border rounded-lg",
                        isToday(day) ? "border-primary bg-primary/5" : "border-border"
                      )}>
                        <div className="text-sm font-medium mb-1">
                          {format(day, "dd")}
                        </div>
                        <div className="space-y-1">
                          {dayRecords.map((record, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className={cn("text-xs block", getStatusColor(record.status))}
                            >
                              {getStatusIcon(record.status)}
                              <span className="ml-1">{record.subject.code}</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Recent Attendance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Attendance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {student.attendanceRecords
                        .slice(0, 10)
                        .map((record, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                            <div className="flex items-center space-x-3">
                              <Badge variant="secondary" className={getStatusColor(record.status)}>
                                {getStatusIcon(record.status)}
                                <span className="ml-1">{record.status}</span>
                              </Badge>
                              <div>
                                <div className="font-medium">{record.subject.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {record.subject.code}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(record.date)}
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-6">
                <h4 className="text-lg font-medium">Subject-wise Attendance</h4>
                <div className="grid gap-6">
                  {student.subjectWiseAttendance.map((subject) => (
                    <Card key={subject.subject.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{subject.subject.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {subject.subject.code}
                            </p>
                          </div>
                          <Badge 
                            variant="secondary" 
                            className={cn("font-mono", getStatusColor(
                              subject.percentage >= 75 ? "PRESENT" : "ABSENT"
                            ))}
                          >
                            {subject.percentage}%
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm">
                          <span>Classes Attended: {subject.present}/{subject.total}</span>
                          <span className="text-muted-foreground">
                            {subject.total - subject.present} missed
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2 mt-2">
                          <div
                            className={cn(
                              "h-2 rounded-full transition-all",
                              subject.percentage >= 75 ? "bg-green-500" : "bg-red-500"
                            )}
                            style={{ width: `${subject.percentage}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}