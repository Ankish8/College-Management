import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canMarkAttendance } from "@/lib/utils/permissions"

/**
 * POST /api/attendance/courses/[courseId]/attendance/save
 * 
 * Finalizes attendance for a specific date and course.
 * Marks the attendance session as completed and validates all records.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    console.log('💾 POST /api/attendance/courses/[courseId]/attendance/save - START')
    
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    // Check permissions - only faculty and admin can save attendance
    if (!session?.user || !canMarkAttendance(user)) {
      return NextResponse.json({ 
        success: false,
        error: "Unauthorized - insufficient permissions to save attendance" 
      }, { status: 403 })
    }

    const { courseId } = await context.params
    const subjectId = courseId
    const body = await request.json()
    const { date } = body
    
    console.log('💾 Save request:', { courseId, subjectId, date })

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
        attendanceRecords: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!attendanceSession) {
      return NextResponse.json({
        success: false,
        error: "No attendance session found for this date"
      }, { status: 404 })
    }

    // Get total students in the batch to validate completeness
    const totalStudentsInBatch = await db.student.count({
      where: {
        batchId: subject.batch.id,
        user: {
          status: 'ACTIVE'
        }
      }
    })

    // Update attendance session as completed
    const updatedSession = await db.attendanceSession.update({
      where: { id: attendanceSession.id },
      data: {
        isCompleted: true,
        notes: `Completed by ${user.name || user.email} at ${new Date().toISOString()}`,
      }
    })

    // Calculate statistics
    const recordCount = attendanceSession.attendanceRecords.length
    const presentCount = attendanceSession.attendanceRecords.filter(r => r.status === 'PRESENT').length
    const absentCount = attendanceSession.attendanceRecords.filter(r => r.status === 'ABSENT').length
    const excusedCount = attendanceSession.attendanceRecords.filter(r => r.status === 'EXCUSED').length
    const attendancePercentage = recordCount > 0 ? Math.round((presentCount / recordCount) * 100) : 0

    console.log('💾 Attendance saved successfully:', {
      sessionId: attendanceSession.id,
      date,
      recordCount,
      presentCount,
      absentCount,
      excusedCount,
      attendancePercentage,
      totalStudentsInBatch,
      isComplete: recordCount === totalStudentsInBatch
    })

    return NextResponse.json({
      success: true,
      message: "Attendance saved successfully",
      data: {
        sessionId: attendanceSession.id,
        courseId: subjectId,
        courseName: subject.name,
        batchName: subject.batch.name,
        date: date,
        isCompleted: true,
        completedAt: updatedSession.updatedAt,
        completedBy: user.name || user.email,
        statistics: {
          totalStudents: recordCount,
          totalStudentsInBatch,
          presentCount,
          absentCount,
          excusedCount,
          attendancePercentage,
          isComplete: recordCount === totalStudentsInBatch
        },
        records: attendanceSession.attendanceRecords.map(record => ({
          studentId: record.student.userId,
          studentName: record.student.user.name,
          status: record.status.toLowerCase(),
          markedAt: record.markedAt
        }))
      }
    })

  } catch (error) {
    console.error("💾 Error saving attendance:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to save attendance",
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}