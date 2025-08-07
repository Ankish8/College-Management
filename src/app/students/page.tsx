import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import dynamic from "next/dynamic"
import { StudentListSkeleton } from "@/components/ui/skeletons"

// Dynamic import for heavy student components
const StudentList = dynamic(
  () => import("@/components/students/student-list").then(mod => ({ default: mod.StudentList })),
  {
    loading: () => <StudentListSkeleton count={8} />,

  }
)

export default async function StudentsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect("/auth/signin")
  }

  // Only admins and faculty can access student management
  if (!isAdmin(session.user as any) && !isFaculty(session.user as any)) {
    redirect("/dashboard")
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <StudentList />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}