import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Same validation schema as the import endpoint
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse JSON data
    const jsonData = await request.json()
    
    // Validate against schema
    const validationResult = TimetableImportSchema.safeParse(jsonData)
    
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        value: err.code === 'invalid_type' ? 'invalid_type' : undefined,
        code: err.code
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

    // Perform additional business logic validation
    const warnings: string[] = []
    const additionalErrors: any[] = []

    // 1. Check if department exists
    const department = await db.department.findFirst({
      where: { name: { contains: data.batch.department } }
    })

    if (!department) {
      additionalErrors.push({
        field: 'batch.department',
        message: `Department '${data.batch.department}' does not exist in the system`,
        value: data.batch.department,
        code: 'not_found'
      })
    }

    // 2. Validate date range
    const startDate = new Date(data.dateRange.startDate)
    const endDate = new Date(data.dateRange.endDate)
    
    if (startDate >= endDate) {
      additionalErrors.push({
        field: 'dateRange',
        message: 'Start date must be before end date',
        code: 'invalid_range'
      })
    }

    // 3. Check for date/dayOfWeek consistency
    data.entries.forEach((entry, index) => {
      const entryDate = new Date(entry.date)
      const expectedDayOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][entryDate.getDay()]
      
      if (entry.type !== 'HOLIDAY' && entry.dayOfWeek !== expectedDayOfWeek) {
        warnings.push(`Entry ${index + 1}: Date ${entry.date} is a ${expectedDayOfWeek}, but dayOfWeek is set to ${entry.dayOfWeek}`)
      }
    })

    // 4. Check for duplicate entries (same batch, date, timeSlot)
    const entryKeys = new Set<string>()
    data.entries.forEach((entry, index) => {
      if (entry.type !== 'HOLIDAY') {
        const key = `${data.batch.name}-${entry.date}-${entry.timeSlot}`
        if (entryKeys.has(key)) {
          warnings.push(`Entry ${index + 1}: Duplicate entry detected for ${entry.date} at ${entry.timeSlot}`)
        }
        entryKeys.add(key)
      }
    })

    // 5. Check time slot format consistency
    const timeSlotNames = new Set<string>()
    data.timeSlots.forEach(ts => timeSlotNames.add(ts.name))
    
    data.entries.forEach((entry, index) => {
      if (entry.type !== 'HOLIDAY' && data.timeSlots.length > 0) {
        if (!timeSlotNames.has(entry.timeSlot)) {
          warnings.push(`Entry ${index + 1}: Time slot '${entry.timeSlot}' is not defined in timeSlots array`)
        }
      }
    })

    // 6. Check for existing batch conflicts
    if (department) {
      const existingBatch = await db.batch.findFirst({
        where: { name: data.batch.name }
      })

      if (existingBatch) {
        warnings.push(`Batch '${data.batch.name}' already exists. Import will use existing batch.`)
      }
    }

    // 7. Check for subject/faculty consistency
    const subjectFacultyMap = new Map<string, string>()
    data.entries.forEach((entry, index) => {
      if (entry.type === 'SUBJECT') {
        const existingFaculty = subjectFacultyMap.get(entry.subject.code)
        if (existingFaculty && existingFaculty !== entry.faculty.email) {
          warnings.push(`Entry ${index + 1}: Subject '${entry.subject.code}' is assigned to different faculty. Previous: ${existingFaculty}, Current: ${entry.faculty.email}`)
        }
        subjectFacultyMap.set(entry.subject.code, entry.faculty.email)
      }
    })

    // Prepare summary
    const totalEntries = data.entries.length
    const subjectEntries = data.entries.filter(e => e.type === 'SUBJECT').length
    const customEventEntries = data.entries.filter(e => e.type === 'CUSTOM_EVENT').length
    const holidayEntries = data.entries.filter(e => e.type === 'HOLIDAY').length

    const response = {
      success: additionalErrors.length === 0,
      message: additionalErrors.length === 0 ? "Validation successful" : "Validation failed",
      errors: additionalErrors,
      warnings,
      summary: {
        totalEntries,
        subjectEntries,
        customEventEntries, 
        holidayEntries,
        timeSlots: data.timeSlots.length,
        dateRange: `${data.dateRange.startDate} to ${data.dateRange.endDate}`,
        batch: data.batch.name,
        department: data.batch.department,
        validationPassed: additionalErrors.length === 0
      },
      validation: {
        schemaValid: true,
        businessLogicValid: additionalErrors.length === 0,
        warningsCount: warnings.length
      }
    }

    return NextResponse.json(response, { 
      status: additionalErrors.length === 0 ? 200 : 400 
    })

  } catch (error: any) {
    console.error('Validation API Error:', error)
    return NextResponse.json({
      success: false,
      message: "Internal server error during validation",
      error: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({
    message: "Timetable Validation API",
    description: "Validates JSON format and business logic without importing data",
    usage: {
      method: "POST",
      contentType: "application/json",
      body: "JSON data following the timetable schema"
    },
    validationChecks: [
      "JSON schema compliance",
      "Date format validation", 
      "Department existence check",
      "Date range consistency",
      "Day of week verification",
      "Duplicate entry detection",
      "Time slot consistency",
      "Subject-faculty mapping"
    ],
    documentation: "/TIMETABLE_JSON_SCHEMA.md"
  })
}