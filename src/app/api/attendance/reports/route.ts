import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canViewAttendance } from "@/lib/utils/permissions"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!session?.user || !canViewAttendance(user)) {
      return NextResponse.json({ 
        success: false,
        error: "Unauthorized - insufficient permissions to view attendance reports" 
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get("batchId")

    if (!batchId) {
      return NextResponse.json({
        success: false,
        error: "Batch ID is required"
      }, { status: 400 })
    }

    // Get batch info with students and subjects
    const batch = await db.batch.findUnique({
      where: { id: batchId },
      include: {
        program: { select: { name: true, shortName: true } },
        specialization: { select: { name: true, shortName: true } },
        students: {
          include: {
            user: { select: { id: true, name: true, email: true, status: true } },
            attendanceRecords: {
              include: {
                session: {
                  include: {
                    subject: { select: { id: true, name: true, code: true, credits: true } }
                  }
                }
              }
            }
          },
          where: {
            user: { status: "ACTIVE" }
          }
        },
        subjects: {
          select: {
            id: true,
            name: true,
            code: true,
            credits: true
          },
          where: { isActive: true }
        }
      }
    })

    if (!batch) {
      return NextResponse.json({
        success: false,
        error: "Batch not found"
      }, { status: 404 })
    }


    // Get all attendance sessions for this batch
    const attendanceSessions = await db.attendanceSession.findMany({
      where: { batchId },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        attendanceRecords: {
          include: {
            student: {
              include: {
                user: { select: { id: true, name: true } }
              }
            }
          }
        }
      }
    })

    // Process student attendance data
    const studentsData = batch.students.map(student => {
      const subjectAttendance = batch.subjects.map(subject => {
        // Get all sessions for this subject
        const subjectSessions = attendanceSessions.filter(session => session.subjectId === subject.id)
        const totalSessions = subjectSessions.length

        // Get attendance records for this student in this subject
        const presentSessions = subjectSessions.filter(session => 
          session.attendanceRecords.some(record => 
            record.student.userId === student.userId && 
            (record.status === "PRESENT" || record.status === "LATE")
          )
        ).length

        return {
          subjectId: subject.id,
          present: presentSessions,
          total: totalSessions,
          percentage: totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0
        }
      })

      // Calculate overall attendance
      const totalClasses = subjectAttendance.reduce((sum, subject) => sum + subject.total, 0)
      const totalPresent = subjectAttendance.reduce((sum, subject) => sum + subject.present, 0)
      const overallAttendance = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0

      return {
        studentId: student.userId,
        name: student.user.name || '',
        rollNumber: student.rollNumber,
        email: student.user.email,
        overallAttendance,
        subjects: subjectAttendance,
        isActive: student.user.status === "ACTIVE"
      }
    })

    // Calculate batch statistics
    const stats = {
      totalStudents: studentsData.length,
      totalSubjects: batch.subjects.length,
      averageAttendance: studentsData.length > 0 
        ? Math.round(studentsData.reduce((sum, student) => sum + student.overallAttendance, 0) / studentsData.length)
        : 0,
      activeStudents: studentsData.filter(student => student.isActive).length
    }

    // Get subjects with session counts
    const subjectsWithSessions = batch.subjects.map(subject => {
      const sessionCount = attendanceSessions.filter(session => session.subjectId === subject.id).length
      return {
        ...subject,
        totalSessions: sessionCount
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        batch: {
          id: batch.id,
          name: batch.name,
          program: batch.program,
          specialization: batch.specialization,
          currentStrength: batch.currentStrength
        },
        students: studentsData,
        subjects: subjectsWithSessions,
        stats,
        totalSessions: attendanceSessions.length
      }
    })

  } catch (error) {
    console.error("Error fetching attendance reports:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch attendance reports",
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}