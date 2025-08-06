import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Comprehensive validation schema for timetable import
const TimetableImportSchema = z.object({
  metadata: z.object({
    importId: z.string().min(1, "Import ID is required"),
    createdAt: z.string().datetime().optional(),
    description: z.string().optional()
  }),
  batch: z.object({
    name: z.string().min(1, "Batch name is required"),
    semester: z.enum(["ODD", "EVEN"], { message: "Semester must be ODD or EVEN" }),
    year: z.number().int().min(2020).max(2030, "Year must be between 2020-2030"),
    department: z.string().min(1, "Department is required"),
    specialization: z.string().optional(),
    capacity: z.number().int().positive().optional()
  }),
  dateRange: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD format"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD format"),
    description: z.string().optional()
  }),
  timeSlots: z.array(z.object({
    name: z.string().min(1, "Time slot name is required"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be HH:MM format"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "End time must be HH:MM format"),
    duration: z.number().int().positive("Duration must be positive"),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().positive("Sort order must be positive")
  })).optional().default([]),
  entries: z.array(z.discriminatedUnion("type", [
    // SUBJECT entry
    z.object({
      type: z.literal("SUBJECT"),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
      dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
      timeSlot: z.string().min(1, "Time slot is required"),
      subject: z.object({
        name: z.string().min(1, "Subject name is required"),
        code: z.string().min(1, "Subject code is required"),
        credits: z.number().int().positive("Credits must be positive"),
        type: z.enum(["THEORY", "PRACTICAL", "LAB", "TUTORIAL"]).default("THEORY")
      }),
      faculty: z.object({
        name: z.string().min(1, "Faculty name is required"),
        email: z.string().email("Faculty email must be valid"),
        department: z.string().optional()
      }),
      recurring: z.boolean().default(false),
      notes: z.string().optional()
    }),
    // CUSTOM_EVENT entry
    z.object({
      type: z.literal("CUSTOM_EVENT"),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
      dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
      timeSlot: z.string().min(1, "Time slot is required"),
      title: z.string().min(1, "Event title is required"),
      description: z.string().optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be valid hex format (#rrggbb)").optional(),
      recurring: z.boolean().default(false)
    }),
    // HOLIDAY entry
    z.object({
      type: z.literal("HOLIDAY"),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
      name: z.string().min(1, "Holiday name is required"),
      description: z.string().optional(),
      holidayType: z.enum(["NATIONAL", "UNIVERSITY", "DEPARTMENT", "LOCAL"]).default("UNIVERSITY"),
      isRecurring: z.boolean().default(false)
    })
  ]))
})

type TimetableImportData = z.infer<typeof TimetableImportSchema>

// Use global import status tracking
declare global {
  var importStatus: Map<string, {
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
    progress: number
    results?: any
    errors?: any[]
    createdAt: Date
    updatedAt?: Date
  }>
}

// Initialize global import status store
if (!global.importStatus) {
  global.importStatus = new Map()
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse and validate JSON data
    const jsonData = await request.json()
    
    // Validate against schema
    const validationResult = TimetableImportSchema.safeParse(jsonData)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        value: err.code === 'invalid_type' ? 'invalid_type' : undefined
      }))

      return NextResponse.json({
        success: false,
        message: "Validation failed",
        errors,
        summary: {
          totalEntries: jsonData.entries?.length || 0,
          validEntries: 0,
          invalidEntries: errors.length,
          warnings: []
        }
      }, { status: 400 })
    }

    const data: TimetableImportData = validationResult.data

    // Initialize import status
    global.importStatus.set(data.metadata.importId, {
      status: 'PROCESSING',
      progress: 0,
      createdAt: new Date()
    })

    // Process import asynchronously
    processImport(data, session.user.id).catch(error => {
      console.error('Import processing failed:', error)
      global.importStatus.set(data.metadata.importId, {
        status: 'FAILED',
        progress: 100,
        errors: [{ message: error.message }],
        createdAt: new Date(),
        updatedAt: new Date()
      })
    })

    return NextResponse.json({
      success: true,
      message: "Import initiated successfully",
      importId: data.metadata.importId,
      statusUrl: `/api/timetable/import/${data.metadata.importId}/status`
    })

  } catch (error: any) {
    console.error('Import API Error:', error)
    return NextResponse.json({
      success: false,
      message: "Internal server error during import",
      error: error.message
    }, { status: 500 })
  }
}

