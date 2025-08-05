import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty, isStudent } from "@/lib/utils/permissions"
import { z } from "zod"
// String-based types matching the Prisma schema
const DayOfWeekValues = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const
const EntryTypeValues = ['REGULAR', 'MAKEUP', 'EXTRA', 'EXAM'] as const

const timetableFilterSchema = z.object({
  batchId: z.string().optional(),
  specializationId: z.string().optional(),
  facultyId: z.string().optional(),
  subjectId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  dayOfWeek: z.enum(DayOfWeekValues).optional(),
  entryType: z.enum(EntryTypeValues).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
})

const createTimetableEntrySchema = z.object({
  batchId: z.string().min(1, "Batch is required"),
  subjectId: z.string().optional(), // Optional for custom events
  facultyId: z.string().optional(), // Optional for custom events
  timeSlotId: z.string().min(1, "Time slot is required"),
  dayOfWeek: z.enum(DayOfWeekValues),
  date: z.string().optional(), // ISO date string for specific date entries
  entryType: z.enum(EntryTypeValues).default("REGULAR"),
  notes: z.string().optional(),
  // Custom event fields
  customEventTitle: z.string().optional(),
  customEventColor: z.string().optional(),
  isCustomEvent: z.boolean().optional(),
}).refine(
  (data) => {
    // Either it's a custom event with title, or it's a regular event with subject and faculty
    if (data.isCustomEvent) {
      return data.customEventTitle && data.customEventTitle.trim().length > 0
    } else {
      return data.subjectId && data.facultyId
    }
  },
  {
    message: "Either provide subject and faculty for regular classes, or title for custom events",
    path: ["subjectId"]
  }
)

// Conflict detection function
async function checkConflicts(data: z.infer<typeof createTimetableEntrySchema>, excludeId?: string) {
  const conflicts: any[] = []
  
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

  // Build OR conditions dynamically based on what fields are present
  const orConditions = [
    { batchId: data.batchId }, // Always check batch conflicts
  ]
  
  // Only check faculty conflicts if faculty is assigned
  if (data.facultyId) {
    orConditions.push({ facultyId: data.facultyId })
  }

  // Single optimized query to check both batch and faculty conflicts
  const allConflicts = await db.timetableEntry.findMany({
    where: {
      ...whereClause,
      OR: orConditions
    },
    include: {
      subject: { select: { name: true } },
      faculty: { select: { name: true } },
      batch: { 
        select: { 
          name: true,
          specialization: { select: { name: true } }
        } 
      },
      timeSlot: { select: { name: true } },
    }
  })

  // Separate conflicts by type
  const batchConflicts = allConflicts.filter(entry => entry.batchId === data.batchId);
  const facultyConflicts = data.facultyId ? allConflicts.filter(entry => entry.facultyId === data.facultyId) : [];

  if (batchConflicts.length > 0) {
    conflicts.push({
      type: "BATCH_DOUBLE_BOOKING",
      message: `Batch already has a class at this time`,
      details: batchConflicts,
    })
  }

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
              programs: {
                some: {
                  batches: {
                    some: { id: data.batchId }
                  }
                }
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
            programs: {
              some: {
                batches: {
                  some: { id: data.batchId }
                }
              }
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
    const rawParams = Object.fromEntries(searchParams.entries())
    
    // Convert parameters to correct types for schema validation
    const queryParams: any = {}
    
    // Copy string parameters directly
    if (rawParams.batchId) queryParams.batchId = rawParams.batchId
    if (rawParams.specializationId) queryParams.specializationId = rawParams.specializationId
    if (rawParams.facultyId) queryParams.facultyId = rawParams.facultyId
    if (rawParams.subjectId) queryParams.subjectId = rawParams.subjectId
    if (rawParams.dateFrom) queryParams.dateFrom = rawParams.dateFrom
    if (rawParams.dateTo) queryParams.dateTo = rawParams.dateTo
    if (rawParams.dayOfWeek) queryParams.dayOfWeek = rawParams.dayOfWeek
    if (rawParams.entryType) queryParams.entryType = rawParams.entryType
    
    // Convert numeric parameters
    if (rawParams.page) queryParams.page = parseInt(rawParams.page)
    if (rawParams.limit) queryParams.limit = parseInt(rawParams.limit)
    
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
        select: {
          // Include all main fields
          id: true,
          batchId: true,
          subjectId: true,
          facultyId: true,
          timeSlotId: true,
          dayOfWeek: true,
          date: true,
          entryType: true,
          notes: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          // Custom event fields - IMPORTANT!
          customEventTitle: true,
          customEventColor: true,
          // Related data
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

    // Debug logging to understand what's being returned
    console.log(`📊 Timetable query results:`)
    console.log(`   Total entries found: ${entries.length}`)
    console.log(`   Recurring entries (date=null): ${entries.filter(e => !e.date).length}`)
    console.log(`   Date-specific entries: ${entries.filter(e => e.date).length}`)
    
    entries.forEach((entry, index) => {
      if (index < 10) { // Only log first 10 for brevity
        const title = entry.subject?.name || entry.customEventTitle || 'No title'
        console.log(`   ${index + 1}. ${entry.id} ${title} ${entry.date ? entry.date.toISOString().split('T')[0] : 'null'} ${entry.dayOfWeek}`)
      }
    })

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

    // Validate subject and faculty for regular classes only
    if (!validatedData.isCustomEvent) {
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
    } else if (validatedData.facultyId) {
      // For custom events, validate faculty only if provided
      const faculty = await db.user.findUnique({
        where: { id: validatedData.facultyId },
      })

      if (!faculty || faculty.role !== "FACULTY") {
        return NextResponse.json(
          { error: "Faculty not found or is not a faculty member" },
          { status: 400 }
        )
      }
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
        subjectId: validatedData.subjectId || null,
        facultyId: validatedData.facultyId || null,
        timeSlotId: validatedData.timeSlotId,
        dayOfWeek: validatedData.dayOfWeek,
        date: validatedData.date ? new Date(validatedData.date) : null,
        entryType: validatedData.entryType,
        notes: validatedData.notes,
        // Custom event fields
        customEventTitle: validatedData.customEventTitle || null,
        customEventColor: validatedData.customEventColor || null,
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