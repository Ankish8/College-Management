"use client"

import * as React from "react"
import {
  Calendar,
  ChevronUp,
  GraduationCap,
  Home,
  Settings,
  ClipboardList,
  BarChart3,
  User2,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useSession } from "next-auth/react"
import { isAdmin } from "@/lib/utils/permissions"
import Link from "next/link"

// Navigation data based on user roles
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      roles: ["ADMIN", "FACULTY", "STUDENT"],
    },
    {
      title: "Academic",
      icon: GraduationCap,
      roles: ["ADMIN", "FACULTY"],
      items: [
        {
          title: "Batches",
          url: "/batches",
          roles: ["ADMIN", "FACULTY"],
        },
        {
          title: "Subjects",
          url: "/subjects",
          roles: ["ADMIN", "FACULTY"],
        },
        {
          title: "Students",
          url: "/students",
          roles: ["ADMIN"],
        },
        {
          title: "Faculty",
          url: "/faculty",
          roles: ["ADMIN"],
        },
      ],
    },
    {
      title: "Timetable",
      icon: Calendar,
      roles: ["ADMIN", "FACULTY", "STUDENT"],
      items: [
        {
          title: "View Timetable",
          url: "/timetable",
          roles: ["ADMIN", "FACULTY", "STUDENT"],
        },
        {
          title: "Manage Timetable",
          url: "/timetable/manage",
          roles: ["ADMIN", "FACULTY"],
        },
        {
          title: "Time Slots",
          url: "/settings/timeslots",
          roles: ["ADMIN"],
        },
      ],
    },
    {
      title: "Attendance",
      icon: ClipboardList,
      roles: ["ADMIN", "FACULTY", "STUDENT"],
      items: [
        {
          title: "Mark Attendance",
          url: "/attendance",
          roles: ["ADMIN", "FACULTY"],
        },
        {
          title: "My Attendance",
          url: "/my-attendance",
          roles: ["STUDENT"],
        },
        {
          title: "Attendance Reports",
          url: "/attendance/reports",
          roles: ["ADMIN", "FACULTY"],
        },
        {
          title: "Disputes",
          url: "/attendance/disputes",
          roles: ["ADMIN", "FACULTY"],
        },
      ],
    },
    {
      title: "Analytics",
      icon: BarChart3,
      roles: ["ADMIN", "FACULTY"],
      items: [
        {
          title: "Overview",
          url: "/analytics",
          roles: ["ADMIN", "FACULTY"],
        },
        {
          title: "Performance",
          url: "/analytics/performance",
          roles: ["ADMIN", "FACULTY"],
        },
        {
          title: "Trends",
          url: "/analytics/trends",
          roles: ["ADMIN"],
        },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      roles: ["ADMIN"],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session, status } = useSession()
  const user = session?.user
  const userRole = user?.role || ""

  // Show loading state if session is still loading
  if (status === "loading") {
    return (
      <Sidebar variant="inset" {...props}>
        <SidebarHeader>
          <div className="p-2">Loading...</div>
        </SidebarHeader>
      </Sidebar>
    )
  }

  // Filter navigation items based on user role
  const filteredNavMain = data.navMain
    .filter(item => userRole && item.roles?.includes(userRole))
    .map(item => {
      if (item.items) {
        const filteredItems = item.items.filter(subItem => 
          subItem.roles?.includes(userRole)
        )
        return {
          ...item,
          items: filteredItems.length > 0 ? filteredItems : undefined
        }
      }
      return item
    })
    .filter(item => !item.items || item.items.length > 0)

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GraduationCap className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">JLU College</span>
                  <span className="truncate text-xs">Management System</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.items ? (
                    <>
                      <SidebarMenuButton tooltip={item.title}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild>
                              <Link href={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </>
                  ) : (
                    <SidebarMenuButton tooltip={item.title} asChild>
                      <Link href={item.url}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src="" alt={user?.name || ""} />
                    <AvatarFallback className="rounded-lg">
                      {user?.name?.slice(0, 2)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name || "User"}</span>
                    <span className="truncate text-xs">{user?.role}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src="" alt={user?.name || ""} />
                      <AvatarFallback className="rounded-lg">
                        {user?.name?.slice(0, 2)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.name || "User"}</span>
                      <span className="truncate text-xs">{user?.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User2 className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                {isAdmin(user) && (
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}