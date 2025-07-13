import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Settings
} from "lucide-react"
import Link from "next/link"
import { db } from "@/lib/db"

async function getDashboardStats() {
  try {
    const [students, batches, subjects, faculty, todayAttendance] = await Promise.all([
      db.student.count(),
      db.batch.count({ where: { isActive: true } }),
      db.subject.count({ where: { isActive: true } }),
      db.user.count({ where: { role: "FACULTY" } }),
      // Placeholder for today's attendance - would need actual calculation
      Promise.resolve(85.5)
    ])

    return {
      totalStudents: students,
      totalBatches: batches,
      totalSubjects: subjects,
      totalFaculty: faculty,
      todayAttendance: todayAttendance,
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    // Return fallback data if database query fails
    return {
      totalStudents: 1,
      totalBatches: 2,
      totalSubjects: 0,
      totalFaculty: 1,
      todayAttendance: 85.5,
    }
  }
}

export async function SectionCards() {
  const stats = await getDashboardStats()

  const essentialCards = [
    {
      title: "Total Students",
      value: stats.totalStudents.toString(),
      description: "Active students",
      icon: Users,
      trend: "+12% from last month",
      trendUp: true,
      href: "/students"
    },
    {
      title: "Total Batches",
      value: stats.totalBatches.toString(),
      description: "All batches",
      icon: GraduationCap,
      trend: "2 active this sem",
      trendUp: null,
      href: "/batches"
    },
    {
      title: "Faculty Members",
      value: stats.totalFaculty.toString(),
      description: "Teaching faculty",
      icon: Users,
      trend: "All active",
      trendUp: null,
      href: "/faculty"
    },
  ]

  return (
    <div className="space-y-3 p-4">
      {/* Ultra Compact Metrics Bar */}
      <div className="flex items-center gap-6 bg-muted/30 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{stats.totalStudents}</span>
          <span className="text-xs text-muted-foreground">Students</span>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{stats.totalBatches}</span>
          <span className="text-xs text-muted-foreground">Batches</span>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{stats.totalFaculty}</span>
          <span className="text-xs text-muted-foreground">Faculty</span>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-green-600">{stats.todayAttendance}%</span>
          <span className="text-xs text-muted-foreground">Today&apos;s Attendance</span>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-blue-600">3</span>
          <span className="text-xs text-muted-foreground">Ongoing</span>
        </div>
      </div>

      {/* Alert Strip */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded px-3 py-2">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium text-orange-700">3</span>
          <span className="text-xs text-orange-600">Pending Approvals</span>
          <Button variant="link" size="sm" className="h-auto p-0 text-xs text-orange-700" asChild>
            <Link href="/admin/approvals">Review</Link>
          </Button>
        </div>
        
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded px-3 py-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm font-medium text-red-700">2</span>
          <span className="text-xs text-red-600">Low Attendance</span>
          <Button variant="link" size="sm" className="h-auto p-0 text-xs text-red-700" asChild>
            <Link href="/analytics/attendance">View</Link>
          </Button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between bg-background border rounded-lg p-3">
        <h3 className="text-sm font-medium">Quick Actions</h3>
        <div className="flex gap-2">
          <Button size="sm" asChild>
            <Link href="/batches/new">
              <GraduationCap className="mr-1 h-3 w-3" />
              Batch
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/subjects">
              <BookOpen className="mr-1 h-3 w-3" />
              Subjects
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/timetable">
              <Calendar className="mr-1 h-3 w-3" />
              Timetable
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/analytics">
              <TrendingUp className="mr-1 h-3 w-3" />
              Analytics
            </Link>
          </Button>
        </div>
      </div>

      {/* Compact Activity Feed */}
      <div className="bg-background border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Recent Activity</h3>
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
            <Link href="/admin/activity-log">View all</Link>
          </Button>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-muted-foreground">Faculty registration submitted</span>
            <span className="text-xs text-muted-foreground">2m</span>
          </div>
          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-muted-foreground">Attendance marked for B.Des Sem 5</span>
            <span className="text-xs text-muted-foreground">15m</span>
          </div>
          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-muted-foreground">New batch created: M.Des Sem 1</span>
            <span className="text-xs text-muted-foreground">1h</span>
          </div>
        </div>
      </div>
    </div>
  )
}