import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"
import { calculateFacultyWorkload } from "@/lib/utils/workload-calculator"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (!isAdmin(session.user as any) && !isFaculty(session.user as any))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const params = await context.params
    const { id: facultyId } = params

    // Verify faculty exists
    const faculty = await db.user.findUnique({
      where: { 
        id: facultyId,
        role: 'FACULTY'
      },
      include: {
        department: true
      }
    })

    if (!faculty) {
      return NextResponse.json(
        { error: "Faculty not found" },
        { status: 404 }
      )
    }

    if (!faculty.department) {
      return NextResponse.json(
        { error: "Faculty department not found" },
        { status: 400 }
      )
    }

    // Calculate workload using the comprehensive workload calculator
    const workload = await calculateFacultyWorkload(facultyId, faculty.department.id)

    return NextResponse.json(workload)
  } catch (error) {
    console.error("Error calculating faculty workload:", error)
    return NextResponse.json(
      { error: "Failed to calculate workload" },
      { status: 500 }
    )
  }
}