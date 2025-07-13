import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/utils/permissions"
import { z } from "zod"

const createExamPeriodSchema = z.object({
  name: z.string().min(1, "Exam period name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  examType: z.enum(["INTERNAL", "EXTERNAL", "PRACTICAL", "VIVA", "PROJECT"]),
  blockRegularClasses: z.boolean().default(true),
  allowReviewClasses: z.boolean().default(true),
  description: z.string().optional(),
  academicCalendarId: z.string().min(1, "Academic calendar ID is required"),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createExamPeriodSchema.parse(body)

    // Verify academic calendar exists and user has access
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

    const academicCalendar = await db.academicCalendar.findFirst({
      where: {
        id: validatedData.academicCalendarId,
        departmentId: user.department.id
      }
    })

    if (!academicCalendar) {
      return NextResponse.json(
        { error: "Academic calendar not found or access denied" },
        { status: 403 }
      )
    }

    // Validate dates are within academic calendar
    const startDate = new Date(validatedData.startDate)
    const endDate = new Date(validatedData.endDate)

    if (startDate < academicCalendar.semesterStart || endDate > academicCalendar.semesterEnd) {
      return NextResponse.json(
        { error: "Exam period must be within the academic calendar semester dates" },
        { status: 400 }
      )
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      )
    }

    // Check for overlapping exam periods
    const overlappingExamPeriod = await db.examPeriod.findFirst({
      where: {
        academicCalendarId: validatedData.academicCalendarId,
        OR: [
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: startDate } }
            ]
          },
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: endDate } }
            ]
          }
        ]
      }
    })

    if (overlappingExamPeriod) {
      return NextResponse.json(
        { error: "Overlapping exam period already exists" },
        { status: 400 }
      )
    }

    // Create exam period
    const examPeriod = await db.examPeriod.create({
      data: {
        name: validatedData.name,
        startDate,
        endDate,
        examType: validatedData.examType,
        blockRegularClasses: validatedData.blockRegularClasses,
        allowReviewClasses: validatedData.allowReviewClasses,
        description: validatedData.description,
        academicCalendarId: validatedData.academicCalendarId,
      }
    })

    return NextResponse.json(examPeriod)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating exam period:", error)
    return NextResponse.json(
      { error: "Failed to create exam period" },
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

    const { searchParams } = new URL(request.url)
    const academicCalendarId = searchParams.get("academicCalendarId")

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

    // Build query
    const whereClause: any = {}

    if (academicCalendarId) {
      // Verify academic calendar belongs to user's department
      const academicCalendar = await db.academicCalendar.findFirst({
        where: {
          id: academicCalendarId,
          departmentId: user.department.id
        }
      })

      if (!academicCalendar) {
        return NextResponse.json(
          { error: "Academic calendar not found" },
          { status: 404 }
        )
      }

      whereClause.academicCalendarId = academicCalendarId
    } else {
      // Get all exam periods for department's academic calendars
      whereClause.academicCalendar = {
        departmentId: user.department.id
      }
    }

    // Get exam periods
    const examPeriods = await db.examPeriod.findMany({
      where: whereClause,
      include: {
        academicCalendar: true
      },
      orderBy: {
        startDate: 'desc'
      }
    })

    return NextResponse.json(examPeriods)
  } catch (error) {
    console.error("Error fetching exam periods:", error)
    return NextResponse.json(
      { error: "Failed to fetch exam periods" },
      { status: 500 }
    )
  }
}