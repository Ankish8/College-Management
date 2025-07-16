import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/utils/permissions"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SubjectAllotmentContent } from "@/components/faculty/subject-allotment-content"

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