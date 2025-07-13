import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/utils/permissions"
import { z } from "zod"

const bulkCreateTimeslotsSchema = z.object({
  timeSlots: z.array(z.object({
    name: z.string().min(1, "Time slot name is required"),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid start time format (HH:MM)"),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid end time format (HH:MM)"),
    sortOrder: z.number().min(0).optional(),
  })).min(1, "At least one time slot is required").max(50, "Maximum 50 time slots allowed"),
  autoGenerateNames: z.boolean().default(false), // Auto-generate names like "9:00-10:00"
  autoSortOrder: z.boolean().default(true), // Auto-assign sort order based on start time
  conflictResolution: z.enum(["SKIP", "MERGE", "STOP"]).default("STOP"),
})

const timeRangeGeneratorSchema = z.object({
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid start time format (HH:MM)"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid end time format (HH:MM)"),
  slotDuration: z.number().min(15).max(300).default(60), // Duration in minutes
  breakDuration: z.number().min(0).max(60).default(0), // Break between slots in minutes
  namePattern: z.enum(["SIMPLE", "12_HOUR", "24_HOUR"]).default("SIMPLE"), // Naming pattern
  excludeBreaks: z.array(z.object({
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    name: z.string().optional(),
  })).default([]), // Break periods to exclude (like lunch)
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

// Helper function to format time
function formatTime(minutes: number, format: "SIMPLE" | "12_HOUR" | "24_HOUR" = "SIMPLE"): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  switch (format) {
    case "12_HOUR":
      const period = hours >= 12 ? "PM" : "AM"
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
      return `${displayHours}:${mins.toString().padStart(2, "0")} ${period}`
    case "24_HOUR":
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
    default: // SIMPLE
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
  }
}

