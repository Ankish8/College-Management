import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (!isAdmin(session.user) && !isFaculty(session.user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's department to only show faculty from same department
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { departmentId: true }
    })

    if (!user?.departmentId) {
      return NextResponse.json(
        { error: "User department not found" },
        { status: 400 }
      )
    }

    const faculty = await db.user.findMany({
      where: {
        role: "FACULTY",
        departmentId: user.departmentId,
        status: "ACTIVE"
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
      },
      orderBy: { name: "asc" }
    })

    return NextResponse.json(faculty)
  } catch (error) {
    console.error("Error fetching faculty:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}