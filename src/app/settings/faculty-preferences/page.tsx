import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isFaculty, isAdmin } from "@/lib/utils/permissions"
import { db } from "@/lib/db"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

// Dynamic import for heavy admin components
const FacultyPreferencesForm = dynamic(
  () => import("@/components/settings/faculty-preferences-form").then(mod => ({ default: mod.FacultyPreferencesForm })),
  {
    loading: () => (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    ),
    ssr: false
  }
)

export const metadata: Metadata = {
  title: "Faculty Preferences",
  description: "Configure teaching preferences, availability, and notification settings",
}

export default async function FacultyPreferencesPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || (!isFaculty(session.user as any) && !isAdmin(session.user as any))) {
    redirect("/dashboard")
  }

  // Get user and their preferences
  const user = await db.user.findUnique({
    where: { id: (session.user as any).id },
    include: {
      facultyPreferences: {
        include: {
          blackoutPeriods: true
        }
      },
      department: true
    }
  })

  if (!user) {
    redirect("/dashboard")
  }

  // Get available time slots for preference selection
  const timeSlots = await db.timeSlot.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  })

  // Get or create faculty preferences
  let preferences: any = user.facultyPreferences
  if (!preferences) {
    preferences = await db.facultyPreferences.create({
      data: {
        facultyId: user.id,
        maxDailyHours: 8,
        maxWeeklyHours: 40,
        preferredTimeSlots: undefined,
        notificationSettings: {
          scheduleChanges: true,
          newAssignments: true,
          conflictAlerts: true,
          reminderNotifications: true,
          emailDigest: "daily"
        }
      },
      include: {
        blackoutPeriods: true
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
              <h1 className="text-2xl font-semibold tracking-tight">Faculty Preferences</h1>
              <p className="text-sm text-muted-foreground">
                Configure your teaching preferences, availability, and notification settings
              </p>
            </div>

            <FacultyPreferencesForm 
              user={user as any}
              preferences={preferences}
              timeSlots={timeSlots}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}