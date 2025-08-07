import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import dynamic from "next/dynamic"
import { CardSkeleton } from "@/components/ui/skeletons"

// Dynamic import for heavy batch components
const BatchList = dynamic(
  () => import("@/components/batches/batch-list").then(mod => ({ default: mod.BatchList })),
  {
    loading: () => (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    ),
    ssr: false
  }
)

export default async function BatchesPage() {
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
          <BatchList />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}