async function processImport(data: TimetableImportData, userId: string) {
  const importId = data.metadata.importId
  const results = {
    batchesCreated: 0,
    subjectsCreated: 0,
    facultyCreated: 0,
    timeSlotsCreated: 0,
    entriesCreated: 0,
    holidaysCreated: 0,
    customEventsCreated: 0,
    warnings: [] as string[]
  }

  try {
    // Update progress: 10%
    const currentStatus = global.importStatus.get(importId)
    global.importStatus.set(importId, {
      ...currentStatus!,
      status: 'PROCESSING',
      progress: 10,
      updatedAt: new Date()
    })

    // 1. Find or create department
    const department = await db.department.findFirst({
      where: { name: { contains: data.batch.department, mode: 'insensitive' } }
    })

    if (!department) {
      throw new Error(`Department '${data.batch.department}' not found. Please create the department first.`)
    }

    // 2. Find or create specialization
    let specialization = null
    if (data.batch.specialization) {
      specialization = await db.specialization.findFirst({
        where: { 
          name: { contains: data.batch.specialization, mode: 'insensitive' },
          departmentId: department.id
        }
      })

      if (!specialization) {
        specialization = await db.specialization.create({
          data: {
            name: data.batch.specialization,
            code: data.batch.specialization.substring(0, 10).toUpperCase(),
            departmentId: department.id,
            isActive: true
          }
        })
        results.warnings.push(`Created new specialization: ${data.batch.specialization}`)
      }
    }

    // Update progress: 20%
    global.importStatus.set(importId, {
      ...global.importStatus.get(importId)!,
      status: 'PROCESSING',
      progress: 20,
      updatedAt: new Date()
    })

    // 3. Find or create batch
    let batch = await db.batch.findFirst({
      where: { name: data.batch.name }
    })

    if (!batch) {
      batch = await db.batch.create({
        data: {
          name: data.batch.name,
          semester: data.batch.semester,
          year: data.batch.year,
          capacity: data.batch.capacity || 30,
          departmentId: department.id,
          specializationId: specialization?.id,
          isActive: true
        }
      })
      results.batchesCreated = 1
    }

    // Update progress: 30%
    global.importStatus.set(importId, {
      ...global.importStatus.get(importId)!,
      status: 'PROCESSING',
      progress: 30,
      updatedAt: new Date()
    })

    // 4. Create/update time slots
    for (const timeSlotData of data.timeSlots) {
      const existingTimeSlot = await db.timeSlot.findFirst({
        where: { name: timeSlotData.name }
      })

      if (!existingTimeSlot) {
        await db.timeSlot.create({
          data: {
            name: timeSlotData.name,
            startTime: timeSlotData.startTime,
            endTime: timeSlotData.endTime,
            duration: timeSlotData.duration,
            isActive: timeSlotData.isActive,
            sortOrder: timeSlotData.sortOrder
          }
        })
        results.timeSlotsCreated++
      }
    }

    // Update progress: 40%
    global.importStatus.set(importId, {
      ...global.importStatus.get(importId)!,
      status: 'PROCESSING',
      progress: 40,
      updatedAt: new Date()
    })

    // 5. Process entries
    const totalEntries = data.entries.length
    let processedEntries = 0

    for (const entry of data.entries) {
      if (entry.type === 'HOLIDAY') {
        // Handle holiday creation
        const existingHoliday = await db.holiday.findFirst({
          where: {
            date: new Date(entry.date),
            name: entry.name
          }
        })

        if (!existingHoliday) {
          await db.holiday.create({
            data: {
              name: entry.name,
              date: new Date(entry.date),
              type: entry.holidayType,
              description: entry.description,
              isRecurring: entry.isRecurring,
              departmentId: department.id
            }
          })
          results.holidaysCreated++
        }
      } else {
        // Handle subject and custom event entries
        let subjectId = null
        let facultyId = null

        if (entry.type === 'SUBJECT') {
          // Find or create subject
          let subject = await db.subject.findFirst({
            where: { 
              OR: [
                { code: entry.subject.code },
                { name: entry.subject.name }
              ]
            }
          })

          if (!subject) {
            subject = await db.subject.create({
              data: {
                name: entry.subject.name,
                code: entry.subject.code,
                credits: entry.subject.credits,
                type: entry.subject.type,
                departmentId: department.id,
                isActive: true
              }
            })
            results.subjectsCreated++
          }
          subjectId = subject.id

          // Find or create faculty
          let faculty = await db.user.findFirst({
            where: {
              email: entry.faculty.email,
              role: 'FACULTY'
            }
          })

          if (!faculty) {
            faculty = await db.user.create({
              data: {
                name: entry.faculty.name,
                email: entry.faculty.email,
                role: 'FACULTY',
                status: 'ACTIVE',
                departmentId: department.id
              }
            })
            results.facultyCreated++
          }
          facultyId = faculty.id

          // Update subject with faculty if not assigned
          if (!subject.facultyId) {
            await db.subject.update({
              where: { id: subject.id },
              data: { facultyId: faculty.id }
            })
          }
        }

        // Find time slot
        const timeSlot = await db.timeSlot.findFirst({
          where: { name: entry.timeSlot }
        })

        if (!timeSlot) {
          results.warnings.push(`Time slot '${entry.timeSlot}' not found for entry on ${entry.date}`)
          continue
        }

        // Create timetable entry
        const entryData: any = {
          batchId: batch.id,
          dayOfWeek: entry.dayOfWeek,
          timeSlotId: timeSlot.id,
          date: new Date(entry.date)
        }

        if (entry.type === 'SUBJECT') {
          entryData.subjectId = subjectId
          entryData.facultyId = facultyId
          entryData.notes = entry.notes
        } else if (entry.type === 'CUSTOM_EVENT') {
          entryData.customEventTitle = entry.title
          entryData.customEventColor = entry.color || '#3b82f6'
          entryData.notes = entry.description
          results.customEventsCreated++
        }

        // Check for existing entry to avoid duplicates
        const existingEntry = await db.timetableEntry.findFirst({
          where: {
            batchId: batch.id,
            dayOfWeek: entry.dayOfWeek,
            timeSlotId: timeSlot.id,
            date: new Date(entry.date)
          }
        })

        if (!existingEntry) {
          await db.timetableEntry.create({
            data: entryData
          })
          results.entriesCreated++
        } else {
          results.warnings.push(`Duplicate entry skipped: ${entry.dayOfWeek} ${entry.timeSlot} on ${entry.date}`)
        }
      }

      processedEntries++
      // Update progress: 40% + (50% * progress)
      const currentProgress = 40 + Math.floor((processedEntries / totalEntries) * 50)
      global.importStatus.set(importId, {
        ...global.importStatus.get(importId)!,
        status: 'PROCESSING',
        progress: currentProgress,
        updatedAt: new Date()
      })
    }

    // Complete import
    global.importStatus.set(importId, {
      ...global.importStatus.get(importId)!,
      status: 'COMPLETED',
      progress: 100,
      results,
      updatedAt: new Date()
    })

  } catch (error: any) {
    console.error('Import processing error:', error)
    global.importStatus.set(importId, {
      ...global.importStatus.get(importId)!,
      status: 'FAILED',
      progress: 100,
      errors: [{ message: error.message }],
      updatedAt: new Date()
    })
    throw error
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({
    message: "Timetable Import API",
    endpoints: {
      "POST /api/timetable/import": "Import timetable data from JSON",
      "POST /api/timetable/validate": "Validate JSON format without importing",
      "GET /api/timetable/import/{importId}/status": "Get import status"
    },
    documentation: "/TIMETABLE_JSON_SCHEMA.md"
  })
}