import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canMarkAttendance, canViewAttendance } from "@/lib/utils/permissions"

/**
 * GET /api/attendance/students
 * 
 * Transforms student data from the main system format to the attendance tracker expected format.
 * This endpoint specifically serves the attendance marking interface.
 * 
 * Query Parameters:
 * - batchId: Filter students by batch
 * - subjectId: Filter students by subject (through batch)
 * - active: Filter by active/inactive status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    // Check if user can view attendance (faculty, admin, or own student data)
    if (!session?.user || !canViewAttendance(user)) {
      return NextResponse.json({ 
        success: false,
        error: "Unauthorized - insufficient permissions to view attendance data" 
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get("batchId")
    const subjectId = searchParams.get("subjectId")
    const active = searchParams.get("active")
    const selectedDate = searchParams.get("date") // Get the selected date for filtering

    // Build where clause
    const whereClause: Record<string, unknown> = {}
    
    if (batchId) {
      whereClause.batchId = batchId
    }

    // If filtering by subject, get the batch from the subject
    if (subjectId && !batchId) {
      const subject = await db.subject.findUnique({
        where: { id: subjectId },
        select: { batchId: true }
      })
      
      if (subject) {
        whereClause.batchId = subject.batchId
      }
    }

    // Filter by active status
    if (active !== null) {
      whereClause.user = {
        status: active === "true" ? "ACTIVE" : "INACTIVE"
      }
    }

    // Fetch students with comprehensive attendance data
    const students = await db.student.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
          }
        },
        batch: {
          include: {
            program: {
              select: {
                name: true,
                shortName: true,
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
        // Include detailed attendance records for history
        attendanceRecords: {
          include: {
            session: {
              include: {
                subject: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  }
                },
                batch: {
                  select: {
                    id: true,
                    name: true,
                  }
                }
              }
            }
          },
          orderBy: {
            session: {
              date: 'desc'
            }
          },
          // Limit to recent records for performance
          take: 100
        }
      },
      orderBy: [
        { user: { status: "desc" } }, // Active students first
        { user: { name: "asc" } },
      ]
    })

    // Transform data to attendance tracker format
    const transformedStudents = students.map(student => {
      // Calculate the week range for the selected date
      let weekAttendanceRecords = student.attendanceRecords
      
      if (selectedDate) {
        const targetDate = new Date(selectedDate)
        const dayOfWeek = targetDate.getDay()
        const startOfWeek = new Date(targetDate)
        const endOfWeek = new Date(targetDate)
        
        // Adjust to get Monday as start of week (0 = Sunday, 1 = Monday)
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        startOfWeek.setDate(targetDate.getDate() + daysToMonday)
        startOfWeek.setHours(0, 0, 0, 0)
        
        // Friday as end of week (5 days from Monday)
        endOfWeek.setDate(startOfWeek.getDate() + 4)
        endOfWeek.setHours(23, 59, 59, 999)
        
        // Filter records for the current week
        weekAttendanceRecords = student.attendanceRecords.filter(record => {
          const recordDate = new Date(record.session.date)
          return recordDate >= startOfWeek && recordDate <= endOfWeek
        })
      }
      
      // Build attendance history for the week (Mon-Fri)
      const attendanceHistory = weekAttendanceRecords.map(record => ({
        date: record.session.date.toISOString().split('T')[0], // YYYY-MM-DD format
        status: record.status.toLowerCase() as 'present' | 'absent' | 'medical' // Map enum to lowercase
      }))

      // Build session-specific attendance history
      const sessionAttendanceHistory = student.attendanceRecords.map(record => ({
        date: record.session.date.toISOString().split('T')[0],
        sessionId: record.sessionId,
        status: record.status.toLowerCase() as 'present' | 'absent' | 'medical'
      }))

      // Calculate attendance statistics
      const totalRecords = student.attendanceRecords.length
      const presentRecords = student.attendanceRecords.filter(
        record => record.status === "PRESENT" || record.status === "LATE"
      ).length

      return {
        // Core student information
        id: student.userId, // Use userId as primary identifier
        name: student.user.name || '',
        email: student.user.email,
        studentId: student.studentId,
        rollNumber: student.rollNumber,
        
        // Optional photo (not in current schema, could be added later)
        photo: undefined,
        
        // Attendance history arrays expected by attendance tracker
        attendanceHistory,
        sessionAttendanceHistory,
        
        // Additional metadata for the attendance system
        batchId: student.batchId,
        batch: {
          id: student.batch.id,
          name: student.batch.name,
          program: student.batch.program,
          specialization: student.batch.specialization,
        },
        
        // Attendance statistics
        attendanceStats: {
          total: totalRecords,
          present: presentRecords,
          absent: totalRecords - presentRecords,
          percentage: totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0
        },
        
        // Status and metadata
        status: student.user.status,
        isActive: student.user.status === "ACTIVE",
        
        // Guardian information (if available)
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
      }
    })

    return NextResponse.json({
      success: true,
      data: transformedStudents,
      meta: {
        total: transformedStudents.length,
        filtered: transformedStudents.filter(s => s.isActive).length,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error("Error fetching students for attendance:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch student data for attendance system",
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}