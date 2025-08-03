import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"
import { z } from "zod"
// String-based types matching the Prisma schema
const DayOfWeekValues = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const
const EntryTypeValues = ['REGULAR', 'MAKEUP', 'EXTRA', 'EXAM'] as const

const updateTimetableEntrySchema = z.object({
  batchId: z.string().optional(),
  subjectId: z.string().optional(),
  facultyId: z.string().optional(),
  timeSlotId: z.string().optional(),
  dayOfWeek: z.enum(DayOfWeekValues).optional(),
  date: z.string().optional(),
  entryType: z.enum(EntryTypeValues).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
})

// Conflict detection function (reused from main route)
async function checkConflicts(data: any, excludeId: string) {
  const conflicts: any[] = []
  
  const whereClause: any = {
    isActive: true,
    NOT: { id: excludeId }
  }
  
  if (data.timeSlotId) whereClause.timeSlotId = data.timeSlotId
  if (data.dayOfWeek) whereClause.dayOfWeek = data.dayOfWeek
  if (data.date) whereClause.date = new Date(data.date)

  // Only check conflicts if time-related fields are being updated
  if (!data.timeSlotId && !data.dayOfWeek && !data.date) {
    return conflicts
  }

  // Check batch conflicts if batch is being updated
  if (data.batchId) {
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
  }

  // Check faculty conflicts if faculty is being updated
  if (data.facultyId) {
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
  }

  return conflicts
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const entry = await db.timetableEntry.findUnique({
      where: { id },

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

    if (!entry) {
      return NextResponse.json(
        { error: "Timetable entry not found" },
        { status: 404 }
      )
    }

    // Role-based access control
    const user = session.user as any
    if (!isAdmin(user) && !isFaculty(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json(entry)
  } catch (error) {
    console.error("Error fetching timetable entry:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateTimetableEntrySchema.parse(body)

    // Verify entry exists
    const existingEntry = await db.timetableEntry.findUnique({
      where: { id },

      include: {
        batch: true,
        subject: true,
      }
    })

    if (!existingEntry) {
      return NextResponse.json(
        { error: "Timetable entry not found" },
        { status: 404 }
      )
    }

    // Validate batch if being updated
    if (validatedData.batchId && validatedData.batchId !== existingEntry.batchId) {
      const batch = await db.batch.findUnique({
        where: { id: validatedData.batchId }
      })
      if (!batch) {
        return NextResponse.json(
          { error: "Batch not found" },
          { status: 404 }
        )
      }
    }

    // Validate subject if being updated
    if (validatedData.subjectId && validatedData.subjectId !== existingEntry.subjectId) {
      const subject = await db.subject.findUnique({
        where: { id: validatedData.subjectId }
      })
      if (!subject) {
        return NextResponse.json(
          { error: "Subject not found" },
          { status: 404 }
        )
      }
      
      // Ensure subject belongs to the correct batch
      const targetBatchId = validatedData.batchId || existingEntry.batchId
      if (subject.batchId !== targetBatchId) {
        return NextResponse.json(
          { error: "Subject does not belong to the specified batch" },
          { status: 400 }
        )
      }
    }

    // Validate faculty if being updated
    if (validatedData.facultyId && validatedData.facultyId !== existingEntry.facultyId) {
      const faculty = await db.user.findUnique({
        where: { id: validatedData.facultyId }
      })
      if (!faculty || faculty.role !== "FACULTY") {
        return NextResponse.json(
          { error: "Faculty not found or is not a faculty member" },
          { status: 400 }
        )
      }
    }

    // Validate time slot if being updated
    if (validatedData.timeSlotId && validatedData.timeSlotId !== existingEntry.timeSlotId) {
      const timeSlot = await db.timeSlot.findUnique({
        where: { id: validatedData.timeSlotId }
      })
      if (!timeSlot || !timeSlot.isActive) {
        return NextResponse.json(
          { error: "Time slot not found or is inactive" },
          { status: 400 }
        )
      }
    }

    // Check for conflicts with the updated data
    const mergedData = {
      batchId: validatedData.batchId || existingEntry.batchId,
      facultyId: validatedData.facultyId || existingEntry.facultyId,
      timeSlotId: validatedData.timeSlotId || existingEntry.timeSlotId,
      dayOfWeek: validatedData.dayOfWeek || existingEntry.dayOfWeek,
      date: validatedData.date || existingEntry.date,
      entryType: validatedData.entryType || existingEntry.entryType,
    }

    const conflicts = await checkConflicts(mergedData, id)
    
    if (conflicts.length > 0) {
      return NextResponse.json(
        { 
          error: "Scheduling conflicts detected", 
          conflicts 
        },
        { status: 409 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (validatedData.batchId !== undefined) updateData.batchId = validatedData.batchId
    if (validatedData.subjectId !== undefined) updateData.subjectId = validatedData.subjectId
    if (validatedData.facultyId !== undefined) updateData.facultyId = validatedData.facultyId
    if (validatedData.timeSlotId !== undefined) updateData.timeSlotId = validatedData.timeSlotId
    if (validatedData.dayOfWeek !== undefined) updateData.dayOfWeek = validatedData.dayOfWeek
    if (validatedData.date !== undefined) updateData.date = validatedData.date ? new Date(validatedData.date) : null
    if (validatedData.entryType !== undefined) updateData.entryType = validatedData.entryType
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive

    // Update the entry
    const updatedEntry = await db.timetableEntry.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(updatedEntry)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating timetable entry:", error)
    return NextResponse.json(
      { error: "Failed to update timetable entry" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (!isAdmin(session.user as any) && !isFaculty(session.user as any))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    
    // For drag and drop, we expect timeSlotName instead of timeSlotId
    if (body.timeSlotName) {
      // Find the time slot by name
      const timeSlot = await db.timeSlot.findFirst({
        where: { name: body.timeSlotName }
      })
      
      if (!timeSlot) {
        // List all available time slots for debugging
        const allTimeSlots = await db.timeSlot.findMany()
        return NextResponse.json({ 
          error: "Time slot not found", 
          requested: body.timeSlotName,
          available: allTimeSlots.map(ts => ts.name)
        }, { status: 400 })
      }
      
      body.timeSlotId = timeSlot.id
      delete body.timeSlotName
    }

    const validatedData = updateTimetableEntrySchema.parse(body)

    // Get existing entry
    const existingEntry = await db.timetableEntry.findUnique({
      where: { id }
    })

    if (!existingEntry) {
      return NextResponse.json(
        { error: "Timetable entry not found" },
        { status: 404 }
      )
    }

    // Check for conflicts with the updated data
    const mergedData = {
      batchId: validatedData.batchId || existingEntry.batchId,
      facultyId: validatedData.facultyId || existingEntry.facultyId,
      timeSlotId: validatedData.timeSlotId || existingEntry.timeSlotId,
      dayOfWeek: validatedData.dayOfWeek || existingEntry.dayOfWeek,
      date: validatedData.date || existingEntry.date,
      entryType: validatedData.entryType || existingEntry.entryType,
    }

    const conflicts = await checkConflicts(mergedData, id)
    
    if (conflicts.length > 0) {
      return NextResponse.json(
        { 
          error: "Scheduling conflicts detected", 
          conflicts 
        },
        { status: 409 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (validatedData.dayOfWeek !== undefined) updateData.dayOfWeek = validatedData.dayOfWeek
    if (validatedData.timeSlotId !== undefined) updateData.timeSlotId = validatedData.timeSlotId

    // Update the entry
    const updatedEntry = await db.timetableEntry.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(updatedEntry)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating timetable entry:", error)
    return NextResponse.json(
      { error: "Failed to update timetable entry" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log(`🗑️ DELETE request received`)
  
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      console.log(`❌ Unauthorized deletion attempt`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    console.log(`🗑️ DELETE request for timetable entry: ${id}`)
    const url = new URL(request.url)
    const specificDate = url.searchParams.get('date') // Get specific date if provided

    // Verify entry exists
    const existingEntry = await db.timetableEntry.findUnique({
      where: { id }
    })

    if (!existingEntry) {
      return NextResponse.json(
        { error: "Timetable entry not found" },
        { status: 404 }
      )
    }

    // Check if trying to delete a past date
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today
    
    if (specificDate) {
      const dateToCheck = new Date(specificDate)
      dateToCheck.setHours(0, 0, 0, 0)
      
      if (dateToCheck < today) {
        console.log(`❌ Attempted to delete past date: ${specificDate}`)
        return NextResponse.json(
          { error: "Cannot delete timetable entries for past dates" },
          { status: 400 }
        )
      }
    }
    
    // For date-specific entries, check if the entry date is in the past
    if (existingEntry.date) {
      const entryDate = new Date(existingEntry.date)
      entryDate.setHours(0, 0, 0, 0)
      
      if (entryDate < today) {
        console.log(`❌ Attempted to delete past date-specific entry: ${entryDate.toDateString()}`)
        return NextResponse.json(
          { error: "Cannot delete timetable entries for past dates" },
          { status: 400 }
        )
      }
    }

    // If this is a recurring entry (date = null) and user wants to delete a specific occurrence
    if (!existingEntry.date && specificDate) {
      console.log(`🔍 Processing date-specific deletion for entry ${id}, date: ${specificDate}`)
      
      // Convert recurring entry to date-specific entries, excluding the date to be deleted
      const dateToDelete = new Date(specificDate)
      console.log(`📅 Date to delete: ${dateToDelete.toISOString()}`)
      
      // Generate date-specific entries for the next 12 weeks, excluding the date to delete
      const currentDate = new Date()
      console.log(`📅 Current date: ${currentDate.toDateString()} (${currentDate.toISOString().split('T')[0]})`)
      
      // Start from beginning of current week to ensure we don't miss any classes
      const startDate = new Date(currentDate)
      startDate.setDate(currentDate.getDate() - currentDate.getDay()) // Go to start of week (Sunday)
      console.log(`📅 Week start date: ${startDate.toDateString()} (${startDate.toISOString().split('T')[0]})`)
      
      const entries = []
      
      // Get the day of week number (0 = Sunday, 1 = Monday, etc.)
      const dayOfWeekMap = {
        'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3,
        'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
      }
      const targetDayOfWeek = dayOfWeekMap[existingEntry.dayOfWeek as keyof typeof dayOfWeekMap]
      console.log(`🎯 Target day of week: ${existingEntry.dayOfWeek} (${targetDayOfWeek})`)
      
      // Generate entries for 12 weeks starting from current week
      for (let week = 0; week < 12; week++) {
        const weekStart = new Date(startDate)
        weekStart.setDate(startDate.getDate() + (week * 7))
        
        const entryDate = new Date(weekStart)
        entryDate.setDate(weekStart.getDate() + targetDayOfWeek)
        
        console.log(`📅 Week ${week}: weekStart=${weekStart.toDateString()}, entryDate=${entryDate.toDateString()}`)
        
        // Skip the date we want to delete
        if (entryDate.toDateString() === dateToDelete.toDateString()) {
          console.log(`❌ Skipping deleted date: ${entryDate.toDateString()}`)
          continue
        }
        
        // Only include current and future dates
        if (entryDate >= currentDate) {
          console.log(`✅ Adding entry for: ${entryDate.toDateString()}`)
          entries.push({
            batchId: existingEntry.batchId,
            subjectId: existingEntry.subjectId,
            facultyId: existingEntry.facultyId,
            timeSlotId: existingEntry.timeSlotId,
            dayOfWeek: existingEntry.dayOfWeek,
            date: entryDate,
            entryType: existingEntry.entryType,
            notes: existingEntry.notes,
            isActive: true,
          })
        } else {
          console.log(`⏭️  Skipping past date: ${entryDate.toDateString()}`)
        }
      }

      console.log(`📊 Generated ${entries.length} date-specific entries`)

      // Delete the original recurring entry and create new date-specific entries
      await db.$transaction(async (tx) => {
        console.log(`🗑️  Deleting recurring entry: ${id}`)
        // Delete the recurring entry
        await tx.timetableEntry.delete({
          where: { id }
        })
        
        // Create new date-specific entries
        if (entries.length > 0) {
          console.log(`➕ Creating ${entries.length} new date-specific entries`)
          await tx.timetableEntry.createMany({
            data: entries
          })
        }
      })
      
      console.log(`✅ Transaction completed successfully`)
      
      return NextResponse.json({ 
        message: "Specific occurrence deleted, recurring pattern converted to individual entries",
        converted_to_specific: true,
        entries_created: entries.length,
        debug: {
          originalEntryId: id,
          deletedDate: specificDate,
          entriesCreated: entries.length
        }
      })
    }

    // Handle normal deletion (date-specific entries or full recurring deletion)
    
    // Check if there are any attendance sessions linked to this entry
    const relatedAttendance = await db.attendanceSession.findFirst({
      where: {
        batchId: existingEntry.batchId,
        subjectId: existingEntry.subjectId,
        date: existingEntry.date || undefined,
      }
    })

    if (relatedAttendance) {
      // Soft delete to preserve attendance history
      await db.timetableEntry.update({
        where: { id },
        data: { isActive: false }
      })
      
      return NextResponse.json({ 
        message: "Timetable entry soft deleted due to existing attendance records",
        soft_deleted: true 
      })
    } else {
      // Hard delete if no attendance records
      await db.timetableEntry.delete({
        where: { id }
      })
      
      return NextResponse.json({ 
        message: "Timetable entry deleted successfully",
        soft_deleted: false 
      })
    }
  } catch (error) {
    console.error("Error deleting timetable entry:", error)
    return NextResponse.json(
      { error: "Failed to delete timetable entry" },
      { status: 500 }
    )
  }
}