import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"
import { z } from "zod"
import { DayOfWeek, EntryType } from "@prisma/client"

const conflictCheckSchema = z.object({
  batchId: z.string().min(1, "Batch is required"),
  facultyId: z.string().min(1, "Faculty is required"),
  timeSlotId: z.string().min(1, "Time slot is required"),
  dayOfWeek: z.nativeEnum(DayOfWeek),
  date: z.string().optional(),
  entryType: z.nativeEnum(EntryType).default("REGULAR"),
  excludeId: z.string().optional(), // For updates
})

// Simple conflict check schema for drag and drop
const simpleConflictCheckSchema = z.object({
  facultyId: z.string(),
  dayOfWeek: z.nativeEnum(DayOfWeek),
  timeSlotName: z.string(),
  excludeEventId: z.string().optional(),
})

// Enhanced conflict detection with alternative suggestions
async function checkConflictsWithAlternatives(data: z.infer<typeof conflictCheckSchema>) {
  const conflicts = []
  const alternatives = []
  
  const whereClause: any = {
    timeSlotId: data.timeSlotId,
    dayOfWeek: data.dayOfWeek,
    isActive: true,
  }
  
  if (data.date) {
    whereClause.date = new Date(data.date)
  }
  
  if (data.excludeId) {
    whereClause.NOT = { id: data.excludeId }
  }

  // Check batch conflicts (same batch, same time)
  const batchConflicts = await db.timetableEntry.findMany({
    where: {
      ...whereClause,
      batchId: data.batchId,
    },
    include: {
      subject: { select: { name: true, code: true } },
      faculty: { select: { name: true, email: true } },
      timeSlot: { select: { name: true, startTime: true, endTime: true } },
    }
  })

  if (batchConflicts.length > 0) {
    conflicts.push({
      type: "BATCH_DOUBLE_BOOKING",
      severity: "error",
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
          specialization: { select: { name: true, shortName: true } }
        } 
      },
      subject: { select: { name: true, code: true } },
      timeSlot: { select: { name: true, startTime: true, endTime: true } },
    }
  })

  if (facultyConflicts.length > 0) {
    conflicts.push({
      type: "FACULTY_CONFLICT", 
      severity: "error",
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
        severity: "warning",
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
        severity: "error",
        message: `Regular classes are blocked during exam period: ${examPeriods.map(e => e.name).join(", ")}`,
        details: examPeriods,
      })
    }
  }

  // Find alternative time slots if conflicts exist
  if (conflicts.some(c => c.severity === "error")) {
    // Get all time slots for the day
    const allTimeSlots = await db.timeSlot.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" }
    })

    // Check each time slot for availability
    for (const timeSlot of allTimeSlots) {
      if (timeSlot.id === data.timeSlotId) continue // Skip current slot
      
      const slotConflicts = await db.timetableEntry.findMany({
        where: {
          batchId: data.batchId,
          timeSlotId: timeSlot.id,
          dayOfWeek: data.dayOfWeek,
          date: data.date ? new Date(data.date) : undefined,
          isActive: true,
          ...(data.excludeId ? { NOT: { id: data.excludeId } } : {}),
        }
      })

      const facultySlotConflicts = await db.timetableEntry.findMany({
        where: {
          facultyId: data.facultyId,
          timeSlotId: timeSlot.id,
          dayOfWeek: data.dayOfWeek,
          date: data.date ? new Date(data.date) : undefined,
          isActive: true,
          ...(data.excludeId ? { NOT: { id: data.excludeId } } : {}),
        }
      })

      if (slotConflicts.length === 0 && facultySlotConflicts.length === 0) {
        alternatives.push({
          timeSlot: {
            id: timeSlot.id,
            name: timeSlot.name,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
            duration: timeSlot.duration,
          },
          available: true,
        })
      }
    }

    // If no alternatives on the same day, suggest other days
    if (alternatives.length === 0) {
      const otherDays = Object.values(DayOfWeek).filter(day => day !== data.dayOfWeek)
      
      for (const day of otherDays.slice(0, 3)) { // Limit to 3 alternative days
        const dayConflicts = await db.timetableEntry.findMany({
          where: {
            batchId: data.batchId,
            timeSlotId: data.timeSlotId,
            dayOfWeek: day,
            date: data.date ? new Date(data.date) : undefined,
            isActive: true,
            ...(data.excludeId ? { NOT: { id: data.excludeId } } : {}),
          }
        })

        const facultyDayConflicts = await db.timetableEntry.findMany({
          where: {
            facultyId: data.facultyId,
            timeSlotId: data.timeSlotId,
            dayOfWeek: day,
            date: data.date ? new Date(data.date) : undefined,
            isActive: true,
            ...(data.excludeId ? { NOT: { id: data.excludeId } } : {}),
          }
        })

        if (dayConflicts.length === 0 && facultyDayConflicts.length === 0) {
          const timeSlot = await db.timeSlot.findUnique({
            where: { id: data.timeSlotId }
          })
          
          alternatives.push({
            dayOfWeek: day,
            timeSlot: timeSlot ? {
              id: timeSlot.id,
              name: timeSlot.name,
              startTime: timeSlot.startTime,
              endTime: timeSlot.endTime,
              duration: timeSlot.duration,
            } : null,
            available: true,
          })
        }
      }
    }
  }

  return { conflicts, alternatives }
}

