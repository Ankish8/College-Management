import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty, isStudent } from "@/lib/utils/permissions"
import { z } from "zod"
import { DayOfWeek, EntryType } from "@prisma/client"

const timetableFilterSchema = z.object({
  batchId: z.string().optional(),
  specializationId: z.string().optional(),
  facultyId: z.string().optional(),
  subjectId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  dayOfWeek: z.nativeEnum(DayOfWeek).optional(),
  entryType: z.nativeEnum(EntryType).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
})

const createTimetableEntrySchema = z.object({
  batchId: z.string().min(1, "Batch is required"),
  subjectId: z.string().min(1, "Subject is required"), 
  facultyId: z.string().min(1, "Faculty is required"),
  timeSlotId: z.string().min(1, "Time slot is required"),
  dayOfWeek: z.nativeEnum(DayOfWeek),
  date: z.string().optional(), // ISO date string for specific date entries
  entryType: z.nativeEnum(EntryType).default("REGULAR"),
  notes: z.string().optional(),
})

// Conflict detection function
async function checkConflicts(data: z.infer<typeof createTimetableEntrySchema>, excludeId?: string) {
  const conflicts = []
  
  const whereClause: any = {
    timeSlotId: data.timeSlotId,
    dayOfWeek: data.dayOfWeek,
    isActive: true,
  }
  
  if (data.date) {
    whereClause.date = new Date(data.date)
  }
  
  if (excludeId) {
    whereClause.NOT = { id: excludeId }
  }

  // Check batch conflicts (same batch, same time)
  const batchConflicts = await db.timetableEntry.findMany({
    where: {
      ...whereClause,
      batchId: data.batchId,
    },
    include: {
      subject: { select: { name: true } },
      faculty: { select: { name: true } },
      timeSlot: { select: { name: true } },
    }
  })

  if (batchConflicts.length > 0) {
    conflicts.push({
      type: "BATCH_DOUBLE_BOOKING",
      message: `Batch already has a class at this time`,
      details: batchConflicts,
    })
  }

  // Check faculty conflicts (same faculty, same time)
  const facultyConflicts = await db.timetableEntry.findMany({
    where: {
      ...whereClause,
      facultyId: data.facultyId,
    },
    include: {
      batch: { 
        select: { 
          name: true,
          specialization: { select: { name: true } }
        } 
      },
      subject: { select: { name: true } },
      timeSlot: { select: { name: true } },
    }
  })

  if (facultyConflicts.length > 0) {
    conflicts.push({
      type: "FACULTY_CONFLICT", 
      message: `Faculty is already teaching another class at this time`,
      details: facultyConflicts,
    })
  }

  // Check for holiday conflicts if specific date is provided
  if (data.date) {
    const holidays = await db.holiday.findMany({
      where: {
        date: new Date(data.date),
        OR: [
          { departmentId: null }, // University-wide holidays
          {
            department: {
              batches: {
                some: { id: data.batchId }
              }
            }
          }
        ]
      }
    })

    if (holidays.length > 0) {
      conflicts.push({
        type: "HOLIDAY_SCHEDULING",
        message: `This date is a holiday: ${holidays.map(h => h.name).join(", ")}`,
        details: holidays,
      })
    }
  }

  // Check for exam period conflicts if specific date is provided
  if (data.date) {
    const examPeriods = await db.examPeriod.findMany({
      where: {
        startDate: { lte: new Date(data.date) },
        endDate: { gte: new Date(data.date) },
        blockRegularClasses: true,
        academicCalendar: {
          department: {
            batches: {
              some: { id: data.batchId }
            }
          }
        }
      }
    })

    if (examPeriods.length > 0 && data.entryType === "REGULAR") {
      conflicts.push({
        type: "EXAM_PERIOD_CONFLICT",
        message: `Regular classes are blocked during exam period: ${examPeriods.map(e => e.name).join(", ")}`,
        details: examPeriods,
      })
    }
  }

  return conflicts
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    // Convert page and limit to numbers
    if (queryParams.page) queryParams.page = parseInt(queryParams.page)
    if (queryParams.limit) queryParams.limit = parseInt(queryParams.limit)
    
    const filters = timetableFilterSchema.parse(queryParams)
    
    const whereClause: any = { isActive: true }
    
    // Role-based filtering
    const user = session.user as any
    if (isStudent(user) && user.student) {
      // Students can only see their own batch
      whereClause.batchId = user.student.batchId
    } else if (!isAdmin(user) && !isFaculty(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Apply filters
    if (filters.batchId) whereClause.batchId = filters.batchId
    if (filters.specializationId) {
      whereClause.batch = {
        specializationId: filters.specializationId
      }
    }
    if (filters.facultyId) whereClause.facultyId = filters.facultyId
    if (filters.subjectId) whereClause.subjectId = filters.subjectId
    if (filters.dayOfWeek) whereClause.dayOfWeek = filters.dayOfWeek
    if (filters.entryType) whereClause.entryType = filters.entryType

    // Date range filtering
    if (filters.dateFrom || filters.dateTo) {
      whereClause.date = {}
      if (filters.dateFrom) whereClause.date.gte = new Date(filters.dateFrom)
      if (filters.dateTo) whereClause.date.lte = new Date(filters.dateTo)
    }

    const skip = (filters.page - 1) * filters.limit

    const [entries, totalCount] = await Promise.all([
      db.timetableEntry.findMany({
        where: whereClause,
        include: {
          batch: {
            select: {
              name: true,
              semester: true,
              program: { select: { name: true, shortName: true } },
              specialization: { select: { name: true, shortName: true } },
            }
          },
          subject: {
            select: {
              name: true,
              code: true,
              credits: true,
            }
          },
          faculty: {
            select: {
              name: true,
              email: true,
            }
          },
          timeSlot: {
            select: {
              name: true,
              startTime: true,
              endTime: true,
              duration: true,
            }
          },
        },
        orderBy: [
          { date: "asc" },
          { dayOfWeek: "asc" },
          { timeSlot: { sortOrder: "asc" } },
        ],
        skip,
        take: filters.limit,
      }),
      db.timetableEntry.count({ where: whereClause })
    ])

    const response = {
      entries,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        totalCount,
        totalPages: Math.ceil(totalCount / filters.limit),
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching timetable entries:", error)
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
    const validatedData = createTimetableEntrySchema.parse(body)

    // Validate batch exists and user has access
    const batch = await db.batch.findUnique({
      where: { id: validatedData.batchId },
      include: {
        program: { 
          include: { 
            department: true 
          } 
        }
      }
    })

    if (!batch) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      )
    }

    // Validate subject exists and belongs to the batch
    const subject = await db.subject.findUnique({
      where: { id: validatedData.subjectId },
    })

    if (!subject || subject.batchId !== validatedData.batchId) {
      return NextResponse.json(
        { error: "Subject not found or does not belong to this batch" },
        { status: 400 }
      )
    }

    // Validate faculty exists
    const faculty = await db.user.findUnique({
      where: { id: validatedData.facultyId },
    })

    if (!faculty || faculty.role !== "FACULTY") {
      return NextResponse.json(
        { error: "Faculty not found or is not a faculty member" },
        { status: 400 }
      )
    }

    // Validate time slot exists
    const timeSlot = await db.timeSlot.findUnique({
      where: { id: validatedData.timeSlotId },
    })

    if (!timeSlot || !timeSlot.isActive) {
      return NextResponse.json(
        { error: "Time slot not found or is inactive" },
        { status: 400 }
      )
    }

    // Check for conflicts
    const conflicts = await checkConflicts(validatedData)
    
    if (conflicts.length > 0) {
      return NextResponse.json(
        { 
          error: "Scheduling conflicts detected", 
          conflicts 
        },
        { status: 409 }
      )
    }

    // Create the timetable entry
    const entry = await db.timetableEntry.create({
      data: {
        batchId: validatedData.batchId,
        subjectId: validatedData.subjectId,
        facultyId: validatedData.facultyId,
        timeSlotId: validatedData.timeSlotId,
        dayOfWeek: validatedData.dayOfWeek,
        date: validatedData.date ? new Date(validatedData.date) : null,
        entryType: validatedData.entryType,
        notes: validatedData.notes,
      },
      include: {
        batch: {
          select: {
            name: true,
            semester: true,
            program: { select: { name: true, shortName: true } },
            specialization: { select: { name: true, shortName: true } },
          }
        },
        subject: {
          select: {
            name: true,
            code: true,
            credits: true,
          }
        },
        faculty: {
          select: {
            name: true,
            email: true,
          }
        },
        timeSlot: {
          select: {
            name: true,
            startTime: true,
            endTime: true,
            duration: true,
          }
        },
      }
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating timetable entry:", error)
    return NextResponse.json(
      { error: "Failed to create timetable entry" },
      { status: 500 }
    )
  }
}