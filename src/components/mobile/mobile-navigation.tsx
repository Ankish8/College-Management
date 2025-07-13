"use client"

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { 
  Home, 
  Calendar, 
  ClipboardList, 
  Users, 
  BookOpen, 
  BarChart3, 
  Settings,
  Menu,
  X,
  Plus,
  Bell
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { isAdmin, isFaculty, isStudent } from '@/lib/utils/permissions'
import Link from 'next/link'
import { PWAStatusIndicator, usePWAContext } from '@/components/providers/pwa-provider'

interface NavigationItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  badge?: string | number
  color?: string
  roles: string[]
  children?: NavigationItem[]
}

const navigationItems: NavigationItem[] = [
  {
    icon: Home,
    label: 'Dashboard',
    href: '/dashboard',
    color: 'text-blue-600',
    roles: ['ADMIN', 'FACULTY', 'STUDENT']
  },
  {
    icon: Calendar,
    label: 'Timetable',
    href: '/timetable',
    color: 'text-green-600',
    roles: ['ADMIN', 'FACULTY', 'STUDENT']
  },
  {
    icon: ClipboardList,
    label: 'Attendance',
    href: '/attendance',
    color: 'text-orange-600',
    roles: ['ADMIN', 'FACULTY'],
    children: [
      {
        icon: ClipboardList,
        label: 'Mark Attendance',
        href: '/attendance/mark',
        roles: ['ADMIN', 'FACULTY']
      },
      {
        icon: BarChart3,
        label: 'View Reports',
        href: '/attendance/reports',
        roles: ['ADMIN', 'FACULTY']
      }
    ]
  },
  {
    icon: ClipboardList,
    label: 'My Attendance',
    href: '/my-attendance',
    color: 'text-purple-600',
    roles: ['STUDENT']
  },
  {
    icon: Users,
    label: 'Students',
    href: '/students',
    color: 'text-indigo-600',
    roles: ['ADMIN', 'FACULTY']
  },
  {
    icon: BookOpen,
    label: 'Subjects',
    href: '/subjects',
    color: 'text-teal-600',
    roles: ['ADMIN', 'FACULTY']
  },
  {
    icon: Users,
    label: 'Faculty',
    href: '/faculty',
    color: 'text-pink-600',
    roles: ['ADMIN']
  },
  {
    icon: BarChart3,
    label: 'Analytics',
    href: '/analytics',
    color: 'text-cyan-600',
    roles: ['ADMIN', 'FACULTY']
  },
  {
    icon: Settings,
    label: 'Settings',
    href: '/settings',
    color: 'text-gray-600',
    roles: ['ADMIN']
  }
]

