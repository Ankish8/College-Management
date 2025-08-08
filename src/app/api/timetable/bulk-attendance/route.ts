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

    // Get time slots for this subject to create session mapping (same as regular attendance system)
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
            sortOrder: true
          }
        }
      },
      orderBy: {
        timeSlot: {
          sortOrder: 'asc'
        }
      }
    })

    // Create time slot mapping
    const timeSlotMap = new Map()
    timetableEntries.forEach(entry => {
      if (!timeSlotMap.has(entry.timeSlot.id)) {
        timeSlotMap.set(entry.timeSlot.id, entry.timeSlot)
      }
    })

    const timeSlots = Array.from(timeSlotMap.values())

    if (timeSlots.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No time slots found for this subject"
      }, { status: 404 })
    }

    // For single slot, verify the specific time slot exists
    if (scope === 'slot') {
      if (!timeSlotId) {
        return NextResponse.json({
          success: false,
          error: "Time slot ID required for single slot marking"
        }, { status: 400 })
      }

      if (!timeSlotMap.has(timeSlotId)) {
        return NextResponse.json({
          success: false,
          error: "Time slot not found for this subject"
        }, { status: 404 })
      }

      // Verify there's a class scheduled for this specific slot on this date
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
          error: "No class scheduled for the specified time slot on this date"
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
      // Find or create attendance session (one per day per subject, same as regular system)
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
          },
          include: {
            attendanceRecords: true
          }
        })
      }

      // Mark attendance for all students using session-specific JSON storage (same as regular system)
      for (const student of students) {
        try {
          // Get existing attendance record to preserve other session data
          const existingRecord = await tx.attendanceRecord.findUnique({
            where: {
              sessionId_studentId: {
                sessionId: attendanceSession.id,
                studentId: student.id
              }
            }
          })

          // Parse existing session data from notes field (JSON format)
          let sessionData = {}
          if (existingRecord?.notes) {
            try {
              sessionData = JSON.parse(existingRecord.notes)
            } catch (e) {
              // If notes is not JSON, start fresh
              sessionData = {}
            }
          }

          if (scope === 'slot') {
            // Update only the specific time slot
            sessionData[timeSlotId] = status
          } else {
            // Full day - update all time slots for this subject
            timeSlots.forEach(slot => {
              sessionData[slot.id] = status
            })
          }

          // Determine overall status for the record (fallback for legacy compatibility)
          const dbStatus = status === 'present' ? 'PRESENT' : 'ABSENT'

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
              notes: JSON.stringify(sessionData)
            },
            create: {
              sessionId: attendanceSession.id,
              studentId: student.id,
              status: dbStatus,
              markedAt: new Date(),
              lastModifiedBy: user.id,
              notes: JSON.stringify(sessionData)
            }
          })

          results.success++
        } catch (error) {
          results.failed++
          console.error(`Failed to mark attendance for student ${student.id}:`, error)
        }
        results.processed++
      }

      // Mark session as completed only for full day
      if (scope === 'fullday') {
        await tx.attendanceSession.update({
          where: { id: attendanceSession.id },
          data: { 
            isCompleted: true
          }
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: scope === 'slot' 
        ? `Marked all students as ${status} for the selected time slot`
        : `Marked all students as ${status} for the full day`,
      data: {
        studentsMarked: students.length,
        status: status,
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

    console.error("Error in bulk attendance marking:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to mark attendance",
    }, { status: 500 })
  }
}