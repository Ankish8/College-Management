import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"
import { z } from "zod"

const conflictCheckSchema = z.object({
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid start time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid end time format"),
  excludeId: z.string().optional(), // For edit operations
})

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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    const validatedParams = conflictCheckSchema.parse(queryParams)
    
    // Get all active time slots
    const whereClause: any = { isActive: true }
    if (validatedParams.excludeId) {
      whereClause.NOT = { id: validatedParams.excludeId }
    }

    const existingTimeSlots = await db.timeSlot.findMany({
      where: whereClause,
      select: { 
        id: true, 
        name: true, 
        startTime: true, 
        endTime: true,
        _count: {
          select: {
            timetableEntries: true,
            timetableTemplates: true,
          }
        }
      }
    })

    // Check for overlaps
    const conflicts = existingTimeSlots.filter(slot => 
      isTimeOverlapping(
        validatedParams.startTime,
        validatedParams.endTime,
        slot.startTime,
        slot.endTime
      )
    ).map(slot => ({
      ...slot,
      usageCount: slot._count.timetableEntries + slot._count.timetableTemplates,
      inUse: slot._count.timetableEntries > 0 || slot._count.timetableTemplates > 0
    }))

    // Find adjacent slots that could be merged
    const adjacentSlots = existingTimeSlots.filter(slot => {
      const adjacentBefore = slot.endTime === validatedParams.startTime
      const adjacentAfter = validatedParams.endTime === slot.startTime
      return adjacentBefore || adjacentAfter
    }).map(slot => ({
      ...slot,
      position: slot.endTime === validatedParams.startTime ? 'before' : 'after',
      usageCount: slot._count.timetableEntries + slot._count.timetableTemplates,
      inUse: slot._count.timetableEntries > 0 || slot._count.timetableTemplates > 0
    }))

    // Calculate gap analysis
    const allSlots = [...existingTimeSlots, {
      id: 'new',
      name: 'New Slot',
      startTime: validatedParams.startTime,
      endTime: validatedParams.endTime,
      _count: { timetableEntries: 0, timetableTemplates: 0 }
    }].sort((a, b) => {
      const aMinutes = parseInt(a.startTime.split(':')[0]) * 60 + parseInt(a.startTime.split(':')[1])
      const bMinutes = parseInt(b.startTime.split(':')[0]) * 60 + parseInt(b.startTime.split(':')[1])
      return aMinutes - bMinutes
    })

    const gaps = []
    for (let i = 0; i < allSlots.length - 1; i++) {
      const current = allSlots[i]
      const next = allSlots[i + 1]
      
      if (current.endTime !== next.startTime) {
        gaps.push({
          startTime: current.endTime,
          endTime: next.startTime,
          duration: (parseInt(next.startTime.split(':')[0]) * 60 + parseInt(next.startTime.split(':')[1])) -
                   (parseInt(current.endTime.split(':')[0]) * 60 + parseInt(current.endTime.split(':')[1]))
        })
      }
    }

    return NextResponse.json({
      conflicts,
      adjacentSlots,
      gaps,
      hasConflicts: conflicts.length > 0,
      canMerge: adjacentSlots.length > 0,
      summary: {
        totalConflicts: conflicts.length,
        totalAdjacent: adjacentSlots.length,
        totalGaps: gaps.length
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid parameters", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error checking conflicts:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}