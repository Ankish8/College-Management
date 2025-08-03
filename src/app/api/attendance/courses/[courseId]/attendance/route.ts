import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canMarkAttendance, canViewAttendance } from "@/lib/utils/permissions"
import { z } from "zod"
// AttendanceStatus is just a string field in the schema

// Validation schemas
const markAttendanceSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  sessionId: z.string().min(1, "Session ID is required"), 
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  status: z.enum(['present', 'absent', 'medical']),
  timestamp: z.string().optional()
})

const bulkMarkAttendanceSchema = z.object({
  records: z.array(markAttendanceSchema).min(1, "At least one attendance record is required")
})

/**
 * GET /api/attendance/courses/[courseId]/attendance
 * 
 * Returns attendance data for a course/subject in the format expected by the attendance tracker.
 * The courseId parameter is actually a subjectId from the main system.
 * 
 * Query Parameters:
 * - date: Single date (YYYY-MM-DD) for daily attendance
 * - startDate & endDate: Date range for weekly/multi-day attendance
 * 
 * Returns: data[studentId][sessionId] = 'present' | 'absent' | 'medical'
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
        error: "Unauthorized - insufficient permissions to view attendance data" 
      }, { status: 403 })
    }

    const { courseId } = await context.params
    const subjectId = courseId
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Validate date parameters
    if (!date && !startDate && !endDate) {
      return NextResponse.json({
        success: false,
        error: "Either 'date' or 'startDate/endDate' parameters are required"
      }, { status: 400 })
    }

    if (date && (startDate || endDate)) {
      return NextResponse.json({
        success: false,
        error: "Cannot specify both 'date' and date range parameters"
      }, { status: 400 })
    }

    // Verify subject exists and get batch info
    const subject = await db.subject.findUnique({
      where: { 
        id: subjectId,
        isActive: true 
      },
      include: {
        batch: {
          select: {
            id: true,
            name: true,
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

    // Build date filter for attendance sessions
    const dateFilter: any = {}
    if (date) {
      dateFilter.date = new Date(date)
    } else if (startDate && endDate) {
      dateFilter.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    // Get attendance sessions for this subject and date range
    const attendanceSessions = await db.attendanceSession.findMany({
      where: {
        subjectId: subjectId,
        batchId: subject.batch.id,
        ...dateFilter
      },
      include: {
        attendanceRecords: {
          include: {
            student: {
              select: {
                userId: true,
                studentId: true,
              }
            }
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    // Get time slots for this subject to create the session mapping
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
          }
        }
      },
      orderBy: {
        timeSlot: {
          sortOrder: 'asc'
        }
      }
    })

    // Create a mapping of unique time slots for this subject
    const timeSlotMap = new Map()
    timetableEntries.forEach(entry => {
      if (!timeSlotMap.has(entry.timeSlot.id)) {
        timeSlotMap.set(entry.timeSlot.id, entry.timeSlot)
      }
    })

    // Transform attendance data into the nested structure expected by attendance tracker
    // data[studentId][sessionId] = status
    const attendanceData: Record<string, Record<string, string>> = {}

    // For each attendance session, process the records
    attendanceSessions.forEach(attendanceSession => {
      attendanceSession.attendanceRecords.forEach(record => {
        const studentId = record.student.userId // Use userId as primary identifier
        
        // Strategy: Create a consistent sessionId that maps to the actual time slots used for this subject
        // We'll use a combination approach:
        // 1. If there are timeSlots defined for this subject, use the first one's ID
        // 2. Otherwise, use a synthetic sessionId based on the attendance session
        const timeSlots = Array.from(timeSlotMap.values())
        let mappedSessionId: string
        
        if (timeSlots.length > 0) {
          // Use the actual time slot ID for consistency
          mappedSessionId = timeSlots[0].id
        } else {
          // Fallback: Create a synthetic session ID based on the subject and date
          // This ensures consistency across different calls
          mappedSessionId = `session-${subjectId}-${date}`
        }
        
        // Initialize student record if not exists
        if (!attendanceData[studentId]) {
          attendanceData[studentId] = {}
        }
        
        // Map attendance status from enum to lowercase string
        let status: string
        switch (record.status) {
          case 'PRESENT':
          case 'LATE':
            status = 'present'
            break
          case 'ABSENT':
            status = 'absent'
            break
          case 'EXCUSED':
            status = 'medical'
            break
          default:
            status = 'absent'
        }
        
        attendanceData[studentId][mappedSessionId] = status
      })
    })

    // Get metadata about students in this batch for context
    const studentsInBatch = await db.student.findMany({
      where: {
        batchId: subject.batch.id,
        user: {
          status: 'ACTIVE'
        }
      },
      select: {
        userId: true,
        studentId: true,
      }
    })

    return NextResponse.json({
      success: true,
      data: attendanceData,
      meta: {
        courseId: subjectId,
        courseName: subject.name,
        batchId: subject.batch.id,
        batchName: subject.batch.name,
        dateRange: date ? { date } : { startDate, endDate },
        attendanceSessionsFound: attendanceSessions.length,
        studentsInBatch: studentsInBatch.length,
        studentsWithAttendance: Object.keys(attendanceData).length,
        availableTimeSlotsForSubject: timeSlotMap.size,
        timestamp: new Date().toISOString(),
        
        // Debug info (remove in production)
        debug: process.env.NODE_ENV === 'development' ? {
          attendanceSessionIds: attendanceSessions.map(s => s.id),
          timeSlotIds: Array.from(timeSlotMap.keys()),
          recordCount: attendanceSessions.reduce((sum, s) => sum + s.attendanceRecords.length, 0)
        } : undefined
      }
    })

  } catch (error) {
    console.error("Error fetching attendance data:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch attendance data",
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}

/**
 * POST /api/attendance/courses/[courseId]/attendance
 * 
 * Marks individual attendance for a student in a specific session.
 * Transforms attendance tracker format to main system database structure.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    console.log('🔴 POST /api/attendance/courses/[courseId]/attendance - START')
    
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    console.log('🔴 Session check:', { hasSession: !!session, hasUser: !!user })

    // Check permissions - only faculty and admin can mark attendance
    if (!session?.user || !canMarkAttendance(user)) {
      console.log('🔴 Permission denied:', { sessionUser: !!session?.user, canMark: canMarkAttendance(user) })
      return NextResponse.json({ 
        success: false,
        error: "Unauthorized - insufficient permissions to mark attendance" 
      }, { status: 403 })
    }

    const { courseId } = await context.params
    const subjectId = courseId
    const body = await request.json()
    
    console.log('🔴 Request data:', { 
      courseId, 
      subjectId, 
      body,
      bodyType: typeof body,
      bodyKeys: Object.keys(body),
      studentIdValue: body.studentId,
      studentIdType: typeof body.studentId
    })
    
    // Validate input
    console.log('🔴 Validating input with schema...')
    const validatedData = markAttendanceSchema.parse(body)
    const { studentId, sessionId, date, status } = validatedData

    // Verify subject exists and get batch info
    const subject = await db.subject.findUnique({
      where: { 
        id: subjectId,
        isActive: true 
      },
      include: {
        batch: {
          select: {
            id: true,
            name: true,
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

    // Verify student exists and belongs to the subject's batch
    const student = await db.student.findUnique({
      where: { userId: studentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            status: true,
          }
        },
        batch: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    console.log('🔴 Student-batch check:', {
      studentFound: !!student,
      studentBatchId: student?.batchId,
      studentBatchName: student?.batch?.name,
      subjectBatchId: subject.batch.id,
      subjectBatchName: subject.batch.name,
      match: student?.batchId === subject.batch.id
    })

    if (!student || student.batchId !== subject.batch.id) {
      console.log('🔴 BATCH MISMATCH:', {
        reason: !student ? 'Student not found' : 'Batch mismatch',
        studentBatch: student?.batchId,
        subjectBatch: subject.batch.id
      })
      return NextResponse.json({
        success: false,
        error: "Student not found or not enrolled in this course's batch"
      }, { status: 400 })
    }

    if (student.user.status !== 'ACTIVE') {
      return NextResponse.json({
        success: false,
        error: "Cannot mark attendance for inactive student"
      }, { status: 400 })
    }

    // Convert status to database enum
    let dbStatus: string
    switch (status) {
      case 'present':
        dbStatus = 'PRESENT'
        break
      case 'absent':
        dbStatus = 'ABSENT'
        break
      case 'medical':
        dbStatus = 'EXCUSED'
        break
      default:
        dbStatus = 'ABSENT'
    }

    console.log('🔴 Processing attendance mark:', {
      studentId,
      sessionId,
      date,
      status,
      dbStatus,
      subjectBatch: subject.batch.id,
      studentFound: !!student
    })

    // Find or create attendance session for this subject, batch, and date
    const attendanceDate = new Date(date)
    let attendanceSession = await db.attendanceSession.findUnique({
      where: {
        batchId_subjectId_date: {
          batchId: subject.batch.id,
          subjectId: subjectId,
          date: attendanceDate
        }
      }
    })

    if (!attendanceSession) {
      // Create new attendance session
      attendanceSession = await db.attendanceSession.create({
        data: {
          batchId: subject.batch.id,
          subjectId: subjectId,
          date: attendanceDate,
          markedBy: user.id,
          isCompleted: false,
        }
      })
    }

    // Create or update attendance record
    const attendanceRecord = await db.attendanceRecord.upsert({
      where: {
        sessionId_studentId: {
          sessionId: attendanceSession.id,
          studentId: student.id
        }
      },
      update: {
        status: dbStatus,
        markedAt: new Date(),
        lastModifiedBy: user.id,
      },
      create: {
        sessionId: attendanceSession.id,
        studentId: student.id,
        status: dbStatus,
        markedAt: new Date(),
        lastModifiedBy: user.id,
      }
    })

    return NextResponse.json({
      success: true,
      message: "Attendance marked successfully",
      data: {
        studentId: studentId,
        studentName: student.user.name,
        sessionId: attendanceSession.id,
        date: date,
        status: status,
        recordId: attendanceRecord.id,
        markedAt: attendanceRecord.markedAt,
        markedBy: user.name || user.email
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log('🔴 Zod validation error:', error.issues)
      return NextResponse.json({
        success: false,
        error: "Invalid input data",
        details: error.issues
      }, { status: 400 })
    }

    console.error("🔴 Error marking attendance:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to mark attendance",
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}