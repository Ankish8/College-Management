import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/utils/permissions"
import { z } from "zod"
// String-based types matching the Prisma schema
const DayOfWeekValues = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const
const EntryTypeValues = ['REGULAR', 'MAKEUP', 'EXTRA', 'EXAM'] as const

const bulkCreateSchema = z.object({
  entries: z.array(z.object({
    batchId: z.string().min(1, "Batch is required"),
    subjectId: z.string().min(1, "Subject is required"),
    facultyId: z.string().min(1, "Faculty is required"),
    timeSlotId: z.string().min(1, "Time slot is required"),
    dayOfWeek: z.enum(DayOfWeekValues),
    date: z.string().optional(),
    entryType: z.enum(EntryTypeValues).default("REGULAR"),
    notes: z.string().optional(),
  })).min(1, "At least one entry is required").max(100, "Maximum 100 entries allowed"),
  validateOnly: z.boolean().default(false), // For validation-only mode
  conflictResolution: z.enum(["SKIP", "FORCE", "STOP"]).default("STOP"),
})

// Batch conflict detection
async function checkBulkConflicts(entries: any[]) {
  const allConflicts = []
  const validEntries = []
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const entryConflicts = []
    
    const whereClause: any = {
      timeSlotId: entry.timeSlotId,
      dayOfWeek: entry.dayOfWeek,
      isActive: true,
    }
    
    if (entry.date) {
      whereClause.date = new Date(entry.date)
    }

    // Check batch conflicts
    const batchConflicts = await db.timetableEntry.findMany({
      where: {
        ...whereClause,
        batchId: entry.batchId,
      },
      include: {
        subject: { select: { name: true, code: true } },
        faculty: { select: { name: true } },
        timeSlot: { select: { name: true } },
      }
    })

    if (batchConflicts.length > 0) {
      entryConflicts.push({
        type: "BATCH_DOUBLE_BOOKING",
        severity: "error",
        message: `Batch already has a class at this time`,
        details: batchConflicts,
      })
    }

    // Check faculty conflicts
    const facultyConflicts = await db.timetableEntry.findMany({
      where: {
        ...whereClause,
        facultyId: entry.facultyId,
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
      entryConflicts.push({
        type: "FACULTY_CONFLICT",
        severity: "error", 
        message: `Faculty is already teaching another class at this time`,
        details: facultyConflicts,
      })
    }

    // Check internal conflicts within the batch
    const internalConflicts = entries.slice(0, i).filter((otherEntry, j) => 
      j !== i &&
      otherEntry.batchId === entry.batchId &&
      otherEntry.timeSlotId === entry.timeSlotId &&
      otherEntry.dayOfWeek === entry.dayOfWeek &&
      otherEntry.date === entry.date
    )

    if (internalConflicts.length > 0) {
      entryConflicts.push({
        type: "INTERNAL_BATCH_CONFLICT",
        severity: "error",
        message: `Duplicate entry within this batch request`,
        details: internalConflicts,
      })
    }

    // Check internal faculty conflicts within the batch
    const internalFacultyConflicts = entries.slice(0, i).filter((otherEntry, j) => 
      j !== i &&
      otherEntry.facultyId === entry.facultyId &&
      otherEntry.timeSlotId === entry.timeSlotId &&
      otherEntry.dayOfWeek === entry.dayOfWeek &&
      otherEntry.date === entry.date
    )

    if (internalFacultyConflicts.length > 0) {
      entryConflicts.push({
        type: "INTERNAL_FACULTY_CONFLICT",
        severity: "error",
        message: `Faculty assigned to multiple classes at the same time in this batch`,
        details: internalFacultyConflicts,
      })
    }

    // Check holiday conflicts if specific date is provided
    if (entry.date) {
      const holidays = await db.holiday.findMany({
        where: {
          date: new Date(entry.date),
          OR: [
            { departmentId: null }, // University-wide holidays
            {
              department: {
                programs: {
                  some: {
                    batches: {
                      some: { id: entry.batchId }
                    }
                  }
                }
              }
            }
          ]
        }
      })

      if (holidays.length > 0) {
        entryConflicts.push({
          type: "HOLIDAY_SCHEDULING",
          severity: "warning",
          message: `This date is a holiday: ${holidays.map(h => h.name).join(", ")}`,
          details: holidays,
        })
      }
    }

    // Check exam period conflicts
    if (entry.date) {
      const examPeriods = await db.examPeriod.findMany({
        where: {
          startDate: { lte: new Date(entry.date) },
          endDate: { gte: new Date(entry.date) },
          blockRegularClasses: true,
          academicCalendar: {
            department: {
              programs: {
                some: {
                  batches: {
                    some: { id: entry.batchId }
                  }
                }
              }
            }
          }
        }
      })

      if (examPeriods.length > 0 && entry.entryType === "REGULAR") {
        entryConflicts.push({
          type: "EXAM_PERIOD_CONFLICT",
          severity: "error",
          message: `Regular classes are blocked during exam period: ${examPeriods.map(e => e.name).join(", ")}`,
          details: examPeriods,
        })
      }
    }

    allConflicts.push({
      entryIndex: i,
      entry,
      conflicts: entryConflicts,
      hasErrors: entryConflicts.some(c => c.severity === "error"),
      hasWarnings: entryConflicts.some(c => c.severity === "warning"),
    })

    if (entryConflicts.length === 0 || !entryConflicts.some(c => c.severity === "error")) {
      validEntries.push(entry)
    }
  }
  
  return { allConflicts, validEntries }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = bulkCreateSchema.parse(body)

    // Validate all referenced entities exist
    const batchIds = [...new Set(validatedData.entries.map(e => e.batchId))]
    const subjectIds = [...new Set(validatedData.entries.map(e => e.subjectId))]
    const facultyIds = [...new Set(validatedData.entries.map(e => e.facultyId))]
    const timeSlotIds = [...new Set(validatedData.entries.map(e => e.timeSlotId))]

    const [batches, subjects, faculty, timeSlots] = await Promise.all([
      db.batch.findMany({
        where: { id: { in: batchIds } },
        select: { id: true, name: true }
      }),
      db.subject.findMany({
        where: { id: { in: subjectIds } },
        select: { id: true, name: true, batchId: true }
      }),
      db.user.findMany({
        where: { 
          id: { in: facultyIds },
          role: "FACULTY"
        },
        select: { id: true, name: true }
      }),
      db.timeSlot.findMany({
        where: { 
          id: { in: timeSlotIds },
          isActive: true
        },
        select: { id: true, name: true }
      })
    ])

    // Check for missing entities
    const missingBatches = batchIds.filter(id => !batches.find(b => b.id === id))
    const missingSubjects = subjectIds.filter(id => !subjects.find(s => s.id === id))
    const missingFaculty = facultyIds.filter(id => !faculty.find(f => f.id === id))
    const missingTimeSlots = timeSlotIds.filter(id => !timeSlots.find(t => t.id === id))

    if (missingBatches.length > 0 || missingSubjects.length > 0 || 
        missingFaculty.length > 0 || missingTimeSlots.length > 0) {
      return NextResponse.json({
        error: "Invalid references found",
        details: {
          missingBatches,
          missingSubjects,
          missingFaculty,
          missingTimeSlots,
        }
      }, { status: 400 })
    }

    // Validate subject-batch relationships
    const invalidSubjects = validatedData.entries.filter(entry => {
      const subject = subjects.find(s => s.id === entry.subjectId)
      return subject && subject.batchId !== entry.batchId
    })

    if (invalidSubjects.length > 0) {
      return NextResponse.json({
        error: "Subject-batch mismatch found",
        details: invalidSubjects,
      }, { status: 400 })
    }

    // Check for conflicts
    const { allConflicts, validEntries } = await checkBulkConflicts(validatedData.entries)
    
    const hasErrors = allConflicts.some(c => c.hasErrors)
    const hasWarnings = allConflicts.some(c => c.hasWarnings)

    // If validation-only mode, return results without creating
    if (validatedData.validateOnly) {
      return NextResponse.json({
        valid: !hasErrors,
        conflicts: allConflicts,
        summary: {
          totalEntries: validatedData.entries.length,
          validEntries: validEntries.length,
          entriesWithErrors: allConflicts.filter(c => c.hasErrors).length,
          entriesWithWarnings: allConflicts.filter(c => c.hasWarnings).length,
        }
      })
    }

    // Handle conflicts based on resolution strategy
    let entriesToCreate = validEntries

    if (hasErrors) {
      switch (validatedData.conflictResolution) {
        case "STOP":
          return NextResponse.json({
            error: "Conflicts detected and resolution is set to STOP",
            conflicts: allConflicts,
            summary: {
              totalEntries: validatedData.entries.length,
              validEntries: validEntries.length,
              entriesWithErrors: allConflicts.filter(c => c.hasErrors).length,
            }
          }, { status: 409 })
        
        case "SKIP":
          // entriesToCreate already contains only valid entries
          break
        
        case "FORCE":
          entriesToCreate = validatedData.entries
          break
      }
    }

    // Create entries in a transaction
    const createdEntries = await db.$transaction(async (tx) => {
      const results = []
      
      for (const entry of entriesToCreate) {
        const created = await tx.timetableEntry.create({
          data: {
            batchId: entry.batchId,
            subjectId: entry.subjectId,
            facultyId: entry.facultyId,
            timeSlotId: entry.timeSlotId,
            dayOfWeek: entry.dayOfWeek,
            date: entry.date ? new Date(entry.date) : null,
            entryType: entry.entryType,
            notes: entry.notes,
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
        
        results.push(created)
      }
      
      return results
    })

    return NextResponse.json({
      success: true,
      created: createdEntries,
      conflicts: hasErrors || hasWarnings ? allConflicts : undefined,
      summary: {
        totalRequested: validatedData.entries.length,
        created: createdEntries.length,
        skipped: validatedData.entries.length - createdEntries.length,
        conflictResolution: validatedData.conflictResolution,
      }
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error bulk creating timetable entries:", error)
    return NextResponse.json(
      { error: "Failed to bulk create timetable entries" },
      { status: 500 }
    )
  }
}