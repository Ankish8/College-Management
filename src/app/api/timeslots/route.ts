import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"
import { z } from "zod"

const timeslotFilterSchema = z.object({
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  departmentId: z.string().optional(),
  sortBy: z.enum(["startTime", "sortOrder", "createdAt", "name", "duration", "usageCount"]).default("sortOrder"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
})

const createTimeslotSchema = z.object({
  name: z.string().min(1, "Time slot name is required"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid start time format (HH:MM)"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid end time format (HH:MM)"),
  sortOrder: z.number().min(0).default(0),
})

// Helper function to calculate duration in minutes
function calculateDuration(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(":").map(Number)
  const [endHour, endMinute] = endTime.split(":").map(Number)
  
  const startMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute
  
  // Handle crossing midnight (though not typically used in timetables)
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

// Helper function to check if time slots are adjacent
function areTimeSlotsAdjacent(end1: string, start2: string): boolean {
  const [end1Hour, end1Min] = end1.split(":").map(Number)
  const [start2Hour, start2Min] = start2.split(":").map(Number)
  
  const end1Minutes = end1Hour * 60 + end1Min
  const start2Minutes = start2Hour * 60 + start2Min
  
  return end1Minutes === start2Minutes
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
    if (rawParams.search) queryParams.search = rawParams.search
    if (rawParams.departmentId) queryParams.departmentId = rawParams.departmentId
    if (rawParams.sortBy) queryParams.sortBy = rawParams.sortBy
    if (rawParams.sortOrder) queryParams.sortOrder = rawParams.sortOrder
    
    // Convert boolean parameters
    if (rawParams.isActive) queryParams.isActive = rawParams.isActive === "true"
    
    const filters = timeslotFilterSchema.parse(queryParams)
    
    const whereClause: any = {}
    
    // Apply filters
    if (filters.isActive !== undefined) whereClause.isActive = filters.isActive
    
    // Search functionality
    if (filters.search) {
      whereClause.OR = [
        { name: { contains: filters.search } },
        { startTime: { contains: filters.search } },
        { endTime: { contains: filters.search } },
      ]
    }

    // Department filtering would require adding department relation to TimeSlot
    // For now, we'll return all time slots as they're typically shared across departments
    
    // Handle complex sorting for usage count
    let orderBy: any = {}
    if (filters.sortBy === 'usageCount') {
      // Can't directly sort by calculated field, will sort in memory later
      orderBy = { createdAt: filters.sortOrder }
    } else {
      orderBy[filters.sortBy] = filters.sortOrder
    }

    const timeSlots = await db.timeSlot.findMany({
      where: whereClause,
      orderBy,
      include: {
        _count: {
          select: {
            timetableEntries: true,
            timetableTemplates: true,
          }
        }
      }
    })

    // Add calculated fields and usage statistics
    let enrichedTimeSlots = timeSlots.map(slot => ({
      ...slot,
      duration: calculateDuration(slot.startTime, slot.endTime),
      inUse: slot._count.timetableEntries > 0 || slot._count.timetableTemplates > 0,
      usageCount: slot._count.timetableEntries + slot._count.timetableTemplates,
    }))

    // Sort by usageCount if requested (since we can't do this in the DB query)
    if (filters.sortBy === 'usageCount') {
      enrichedTimeSlots.sort((a, b) => {
        const diff = a.usageCount - b.usageCount
        return filters.sortOrder === 'asc' ? diff : -diff
      })
    }

    return NextResponse.json({ timeSlots: enrichedTimeSlots })
  } catch (error) {
    console.error("Error fetching time slots:", error)
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
    const validatedData = createTimeslotSchema.parse(body)

    // Validate that end time is after start time
    const duration = calculateDuration(validatedData.startTime, validatedData.endTime)
    if (duration <= 0) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      )
    }

    // Check for overlapping time slots
    const existingTimeSlots = await db.timeSlot.findMany({
      where: { isActive: true },
      select: { id: true, name: true, startTime: true, endTime: true }
    })

    const overlappingSlots = existingTimeSlots.filter(slot => 
      isTimeOverlapping(
        validatedData.startTime, 
        validatedData.endTime, 
        slot.startTime, 
        slot.endTime
      )
    )

    if (overlappingSlots.length > 0) {
      return NextResponse.json({
        error: "Time slot overlaps with existing time slots",
        overlapping: overlappingSlots
      }, { status: 409 })
    }

    // Check if a time slot with the same name already exists
    const existingNameSlot = await db.timeSlot.findFirst({
      where: { 
        name: validatedData.name,
        isActive: true 
      }
    })

    if (existingNameSlot) {
      return NextResponse.json(
        { error: "A time slot with this name already exists" },
        { status: 400 }
      )
    }

    // Auto-calculate sort order if not provided
    let sortOrder = validatedData.sortOrder
    if (sortOrder === 0) {
      const maxSortOrder = await db.timeSlot.findFirst({
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true }
      })
      sortOrder = (maxSortOrder?.sortOrder || 0) + 1
    }

    // Create the time slot
    const timeSlot = await db.timeSlot.create({
      data: {
        name: validatedData.name,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        duration: duration,
        sortOrder: sortOrder,
      },
      include: {
        _count: {
          select: {
            timetableEntries: true,
            timetableTemplates: true,
          }
        }
      }
    })

    const enrichedTimeSlot = {
      ...timeSlot,
      inUse: false,
      usageCount: 0,
    }

    return NextResponse.json(enrichedTimeSlot, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating time slot:", error)
    return NextResponse.json(
      { error: "Failed to create time slot" },
      { status: 500 }
    )
  }
}