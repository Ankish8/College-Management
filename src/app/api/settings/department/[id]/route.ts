import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/utils/permissions"
import { z } from "zod"

const updateDepartmentSettingsSchema = z.object({
  creditHoursRatio: z.number().min(1).max(30),
  maxFacultyCredits: z.number().min(1).max(50),
  coFacultyWeight: z.number().min(0).max(1),
})

interface RouteProps {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteProps) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: departmentId } = await params
    const body = await request.json()
    const validatedData = updateDepartmentSettingsSchema.parse(body)

    // Verify department exists and user has access
    const user = await db.user.findUnique({
      where: { id: (session.user as any).id },
      include: {
        department: true
      }
    })

    if (!user?.department || user.department.id !== departmentId) {
      return NextResponse.json(
        { error: "Department not found or access denied" },
        { status: 403 }
      )
    }

    // Update or create department settings
    const settings = await db.departmentSettings.upsert({
      where: { departmentId },
      update: {
        creditHoursRatio: validatedData.creditHoursRatio,
        maxFacultyCredits: validatedData.maxFacultyCredits,
        coFacultyWeight: validatedData.coFacultyWeight,
      },
      create: {
        departmentId,
        creditHoursRatio: validatedData.creditHoursRatio,
        maxFacultyCredits: validatedData.maxFacultyCredits,
        coFacultyWeight: validatedData.coFacultyWeight,
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating department settings:", error)
    return NextResponse.json(
      { error: "Failed to update department settings" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest, { params }: RouteProps) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: departmentId } = await params

    // Verify department exists and user has access
    const user = await db.user.findUnique({
      where: { id: (session.user as any).id },
      include: {
        department: true
      }
    })

    if (!user?.department || user.department.id !== departmentId) {
      return NextResponse.json(
        { error: "Department not found or access denied" },
        { status: 403 }
      )
    }

    // Get department settings
    const settings = await db.departmentSettings.findUnique({
      where: { departmentId }
    })

    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        creditHoursRatio: 15,
        maxFacultyCredits: 30,
        coFacultyWeight: 0.5,
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error fetching department settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch department settings" },
      { status: 500 }
    )
  }
}