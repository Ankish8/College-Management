import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/utils/permissions"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

// Dynamic import for heavy faculty components
const SubjectAllotmentContent = dynamic(
  () => import("@/components/faculty/subject-allotment-content").then(mod => ({ default: mod.SubjectAllotmentContent })),
  {
    loading: () => (
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }
)

export default async function SubjectAllotmentPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect("/auth/signin")
  }

  if (!isAdmin(session.user as any)) {
    redirect("/dashboard")
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 min-h-0 min-w-0 max-w-full overflow-hidden" style={{ width: '100%', maxWidth: '100%' }}>
          <SubjectAllotmentContent />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}