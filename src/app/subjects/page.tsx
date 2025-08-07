import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import dynamic from "next/dynamic"
import { TableSkeleton } from "@/components/ui/skeletons"

// Dynamic import for heavy subject components
const SubjectList = dynamic(
  () => import("@/components/subjects/subject-list").then(mod => ({ default: mod.SubjectList })),
  {
    loading: () => <TableSkeleton rows={8} columns={6} />,

  }
)

export default async function SubjectsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect("/auth/signin")
  }

  if (!isAdmin(session.user as any) && !isFaculty(session.user as any)) {
    redirect("/dashboard")
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <SubjectList />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}