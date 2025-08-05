import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { canMarkAttendance } from "@/lib/utils/permissions"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { AttendancePageContent } from "@/components/attendance/attendance-page-content"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"

/**
 * Main Attendance Page
 * 
 * This page serves as the primary interface for marking attendance.
 * It integrates the attendance tracker system with the main dashboard.
 */
export default async function AttendancePage() {
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

  if (!userWithDepartment?.department) {
    throw new Error("User department not found")
  }

  // Fetch subjects that the user can mark attendance for
  // Note: We'll filter by date dynamically on the client side
  
  const subjects = await db.subject.findMany({
    where: {
      isActive: true,
      batch: {
        program: {
          departmentId: userWithDepartment.department.id
        }
      }
      // Faculty can mark attendance for all subjects in their department
      // No restriction to only subjects they teach
    },
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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-xl font-semibold mb-2">No Subjects Available</h2>
              <p className="text-muted-foreground max-w-md">
                {user.role === 'FACULTY' 
                  ? "You don't have any subjects assigned for attendance marking."
                  : "No active subjects found in your department."
                }
              </p>
              <div className="mt-4 text-sm text-muted-foreground">
                Contact your administrator if you believe this is an error.
              </div>
            </div>
          ) : (
            <AttendancePageContent 
              subjects={transformedSubjects}
              currentUser={user}
              department={userWithDepartment.department}
            />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}