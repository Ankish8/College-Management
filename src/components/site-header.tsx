"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import SignOutButton from "@/components/auth/sign-out-button"
import { useSession } from "next-auth/react"
import { Bell } from "lucide-react"
import { UniversalSearchTrigger } from "./universal-search-trigger"
import { ServiceWorkerStatusMini } from "./ui/service-worker-status"
import { OfflineStatusMini } from "./ui/offline-status"

export function SiteHeader() {
  const { data: session } = useSession()
  const user = session?.user

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "FACULTY": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "STUDENT": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      
      {/* Universal Search */}
      <div className="flex flex-1 items-center gap-2">
        <UniversalSearchTrigger 
          placeholder="Search students, subjects, batches..."
          className="max-w-md"
        />
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Offline Status */}
        <OfflineStatusMini />
        
        {/* Service Worker Status */}
        <ServiceWorkerStatusMini />
        
        <Separator orientation="vertical" className="h-4" />
        
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
        </Button>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-2">
            <Badge variant="status-outline" className={getRoleColor((user as any).role)}>
              {(user as any).role}
            </Badge>
            <div className="hidden text-right sm:block">
              <div className="text-xs font-medium">{(user as any)?.name || "User"}</div>
              <div className="text-xs text-muted-foreground">
                {(user as any)?.department?.shortName || "JLU"}
              </div>
            </div>
            <SignOutButton />
          </div>
        )}
      </div>
    </header>
  )
}