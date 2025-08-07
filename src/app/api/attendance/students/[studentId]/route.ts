import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canViewAttendance } from "@/lib/utils/permissions"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!session?.user || !canViewAttendance(user)) {
      return NextResponse.json({ 
        success: false,
        error: "Unauthorized - insufficient permissions to view student attendance" 
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get("batchId")
    const params = await context.params
    const studentId = params.studentId

    if (!studentId) {
      return NextResponse.json({
        success: false,
        error: "Student ID is required"
      }, { status: 400 })
    }

    // Get student with comprehensive attendance data
    const student = await db.student.findFirst({
      where: { 
        userId: studentId,
        ...(batchId ? { batchId } : {})
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true
          }
        },
        batch: {
          include: {
            program: { select: { name: true, shortName: true } },
            specialization: { select: { name: true, shortName: true } }
          }
        },
        attendanceRecords: {
          include: {
            session: {
              include: {
                subject: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    credits: true
                  }
                }
              }
            }
          },
          orderBy: {
            session: {
              date: 'desc'
            }
          }
        }
      }
    })

    if (!student) {
      return NextResponse.json({
        success: false,
        error: "Student not found"
      }, { status: 404 })
    }

    // Group attendance records by subject
    const subjectAttendance = new Map()
    
    student.attendanceRecords.forEach(record => {
      const subjectId = record.session.subject.id
      if (!subjectAttendance.has(subjectId)) {
        subjectAttendance.set(subjectId, {
          subject: record.session.subject,
          records: [],
          present: 0,
          total: 0
        })
      }
      
      const subjectData = subjectAttendance.get(subjectId)
      subjectData.records.push({
        date: record.session.date.toISOString().split('T')[0],
        status: record.status,
        sessionId: record.sessionId,
        reason: record.reason,
        notes: record.notes
      })
      subjectData.total++
      if (record.status === "PRESENT" || record.status === "LATE") {
        subjectData.present++
      }
    })

    // Calculate subject-wise attendance
    const subjectWiseAttendance = Array.from(subjectAttendance.values()).map(subjectData => ({
      subject: subjectData.subject,
      present: subjectData.present,
      total: subjectData.total,
      percentage: subjectData.total > 0 ? Math.round((subjectData.present / subjectData.total) * 100) : 0,
      records: subjectData.records.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }))

    // Calculate overall attendance
    const totalClasses = subjectWiseAttendance.reduce((sum, subject) => sum + subject.total, 0)
    const totalPresent = subjectWiseAttendance.reduce((sum, subject) => sum + subject.present, 0)
    const overallAttendance = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0

    // Format attendance records for calendar view
    const attendanceRecords = student.attendanceRecords.map(record => ({
      date: record.session.date.toISOString().split('T')[0],
      subject: record.session.subject,
      status: record.status,
      session: {
        id: record.sessionId,
        notes: record.session.notes
      }
    }))

    const studentDetail = {
      id: student.userId,
      name: student.user.name || '',
      email: student.user.email,
      rollNumber: student.rollNumber,
      batch: {
        id: student.batch.id,
        name: student.batch.name,
        program: student.batch.program,
        specialization: student.batch.specialization
      },
      overallAttendance,
      subjectWiseAttendance,
      attendanceRecords: attendanceRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      status: student.user.status,
      isActive: student.user.status === "ACTIVE"
    }

    return NextResponse.json({
      success: true,
      data: studentDetail
    })

  } catch (error) {
    console.error("Error fetching student attendance details:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch student attendance details",
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}