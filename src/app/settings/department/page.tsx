import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/utils/permissions"
import { db } from "@/lib/db"
import { DepartmentSettingsForm } from "@/components/settings/department-settings-form"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"

export const metadata: Metadata = {
  title: "Department Settings",
  description: "Configure department-specific workload and academic settings",
}

export default async function DepartmentSettingsPage() {
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
          settings: true
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
                <h1 className="text-2xl font-semibold tracking-tight">Department Settings</h1>
                <p className="text-sm text-muted-foreground">
                  Configure department-specific workload and academic settings
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

  // Get or create department settings
  let settings = user.department.settings
  if (!settings) {
    settings = await db.departmentSettings.create({
      data: {
        departmentId: user.department.id,
        creditHoursRatio: 15,
        maxFacultyCredits: 30,
        coFacultyWeight: 0.5,
      }
    })
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Department Settings</h1>
              <p className="text-sm text-muted-foreground">
                Configure workload limits, credit ratios, and other department-specific settings for {user.department.name}
              </p>
            </div>

            <DepartmentSettingsForm 
              department={user.department}
              settings={{
                ...settings,
                schedulingMode: settings.schedulingMode as "MODULE_BASED" | "WEEKLY_RECURRING"
              }}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}