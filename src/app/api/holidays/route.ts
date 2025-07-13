import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/utils/permissions"
import { z } from "zod"

const createHolidaySchema = z.object({
  name: z.string().min(1, "Holiday name is required"),
  date: z.string().min(1, "Date is required"),
  type: z.enum(["NATIONAL", "UNIVERSITY", "DEPARTMENT", "LOCAL"]),
  description: z.string().optional(),
  isRecurring: z.boolean().default(false),
  departmentId: z.string().min(1, "Department ID is required"),
  academicCalendarId: z.string().optional(), // Optional for department-wide holidays
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createHolidaySchema.parse(body)

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

    // If academic calendar is specified, verify it belongs to the department
    if (validatedData.academicCalendarId) {
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

    // Get holidays for the department
    const holidays = await db.holiday.findMany({
      where: { departmentId: user.department.id },
      orderBy: {
        date: 'desc'
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