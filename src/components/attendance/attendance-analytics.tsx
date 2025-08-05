"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  BookOpen, 
  Calendar,
  AlertTriangle,
  CheckCircle
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface AttendanceAnalyticsProps {
  batchId: string
  data: any
  isLoading: boolean
}

interface SubjectAnalytics {
  subjectId: string
  name: string
  code: string
  averageAttendance: number
  studentsAbove75: number
  studentsBelow75: number
  totalStudents: number
  totalSessions: number
  trend: "up" | "down" | "stable"
}

interface StudentRiskAnalytics {
  studentId: string
  name: string
  rollNumber: string
  overallAttendance: number
  riskLevel: "high" | "medium" | "low"
  criticalSubjects: number
}

export function AttendanceAnalytics({ batchId, data, isLoading }: AttendanceAnalyticsProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    )
  }

  if (!data || !data.students || !data.subjects) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
          <p className="text-muted-foreground">
            No attendance data available for analytics.
          </p>
        </CardContent>
      </Card>
    )
  }

  const students = data.students || []
  const subjects = data.subjects || []

  // Calculate subject-wise analytics
  const subjectAnalytics: SubjectAnalytics[] = subjects.map((subject: any) => {
    const subjectStudents = students.map((student: any) => 
      student.subjects.find((s: any) => s.subjectId === subject.id)
    ).filter(Boolean)

    const averageAttendance = subjectStudents.length > 0
      ? Math.round(subjectStudents.reduce((sum: number, s: any) => sum + s.percentage, 0) / subjectStudents.length)
      : 0

    const studentsAbove75 = subjectStudents.filter((s: any) => s.percentage >= 75).length
    const studentsBelow75 = subjectStudents.filter((s: any) => s.percentage < 75).length

    return {
      subjectId: subject.id,
      name: subject.name,
      code: subject.code,
      averageAttendance,
      studentsAbove75,
      studentsBelow75,
      totalStudents: subjectStudents.length,
      totalSessions: subject.totalSessions || 0,
      trend: averageAttendance >= 80 ? "up" : averageAttendance >= 70 ? "stable" : "down"
    }
  })

  // Calculate at-risk students
  const studentRiskAnalytics: StudentRiskAnalytics[] = students.map((student: any) => {
    const criticalSubjects = student.subjects.filter((s: any) => s.percentage < 75).length
    let riskLevel: "high" | "medium" | "low" = "low"

    if (student.overallAttendance < 65 || criticalSubjects >= 3) {
      riskLevel = "high"
    } else if (student.overallAttendance < 75 || criticalSubjects >= 2) {
      riskLevel = "medium"
    }

    return {
      studentId: student.studentId,
      name: student.name,
      rollNumber: student.rollNumber,
      overallAttendance: student.overallAttendance,
      riskLevel,
      criticalSubjects
    }
  })

  // Overall statistics
  const overallStats = {
    totalStudents: students.length,
    studentsAbove75: students.filter((s: any) => s.overallAttendance >= 75).length,
    studentsBelow75: students.filter((s: any) => s.overallAttendance < 75).length,
    studentsAt60: students.filter((s: any) => s.overallAttendance < 60).length,
    averageAttendance: data.stats?.averageAttendance || 0,
    highRiskStudents: studentRiskAnalytics.filter(s => s.riskLevel === "high").length,
    mediumRiskStudents: studentRiskAnalytics.filter(s => s.riskLevel === "medium").length,
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="h-4 w-4 text-green-500" />
      case "down": return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <BarChart3 className="h-4 w-4 text-yellow-500" />
    }
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "high": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      default: return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    }
  }

  return (
    <div className="space-y-6">
      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students Above 75%</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.studentsAbove75}</div>
            <Progress 
              value={(overallStats.studentsAbove75 / overallStats.totalStudents) * 100} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((overallStats.studentsAbove75 / overallStats.totalStudents) * 100)}% of students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students Below 75%</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.studentsBelow75}</div>
            <Progress 
              value={(overallStats.studentsBelow75 / overallStats.totalStudents) * 100} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((overallStats.studentsBelow75 / overallStats.totalStudents) * 100)}% of students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Students</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overallStats.highRiskStudents}</div>
            <p className="text-xs text-muted-foreground">
              Below 65% or 3+ critical subjects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Batch Average</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.averageAttendance}%</div>
            <Badge variant={overallStats.averageAttendance >= 75 ? "default" : "destructive"} className="text-xs">
              {overallStats.averageAttendance >= 75 ? "Good" : "Needs Improvement"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Subject-wise Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Subject-wise Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {subjectAnalytics
              .sort((a, b) => b.averageAttendance - a.averageAttendance)
              .map((subject) => (
                <div key={subject.subjectId} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="font-medium">{subject.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {subject.code} • {subject.totalSessions} sessions
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-medium">{subject.averageAttendance}%</div>
                      <div className="text-sm text-muted-foreground">
                        {subject.studentsAbove75} good, {subject.studentsBelow75} at risk
                      </div>
                    </div>
                    <div className="w-24">
                      <Progress value={subject.averageAttendance} />
                    </div>
                    {getTrendIcon(subject.trend)}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* At-Risk Students */}
      {overallStats.highRiskStudents > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              High-Risk Students (Immediate Attention Required)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {studentRiskAnalytics
                .filter(student => student.riskLevel === "high")
                .sort((a, b) => a.overallAttendance - b.overallAttendance)
                .map((student) => (
                  <div key={student.studentId} className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {student.rollNumber} • {student.criticalSubjects} critical subjects
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant="destructive">
                        {student.overallAttendance}%
                      </Badge>
                      <Badge variant="outline" className={getRiskColor(student.riskLevel)}>
                        High Risk
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medium Risk Students */}
      {overallStats.mediumRiskStudents > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <TrendingDown className="h-5 w-5" />
              Medium-Risk Students (Monitor Closely)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {studentRiskAnalytics
                .filter(student => student.riskLevel === "medium")
                .sort((a, b) => a.overallAttendance - b.overallAttendance)
                .slice(0, 10) // Show top 10 medium risk students
                .map((student) => (
                  <div key={student.studentId} className="flex items-center justify-between p-3 border border-yellow-200 rounded-lg bg-yellow-50 dark:bg-yellow-900/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                        <TrendingDown className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {student.rollNumber} • {student.criticalSubjects} critical subjects
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary">
                        {student.overallAttendance}%
                      </Badge>
                      <Badge variant="outline" className={getRiskColor(student.riskLevel)}>
                        Medium Risk
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}