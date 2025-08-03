import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from 'next/link'

export default function NotFound() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
            <Card className="max-w-lg w-full">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 border-2 border-muted rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  
                  <h1 className="text-3xl font-bold mb-2">404</h1>
                  <h2 className="text-lg font-semibold text-muted-foreground mb-4">Page Not Found</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button asChild className="w-full">
                    <Link href="/dashboard">
                      Go to Dashboard
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/">
                      Go to Home
                    </Link>
                  </Button>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <p className="text-xs text-muted-foreground">
                    JLU College Management System
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}