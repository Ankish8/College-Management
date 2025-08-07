import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import dynamic from "next/dynamic"
import { TableSkeleton } from "@/components/ui/skeletons"

// Dynamic import for heavy faculty components
const FacultyList = dynamic(
  () => import("@/components/faculty/faculty-list").then(mod => ({ default: mod.FacultyList })),
  {
    loading: () => <TableSkeleton rows={8} columns={7} />
  }
)

export default async function FacultyPage() {
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
          <FacultyList />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}