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
          where: {
            session: {
              subjectId: subjectId || undefined // Filter by subject if provided
            }
          },
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

    // First, get the timetable entries to see which days have scheduled classes for this subject
    let scheduledClasses: any[] = []
    if (selectedDate && subjectId) {
      const targetDate = new Date(selectedDate + 'T00:00:00.000Z') // Ensure UTC to avoid timezone issues
      const dayOfWeek = targetDate.getUTCDay() // Use UTC to avoid timezone shifts
      const startOfWeek = new Date(targetDate)
      const endOfWeek = new Date(targetDate)
      
      // Adjust to get Monday as start of week
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      startOfWeek.setUTCDate(targetDate.getUTCDate() + daysToMonday)
      startOfWeek.setUTCHours(0, 0, 0, 0)
      
      // Friday as end of week  
      endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 4)
      endOfWeek.setUTCHours(23, 59, 59, 999)
      
      // Get timetable entries for this subject that are active
      const timetableEntries = await db.timetableEntry.findMany({
        where: {
          subjectId: subjectId,
          isActive: true
        },
        include: {
          timeSlot: {
            select: {
              startTime: true,
              endTime: true
            }
          }
        }
      })
      
      console.log(`📋 Found ${timetableEntries.length} timetable entries for subject:`)
      timetableEntries.forEach((entry, i) => {
        const entryType = entry.date ? 'date-specific' : 'recurring'
        const entryDateStr = entry.date ? entry.date.toISOString().split('T')[0] : 'all weeks'
        console.log(`  ${i+1}. ${entry.dayOfWeek} (${entryType}, ${entryDateStr}) - Entry ID: ${entry.id}`)
      })
      
      // Convert timetable entries to actual dates for the current week
      const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
      
      // Only process weekdays (Monday to Friday) 
      for (let i = 0; i < 5; i++) { // Only Monday-Friday
        const currentDate = new Date(startOfWeek)
        currentDate.setUTCDate(startOfWeek.getUTCDate() + i) // startOfWeek is Monday
        const dayName = dayNames[currentDate.getUTCDay()]
        
        console.log(`🔍 Day ${i}: ${currentDate.toISOString().split('T')[0]} (${dayName})`)
        
        // Check if there's a timetable entry for this specific date
        // Need to consider both recurring entries (date: null) and date-specific entries
        const currentDateStr = currentDate.toISOString().split('T')[0]
        const entryForDay = timetableEntries.find(entry => {
          // Must match the day of week
          if (entry.dayOfWeek !== dayName) return false
          
          // If it's a recurring entry (date is null), it applies to all weeks
          if (!entry.date) return true
          
          // If it's a date-specific entry, it must match the exact date
          const entryDateStr = entry.date.toISOString().split('T')[0]
          return entryDateStr === currentDateStr
        })
        
        if (entryForDay) {
          const entryType = entryForDay.date ? 'date-specific' : 'recurring'
          const entryDateStr = entryForDay.date ? entryForDay.date.toISOString().split('T')[0] : 'all weeks'
          console.log(`✅ Found ${entryType} entry for ${dayName} on ${currentDateStr}: applies to ${entryDateStr}`)
          scheduledClasses.push({
            date: new Date(currentDate), // Create new date object to avoid reference issues
            dayOfWeek: dayName,
            timeSlot: entryForDay.timeSlot,
            timetableEntryId: entryForDay.id
          })
        } else {
          console.log(`❌ No entry found for ${dayName} on ${currentDateStr}`)
        }
      }
      
      console.log('🔍 DEBUG: selectedDate:', selectedDate)
      console.log('🔍 DEBUG: targetDate:', targetDate.toISOString().split('T')[0], 'dayOfWeek:', dayOfWeek)
      console.log('🔍 DEBUG: startOfWeek:', startOfWeek.toISOString().split('T')[0])
      console.log('🔍 DEBUG: endOfWeek:', endOfWeek.toISOString().split('T')[0])
      console.log('📅 Found scheduled classes for week:', scheduledClasses.map(c => ({ date: c.date.toISOString().split('T')[0], day: c.dayOfWeek })))
    }

    // Transform data to attendance tracker format
    const transformedStudents = students.map(student => {
      // Only build attendance history for dates when classes were actually scheduled
      const attendanceHistory = scheduledClasses.map(scheduledClass => {
        const dateStr = scheduledClass.date.toISOString().split('T')[0]
        
        // Find if this student has an attendance record for this date
        const attendanceRecord = student.attendanceRecords.find(
          record => {
            const recordDate = new Date(record.session.date).toISOString().split('T')[0]
            return recordDate === dateStr
          }
        )
        
        return {
          date: dateStr,
          status: attendanceRecord 
            ? attendanceRecord.status.toLowerCase() as 'present' | 'absent' | 'medical'
            : 'unmarked' // Show unmarked for scheduled classes without attendance
        }
      }) // Show ALL scheduled classes, whether marked or not

      // Build session-specific attendance history (only for scheduled classes)
      const sessionAttendanceHistory = scheduledClasses.map(scheduledClass => {
        const dateStr = scheduledClass.date.toISOString().split('T')[0]
        
        const attendanceRecord = student.attendanceRecords.find(
          record => {
            const recordDate = new Date(record.session.date).toISOString().split('T')[0]
            return recordDate === dateStr
          }
        )
        
        return {
          date: dateStr,
          sessionId: attendanceRecord?.sessionId || null,
          status: attendanceRecord 
            ? attendanceRecord.status.toLowerCase() as 'present' | 'absent' | 'medical'
            : 'unmarked'
        }
      }) // Show ALL scheduled classes

      // Calculate attendance statistics (only for scheduled sessions with marked attendance)
      const markedRecords = attendanceHistory.filter(record => record.status !== 'unmarked')
      const totalRecords = markedRecords.length
      const presentRecords = markedRecords.filter(
        record => record.status === 'present' || record.status === 'medical'
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