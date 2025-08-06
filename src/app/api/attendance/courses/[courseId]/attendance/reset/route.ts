import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canMarkAttendance } from "@/lib/utils/permissions"

/**
 * POST /api/attendance/courses/[courseId]/attendance/reset
 * 
 * Resets attendance for a specific date and course.
 * Deletes all attendance records for the session and marks it as incomplete.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    console.log('🔄 POST /api/attendance/courses/[courseId]/attendance/reset - START')
    
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    // Check permissions - only faculty and admin can reset attendance
    if (!session?.user || !canMarkAttendance(user)) {
      return NextResponse.json({ 
        success: false,
        error: "Unauthorized - insufficient permissions to reset attendance" 
      }, { status: 403 })
    }

    const { courseId } = await context.params
    const subjectId = courseId
    const body = await request.json()
    const { date } = body
    
    console.log('🔄 Reset request:', { courseId, subjectId, date })

    if (!date) {
      return NextResponse.json({
        success: false,
        error: "Date is required"
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

    // Find the attendance session for this date
    const attendanceDate = new Date(date)
    const attendanceSession = await db.attendanceSession.findUnique({
      where: {
        batchId_subjectId_date: {
          batchId: subject.batch.id,
          subjectId: subjectId,
          date: attendanceDate
        }
      },
      include: {
        attendanceRecords: true
      }
    })

    if (!attendanceSession) {
      return NextResponse.json({
        success: false,
        error: "No attendance session found for this date"
      }, { status: 404 })
    }

    // Count records before deletion for logging
    const recordCount = attendanceSession.attendanceRecords.length

    // Delete all attendance records for this session
    await db.attendanceRecord.deleteMany({
      where: {
        sessionId: attendanceSession.id
      }
    })

    // Update attendance session as incomplete and clear completion notes
    await db.attendanceSession.update({
      where: { id: attendanceSession.id },
      data: {
        isCompleted: false,
        notes: `Reset by ${user.name || user.email} at ${new Date().toISOString()}`,
      }
    })

    console.log('🔄 Attendance reset successfully:', {
      sessionId: attendanceSession.id,
      date,
      deletedRecords: recordCount,
      resetBy: user.name || user.email
    })

    return NextResponse.json({
      success: true,
      message: "Attendance reset successfully",
      data: {
        sessionId: attendanceSession.id,
        courseId: subjectId,
        courseName: subject.name,
        batchName: subject.batch.name,
        date: date,
        isCompleted: false,
        resetAt: new Date().toISOString(),
        resetBy: user.name || user.email,
        statistics: {
          deletedRecords: recordCount,
          message: `All ${recordCount} attendance records have been cleared`
        }
      }
    })

  } catch (error) {
    console.error("🔄 Error resetting attendance:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to reset attendance",
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}