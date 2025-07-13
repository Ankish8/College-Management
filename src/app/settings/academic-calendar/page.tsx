import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/utils/permissions"
import { db } from "@/lib/db"
import { AcademicCalendarSettings } from "@/components/settings/academic-calendar-settings"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"

export const metadata: Metadata = {
  title: "Academic Calendar Settings",
  description: "Configure academic calendars, semesters, holidays, and exam periods",
}

export default async function AcademicCalendarSettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || !isAdmin(session.user as any)) {
    redirect("/dashboard")
  }

  // Get user's department
  const user = await db.user.findUnique({
    where: { id: (session.user as any).id },
    include: {
      department: {
        include: {
          academicCalendars: {
            include: {
              holidays: true,
              examPeriods: true,
            },
            orderBy: {
              semesterStart: 'desc'
            }
          },
          holidays: {
            where: {
              academicCalendarId: null // Department-wide holidays
            },
            orderBy: {
              date: 'desc'
            }
          }
        }
      }
    }
  })

  if (!user?.department) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">Academic Calendar Settings</h1>
                <p className="text-sm text-muted-foreground">
                  Configure academic calendars, semesters, holidays, and exam periods
                </p>
              </div>
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No department assigned. Please contact system administrator.
                </p>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Academic Calendar Settings</h1>
              <p className="text-sm text-muted-foreground">
                Configure academic calendars, semesters, holidays, and exam periods for {user.department.name}
              </p>
            </div>

            <AcademicCalendarSettings 
              department={user.department}
              academicCalendars={user.department.academicCalendars}
              departmentHolidays={user.department.holidays}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}