import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (!isAdmin(session.user as any) && !isFaculty(session.user as any))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's department using email instead of ID (more reliable)
    const currentUser = await db.user.findUnique({
      where: { email: session.user.email! },
      select: { departmentId: true, role: true }
    })

    if (!currentUser?.departmentId) {
      return NextResponse.json(
        { error: "User department not found" },
        { status: 400 }
      )
    }

    // Get all faculty in the department with their assignments
    const facultyList = await db.user.findMany({
      where: {
        role: 'FACULTY',
        departmentId: currentUser.departmentId
      },
      include: {
        primarySubjects: {
          where: { isActive: true },
          include: {
            batch: {
              select: {
                id: true,
                name: true,
                semester: true,
                program: {
                  select: {
                    name: true,
                    shortName: true
                  }
                }
              }
            }
          }
        },
        coFacultySubjects: {
          where: { isActive: true },
          include: {
            batch: {
              select: {
                id: true,
                name: true,
                semester: true,
                program: {
                  select: {
                    name: true,
                    shortName: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Simple processing without complex calculations
    const facultyWorkloads = facultyList.map(faculty => {
      const primaryCredits = faculty.primarySubjects.reduce((sum, s) => sum + s.credits, 0)
      const coFacultyCredits = faculty.coFacultySubjects.reduce((sum, s) => sum + (s.credits * 0.5), 0)
      const totalCredits = primaryCredits + coFacultyCredits
      const maxCredits = 30
      const utilization = (totalCredits / maxCredits) * 100
      
      return {
        id: faculty.id,
        name: faculty.name || 'Unknown',
        email: faculty.email,
        employeeId: faculty.employeeId || '',
        status: faculty.status,
        currentWorkload: {
          totalCredits: Math.round(totalCredits * 100) / 100,
          teachingCredits: primaryCredits,
          nonTeachingCredits: coFacultyCredits,
          maxCredits: maxCredits,
          utilization: Math.round(utilization * 100) / 100,
          status: totalCredits > maxCredits ? 'overloaded' : 
                  utilization >= 80 ? 'balanced' : 'underutilized',
          hoursPerWeek: totalCredits * 15
        },
        assignedSubjects: faculty.primarySubjects.map(subject => ({
          id: subject.id,
          name: subject.name,
          code: subject.code,
          credits: subject.credits,
          totalHours: subject.totalHours,
          examType: subject.examType,
          subjectType: subject.subjectType,
          isTeaching: subject.subjectType === 'CORE',
          batch: subject.batch
        })),
        preferences: {
          maxDailyHours: 8,
          maxWeeklyHours: maxCredits,
          preferredTimeSlots: []
        },
        analytics: {
          subjectCount: faculty.primarySubjects.length,
          batchCount: 1,
          averageCreditsPerSubject: faculty.primarySubjects.length > 0 ? 
            faculty.primarySubjects.reduce((sum, s) => sum + s.credits, 0) / faculty.primarySubjects.length : 0,
          workloadTrend: 'stable' as const
        }
      }
    })

    // Simple summary
    const summary = {
      totalFaculty: facultyWorkloads.length,
      activeFaculty: facultyWorkloads.filter(f => f.status === 'ACTIVE').length,
      totalSubjects: facultyWorkloads.reduce((sum, f) => sum + f.assignedSubjects.length, 0),
      totalCredits: facultyWorkloads.reduce((sum, f) => sum + f.currentWorkload.totalCredits, 0),
      averageWorkload: facultyWorkloads.length > 0 ? 
        facultyWorkloads.reduce((sum, f) => sum + f.currentWorkload.totalCredits, 0) / facultyWorkloads.length : 0,
      facultyDistribution: {
        overloaded: facultyWorkloads.filter(f => f.currentWorkload.status === 'overloaded').length,
        balanced: facultyWorkloads.filter(f => f.currentWorkload.status === 'balanced').length,
        underutilized: facultyWorkloads.filter(f => f.currentWorkload.status === 'underutilized').length
      }
    }

    return NextResponse.json({
      faculty: facultyWorkloads,
      summary: summary,
      recommendations: [],
      metadata: {
        departmentId: currentUser.departmentId,
        maxCreditsPerFaculty: 30,
        coFacultyWeight: 0.5,
        generatedAt: new Date().toISOString(),
        requestedBy: session.user.id || 'unknown'
      }
    })

  } catch (error) {
    console.error("Error generating faculty workload summary:", error)
    return NextResponse.json(
      { error: "Failed to generate workload summary" },
      { status: 500 }
    )
  }
}