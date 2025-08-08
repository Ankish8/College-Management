import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canMarkAttendance } from "@/lib/utils/permissions"
import { z } from "zod"

const resetAttendanceSchema = z.object({
  batchId: z.string().min(1, "Batch ID is required"),
  subjectId: z.string().min(1, "Subject ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
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
        error: "Unauthorized - insufficient permissions to reset attendance" 
      }, { status: 403 })
    }

    const body = await request.json()
    const { batchId, subjectId, date, scope, timeSlotId } = resetAttendanceSchema.parse(body)

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

    // For single slot, verify the specific time slot exists
    if (scope === 'slot') {
      if (!timeSlotId) {
        return NextResponse.json({
          success: false,
          error: "Time slot ID required for single slot reset"
        }, { status: 400 })
      }

      // Get time slots for this subject to validate timeSlotId
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
          error: "No class found for the specified time slot on this date"
        }, { status: 404 })
      }
    }

    const results = {
      processed: 0,
      success: 0,
      failed: 0
    }

    // Process in transaction
    await db.$transaction(async (tx) => {
      // Find attendance session
      const attendanceSession = await tx.attendanceSession.findUnique({
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
        // No attendance session exists, nothing to reset
        return
      }

      if (scope === 'fullday') {
        // Reset entire day - delete all attendance records for this session
        const deletedRecords = await tx.attendanceRecord.deleteMany({
          where: {
            sessionId: attendanceSession.id
          }
        })

        results.processed = deletedRecords.count
        results.success = deletedRecords.count

        // Mark session as not completed
        await tx.attendanceSession.update({
          where: { id: attendanceSession.id },
          data: { 
            isCompleted: false,
            notes: `Full day attendance reset by ${user.name || user.email} at ${new Date().toISOString()}`
          }
        })
      } else {
        // Reset specific time slot - update session-specific JSON data
        console.log(`🔄 Resetting time slot ${timeSlotId} for ${attendanceSession.attendanceRecords.length} students`)
        
        for (const record of attendanceSession.attendanceRecords) {
          try {
            let sessionData = {}
            
            console.log(`🔄 Processing student ${record.studentId.slice(-8)} with notes:`, record.notes)
            
            // Parse existing session data from notes field
            if (record.notes) {
              try {
                sessionData = JSON.parse(record.notes)
                console.log(`🔄 Parsed session data:`, sessionData)
              } catch (e) {
                console.log(`🔄 Failed to parse notes, starting fresh`)
                // If notes is not JSON, start fresh
                sessionData = {}
              }
            }

            // Check if this time slot exists in the session data
            if (!sessionData.hasOwnProperty(timeSlotId!)) {
              console.log(`🔄 Time slot ${timeSlotId} not found in session data for student ${record.studentId.slice(-8)}`)
              continue // Skip this student as they don't have data for this time slot
            }

            // Remove the specific time slot from session data
            console.log(`🔄 Removing time slot ${timeSlotId} from session data`)
            delete sessionData[timeSlotId!]
            
            console.log(`🔄 Updated session data:`, sessionData)

            // If no session data remains, delete the entire record
            if (Object.keys(sessionData).length === 0) {
              console.log(`🔄 No session data remains, deleting record for student ${record.studentId.slice(-8)}`)
              await tx.attendanceRecord.delete({
                where: {
                  sessionId_studentId: {
                    sessionId: attendanceSession.id,
                    studentId: record.studentId
                  }
                }
              })
            } else {
              // Update with remaining session data
              console.log(`🔄 Updating record with remaining session data for student ${record.studentId.slice(-8)}`)
              await tx.attendanceRecord.update({
                where: {
                  sessionId_studentId: {
                    sessionId: attendanceSession.id,
                    studentId: record.studentId
                  }
                },
                data: {
                  notes: JSON.stringify(sessionData),
                  markedAt: new Date(),
                  lastModifiedBy: user.id,
                }
              })
            }

            results.success++
          } catch (error) {
            results.failed++
            console.error(`🔄 Failed to reset attendance for student ${record.studentId}:`, error)
          }
          results.processed++
        }

        // Add note about the reset
        await tx.attendanceSession.update({
          where: { id: attendanceSession.id },
          data: {
            notes: `Time slot ${timeSlotId} reset by ${user.name || user.email} at ${new Date().toISOString()}`
          }
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: scope === 'slot' 
        ? `Reset attendance for the selected time slot`
        : `Reset attendance for the full day`,
      data: {
        recordsProcessed: results.processed,
        recordsReset: results.success,
        scope: scope,
        ...(scope === 'slot' && { timeSlotId })
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

    console.error("Error in reset attendance operation:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to reset attendance",
    }, { status: 500 })
  }
}