export function MobileNavigation() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [quickActions, setQuickActions] = useState<NavigationItem[]>([])
  const { isOnline, notifications } = usePWAContext()
  
  const user = session?.user
  const userRole = (user as any)?.role || ''

  // Filter navigation items based on user role
  const filteredNavItems = navigationItems.filter(item => 
    userRole && item.roles.includes(userRole)
  )

  // Get quick actions based on user role and time of day
  useEffect(() => {
    if (!userRole) return

    const now = new Date()
    const hour = now.getHours()
    const isClassTime = hour >= 9 && hour <= 17 // 9 AM to 5 PM

    const actions: NavigationItem[] = []

    if (isFaculty(user as any) || isAdmin(user as any)) {
      if (isClassTime) {
        actions.push({
          icon: ClipboardList,
          label: 'Mark Attendance',
          href: '/attendance/mark',
          color: 'text-green-600',
          badge: 'Quick',
          roles: ['FACULTY', 'ADMIN']
        })
      }
      
      actions.push({
        icon: Calendar,
        label: 'Today\'s Classes',
        href: '/timetable?view=day',
        color: 'text-blue-600',
        roles: ['FACULTY', 'ADMIN']
      })
    }

    if (isStudent(user as any)) {
      actions.push({
        icon: Calendar,
        label: 'My Schedule',
        href: '/timetable',
        color: 'text-blue-600',
        roles: ['STUDENT']
      })
      
      actions.push({
        icon: ClipboardList,
        label: 'My Attendance',
        href: '/my-attendance',
        color: 'text-purple-600',
        roles: ['STUDENT']
      })
    }

    setQuickActions(actions)
  }, [userRole, user])

  const handleNavigation = (href: string) => {
    setIsOpen(false)
    router.push(href)
  }

  const isCurrentPath = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg md:hidden">
        <div className="grid grid-cols-5 h-16">
          {/* Home */}
          <Link
            href="/dashboard"
            className={cn(
              "flex flex-col items-center justify-center text-xs gap-1 transition-colors",
              isCurrentPath('/dashboard') 
                ? "text-primary bg-primary/5" 
                : "text-gray-600 hover:text-primary"
            )}
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </Link>

          {/* Timetable */}
          <Link
            href="/timetable"
            className={cn(
              "flex flex-col items-center justify-center text-xs gap-1 transition-colors",
              isCurrentPath('/timetable') 
                ? "text-primary bg-primary/5" 
                : "text-gray-600 hover:text-primary"
            )}
          >
            <Calendar className="h-5 w-5" />
            <span>Schedule</span>
          </Link>

          {/* Quick Action Button (Center) */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                size="sm"
                className="mx-auto mt-1 h-12 w-12 rounded-full shadow-lg"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </SheetTrigger>
          </Sheet>

          {/* Attendance/My Attendance */}
          <Link
            href={isStudent(user as any) ? "/my-attendance" : "/attendance"}
            className={cn(
              "flex flex-col items-center justify-center text-xs gap-1 transition-colors",
              isCurrentPath('/attendance') || isCurrentPath('/my-attendance')
                ? "text-primary bg-primary/5" 
                : "text-gray-600 hover:text-primary"
            )}
          >
            <ClipboardList className="h-5 w-5" />
            <span>Attendance</span>
            {!isOnline && (
              <Badge variant="destructive" className="h-1 w-1 p-0 absolute top-2 right-2" />
            )}
          </Link>

          {/* More Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center text-xs gap-1 text-gray-600 hover:text-primary transition-colors">
                <Menu className="h-5 w-5" />
                <span>More</span>
                {notifications.isSupported && !notifications.isSubscribed && (
                  <Badge variant="secondary" className="h-1 w-1 p-0 absolute top-2 right-2" />
                )}
              </button>
            </SheetTrigger>
          </Sheet>
        </div>
      </div>

      {/* Mobile Slide-out Menu */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          <div className="py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">Menu</h2>
                <p className="text-sm text-muted-foreground">
                  {user?.name} • {userRole}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <PWAStatusIndicator />
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            {quickActions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action) => (
                    <Button
                      key={action.href}
                      variant="outline"
                      size="sm"
                      onClick={() => handleNavigation(action.href)}
                      className="h-16 flex-col gap-2"
                    >
                      <action.icon className={cn("h-5 w-5", action.color)} />
                      <span className="text-xs">{action.label}</span>
                      {action.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {action.badge}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Full Navigation */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Navigation</h3>
              {filteredNavItems.map((item) => (
                <div key={item.href}>
                  <Button
                    variant={isCurrentPath(item.href) ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => handleNavigation(item.href)}
                    className="w-full justify-start h-12"
                  >
                    <item.icon className={cn("h-5 w-5 mr-3", item.color)} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                  
                  {/* Sub-items */}
                  {item.children && isCurrentPath(item.href) && (
                    <div className="ml-8 mt-2 space-y-1">
                      {item.children
                        .filter(child => userRole && child.roles.includes(userRole))
                        .map((child) => (
                          <Button
                            key={child.href}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleNavigation(child.href)}
                            className="w-full justify-start h-10 text-sm"
                          >
                            <child.icon className="h-4 w-4 mr-3 text-gray-500" />
                            <span>{child.label}</span>
                          </Button>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* PWA Actions */}
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-sm font-medium text-gray-700 mb-3">App Features</h3>
              <div className="space-y-2">
                {!notifications.isSubscribed && notifications.isSupported && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      notifications.subscribe()
                      setIsOpen(false)
                    }}
                    className="w-full justify-start"
                  >
                    <Bell className="h-4 w-4 mr-3 text-blue-600" />
                    <span>Enable Notifications</span>
                    <Badge variant="secondary" className="ml-auto">
                      New
                    </Badge>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

// Mobile-specific header component
export function MobileHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { isOnline } = usePWAContext()
  
  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 md:hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <Badge variant="destructive" className="text-xs">
              Offline
            </Badge>
          )}
          <PWAStatusIndicator />
        </div>
      </div>
    </div>
  )
}

// Mobile card component optimized for touch
export function MobileCard({ 
  children, 
  className,
  onClick,
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & {
  onClick?: () => void
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 shadow-sm",
        "active:scale-[0.98] transition-transform duration-100",
        onClick && "cursor-pointer hover:shadow-md",
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}

// Touch-optimized button sizes
export const mobileTouchTargets = {
  button: "min-h-[44px] min-w-[44px]", // Apple HIG recommendation
  icon: "h-6 w-6", // Larger icons for mobile
  text: "text-base", // Readable text size
  spacing: "p-4" // Adequate padding for touch
}