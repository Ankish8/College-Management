import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/utils/permissions"
import { z } from "zod"

const createAcademicCalendarSchema = z.object({
  semesterName: z.string().min(1, "Semester name is required"),
  academicYear: z.string().min(1, "Academic year is required"),
  semesterStart: z.string().min(1, "Start date is required"),
  semesterEnd: z.string().min(1, "End date is required"),
  departmentId: z.string().min(1, "Department ID is required"),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createAcademicCalendarSchema.parse(body)

    // Verify user has access to this department
    const user = await db.user.findUnique({
      where: { id: (session.user as any).id },
      include: { department: true }
    })

    if (!user?.department || user.department.id !== validatedData.departmentId) {
      return NextResponse.json(
        { error: "Department not found or access denied" },
        { status: 403 }
      )
    }

    // Check for overlapping academic calendars
    const existingCalendar = await db.academicCalendar.findFirst({
      where: {
        departmentId: validatedData.departmentId,
        OR: [
          {
            AND: [
              { semesterStart: { lte: new Date(validatedData.semesterStart) } },
              { semesterEnd: { gte: new Date(validatedData.semesterStart) } }
            ]
          },
          {
            AND: [
              { semesterStart: { lte: new Date(validatedData.semesterEnd) } },
              { semesterEnd: { gte: new Date(validatedData.semesterEnd) } }
            ]
          }
        ]
      }
    })

    if (existingCalendar) {
      return NextResponse.json(
        { error: "Overlapping academic calendar already exists for this department" },
        { status: 400 }
      )
    }

    // Create academic calendar
    const academicCalendar = await db.academicCalendar.create({
      data: {
        semesterName: validatedData.semesterName,
        academicYear: validatedData.academicYear,
        semesterStart: new Date(validatedData.semesterStart),
        semesterEnd: new Date(validatedData.semesterEnd),
        departmentId: validatedData.departmentId,
        isActive: true, // New calendars are active by default
      },
      include: {
        holidays: true,
        examPeriods: true,
      }
    })

    return NextResponse.json(academicCalendar)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating academic calendar:", error)
    return NextResponse.json(
      { error: "Failed to create academic calendar" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's department
    const user = await db.user.findUnique({
      where: { id: (session.user as any).id },
      include: { department: true }
    })

    if (!user?.department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      )
    }

    // Get academic calendars for the department
    const academicCalendars = await db.academicCalendar.findMany({
      where: { departmentId: user.department.id },
      include: {
        holidays: true,
        examPeriods: true,
      },
      orderBy: {
        semesterStart: 'desc'
      }
    })

    return NextResponse.json(academicCalendars)
  } catch (error) {
    console.error("Error fetching academic calendars:", error)
    return NextResponse.json(
      { error: "Failed to fetch academic calendars" },
      { status: 500 }
    )
  }
}