// Simple conflict check for drag and drop
async function checkSimpleConflict(data: z.infer<typeof simpleConflictCheckSchema>) {
  // Find the time slot by name
  const timeSlot = await db.timeSlot.findFirst({
    where: { name: data.timeSlotName }
  })
  
  if (!timeSlot) {
    return { hasConflict: false, reason: "Time slot not found" }
  }

  // Check for faculty conflicts across all batches
  const whereClause: any = {
    isActive: true,
    facultyId: data.facultyId,
    dayOfWeek: data.dayOfWeek,
    timeSlotId: timeSlot.id,
  }

  // Exclude the current event if provided
  if (data.excludeEventId) {
    whereClause.NOT = { id: data.excludeEventId }
  }

  const conflictingEntry = await db.timetableEntry.findFirst({
    where: whereClause,
    include: {
      subject: { select: { name: true, code: true } },
      batch: { 
        select: { 
          name: true,
          program: { select: { name: true, shortName: true } },
          specialization: { select: { name: true, shortName: true } }
        } 
      },
      timeSlot: { select: { name: true } },
    }
  })

  if (conflictingEntry) {
    return {
      hasConflict: true,
      conflictType: "FACULTY_CONFLICT",
      conflictDetails: {
        subjectName: conflictingEntry.subject.name,
        subjectCode: conflictingEntry.subject.code,
        batchName: conflictingEntry.batch.name,
        timeSlot: conflictingEntry.timeSlot.name,
      }
    }
  }

  return { hasConflict: false }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const facultyId = searchParams.get('facultyId')
    const dayOfWeek = searchParams.get('dayOfWeek')
    const timeSlotName = searchParams.get('timeSlotName')
    const excludeEventId = searchParams.get('excludeEventId')

    if (!facultyId || !dayOfWeek || !timeSlotName) {
      return NextResponse.json(
        { error: "Missing required parameters: facultyId, dayOfWeek, timeSlotName" },
        { status: 400 }
      )
    }

    const validatedData = simpleConflictCheckSchema.parse({
      facultyId,
      dayOfWeek,
      timeSlotName,
      excludeEventId: excludeEventId || undefined,
    })

    const result = await checkSimpleConflict(validatedData)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid parameters", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error checking simple conflicts:", error)
    return NextResponse.json(
      { error: "Failed to check conflicts" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (!isAdmin(session.user as any) && !isFaculty(session.user as any))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = conflictCheckSchema.parse(body)

    // Validate batch exists
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

    const result = await checkConflictsWithAlternatives(validatedData)

    return NextResponse.json({
      hasConflicts: result.conflicts.length > 0,
      conflicts: result.conflicts,
      alternatives: result.alternatives,
      summary: {
        errorCount: result.conflicts.filter(c => c.severity === "error").length,
        warningCount: result.conflicts.filter(c => c.severity === "warning").length,
        alternativeCount: result.alternatives.length,
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error checking conflicts:", error)
    return NextResponse.json(
      { error: "Failed to check conflicts" },
      { status: 500 }
    )
  }
}