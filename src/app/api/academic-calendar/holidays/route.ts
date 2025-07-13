import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"
import { z } from "zod"
import { HolidayType } from "@prisma/client"

const holidayFilterSchema = z.object({
  departmentId: z.string().optional(),
  type: z.nativeEnum(HolidayType).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  year: z.number().min(2020).max(2030).optional(),
  isRecurring: z.boolean().optional(),
  academicCalendarId: z.string().optional(),
})

const createHolidaySchema = z.object({
  name: z.string().min(1, "Holiday name is required"),
  date: z.string().min(1, "Holiday date is required"),
  type: z.nativeEnum(HolidayType),
  departmentId: z.string().optional(), // null for university-wide holidays
  academicCalendarId: z.string().optional(),
  isRecurring: z.boolean().default(false),
  description: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    // Convert numeric and boolean parameters
    if (queryParams.year) queryParams.year = parseInt(queryParams.year)
    if (queryParams.isRecurring) queryParams.isRecurring = queryParams.isRecurring === "true"
    
    const filters = holidayFilterSchema.parse(queryParams)
    
    const whereClause: any = {}
    
    // Apply filters
    if (filters.departmentId) {
      whereClause.departmentId = filters.departmentId
    } else {
      // If no specific department, include university-wide and user's department holidays
      const user = await db.user.findUnique({
        where: { id: (session.user as any).id },
        include: { department: true }
      })
      
      whereClause.OR = [
        { departmentId: null }, // University-wide holidays
        ...(user?.departmentId ? [{ departmentId: user.departmentId }] : [])
      ]
    }
    
    if (filters.type) whereClause.type = filters.type
    if (filters.academicCalendarId) whereClause.academicCalendarId = filters.academicCalendarId
    if (filters.isRecurring !== undefined) whereClause.isRecurring = filters.isRecurring

    // Date range filtering
    if (filters.dateFrom || filters.dateTo || filters.year) {
      whereClause.date = {}
      
      if (filters.year) {
        whereClause.date.gte = new Date(`${filters.year}-01-01`)
        whereClause.date.lte = new Date(`${filters.year}-12-31`)
      } else {
        if (filters.dateFrom) whereClause.date.gte = new Date(filters.dateFrom)
        if (filters.dateTo) whereClause.date.lte = new Date(filters.dateTo)
      }
    }

    const holidays = await db.holiday.findMany({
      where: whereClause,
      include: {
        department: {
          select: {
            name: true,
            shortName: true,
          }
        },
        academicCalendar: {
          select: {
            semesterName: true,
            academicYear: true,
          }
        }
      },
      orderBy: { date: "asc" }
    })

    // Group holidays by month for better organization
    const holidaysByMonth = holidays.reduce((acc, holiday) => {
      const monthKey = holiday.date.toISOString().substring(0, 7) // YYYY-MM
      if (!acc[monthKey]) {
        acc[monthKey] = []
      }
      acc[monthKey].push(holiday)
      return acc
    }, {} as Record<string, typeof holidays>)

    return NextResponse.json({
      holidays,
      holidaysByMonth,
      summary: {
        total: holidays.length,
        byType: Object.values(HolidayType).reduce((acc, type) => {
          acc[type] = holidays.filter(h => h.type === type).length
          return acc
        }, {} as Record<HolidayType, number>),
        recurring: holidays.filter(h => h.isRecurring).length,
        universityWide: holidays.filter(h => h.departmentId === null).length,
      }
    })
  } catch (error) {
    console.error("Error fetching holidays:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createHolidaySchema.parse(body)

    // Validate date format
    const holidayDate = new Date(validatedData.date)
    if (isNaN(holidayDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      )
    }

    // Validate department if provided
    if (validatedData.departmentId) {
      const department = await db.department.findUnique({
        where: { id: validatedData.departmentId }
      })
      if (!department) {
        return NextResponse.json(
          { error: "Department not found" },
          { status: 404 }
        )
      }
    }

    // Validate academic calendar if provided
    if (validatedData.academicCalendarId) {
      const academicCalendar = await db.academicCalendar.findUnique({
        where: { id: validatedData.academicCalendarId }
      })
      if (!academicCalendar) {
        return NextResponse.json(
          { error: "Academic calendar not found" },
          { status: 404 }
        )
      }
      
      // Ensure the holiday date falls within the academic calendar period
      if (holidayDate < academicCalendar.semesterStart || holidayDate > academicCalendar.semesterEnd) {
        return NextResponse.json(
          { error: "Holiday date must fall within the academic calendar period" },
          { status: 400 }
        )
      }
    }

    // Check for duplicate holidays on the same date and scope
    const duplicateHoliday = await db.holiday.findFirst({
      where: {
        date: holidayDate,
        departmentId: validatedData.departmentId || null,
        name: validatedData.name,
      }
    })

    if (duplicateHoliday) {
      return NextResponse.json(
        { error: "A holiday with this name already exists on this date for this scope" },
        { status: 400 }
      )
    }

    // Check for conflicting holidays on the same date (different names, same scope)
    const conflictingHolidays = await db.holiday.findMany({
      where: {
        date: holidayDate,
        departmentId: validatedData.departmentId || null,
        NOT: { name: validatedData.name }
      }
    })

    if (conflictingHolidays.length > 0) {
      return NextResponse.json({
        warning: "Other holidays exist on this date for the same scope",
        existingHolidays: conflictingHolidays,
        continue: false, // Frontend can prompt user to continue anyway
      }, { status: 409 })
    }

    // Create the holiday
    const holiday = await db.holiday.create({
      data: {
        name: validatedData.name,
        date: holidayDate,
        type: validatedData.type,
        departmentId: validatedData.departmentId || null,
        academicCalendarId: validatedData.academicCalendarId || null,
        isRecurring: validatedData.isRecurring,
        description: validatedData.description || null,
      },
      include: {
        department: {
          select: {
            name: true,
            shortName: true,
          }
        },
        academicCalendar: {
          select: {
            semesterName: true,
            academicYear: true,
          }
        }
      }
    })

    // Check for affected timetable entries on this date
    const affectedEntries = await db.timetableEntry.findMany({
      where: {
        date: holidayDate,
        isActive: true,
        ...(validatedData.departmentId ? {
          batch: {
            program: {
              departmentId: validatedData.departmentId
            }
          }
        } : {})
      },
      include: {
        batch: {
          select: {
            name: true,
            program: { select: { name: true } }
          }
        },
        subject: { select: { name: true, code: true } },
        faculty: { select: { name: true } },
        timeSlot: { select: { name: true } },
      }
    })

    return NextResponse.json({
      holiday,
      affectedEntries: affectedEntries.length > 0 ? affectedEntries : undefined,
      summary: {
        holidayCreated: true,
        affectedTimetableEntries: affectedEntries.length,
        scope: validatedData.departmentId ? "Department" : "University-wide",
      }
    }, { status: 201 })
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