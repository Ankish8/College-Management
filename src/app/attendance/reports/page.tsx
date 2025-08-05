import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { canViewAttendance } from "@/lib/utils/permissions"
import { AttendanceReportsContent } from "@/components/attendance/attendance-reports-content"

export default async function AttendanceReportsPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  
  if (!session?.user) {
    redirect("/auth/signin")
  }

  if (!canViewAttendance(user)) {
    redirect("/dashboard")
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Attendance Reports</h1>
              <p className="text-muted-foreground">
                View comprehensive attendance analytics and detailed student reports
              </p>
            </div>
          </div>
          <AttendanceReportsContent />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}