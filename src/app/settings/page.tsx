import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/utils/permissions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, GraduationCap, Clock, Users, BookOpen, Building2, Calendar, CalendarDays, UserCheck } from "lucide-react"
import Link from "next/link"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"

export const metadata: Metadata = {
  title: "Settings",
  description: "System configuration and settings",
}

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || !isAdmin(session.user as any)) {
    redirect("/dashboard")
  }

  const settingsCards = [
    {
      title: "Department Settings",
      description: "Configure workload limits, credit ratios, and department-specific settings",
      icon: Building2,
      href: "/settings/department",
      available: true,
    },
    {
      title: "Batch Configuration",
      description: "Manage academic batches, semesters, and student groups",
      icon: GraduationCap,
      href: "/settings/batch-config",
      available: true,
    },
    {
      title: "Subject Management",
      description: "Configure subjects, credits, and faculty assignments",
      icon: BookOpen,
      href: "/settings/subjects",
      available: true,
    },
    {
      title: "Time Slots",
      description: "Set up class timings and schedule periods",
      icon: Clock,
      href: "/settings/timeslots",
      available: true,
    },
    {
      title: "Timetable Settings",
      description: "Configure scheduling modes, breaks, and conflict resolution",
      icon: Calendar,
      href: "/settings/timetable",
      available: true,
    },
    {
      title: "Academic Calendar",
      description: "Manage academic calendars, semesters, holidays, and exam periods",
      icon: CalendarDays,
      href: "/settings/academic-calendar",
      available: true,
    },
    {
      title: "Faculty Preferences",
      description: "Configure teaching preferences, availability, and notification settings",
      icon: UserCheck,
      href: "/settings/faculty-preferences",
      available: true,
    },
    {
      title: "User Management",
      description: "Manage faculty, students, and system users",
      icon: Users,
      href: "/settings/users",
      available: false,
    },
  ]

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Configure system settings and manage academic resources
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {settingsCards.map((card) => (
                <Card key={card.href} className={!card.available ? "opacity-60" : ""}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <card.icon className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{card.title}</CardTitle>
                    </div>
                    <CardDescription>{card.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {card.available ? (
                      <Button asChild>
                        <Link href={card.href}>
                          <Settings className="mr-2 h-4 w-4" />
                          Configure
                        </Link>
                      </Button>
                    ) : (
                      <Button disabled>
                        Coming Soon
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common administrative tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" asChild>
                    <Link href="/students">Manage Students</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/faculty">Manage Faculty</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/subjects">Manage Subjects</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/batches">Manage Batches</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}