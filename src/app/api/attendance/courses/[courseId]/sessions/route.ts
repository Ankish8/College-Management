import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canMarkAttendance, canViewAttendance } from "@/lib/utils/permissions"

/**
 * GET /api/attendance/courses/[courseId]/sessions
 * 
 * Returns the sessions (time slots) for a specific course/subject.
 * The courseId parameter is actually a subjectId from the main system.
 * 
 * Used by the attendance tracker to get the available sessions for attendance marking.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    // Check permissions
    if (!session?.user || !canViewAttendance(user)) {
      return NextResponse.json({ 
        success: false,
        error: "Unauthorized - insufficient permissions to view sessions" 
      }, { status: 403 })
    }

    const { courseId } = await context.params
    const subjectId = courseId // courseId is actually subjectId

    // Verify subject exists and is active
    const subject = await db.subject.findUnique({
      where: { 
        id: subjectId,
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
      }
    })

    if (!subject) {
      return NextResponse.json({
        success: false,
        error: "Course not found or inactive"
      }, { status: 404 })
    }

    // Fetch all timetable entries for this subject to get associated time slots
    const timetableEntries = await db.timetableEntry.findMany({
      where: {
        subjectId: subjectId,
        isActive: true
      },
      include: {
        timeSlot: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            duration: true,
            sortOrder: true,
            isActive: true,
          }
        }
      },
      orderBy: {
        timeSlot: {
          sortOrder: 'asc'
        }
      }
    })

    // Extract unique time slots (a subject might have multiple timetable entries with same time slot)
    const uniqueTimeSlots = new Map()
    timetableEntries.forEach(entry => {
      const timeSlot = entry.timeSlot
      // Only include active time slots
      if (timeSlot.isActive && !uniqueTimeSlots.has(timeSlot.id)) {
        uniqueTimeSlots.set(timeSlot.id, timeSlot)
      }
    })

    // Transform time slots into sessions format expected by attendance tracker
    const sessions = Array.from(uniqueTimeSlots.values()).map(timeSlot => ({
      id: timeSlot.id,
      name: timeSlot.name || `${timeSlot.startTime}-${timeSlot.endTime}`,
      startTime: timeSlot.startTime,
      endTime: timeSlot.endTime,
      
      // Additional metadata that might be useful
      duration: timeSlot.duration || 50,
      sortOrder: timeSlot.sortOrder || 0,
    }))

    // Sort sessions by sort order to maintain consistent ordering
    sessions.sort((a, b) => a.sortOrder - b.sortOrder)

    return NextResponse.json({
      success: true,
      data: sessions,
      meta: {
        courseId: subjectId,
        courseName: subject.name,
        courseCode: subject.code,
        sessionsCount: sessions.length,
        timetableEntriesCount: timetableEntries.length,
        timestamp: new Date().toISOString(),
      }
    })

  } catch (error) {
    console.error("Error fetching sessions for attendance:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch sessions for attendance system",
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}