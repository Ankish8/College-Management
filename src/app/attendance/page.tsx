import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { canMarkAttendance } from "@/lib/utils/permissions"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { AttendancePageContent } from "@/components/attendance/attendance-page-content"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { GraduationCap } from "lucide-react"

/**
 * Main Attendance Page
 * 
 * This page serves as the primary interface for marking attendance.
 * It integrates the attendance tracker system with the main dashboard.
 */
export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Get user session and verify authentication
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  // Redirect to signin if not authenticated
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Check if user has permission to mark attendance
  if (!canMarkAttendance(user)) {
    redirect('/dashboard')
  }

  // Get user's department to fetch relevant subjects
  const userWithDepartment = await db.user.findUnique({
    where: { id: user.id },
    include: {
      department: {
        select: {
          id: true,
          name: true,
          shortName: true,
        }
      }
    }
  })

  // Handle admin users who may not have a department
  let subjectWhereClause: any = {
    isActive: true,
  };

  if (userWithDepartment?.department) {
    // Regular users - filter by their department
    subjectWhereClause.batch = {
      program: {
        departmentId: userWithDepartment.department.id
      }
    };
  } else if (user.role === 'ADMIN') {
    // Admin users can see all subjects across departments
    // No additional filtering needed
  } else {
    // Non-admin users without department - this shouldn't happen
    throw new Error("User department not found")
  }

  // Fetch subjects that the user can mark attendance for
  // Note: We'll filter by date dynamically on the client side
  
  const subjects = await db.subject.findMany({
    where: subjectWhereClause,
    include: {
      batch: {
        include: {
          program: {
            select: {
              name: true,
              shortName: true,
            }
          },
          specialization: {
            select: {
              name: true,
              shortName: true,
            }
          }
        }
      },
      primaryFaculty: {
        select: {
          name: true,
          email: true,
        }
      },
      coFaculty: {
        select: {
          name: true,
          email: true,
        }
      },
      timetableEntries: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
          dayOfWeek: true,
          timeSlotId: true,
          isActive: true,
        }
      },
      _count: {
        select: {
          attendanceSessions: true,
        }
      }
    },
    orderBy: [
      { batch: { semester: 'desc' } }, // Current semester first
      { name: 'asc' }
    ]
  })


  // Transform subjects for the attendance interface
  const transformedSubjects = subjects.map(subject => ({
    id: subject.id,
    name: subject.name,
    code: subject.code,
    credits: subject.credits,
    batch: {
      id: subject.batch.id,
      name: subject.batch.name,
      semester: subject.batch.semester,
      program: subject.batch.program,
      specialization: subject.batch.specialization,
    },
    faculty: {
      primary: subject.primaryFaculty,
      co: subject.coFaculty,
    },
    timetableEntries: subject.timetableEntries,
    attendanceSessionsCount: subject._count.attendanceSessions,
  }))

  // Create breadcrumb items based on URL parameters
  const resolvedSearchParams = await searchParams
  const selectedBatchId = resolvedSearchParams?.batch as string
  const selectedSubjectId = resolvedSearchParams?.subject as string
  const selectedDate = resolvedSearchParams?.date as string

  let selectedBatch: any = null
  let selectedSubject: any = null

  if (selectedBatchId && selectedSubjectId) {
    selectedSubject = transformedSubjects.find(s => s.id === selectedSubjectId)
    selectedBatch = selectedSubject?.batch
  }

  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Timetable", href: "/timetable" },
    {
      label: selectedBatch && selectedSubject 
        ? `Mark Attendance - ${selectedSubject.name} (${selectedBatch.name})`
        : "Mark Attendance",
      current: true
    }
  ]

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {subjects.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center text-center space-y-4 max-w-md">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <GraduationCap className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium text-foreground">
                    {user.role === 'FACULTY' 
                      ? "No subjects assigned for attendance marking"
                      : "No active subjects found"
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Contact your administrator if you believe this is an error.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <AttendancePageContent 
              subjects={transformedSubjects}
              currentUser={user}
              department={userWithDepartment?.department || null}
              breadcrumbItems={breadcrumbItems}
            />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}