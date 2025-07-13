import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"
import { z } from "zod"
import { DayOfWeek, RecurrencePattern, EndCondition } from "@prisma/client"

const templateFilterSchema = z.object({
  batchId: z.string().optional(),
  facultyId: z.string().optional(),
  subjectId: z.string().optional(),
  isActive: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
})

const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  batchId: z.string().min(1, "Batch is required"),
  subjectId: z.string().min(1, "Subject is required"),
  facultyId: z.string().min(1, "Faculty is required"),
  timeSlotId: z.string().min(1, "Time slot is required"),
  dayOfWeek: z.nativeEnum(DayOfWeek),
  recurrencePattern: z.nativeEnum(RecurrencePattern).default("WEEKLY"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  endCondition: z.nativeEnum(EndCondition).default("SEMESTER_END"),
  totalHours: z.number().min(1).optional(),
  notes: z.string().optional(),
  generateEntries: z.boolean().default(true), // Whether to immediately generate entries
})

// Function to generate timetable entries from template
async function generateEntriesFromTemplate(template: any) {
  const entries = []
  const startDate = new Date(template.startDate)
  
  let currentDate = new Date(startDate)
  let totalHoursGenerated = 0
  
  // Get the subject to check total hours needed
  const subject = await db.subject.findUnique({
    where: { id: template.subjectId },
    select: { totalHours: true }
  })
  
  const targetHours = template.endCondition === "HOURS_COMPLETE" 
    ? template.totalHours 
    : subject?.totalHours || 0

  // Get time slot duration
  const timeSlot = await db.timeSlot.findUnique({
    where: { id: template.timeSlotId },
    select: { duration: true }
  })
  
  const slotDurationHours = timeSlot ? timeSlot.duration / 60 : 1

  // Generate entries based on recurrence pattern
  const maxIterations = 100 // Safety limit
  let iterations = 0

  while (iterations < maxIterations) {
    iterations++
    
    // Check end conditions
    if (template.endDate && currentDate > new Date(template.endDate)) {
      break
    }
    
    if (template.endCondition === "HOURS_COMPLETE" && totalHoursGenerated >= targetHours) {
      break
    }
    
    // Check if current date matches the day of week
    const dayMapping = {
      MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, 
      FRIDAY: 5, SATURDAY: 6, SUNDAY: 0
    }
    
    if (currentDate.getDay() === dayMapping[template.dayOfWeek]) {
      // Check if this date is not a holiday
      const holidays = await db.holiday.findMany({
        where: {
          date: currentDate,
          OR: [
            { departmentId: null },
            {
              department: {
                batches: {
                  some: { id: template.batchId }
                }
              }
            }
          ]
        }
      })
      
      // Check if it's during an exam period that blocks regular classes
      const examPeriods = await db.examPeriod.findMany({
        where: {
          startDate: { lte: currentDate },
          endDate: { gte: currentDate },
          blockRegularClasses: true,
          academicCalendar: {
            department: {
              batches: {
                some: { id: template.batchId }
              }
            }
          }
        }
      })
      
      if (holidays.length === 0 && examPeriods.length === 0) {
        entries.push({
          batchId: template.batchId,
          subjectId: template.subjectId,
          facultyId: template.facultyId,
          timeSlotId: template.timeSlotId,
          dayOfWeek: template.dayOfWeek,
          date: new Date(currentDate),
          entryType: "REGULAR",
          notes: `Generated from template: ${template.name}`,
        })
        
        totalHoursGenerated += slotDurationHours
      }
    }
    
    // Move to next date based on recurrence pattern
    switch (template.recurrencePattern) {
      case "DAILY":
        currentDate.setDate(currentDate.getDate() + 1)
        break
      case "WEEKLY":
        currentDate.setDate(currentDate.getDate() + 7)
        break
      case "MONTHLY":
        currentDate.setMonth(currentDate.getMonth() + 1)
        break
      default:
        currentDate.setDate(currentDate.getDate() + 7) // Default to weekly
    }
  }
  
  return entries
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (!isAdmin(session.user as any) && !isFaculty(session.user as any))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    // Convert page and limit to numbers
    if (queryParams.page) queryParams.page = parseInt(queryParams.page)
    if (queryParams.limit) queryParams.limit = parseInt(queryParams.limit)
    if (queryParams.isActive) queryParams.isActive = queryParams.isActive === "true"
    
    const filters = templateFilterSchema.parse(queryParams)
    
    const whereClause: any = {}
    
    // Apply filters
    if (filters.batchId) whereClause.batchId = filters.batchId
    if (filters.facultyId) whereClause.facultyId = filters.facultyId
    if (filters.subjectId) whereClause.subjectId = filters.subjectId
    if (filters.isActive !== undefined) whereClause.isActive = filters.isActive

    const skip = (filters.page - 1) * filters.limit

    const [templates, totalCount] = await Promise.all([
      db.timetableTemplate.findMany({
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
        orderBy: { createdAt: "desc" },
        skip,
        take: filters.limit,
      }),
      db.timetableTemplate.count({ where: whereClause })
    ])

    const response = {
      templates,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        totalCount,
        totalPages: Math.ceil(totalCount / filters.limit),
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching timetable templates:", error)
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
    const validatedData = createTemplateSchema.parse(body)

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

    // Validate end condition requirements
    if (validatedData.endCondition === "HOURS_COMPLETE" && !validatedData.totalHours) {
      return NextResponse.json(
        { error: "Total hours is required when end condition is HOURS_COMPLETE" },
        { status: 400 }
      )
    }

    if (validatedData.endCondition === "SPECIFIC_DATE" && !validatedData.endDate) {
      return NextResponse.json(
        { error: "End date is required when end condition is SPECIFIC_DATE" },
        { status: 400 }
      )
    }

    // Create the template
    const template = await db.timetableTemplate.create({
      data: {
        name: validatedData.name,
        batchId: validatedData.batchId,
        subjectId: validatedData.subjectId,
        facultyId: validatedData.facultyId,
        timeSlotId: validatedData.timeSlotId,
        dayOfWeek: validatedData.dayOfWeek,
        recurrencePattern: validatedData.recurrencePattern,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        endCondition: validatedData.endCondition,
        totalHours: validatedData.totalHours,
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

    let generatedEntries = []

    // Generate entries immediately if requested
    if (validatedData.generateEntries) {
      const entries = await generateEntriesFromTemplate(template)
      
      if (entries.length > 0) {
        // Create all entries in a transaction
        generatedEntries = await db.$transaction(async (tx) => {
          const results = []
          
          for (const entry of entries) {
            const created = await tx.timetableEntry.create({
              data: entry,
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
      }
    }

    return NextResponse.json({
      template,
      generatedEntries: generatedEntries,
      summary: {
        templateCreated: true,
        entriesGenerated: generatedEntries.length,
        generateEntries: validatedData.generateEntries,
      }
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating timetable template:", error)
    return NextResponse.json(
      { error: "Failed to create timetable template" },
      { status: 500 }
    )
  }
}