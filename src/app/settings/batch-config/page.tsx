import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/utils/permissions"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

// Dynamic import for heavy admin components
const BatchConfiguration = dynamic(
  () => import("@/components/settings/batch-configuration").then(mod => ({ default: mod.BatchConfiguration })),
  {
    loading: () => (
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    ),

  }
)

export default async function BatchConfigPage() {
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
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <BatchConfiguration />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}