import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canMarkAttendance, canViewAttendance } from "@/lib/utils/permissions"

/**
 * GET /api/attendance/courses/[courseId]
 * 
 * Transforms a Subject from the main system into a "Course" for the attendance tracker.
 * The courseId parameter is actually a subjectId from the main system.
 * 
 * Returns course details with associated sessions (time slots) for attendance marking.
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
        error: "Unauthorized - insufficient permissions to view course data" 
      }, { status: 403 })
    }

    const { courseId } = await context.params
    const subjectId = courseId // courseId is actually subjectId

    // Fetch subject with comprehensive details
    const subject = await db.subject.findUnique({
      where: { 
        id: subjectId,
        isActive: true // Only active subjects
      },
      include: {
        batch: {
          include: {
            program: {
              select: {
                name: true,
                shortName: true,
                department: {
                  select: {
                    name: true,
                    shortName: true,
                  }
                }
              }
            },
            specialization: {
              select: {
                name: true,
                shortName: true,
              }
            }
          }
        },
        primaryFaculty: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
          }
        },
        coFaculty: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
          }
        },
        // Get all timetable entries for this subject to find associated time slots
        timetableEntries: {
          where: {
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
              }
            }
          },
          orderBy: {
            timeSlot: {
              sortOrder: 'asc'
            }
          }
        }
      }
    })

    if (!subject) {
      return NextResponse.json({
        success: false,
        error: "Course not found or inactive"
      }, { status: 404 })
    }

    // Extract unique time slots from timetable entries
    const uniqueTimeSlots = new Map()
    subject.timetableEntries.forEach(entry => {
      const timeSlot = entry.timeSlot
      if (!uniqueTimeSlots.has(timeSlot.id)) {
        uniqueTimeSlots.set(timeSlot.id, timeSlot)
      }
    })

    // Transform time slots into sessions format expected by attendance tracker
    const sessions = Array.from(uniqueTimeSlots.values()).map(timeSlot => ({
      id: timeSlot.id,
      name: timeSlot.name || `${timeSlot.startTime}-${timeSlot.endTime}`,
      startTime: timeSlot.startTime,
      endTime: timeSlot.endTime,
      duration: timeSlot.duration || 50, // Default 50 minutes if not specified
    }))

    // Determine room information (could be enhanced to include actual room assignments)
    const roomInfo = "TBD" // Could be extracted from timetable notes or separate room entity

    // Build semester information
    const semesterInfo = `${subject.batch.program.shortName} ${subject.batch.specialization?.shortName || ''} Sem ${subject.batch.semester}`.trim()

    // Transform subject into course format expected by attendance tracker
    const courseData = {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      semester: semesterInfo,
      room: roomInfo,
      
      // Sessions are the time slots where this subject is taught
      sessions: sessions,
      
      // Additional metadata for the attendance system
      credits: subject.credits,
      totalHours: subject.totalHours,
      examType: subject.examType,
      subjectType: subject.subjectType,
      description: subject.description,
      
      // Batch information
      batch: {
        id: subject.batch.id,
        name: subject.batch.name,
        semester: subject.batch.semester,
        currentStrength: subject.batch.currentStrength,
        program: subject.batch.program,
        specialization: subject.batch.specialization,
      },
      
      // Faculty information
      faculty: {
        primary: subject.primaryFaculty,
        co: subject.coFaculty,
      },
      
      // Status and metadata
      isActive: subject.isActive,
      
      // Timetable information
      scheduledTimeSlots: subject.timetableEntries.length,
      activeTimetableEntries: subject.timetableEntries.filter(e => e.isActive).length,
    }

    return NextResponse.json({
      success: true,
      data: courseData,
      meta: {
        subjectId: subject.id,
        sessionsCount: sessions.length,
        timestamp: new Date().toISOString(),
      }
    })

  } catch (error) {
    console.error("Error fetching course for attendance:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch course data for attendance system",
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}