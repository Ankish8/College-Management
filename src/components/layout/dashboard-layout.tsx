import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { isAdmin, isFaculty, isStudent } from "@/lib/utils/permissions"
import SignOutButton from "@/components/auth/sign-out-button"
import Link from "next/link"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  const user = session?.user

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN": return "bg-red-100 text-red-800"
      case "FACULTY": return "bg-blue-100 text-blue-800"
      case "STUDENT": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-xl font-semibold text-gray-900">
                JLU College Management
              </Link>
              <div className="hidden md:flex items-center space-x-4">
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                  Dashboard
                </Link>
                {(isAdmin(user as any) || isFaculty(user as any)) && (
                  <>
                    <Link href="/batches" className="text-gray-600 hover:text-gray-900">
                      Batches
                    </Link>
                    <Link href="/subjects" className="text-gray-600 hover:text-gray-900">
                      Subjects
                    </Link>
                    <Link href="/timetable" className="text-gray-600 hover:text-gray-900">
                      Timetable
                    </Link>
                  </>
                )}
                {(isAdmin(user as any) || isFaculty(user as any)) && (
                  <Link href="/attendance" className="text-gray-600 hover:text-gray-900">
                    Attendance
                  </Link>
                )}
                {isStudent(user as any) && (
                  <Link href="/my-attendance" className="text-gray-600 hover:text-gray-900">
                    My Attendance
                  </Link>
                )}
                {isAdmin(user as any) && (
                  <>
                    <Link href="/students" className="text-gray-600 hover:text-gray-900">
                      Students
                    </Link>
                    <Link href="/faculty" className="text-gray-600 hover:text-gray-900">
                      Faculty
                    </Link>
                    <Link href="/settings" className="text-gray-600 hover:text-gray-900">
                      Settings
                    </Link>
                  </>
                )}
              </div>
            </div>
            
            {session?.user && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Badge variant="status-outline" className={getRoleColor((user as any)?.role)}>
                    {(user as any)?.role}
                  </Badge>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {(user as any)?.name || "User"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(user as any)?.department?.shortName || "JLU"}
                    </div>
                  </div>
                </div>
                <SignOutButton />
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}