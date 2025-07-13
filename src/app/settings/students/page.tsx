import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/utils/permissions"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Upload, UserPlus, Settings2, FileText, Download } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Student Settings",
  description: "Configure student management settings and bulk operations",
}

export default async function StudentSettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || !isAdmin(session.user as any)) {
    redirect("/dashboard")
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Student Settings</h1>
              <p className="text-sm text-muted-foreground">
                Configure student management settings and perform bulk operations
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Bulk Operations</CardTitle>
                  </div>
                  <CardDescription>
                    Import students from Excel files and manage bulk data operations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button asChild className="w-full">
                    <Link href="/students">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Go to Student Management
                    </Link>
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Use the bulk upload feature in the main student management page to import multiple students at once.
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Data Export</CardTitle>
                  </div>
                  <CardDescription>
                    Export student data and generate reports
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" disabled className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Export Student Data
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Export functionality coming soon. Export all student records to Excel format.
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Student ID Configuration</CardTitle>
                  </div>
                  <CardDescription>
                    Configure automatic student ID generation and formatting
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" disabled className="w-full">
                    <Settings2 className="mr-2 h-4 w-4" />
                    Configure ID Format
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Currently using automatic generation. Custom format configuration coming soon.
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Batch Management</CardTitle>
                  </div>
                  <CardDescription>
                    Configure batch settings and student group management
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/settings/batch-config">
                      <Settings2 className="mr-2 h-4 w-4" />
                      Batch Configuration
                    </Link>
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Manage academic batches, semesters, and student groupings.
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common student management tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" asChild>
                    <Link href="/students">View All Students</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/batches">Manage Batches</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/settings">Back to Settings</Link>
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