// Helper function to generate time slots from range
function generateTimeSlotsFromRange(config: z.infer<typeof timeRangeGeneratorSchema>) {
  const timeSlots = []
  
  const [startHour, startMinute] = config.startTime.split(":").map(Number)
  const [endHour, endMinute] = config.endTime.split(":").map(Number)
  
  const startMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute
  
  let currentStart = startMinutes
  let sortOrder = 1
  
  while (currentStart + config.slotDuration <= endMinutes) {
    const currentEnd = currentStart + config.slotDuration
    
    const slotStartTime = formatTime(currentStart, "24_HOUR")
    const slotEndTime = formatTime(currentEnd, "24_HOUR")
    
    // Check if this slot overlaps with any break periods
    const overlapsWithBreak = config.excludeBreaks.some(breakPeriod => 
      isTimeOverlapping(slotStartTime, slotEndTime, breakPeriod.startTime, breakPeriod.endTime)
    )
    
    if (!overlapsWithBreak) {
      // Generate name based on pattern
      let name: string
      switch (config.namePattern) {
        case "12_HOUR":
          name = `${formatTime(currentStart, "12_HOUR")}-${formatTime(currentEnd, "12_HOUR")}`
          break
        case "24_HOUR":
          name = `${formatTime(currentStart, "24_HOUR")}-${formatTime(currentEnd, "24_HOUR")}`
          break
        default: // SIMPLE
          name = `${slotStartTime}-${slotEndTime}`
      }
      
      timeSlots.push({
        name,
        startTime: slotStartTime,
        endTime: slotEndTime,
        sortOrder: sortOrder++,
      })
    }
    
    currentStart = currentEnd + config.breakDuration
  }
  
  return timeSlots
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    
    let timeSlots: any[] = []
    
    // Check if this is a time range generator request
    if (body.startTime && body.endTime && body.slotDuration) {
      const rangeConfig = timeRangeGeneratorSchema.parse(body)
      timeSlots = generateTimeSlotsFromRange(rangeConfig)
      
      // Return generated slots for preview if requested
      if (body.preview) {
        return NextResponse.json({
          preview: true,
          generatedSlots: timeSlots,
          summary: {
            totalSlots: timeSlots.length,
            startTime: rangeConfig.startTime,
            endTime: rangeConfig.endTime,
            slotDuration: rangeConfig.slotDuration,
            breakDuration: rangeConfig.breakDuration,
          }
        })
      }
    } else {
      // Direct time slots creation
      const validatedData = bulkCreateTimeslotsSchema.parse(body)
      timeSlots = validatedData.timeSlots
    }

    // Auto-generate names if requested
    if (body.autoGenerateNames) {
      timeSlots = timeSlots.map(slot => ({
        ...slot,
        name: `${slot.startTime}-${slot.endTime}`
      }))
    }

    // Auto-assign sort order if requested
    if (body.autoSortOrder) {
      timeSlots.sort((a, b) => {
        const aMinutes = parseInt(a.startTime.split(":")[0]) * 60 + parseInt(a.startTime.split(":")[1])
        const bMinutes = parseInt(b.startTime.split(":")[0]) * 60 + parseInt(b.startTime.split(":")[1])
        return aMinutes - bMinutes
      })
      
      timeSlots = timeSlots.map((slot, index) => ({
        ...slot,
        sortOrder: index + 1
      }))
    }

    // Validate all time slots
    const invalidSlots = []
    const validSlots = []
    
    for (let i = 0; i < timeSlots.length; i++) {
      const slot = timeSlots[i]
      const errors = []
      
      // Check duration
      const duration = calculateDuration(slot.startTime, slot.endTime)
      if (duration <= 0) {
        errors.push("End time must be after start time")
      }
      
      // Check for internal overlaps
      const internalOverlaps = timeSlots.slice(0, i).filter((otherSlot, j) => 
        j !== i && isTimeOverlapping(slot.startTime, slot.endTime, otherSlot.startTime, otherSlot.endTime)
      )
      
      if (internalOverlaps.length > 0) {
        errors.push("Overlaps with other slots in this request")
      }
      
      if (errors.length > 0) {
        invalidSlots.push({ slotIndex: i, slot, errors })
      } else {
        validSlots.push({ ...slot, duration })
      }
    }

    if (invalidSlots.length > 0) {
      return NextResponse.json({
        error: "Invalid time slots found",
        invalidSlots,
        validSlotsCount: validSlots.length,
      }, { status: 400 })
    }

    // Check for conflicts with existing time slots
    const existingTimeSlots = await db.timeSlot.findMany({
      where: { isActive: true },
      select: { id: true, name: true, startTime: true, endTime: true }
    })

    const conflicts = []
    const conflictFreeSlots = []
    
    for (const slot of validSlots) {
      const overlappingSlots = existingTimeSlots.filter(existing => 
        isTimeOverlapping(slot.startTime, slot.endTime, existing.startTime, existing.endTime)
      )
      
      const nameConflict = existingTimeSlots.find(existing => existing.name === slot.name)
      
      if (overlappingSlots.length > 0 || nameConflict) {
        conflicts.push({
          slot,
          overlapping: overlappingSlots,
          nameConflict: nameConflict ? [nameConflict] : [],
        })
      } else {
        conflictFreeSlots.push(slot)
      }
    }

    // Handle conflicts based on resolution strategy
    let slotsToCreate = conflictFreeSlots

    if (conflicts.length > 0) {
      switch (body.conflictResolution || "STOP") {
        case "STOP":
          return NextResponse.json({
            error: "Conflicts detected and resolution is set to STOP",
            conflicts,
            conflictFreeSlots: conflictFreeSlots.length,
          }, { status: 409 })
        
        case "SKIP":
          // slotsToCreate already contains only conflict-free slots
          break
        
        case "MERGE":
          // For merge, we could implement logic to merge overlapping slots
          // For now, just skip conflicting ones
          break
      }
    }

    // Create time slots in a transaction
    const createdTimeSlots = await db.$transaction(async (tx) => {
      const results = []
      
      for (const slot of slotsToCreate) {
        const created = await tx.timeSlot.create({
          data: {
            name: slot.name,
            startTime: slot.startTime,
            endTime: slot.endTime,
            duration: slot.duration,
            sortOrder: slot.sortOrder || 0,
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
        
        results.push({
          ...created,
          inUse: false,
          usageCount: 0,
        })
      }
      
      return results
    })

    return NextResponse.json({
      success: true,
      created: createdTimeSlots,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      summary: {
        totalRequested: timeSlots.length,
        created: createdTimeSlots.length,
        skipped: timeSlots.length - createdTimeSlots.length,
        conflictResolution: body.conflictResolution || "STOP",
      }
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error bulk creating time slots:", error)
    return NextResponse.json(
      { error: "Failed to bulk create time slots" },
      { status: 500 }
    )
  }
}