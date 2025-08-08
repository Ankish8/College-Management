import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canMarkAttendance } from "@/lib/utils/permissions"
import { z } from "zod"

const bulkAttendanceSchema = z.object({
  batchId: z.string().min(1, "Batch ID is required"),
  subjectId: z.string().min(1, "Subject ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  status: z.enum(['present', 'absent']),
  scope: z.enum(['slot', 'fullday']),
  timeSlotId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!session?.user || !canMarkAttendance(user)) {
      return NextResponse.json({ 
        success: false,
        error: "Unauthorized - insufficient permissions to mark attendance" 
      }, { status: 403 })
    }

    const body = await request.json()
    const { batchId, subjectId, date, status, scope, timeSlotId } = bulkAttendanceSchema.parse(body)

    // Verify subject and batch exist
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

    if (!subject || subject.batch.id !== batchId) {
      return NextResponse.json({
        success: false,
        error: "Subject or batch not found"
      }, { status: 404 })
    }

    const attendanceDate = new Date(date)

    // For single slot, verify the specific timetable entry exists
    if (scope === 'slot') {
      if (!timeSlotId) {
        return NextResponse.json({
          success: false,
          error: "Time slot ID required for single slot marking"
        }, { status: 400 })
      }

      const timetableEntry = await db.timetableEntry.findFirst({
        where: {
          batchId,
          subjectId,
          timeSlotId,
          date: attendanceDate,
          isActive: true
        }
      })

      if (!timetableEntry) {
        return NextResponse.json({
          success: false,
          error: "No class found for the specified time slot"
        }, { status: 404 })
      }
    }

    // Get all active students in the batch
    const students = await db.student.findMany({
      where: {
        batchId,
        user: { status: 'ACTIVE' }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (students.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No active students found in batch"
      }, { status: 404 })
    }

    const results = {
      processed: 0,
      success: 0,
      failed: 0
    }

    // Process in transaction
    await db.$transaction(async (tx) => {
      // Find or create attendance session (one per day per subject)
      let attendanceSession = await tx.attendanceSession.findUnique({
        where: {
          batchId_subjectId_date: {
            batchId,
            subjectId,
            date: attendanceDate
          }
        },
        include: {
          attendanceRecords: true
        }
      })

      if (!attendanceSession) {
        attendanceSession = await tx.attendanceSession.create({
          data: {
            batchId,
            subjectId,
            date: attendanceDate,
            markedBy: user.id,
            isCompleted: false,
            notes: scope === 'slot' ? `Bulk marked for time slot: ${timeSlotId}` : 'Bulk marked for full day'
          },
          include: {
            attendanceRecords: true
          }
        })
      }

      const dbStatus = status === 'present' ? 'PRESENT' : 'ABSENT'

      // For slot-specific marking, check if attendance was already marked
      if (scope === 'slot') {
        const existingRecords = attendanceSession.attendanceRecords
        
        // If this is the first attendance marking for the day, proceed normally
        // If attendance was already marked and we're doing slot-specific, we need to be careful
        if (existingRecords.length > 0) {
          // Add note that this is a partial update for specific slot
          await tx.attendanceSession.update({
            where: { id: attendanceSession.id },
            data: {
              notes: (attendanceSession.notes || '') + ` | Slot-specific update: ${timeSlotId} marked as ${status} at ${new Date().toISOString()}`
            }
          })
        }
      }

      // Mark attendance for all students
      for (const student of students) {
        try {
          await tx.attendanceRecord.upsert({
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

          results.success++
        } catch (error) {
          results.failed++
          console.error(`Failed to mark attendance for student ${student.id}:`, error)
        }
        results.processed++
      }

      // Mark session as completed only for full day, not for single slots
      if (scope === 'fullday') {
        await tx.attendanceSession.update({
          where: { id: attendanceSession.id },
          data: { 
            isCompleted: true,
            notes: `Bulk marked all students as ${status} for full day`
          }
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: scope === 'slot' 
        ? `Marked all students as ${status}. Note: This applies to the entire day for this subject (attendance system tracks per day, not per time slot).`
        : `Marked all students as ${status} for the full day`,
      data: {
        studentsMarked: students.length,
        status: status,
        scope: scope,
        ...(scope === 'slot' && { timeSlotId }),
        warning: scope === 'slot' ? 'Attendance is tracked per day per subject, not per time slot' : undefined
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: "Invalid input data",
        details: error.issues
      }, { status: 400 })
    }

    console.error("Error in bulk attendance marking:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to mark attendance",
    }, { status: 500 })
  }
}