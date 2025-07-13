import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/utils/permissions"
import { z } from "zod"

const updateTimeslotSchema = z.object({
  name: z.string().min(1).optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  sortOrder: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
})

// Helper function to calculate duration in minutes
function calculateDuration(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(":").map(Number)
  const [endHour, endMinute] = endTime.split(":").map(Number)
  
  const startMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute
  
  return endMinutes >= startMinutes ? endMinutes - startMinutes : (24 * 60 - startMinutes) + endMinutes
}

// Helper function to check for time overlaps
function isTimeOverlapping(start1: string, end1: string, start2: string, end2: string): boolean {
  const [start1Hour, start1Min] = start1.split(":").map(Number)
  const [end1Hour, end1Min] = end1.split(":").map(Number)
  const [start2Hour, start2Min] = start2.split(":").map(Number)
  const [end2Hour, end2Min] = end2.split(":").map(Number)
  
  const start1Minutes = start1Hour * 60 + start1Min
  const end1Minutes = end1Hour * 60 + end1Min
  const start2Minutes = start2Hour * 60 + start2Min
  const end2Minutes = end2Hour * 60 + end2Min
  
  return (start1Minutes < end2Minutes && end1Minutes > start2Minutes)
}

// Helper function to check if time slots are adjacent and can be merged
async function findAdjacentSlots(timeSlotId: string, startTime: string, endTime: string) {
  const allSlots = await db.timeSlot.findMany({
    where: { 
      isActive: true,
      NOT: { id: timeSlotId }
    },
    orderBy: { startTime: "asc" }
  })

  const adjacentSlots = []
  
  for (const slot of allSlots) {
    // Check if current slot ends where another starts (can merge)
    if (endTime === slot.startTime) {
      adjacentSlots.push({ ...slot, position: "after" })
    }
    // Check if another slot ends where current starts (can merge)
    if (slot.endTime === startTime) {
      adjacentSlots.push({ ...slot, position: "before" })
    }
  }
  
  return adjacentSlots
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const timeSlot = await db.timeSlot.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            timetableEntries: true,
            timetableTemplates: true,
          }
        },
        timetableEntries: {
          where: { isActive: true },
          include: {
            batch: { select: { name: true } },
            subject: { select: { name: true, code: true } },
            faculty: { select: { name: true } },
          },
          take: 10, // Limit for performance
        }
      }
    })

    if (!timeSlot) {
      return NextResponse.json(
        { error: "Time slot not found" },
        { status: 404 }
      )
    }

    // Find adjacent slots for potential merging
    const adjacentSlots = await findAdjacentSlots(
      timeSlot.id, 
      timeSlot.startTime, 
      timeSlot.endTime
    )

    const enrichedTimeSlot = {
      ...timeSlot,
      duration: calculateDuration(timeSlot.startTime, timeSlot.endTime),
      inUse: timeSlot._count.timetableEntries > 0 || timeSlot._count.timetableTemplates > 0,
      usageCount: timeSlot._count.timetableEntries + timeSlot._count.timetableTemplates,
      adjacentSlots,
    }

    return NextResponse.json(enrichedTimeSlot)
  } catch (error) {
    console.error("Error fetching time slot:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateTimeslotSchema.parse(body)

    // Verify time slot exists
    const existingTimeSlot = await db.timeSlot.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            timetableEntries: true,
            timetableTemplates: true,
          }
        }
      }
    })

    if (!existingTimeSlot) {
      return NextResponse.json(
        { error: "Time slot not found" },
        { status: 404 }
      )
    }

    // Check if time slot is in use and prevent certain changes
    const isInUse = existingTimeSlot._count.timetableEntries > 0 || existingTimeSlot._count.timetableTemplates > 0
    
    if (isInUse && (validatedData.startTime || validatedData.endTime)) {
      return NextResponse.json(
        { 
          error: "Cannot modify start/end time of a time slot that is currently in use",
          usage: {
            timetableEntries: existingTimeSlot._count.timetableEntries,
            timetableTemplates: existingTimeSlot._count.timetableTemplates,
          }
        },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    
    if (validatedData.name !== undefined) {
      // Check if name already exists (excluding current slot)
      const existingNameSlot = await db.timeSlot.findFirst({
        where: { 
          name: validatedData.name,
          isActive: true,
          NOT: { id: params.id }
        }
      })

      if (existingNameSlot) {
        return NextResponse.json(
          { error: "A time slot with this name already exists" },
          { status: 400 }
        )
      }
      
      updateData.name = validatedData.name
    }

    // Handle time changes
    const newStartTime = validatedData.startTime || existingTimeSlot.startTime
    const newEndTime = validatedData.endTime || existingTimeSlot.endTime

    if (validatedData.startTime || validatedData.endTime) {
      // Validate that end time is after start time
      const duration = calculateDuration(newStartTime, newEndTime)
      if (duration <= 0) {
        return NextResponse.json(
          { error: "End time must be after start time" },
          { status: 400 }
        )
      }

      // Check for overlapping time slots (excluding current slot)
      const existingTimeSlots = await db.timeSlot.findMany({
        where: { 
          isActive: true,
          NOT: { id: params.id }
        },
        select: { id: true, name: true, startTime: true, endTime: true }
      })

      const overlappingSlots = existingTimeSlots.filter(slot => 
        isTimeOverlapping(newStartTime, newEndTime, slot.startTime, slot.endTime)
      )

      if (overlappingSlots.length > 0) {
        return NextResponse.json({
          error: "Updated time slot would overlap with existing time slots",
          overlapping: overlappingSlots
        }, { status: 409 })
      }

      updateData.startTime = newStartTime
      updateData.endTime = newEndTime
      updateData.duration = duration
    }

    if (validatedData.sortOrder !== undefined) updateData.sortOrder = validatedData.sortOrder
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive

    // Update the time slot
    const updatedTimeSlot = await db.timeSlot.update({
      where: { id: params.id },
      data: updateData,
      include: {
        _count: {
          select: {
            timetableEntries: true,
            timetableTemplates: true,
          }
        }
      }
    })

    // Find adjacent slots for potential merging after update
    const adjacentSlots = await findAdjacentSlots(
      updatedTimeSlot.id, 
      updatedTimeSlot.startTime, 
      updatedTimeSlot.endTime
    )

    const enrichedTimeSlot = {
      ...updatedTimeSlot,
      duration: calculateDuration(updatedTimeSlot.startTime, updatedTimeSlot.endTime),
      inUse: updatedTimeSlot._count.timetableEntries > 0 || updatedTimeSlot._count.timetableTemplates > 0,
      usageCount: updatedTimeSlot._count.timetableEntries + updatedTimeSlot._count.timetableTemplates,
      adjacentSlots,
    }

    return NextResponse.json(enrichedTimeSlot)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating time slot:", error)
    return NextResponse.json(
      { error: "Failed to update time slot" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify time slot exists
    const existingTimeSlot = await db.timeSlot.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            timetableEntries: true,
            timetableTemplates: true,
          }
        }
      }
    })

    if (!existingTimeSlot) {
      return NextResponse.json(
        { error: "Time slot not found" },
        { status: 404 }
      )
    }

    // Check if time slot is in use
    const isInUse = existingTimeSlot._count.timetableEntries > 0 || existingTimeSlot._count.timetableTemplates > 0

    if (isInUse) {
      // Soft delete - mark as inactive instead of deleting
      const softDeletedTimeSlot = await db.timeSlot.update({
        where: { id: params.id },
        data: { isActive: false }
      })
      
      return NextResponse.json({ 
        message: "Time slot soft deleted due to existing usage",
        soft_deleted: true,
        usage: {
          timetableEntries: existingTimeSlot._count.timetableEntries,
          timetableTemplates: existingTimeSlot._count.timetableTemplates,
        },
        timeSlot: softDeletedTimeSlot
      })
    } else {
      // Hard delete if not in use
      await db.timeSlot.delete({
        where: { id: params.id }
      })
      
      return NextResponse.json({ 
        message: "Time slot deleted successfully",
        soft_deleted: false 
      })
    }
  } catch (error) {
    console.error("Error deleting time slot:", error)
    return NextResponse.json(
      { error: "Failed to delete time slot" },
      { status: 500 }
    )
  }
}