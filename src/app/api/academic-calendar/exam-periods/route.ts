import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"
import { z } from "zod"
// ExamPeriodType is just a string field in the schema

const examPeriodFilterSchema = z.object({
  academicCalendarId: z.string().optional(),
  examType: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  year: z.number().min(2020).max(2030).optional(),
  blockRegularClasses: z.boolean().optional(),
  departmentId: z.string().optional(),
})

const createExamPeriodSchema = z.object({
  name: z.string().min(1, "Exam period name is required"),
  academicCalendarId: z.string().min(1, "Academic calendar is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  examType: z.string(),
  blockRegularClasses: z.boolean().default(true),
  allowReviewClasses: z.boolean().default(true),
  description: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rawParams = Object.fromEntries(searchParams.entries())
    
    // Convert parameters to correct types for schema validation
    const queryParams: any = {}
    
    // Copy string parameters directly
    if (rawParams.academicCalendarId) queryParams.academicCalendarId = rawParams.academicCalendarId
    if (rawParams.examType) queryParams.examType = rawParams.examType
    if (rawParams.dateFrom) queryParams.dateFrom = rawParams.dateFrom
    if (rawParams.dateTo) queryParams.dateTo = rawParams.dateTo
    if (rawParams.departmentId) queryParams.departmentId = rawParams.departmentId
    
    // Convert numeric parameters
    if (rawParams.year) queryParams.year = parseInt(rawParams.year)
    
    // Convert boolean parameters
    if (rawParams.blockRegularClasses) queryParams.blockRegularClasses = rawParams.blockRegularClasses === "true"
    
    const filters = examPeriodFilterSchema.parse(queryParams)
    
    const whereClause: any = {}
    
    // Apply filters
    if (filters.academicCalendarId) {
      whereClause.academicCalendarId = filters.academicCalendarId
    } else if (filters.departmentId) {
      // Filter by department through academic calendar
      whereClause.academicCalendar = {
        departmentId: filters.departmentId
      }
    } else {
      // If no specific filters, get user's department exam periods
      const user = await db.user.findUnique({
        where: { id: (session.user as any).id },
        include: { department: true }
      })
      
      if (user?.departmentId) {
        whereClause.academicCalendar = {
          departmentId: user.departmentId
        }
      }
    }
    
    if (filters.examType) whereClause.examType = filters.examType
    if (filters.blockRegularClasses !== undefined) whereClause.blockRegularClasses = filters.blockRegularClasses

    // Date range filtering
    if (filters.dateFrom || filters.dateTo || filters.year) {
      if (filters.year) {
        whereClause.startDate = { gte: new Date(`${filters.year}-01-01`) }
        whereClause.endDate = { lte: new Date(`${filters.year}-12-31`) }
      } else {
        if (filters.dateFrom) {
          whereClause.startDate = { gte: new Date(filters.dateFrom) }
        }
        if (filters.dateTo) {
          whereClause.endDate = { lte: new Date(filters.dateTo) }
        }
      }
    }

    const examPeriods = await db.examPeriod.findMany({
      where: whereClause,
      include: {
        academicCalendar: {
          select: {
            semesterName: true,
            academicYear: true,
            department: {
              select: {
                name: true,
                shortName: true,
              }
            }
          }
        }
      },
      orderBy: { startDate: "asc" }
    })

    // Add duration and status information
    const enrichedExamPeriods = examPeriods.map(period => {
      const startDate = new Date(period.startDate)
      const endDate = new Date(period.endDate)
      const currentDate = new Date()
      
      let status: "upcoming" | "ongoing" | "completed"
      if (currentDate < startDate) {
        status = "upcoming"
      } else if (currentDate > endDate) {
        status = "completed"
      } else {
        status = "ongoing"
      }
      
      const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        ...period,
        status,
        durationDays,
      }
    })

    return NextResponse.json({
      examPeriods: enrichedExamPeriods,
      summary: {
        total: examPeriods.length,
        upcoming: enrichedExamPeriods.filter(p => p.status === "upcoming").length,
        ongoing: enrichedExamPeriods.filter(p => p.status === "ongoing").length,
        completed: enrichedExamPeriods.filter(p => p.status === "completed").length,
        byType: ["INTERNAL", "EXTERNAL"].reduce((acc, type) => {
          acc[type] = examPeriods.filter(p => p.examType === type).length
          return acc
        }, {} as Record<string, number>),
      }
    })
  } catch (error) {
    console.error("Error fetching exam periods:", error)
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
    const validatedData = createExamPeriodSchema.parse(body)

    // Validate dates
    const startDate = new Date(validatedData.startDate)
    const endDate = new Date(validatedData.endDate)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      )
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      )
    }

    // Validate academic calendar exists
    const academicCalendar = await db.academicCalendar.findUnique({
      where: { id: validatedData.academicCalendarId },
      include: {
        department: true
      }
    })

    if (!academicCalendar) {
      return NextResponse.json(
        { error: "Academic calendar not found" },
        { status: 404 }
      )
    }

    // Ensure exam period falls within the academic calendar
    if (startDate < academicCalendar.semesterStart || endDate > academicCalendar.semesterEnd) {
      return NextResponse.json(
        { error: "Exam period must fall within the academic calendar period" },
        { status: 400 }
      )
    }

    // Check for overlapping exam periods
    const overlappingPeriods = await db.examPeriod.findMany({
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
          },
          {
            AND: [
              { startDate: { gte: startDate } },
              { endDate: { lte: endDate } }
            ]
          }
        ]
      },
      select: {
        name: true,
        startDate: true,
        endDate: true,
        examType: true,
      }
    })

    if (overlappingPeriods.length > 0) {
      return NextResponse.json({
        error: "Exam period overlaps with existing exam periods",
        overlappingPeriods,
      }, { status: 409 })
    }

    // Check for duplicate name within the same academic calendar
    const duplicateName = await db.examPeriod.findFirst({
      where: {
        academicCalendarId: validatedData.academicCalendarId,
        name: validatedData.name,
      }
    })

    if (duplicateName) {
      return NextResponse.json(
        { error: "An exam period with this name already exists in this academic calendar" },
        { status: 400 }
      )
    }

    // Create the exam period
    const examPeriod = await db.examPeriod.create({
      data: {
        name: validatedData.name,
        academicCalendarId: validatedData.academicCalendarId,
        startDate: startDate,
        endDate: endDate,
        examType: validatedData.examType,
        blockRegularClasses: validatedData.blockRegularClasses,
        allowReviewClasses: validatedData.allowReviewClasses,
        description: validatedData.description || null,
      },
      include: {
        academicCalendar: {
          select: {
            semesterName: true,
            academicYear: true,
            department: {
              select: {
                name: true,
                shortName: true,
              }
            }
          }
        }
      }
    })

    // Check for affected timetable entries during this period if regular classes are blocked
    let affectedEntries: any[] = []
    if (validatedData.blockRegularClasses) {
      affectedEntries = await db.timetableEntry.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
          entryType: "REGULAR",
          isActive: true,
          batch: {
            program: {
              departmentId: academicCalendar.department.id
            }
          }
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
    }

    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const currentDate = new Date()
    
    let status: "upcoming" | "ongoing" | "completed"
    if (currentDate < startDate) {
      status = "upcoming"
    } else if (currentDate > endDate) {
      status = "completed"
    } else {
      status = "ongoing"
    }

    return NextResponse.json({
      examPeriod: {
        ...examPeriod,
        status,
        durationDays,
      },
      affectedEntries: affectedEntries.length > 0 ? affectedEntries : undefined,
      summary: {
        examPeriodCreated: true,
        affectedTimetableEntries: affectedEntries.length,
        durationDays,
        blocksRegularClasses: validatedData.blockRegularClasses,
        allowsReviewClasses: validatedData.allowReviewClasses,
      }
    }, { status: 201 })
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