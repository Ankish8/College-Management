import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/utils/permissions"
import { z } from "zod"

// Validation schema for bulk subject assignment
const allotmentSchema = z.object({
  assignments: z.array(z.object({
    facultyId: z.string().min(1, "Faculty ID is required"),
    subjectIds: z.array(z.string()).optional().default([])
  }))
})

// Helper function to calculate workload impact
async function calculateWorkloadImpact(facultyId: string, newSubjectIds: string[]) {
  const faculty = await db.user.findUnique({
    where: { id: facultyId },
    include: {
      primarySubjects: {
        where: { isActive: true },
        select: { id: true, credits: true, subjectType: true }
      },
      coFacultySubjects: {
        where: { isActive: true },
        select: { id: true, credits: true, subjectType: true }
      },
      department: {
        include: {
          settings: true
        }
      }
    }
  })

  if (!faculty) throw new Error(`Faculty ${facultyId} not found`)

  // Get new subjects being assigned
  const newSubjects = await db.subject.findMany({
    where: { id: { in: newSubjectIds } },
    select: { id: true, credits: true, subjectType: true }
  })

  // Calculate current workload
  const currentCredits = faculty.primarySubjects.reduce((sum, s) => sum + s.credits, 0) +
                        faculty.coFacultySubjects.reduce((sum, s) => sum + s.credits, 0)

  // Calculate new total workload
  const newCredits = newSubjects.reduce((sum, s) => sum + s.credits, 0)
  const totalCredits = currentCredits + newCredits

  // Get max credits from department settings
  const maxCredits = faculty.department?.settings?.maxFacultyCredits || 30

  // Calculate teaching vs non-teaching breakdown
  const currentTeachingCredits = faculty.primarySubjects
    .filter(s => s.subjectType === 'CORE')
    .reduce((sum, s) => sum + s.credits, 0) +
    faculty.coFacultySubjects
    .filter(s => s.subjectType === 'CORE')
    .reduce((sum, s) => sum + s.credits, 0)

  const newTeachingCredits = newSubjects
    .filter(s => s.subjectType === 'CORE')
    .reduce((sum, s) => sum + s.credits, 0)

  const totalTeachingCredits = currentTeachingCredits + newTeachingCredits
  const totalNonTeachingCredits = totalCredits - totalTeachingCredits

  return {
    facultyId,
    facultyName: faculty.name,
    currentCredits,
    newCredits,
    totalCredits,
    maxCredits,
    utilization: (totalCredits / maxCredits) * 100,
    teachingCredits: totalTeachingCredits,
    nonTeachingCredits: totalNonTeachingCredits,
    status: totalCredits > maxCredits ? 'overloaded' : 
            totalCredits >= maxCredits * 0.8 ? 'balanced' : 'underutilized',
    isOverloaded: totalCredits > maxCredits,
    exceedsBy: totalCredits > maxCredits ? totalCredits - maxCredits : 0
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = allotmentSchema.parse(body)

    // Get user's department for boundary checking
    const currentUser = await db.user.findUnique({
      where: { id: (session.user as any).id },
      select: { departmentId: true }
    })

    if (!currentUser?.departmentId) {
      return NextResponse.json(
        { error: "User department not found" },
        { status: 400 }
      )
    }

    // Validate all faculty belong to the same department
    const facultyIds = validatedData.assignments.map(a => a.facultyId)
    const faculty = await db.user.findMany({
      where: {
        id: { in: facultyIds },
        role: 'FACULTY',
        departmentId: currentUser.departmentId
      }
    })

    if (faculty.length !== facultyIds.length) {
      return NextResponse.json(
        { error: "Some faculty members not found or not in your department" },
        { status: 400 }
      )
    }

    // Collect all subject IDs being assigned
    const allSubjectIds = validatedData.assignments.flatMap(a => a.subjectIds)
    
    // Validate all subjects exist and belong to the department
    const subjects = await db.subject.findMany({
      where: {
        id: { in: allSubjectIds },
        isActive: true,
        batch: {
          program: {
            departmentId: currentUser.departmentId
          }
        }
      }
    })

    if (subjects.length !== allSubjectIds.length) {
      return NextResponse.json(
        { error: "Some subjects not found or not in your department" },
        { status: 400 }
      )
    }

    // Check for duplicate assignments (subject assigned to multiple faculty)
    const subjectAssignments = new Map<string, string>()
    for (const assignment of validatedData.assignments) {
      for (const subjectId of assignment.subjectIds) {
        if (subjectAssignments.has(subjectId)) {
          const conflictingFacultyId = subjectAssignments.get(subjectId)
          const conflictingFaculty = faculty.find(f => f.id === conflictingFacultyId)
          const currentFaculty = faculty.find(f => f.id === assignment.facultyId)
          
          return NextResponse.json(
            { 
              error: `Subject conflict: Subject is assigned to both ${conflictingFaculty?.name} and ${currentFaculty?.name}` 
            },
            { status: 400 }
          )
        }
        subjectAssignments.set(subjectId, assignment.facultyId)
      }
    }

    // Calculate workload impact for all faculty
    const workloadImpacts = []
    const overloadedFaculty = []

    for (const assignment of validatedData.assignments) {
      const impact = await calculateWorkloadImpact(assignment.facultyId, assignment.subjectIds)
      workloadImpacts.push(impact)
      
      if (impact.isOverloaded) {
        overloadedFaculty.push({
          facultyName: impact.facultyName,
          exceedsBy: impact.exceedsBy,
          totalCredits: impact.totalCredits,
          maxCredits: impact.maxCredits
        })
      }
    }

    // If there are overloaded faculty, return warning (don't save yet)
    if (overloadedFaculty.length > 0) {
      return NextResponse.json({
        error: "Workload validation failed",
        details: {
          overloadedFaculty,
          workloadImpacts,
          canForceAssign: true // Allow admin to override
        }
      }, { status: 400 })
    }

    // Start transaction to update all assignments
    const result = await db.$transaction(async (prisma) => {
      const updateResults = []

      for (const assignment of validatedData.assignments) {
        // First, remove this faculty from all subjects they're currently assigned to
        await prisma.subject.updateMany({
          where: {
            OR: [
              { primaryFacultyId: assignment.facultyId },
              { coFacultyId: assignment.facultyId }
            ]
          },
          data: {
            primaryFacultyId: null,
            coFacultyId: null
          }
        })

        // Then assign the new subjects
        if (assignment.subjectIds.length > 0) {
          const assignmentResult = await prisma.subject.updateMany({
            where: {
              id: { in: assignment.subjectIds }
            },
            data: {
              primaryFacultyId: assignment.facultyId
            }
          })

          updateResults.push({
            facultyId: assignment.facultyId,
            subjectsAssigned: assignment.subjectIds.length,
            updated: assignmentResult.count
          })
        }
      }

      return updateResults
    })

    // Prepare response with updated workload summary
    const responseData = {
      success: true,
      message: "Subject allotment saved successfully",
      assignments: result,
      workloadImpacts,
      summary: {
        totalAssignments: validatedData.assignments.length,
        totalSubjects: allSubjectIds.length,
        facultyUpdated: result.length
      }
    }

    return NextResponse.json(responseData)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error in bulk subject allotment:", error)
    return NextResponse.json(
      { error: "Failed to save subject allotment" },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve current allotment status
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's department
    const currentUser = await db.user.findUnique({
      where: { id: (session.user as any).id },
      select: { departmentId: true }
    })

    if (!currentUser?.departmentId) {
      return NextResponse.json(
        { error: "User department not found" },
        { status: 400 }
      )
    }

    // Get all faculty with their assigned subjects
    const facultyWithSubjects = await db.user.findMany({
      where: {
        role: 'FACULTY',
        departmentId: currentUser.departmentId,
        status: 'ACTIVE'
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
      }
    })

    // Get unassigned subjects
    const unassignedSubjects = await db.subject.findMany({
      where: {
        isActive: true,
        primaryFacultyId: null,
        coFacultyId: null,
        batch: {
          program: {
            departmentId: currentUser.departmentId
          }
        }
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
            }
          }
        }
      }
    })

    return NextResponse.json({
      faculty: facultyWithSubjects,
      unassignedSubjects,
      summary: {
        totalFaculty: facultyWithSubjects.length,
        totalUnassigned: unassignedSubjects.length
      }
    })

  } catch (error) {
    console.error("Error retrieving allotment status:", error)
    return NextResponse.json(
      { error: "Failed to retrieve allotment status" },
      { status: 500 }
    )
  }
}