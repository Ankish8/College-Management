import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canMarkAttendance } from "@/lib/utils/permissions"
import { z } from "zod"
// AttendanceStatus is just a string field in the schema

// Validation schemas
const bulkAttendanceRecordSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  sessionId: z.string().min(1, "Session ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  status: z.enum(['present', 'absent', 'medical']),
  timestamp: z.string().optional()
})

const bulkMarkAttendanceSchema = z.object({
  records: z.array(bulkAttendanceRecordSchema).min(1, "At least one attendance record is required")
})

/**
 * POST /api/attendance/courses/[courseId]/attendance/bulk
 * 
 * Marks attendance for multiple students in bulk operation.
 * Transforms attendance tracker format to main system database structure.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    // Check permissions - only faculty and admin can mark attendance
    if (!session?.user || !canMarkAttendance(user)) {
      return NextResponse.json({ 
        success: false,
        error: "Unauthorized - insufficient permissions to mark attendance" 
      }, { status: 403 })
    }

    const { courseId } = await context.params
    const subjectId = courseId
    const body = await request.json()
    
    // Validate input
    const validatedData = bulkMarkAttendanceSchema.parse(body)
    const { records } = validatedData

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

    // Group records by date to optimize attendance session creation
    const recordsByDate = new Map<string, typeof records>()
    records.forEach(record => {
      if (!recordsByDate.has(record.date)) {
        recordsByDate.set(record.date, [])
      }
      recordsByDate.get(record.date)!.push(record)
    })

    // Track results
    const results = {
      processed: 0,
      success: 0,
      failed: 0,
      errors: [] as string[],
      details: [] as any[]
    }

    // Process records in a transaction for data consistency
    await db.$transaction(async (tx) => {
      // Process each date group
      for (const [dateStr, dateRecords] of recordsByDate.entries()) {
        const attendanceDate = new Date(dateStr)

        // Find or create attendance session for this date
        let attendanceSession = await tx.attendanceSession.findUnique({
          where: {
            batchId_subjectId_date: {
              batchId: subject.batch.id,
              subjectId: subjectId,
              date: attendanceDate
            }
          }
        })

        if (!attendanceSession) {
          attendanceSession = await tx.attendanceSession.create({
            data: {
              batchId: subject.batch.id,
              subjectId: subjectId,
              date: attendanceDate,
              markedBy: user.id,
              isCompleted: false,
            }
          })
        }

        // Process each record for this date
        for (const record of dateRecords) {
          try {
            results.processed++

            // Verify student exists and belongs to the subject's batch
            const student = await tx.student.findUnique({
              where: { userId: record.studentId },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    status: true,
                  }
                }
              }
            })

            if (!student || student.batchId !== subject.batch.id) {
              results.failed++
              results.errors.push(`Student ${record.studentId} not found or not enrolled in this course's batch`)
              continue
            }

            if (student.user.status !== 'ACTIVE') {
              results.failed++
              results.errors.push(`Cannot mark attendance for inactive student ${student.user.name}`)
              continue
            }

            // Convert status to database enum
            let dbStatus: string
            switch (record.status) {
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

            // Create or update attendance record
            const attendanceRecord = await tx.attendanceRecord.upsert({
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
            results.details.push({
              studentId: record.studentId,
              studentName: student.user.name,
              date: dateStr,
              status: record.status,
              recordId: attendanceRecord.id,
              action: attendanceRecord.markedAt === attendanceRecord.updatedAt ? 'created' : 'updated'
            })

          } catch (recordError) {
            results.failed++
            results.errors.push(`Error processing record for student ${record.studentId}: ${recordError}`)
            console.error(`Bulk attendance error for student ${record.studentId}:`, recordError)
          }
        }

        // Mark attendance session as completed if all students processed successfully
        const totalStudentsInBatch = await tx.student.count({
          where: {
            batchId: subject.batch.id,
            user: { status: 'ACTIVE' }
          }
        })

        const attendanceRecordsForSession = await tx.attendanceRecord.count({
          where: { sessionId: attendanceSession.id }
        })

        // Mark as completed if we have attendance records for most students
        const completionThreshold = Math.floor(totalStudentsInBatch * 0.8) // 80% threshold
        if (attendanceRecordsForSession >= completionThreshold) {
          await tx.attendanceSession.update({
            where: { id: attendanceSession.id },
            data: { isCompleted: true }
          })
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Bulk attendance operation completed. ${results.success} records processed successfully, ${results.failed} failed.`,
      data: {
        summary: {
          totalProcessed: results.processed,
          successful: results.success,
          failed: results.failed,
          errorCount: results.errors.length
        },
        errors: results.errors,
        processedRecords: results.details,
        markedBy: user.name || user.email,
        processedAt: new Date().toISOString()
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

    console.error("Error in bulk attendance operation:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to process bulk attendance operation",
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}