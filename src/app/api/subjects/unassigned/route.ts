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

    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get("batchId")
    const subjectType = searchParams.get("subjectType") // CORE or ELECTIVE
    const examType = searchParams.get("examType") // THEORY, PRACTICAL, etc.

    // Get user's department to filter subjects using email instead of ID (more reliable)
    const currentUser = await db.user.findUnique({
      where: { email: session.user.email! },
      select: { departmentId: true }
    })

    if (!currentUser?.departmentId) {
      return NextResponse.json(
        { error: "User department not found" },
        { status: 400 }
      )
    }

    // Build where clause for filtering
    const whereClause: any = {
      isActive: true,
      // Subject is unassigned if both primary and co-faculty are null
      AND: [
        { primaryFacultyId: null },
        { coFacultyId: null }
      ],
      batch: {
        program: {
          departmentId: currentUser.departmentId
        }
      }
    }

    // Add optional filters
    if (batchId) {
      whereClause.batchId = batchId
    }

    if (subjectType && ['CORE', 'ELECTIVE'].includes(subjectType)) {
      whereClause.subjectType = subjectType
    }

    if (examType && ['THEORY', 'PRACTICAL', 'JURY', 'PROJECT', 'VIVA'].includes(examType)) {
      whereClause.examType = examType
    }

    // Fetch unassigned subjects with detailed information
    const unassignedSubjects = await db.subject.findMany({
      where: whereClause,
      include: {
        batch: {
          select: {
            id: true,
            name: true,
            semester: true,
            startYear: true,
            endYear: true,
            currentStrength: true,
            maxCapacity: true,
            program: {
              select: {
                id: true,
                name: true,
                shortName: true,
                duration: true
              }
            },
            specialization: {
              select: {
                id: true,
                name: true,
                shortName: true
              }
            },
            _count: {
              select: {
                students: true
              }
            }
          }
        },
        _count: {
          select: {
            timetableEntries: true,
            attendanceSessions: true
          }
        }
      },
      orderBy: [
        { batch: { semester: 'asc' } },
        { subjectType: 'asc' },
        { name: 'asc' }
      ]
    })

    // Calculate additional metadata for each subject
    const enrichedSubjects = unassignedSubjects.map(subject => {
      // Calculate expected teaching hours based on credits
      const expectedHours = subject.credits * 15 // 15 hours per credit (standard)
      
      // Determine priority based on semester and subject type
      const priority = subject.batch.semester <= 2 ? 'high' : 
                     subject.batch.semester <= 4 ? 'medium' : 'low'
      
      // Check if subject has any timetable entries (might indicate partial assignment)
      const hasSchedule = subject._count.timetableEntries > 0
      
      return {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        credits: subject.credits,
        totalHours: subject.totalHours,
        expectedHours,
        examType: subject.examType,
        subjectType: subject.subjectType,
        description: subject.description,
        priority,
        hasSchedule,
        createdAt: subject.createdAt,
        updatedAt: subject.updatedAt,
        batch: {
          id: subject.batch.id,
          name: subject.batch.name,
          semester: subject.batch.semester,
          startYear: subject.batch.startYear,
          endYear: subject.batch.endYear,
          currentStrength: subject.batch.currentStrength,
          maxCapacity: subject.batch.maxCapacity,
          studentCount: subject.batch._count.students,
          program: subject.batch.program,
          specialization: subject.batch.specialization
        },
        analytics: {
          timetableEntries: subject._count.timetableEntries,
          attendanceSessions: subject._count.attendanceSessions
        }
      }
    })

    // Calculate summary statistics
    const summary = {
      totalUnassigned: enrichedSubjects.length,
      bySubjectType: {
        CORE: enrichedSubjects.filter(s => s.subjectType === 'CORE').length,
        ELECTIVE: enrichedSubjects.filter(s => s.subjectType === 'ELECTIVE').length
      },
      byExamType: {
        THEORY: enrichedSubjects.filter(s => s.examType === 'THEORY').length,
        PRACTICAL: enrichedSubjects.filter(s => s.examType === 'PRACTICAL').length,
        JURY: enrichedSubjects.filter(s => s.examType === 'JURY').length,
        PROJECT: enrichedSubjects.filter(s => s.examType === 'PROJECT').length,
        VIVA: enrichedSubjects.filter(s => s.examType === 'VIVA').length
      },
      byPriority: {
        high: enrichedSubjects.filter(s => s.priority === 'high').length,
        medium: enrichedSubjects.filter(s => s.priority === 'medium').length,
        low: enrichedSubjects.filter(s => s.priority === 'low').length
      },
      totalCredits: enrichedSubjects.reduce((sum, s) => sum + s.credits, 0),
      totalHours: enrichedSubjects.reduce((sum, s) => sum + s.totalHours, 0),
      averageCreditsPerSubject: enrichedSubjects.length > 0 ? 
        enrichedSubjects.reduce((sum, s) => sum + s.credits, 0) / enrichedSubjects.length : 0
    }

    return NextResponse.json({
      subjects: enrichedSubjects,
      summary,
      filters: {
        batchId: batchId || null,
        subjectType: subjectType || null,
        examType: examType || null
      }
    })

  } catch (error) {
    console.error("Error fetching unassigned subjects:", error)
    return NextResponse.json(
      { error: "Failed to fetch unassigned subjects" },
      { status: 500 }
    )
  }
}

// POST endpoint to create a new unassigned subject
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, code, credits, batchId, examType, subjectType, description } = body

    // Basic validation
    if (!name || !code || !credits || !batchId) {
      return NextResponse.json(
        { error: "Missing required fields: name, code, credits, batchId" },
        { status: 400 }
      )
    }

    // Get user's department for boundary checking using email instead of ID (more reliable)
    const currentUser = await db.user.findUnique({
      where: { email: session.user.email! },
      select: { departmentId: true }
    })

    if (!currentUser?.departmentId) {
      return NextResponse.json(
        { error: "User department not found" },
        { status: 400 }
      )
    }

    // Validate batch belongs to user's department
    const batch = await db.batch.findFirst({
      where: {
        id: batchId,
        program: {
          departmentId: currentUser.departmentId
        }
      }
    })

    if (!batch) {
      return NextResponse.json(
        { error: "Batch not found or not in your department" },
        { status: 400 }
      )
    }

    // Check if subject code already exists
    const existingSubject = await db.subject.findUnique({
      where: { code }
    })

    if (existingSubject) {
      return NextResponse.json(
        { error: "A subject with this code already exists" },
        { status: 400 }
      )
    }

    // Calculate total hours based on credits
    const totalHours = credits * 15 // Standard: 15 hours per credit

    // Create the unassigned subject
    const newSubject = await db.subject.create({
      data: {
        name,
        code,
        credits,
        totalHours,
        batchId,
        examType: examType || 'THEORY',
        subjectType: subjectType || 'CORE',
        description: description || null,
        // Explicitly leave faculty assignments null for unassigned subject
        primaryFacultyId: null,
        coFacultyId: null
      },
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
            },
            specialization: {
              select: {
                name: true,
                shortName: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      subject: newSubject,
      message: "Subject created successfully and added to unassigned pool"
    }, { status: 201 })

  } catch (error) {
    console.error("Error creating unassigned subject:", error)
    return NextResponse.json(
      { error: "Failed to create subject" },
      { status: 500 }
    )
  }
}