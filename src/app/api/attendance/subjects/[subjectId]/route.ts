import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canViewAttendance } from "@/lib/utils/permissions"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!session?.user || !canViewAttendance(user)) {
      return NextResponse.json({ 
        success: false,
        error: "Unauthorized - insufficient permissions to view subject attendance" 
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get("batchId")
    const resolvedParams = await params
    const subjectId = resolvedParams.subjectId

    if (!subjectId) {
      return NextResponse.json({
        success: false,
        error: "Subject ID is required"
      }, { status: 400 })
    }

    // Get subject details
    const subject = await db.subject.findUnique({
      where: { id: subjectId },
      select: {
        id: true,
        name: true,
        code: true,
        credits: true,
        batchId: true
      }
    })

    if (!subject) {
      return NextResponse.json({
        success: false,
        error: "Subject not found"
      }, { status: 404 })
    }

    // Verify batch matches if provided
    if (batchId && subject.batchId !== batchId) {
      return NextResponse.json({
        success: false,
        error: "Subject does not belong to the specified batch"
      }, { status: 400 })
    }

    // Get all attendance sessions for this subject
    const attendanceSessions = await db.attendanceSession.findMany({
      where: { 
        subjectId,
        batchId: subject.batchId
      },
      include: {
        attendanceRecords: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    status: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    // Get all students in the batch
    const batchStudents = await db.student.findMany({
      where: { 
        batchId: subject.batchId,
        user: { status: "ACTIVE" }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    })

    // Calculate student-wise attendance for this subject
    const studentAttendance = batchStudents.map(student => {
      const studentRecords = attendanceSessions.flatMap(session => 
        session.attendanceRecords.filter(record => record.student.userId === student.userId)
      )

      const totalSessions = attendanceSessions.length
      const presentSessions = studentRecords.filter(record => 
        record.status === "PRESENT" || record.status === "LATE"
      ).length

      const recentAttendance = attendanceSessions
        .slice(0, 10) // Last 10 sessions
        .map(session => {
          const studentRecord = session.attendanceRecords.find(record => 
            record.student.userId === student.userId
          )
          return {
            date: session.date.toISOString().split('T')[0],
            status: studentRecord?.status || "ABSENT"
          }
        })

      return {
        studentId: student.userId,
        name: student.user.name || '',
        rollNumber: student.rollNumber,
        present: presentSessions,
        total: totalSessions,
        percentage: totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0,
        recentAttendance
      }
    })

    // Calculate subject statistics
    const totalStudents = studentAttendance.length
    const averageAttendance = totalStudents > 0 
      ? Math.round(studentAttendance.reduce((sum, student) => sum + student.percentage, 0) / totalStudents)
      : 0

    // Format session data
    const sessions = attendanceSessions.map(session => {
      const presentCount = session.attendanceRecords.filter(record => 
        record.status === "PRESENT" || record.status === "LATE"
      ).length
      const absentCount = session.attendanceRecords.filter(record => 
        record.status === "ABSENT"
      ).length

      return {
        id: session.id,
        date: session.date.toISOString().split('T')[0],
        isCompleted: session.isCompleted,
        presentCount,
        absentCount,
        notes: session.notes
      }
    })

    const subjectDetail = {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      credits: subject.credits,
      totalSessions: attendanceSessions.length,
      averageAttendance,
      students: studentAttendance.sort((a, b) => b.percentage - a.percentage),
      sessions: sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }

    return NextResponse.json({
      success: true,
      data: subjectDetail
    })

  } catch (error) {
    console.error("Error fetching subject attendance details:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch subject attendance details",
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}