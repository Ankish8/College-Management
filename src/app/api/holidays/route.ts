import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"
import { z } from "zod"

const createHolidaySchema = z.object({
  name: z.string().min(1, "Holiday name is required"),
  date: z.string().min(1, "Date is required"),
  type: z.enum(["NATIONAL", "UNIVERSITY", "DEPARTMENT", "LOCAL", "FESTIVAL"]),
  description: z.string().optional().nullable(),
  isRecurring: z.boolean().default(false),
  departmentId: z.string().nullable().optional(), // Optional for university-wide holidays
  academicCalendarId: z.string().nullable().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (!isAdmin(session.user as any) && !isFaculty(session.user as any))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createHolidaySchema.parse(body)

    // For department-specific holidays, verify user has access
    if (validatedData.departmentId) {
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
    }

    // If academic calendar is specified, verify it exists and matches department
    if (validatedData.academicCalendarId && validatedData.departmentId) {
      const academicCalendar = await db.academicCalendar.findFirst({
        where: {
          id: validatedData.academicCalendarId,
          departmentId: validatedData.departmentId
        }
      })

      if (!academicCalendar) {
        return NextResponse.json(
          { error: "Academic calendar not found" },
          { status: 404 }
        )
      }
    }

    // Create holiday
    const holiday = await db.holiday.create({
      data: {
        name: validatedData.name,
        date: new Date(validatedData.date),
        type: validatedData.type,
        description: validatedData.description,
        isRecurring: validatedData.isRecurring,
        departmentId: validatedData.departmentId,
        academicCalendarId: validatedData.academicCalendarId,
      }
    })

    return NextResponse.json(holiday)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Holiday validation error:", error.issues)
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating holiday:", error)
    return NextResponse.json(
      { error: "Failed to create holiday" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    let whereClause: any = {}
    
    // Date filtering
    if (dateFrom || dateTo) {
      whereClause.date = {}
      if (dateFrom) whereClause.date.gte = new Date(dateFrom)
      if (dateTo) whereClause.date.lte = new Date(dateTo)
    }

    // Get holidays - include university-wide holidays (departmentId: null) and department-specific ones
    const user = await db.user.findUnique({
      where: { id: (session.user as any).id },
      include: { department: true }
    })

    if (user?.department) {
      // Include both university-wide and department-specific holidays
      whereClause.OR = [
        { departmentId: null }, // University-wide holidays
        { departmentId: user.department.id } // Department-specific holidays
      ]
    } else {
      // If no department, only show university-wide holidays
      whereClause.departmentId = null
    }

    const holidays = await db.holiday.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
      select: {
        id: true,
        name: true,
        date: true,
        type: true,
        description: true,
        isRecurring: true,
        departmentId: true,
        createdAt: true,
      }
    })

    return NextResponse.json(holidays)
  } catch (error) {
    console.error("Error fetching holidays:", error)
    return NextResponse.json(
      { error: "Failed to fetch holidays" },
      { status: 500 }
    )
  }
}