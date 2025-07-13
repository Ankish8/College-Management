import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"

export default async function ManageTimetablePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/auth/signin")
  }

  const user = session.user as any
  
  if (!isAdmin(user) && !isFaculty(user)) {
    redirect("/timetable")
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Manage Timetable</h1>
              <p className="text-muted-foreground">
                Create and manage class schedules
              </p>
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-center text-muted-foreground">
              Timetable management features coming soon...
            </p>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}