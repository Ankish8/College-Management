import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty, canCreateSubject } from "@/lib/utils/permissions"
import { calculateSubjectHours, getMaxFacultyCredits } from "@/lib/utils/credit-hours"
import { z } from "zod"

const createSubjectSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  code: z.string().min(1, "Subject code is required"),
  credits: z.number().min(1).max(6),
  batchId: z.string().min(1, "Batch is required"),
  primaryFacultyId: z.string().min(1, "Primary faculty is required"),
  coFacultyId: z.string().optional(),
  examType: z.enum(["THEORY", "PRACTICAL", "JURY", "PROJECT", "VIVA"]),
  subjectType: z.enum(["CORE", "ELECTIVE"]),
  description: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (!isAdmin(session.user as any) && !isFaculty(session.user as any))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get("batchId")
    const search = searchParams.get("search")
    const fields = searchParams.get("fields") // Optional field selection

    const whereClause: Record<string, unknown> = {}
    
    if (batchId) {
      whereClause.batchId = batchId
    }

    if (search) {
      whereClause.OR = [
        {
          name: {
            contains: search
          }
        },
        {
          code: {
            contains: search
          }
        }
      ]
    }

    // Optimize query based on requested fields
    const isMinimal = fields === 'minimal'
    
    const subjects = await db.subject.findMany({
      where: whereClause,
      select: isMinimal ? {
        id: true,
        name: true,
        code: true,
        credits: true,
        primaryFaculty: {
          select: {
            name: true,
          }
        }
      } : {
        id: true,
        name: true,
        code: true,
        credits: true,
        totalHours: true,
        examType: true,
        subjectType: true,
        description: true,
        createdAt: true,
        batch: {
          select: {
            id: true,
            name: true,
            semester: true,
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
            },
            _count: {
              select: {
                students: true
              }
            }
          }
        },
        primaryFaculty: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        coFaculty: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        _count: {
          select: {
            attendanceSessions: true,
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(subjects)
  } catch (error) {
    console.error("Error fetching subjects:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !canCreateSubject(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createSubjectSchema.parse(body)

    // Get user's department to fetch credit hours ratio
    const user = await db.user.findUnique({
      where: { id: (session.user as any).id },
      include: { 
        department: {
          include: {
            settings: true
          }
        }
      }
    })

    // For admin users without department, get department from the batch
    let departmentId = user?.department?.id;
    let departmentSettings = user?.department?.settings;
    
    if (!departmentId && user?.role === "ADMIN") {
      // Get department from the selected batch
      const batch = await db.batch.findUnique({
        where: { id: validatedData.batchId },
        include: {
          program: {
            include: {
              department: {
                include: {
                  settings: true
                }
              }
            }
          }
        }
      });
      
      if (batch?.program?.department) {
        departmentId = batch.program.department.id;
        departmentSettings = batch.program.department.settings;
      }
    }

    if (!departmentId) {
      return NextResponse.json(
        { error: "Department information required for subject creation" },
        { status: 400 }
      )
    }

    // Calculate total hours using centralized function
    const totalHours = await calculateSubjectHours(validatedData.credits, departmentId)

    // Check if subject code already exists
    const existingSubject = await db.subject.findUnique({
      where: { code: validatedData.code }
    })

    if (existingSubject) {
      return NextResponse.json(
        { error: "A subject with this code already exists" },
        { status: 400 }
      )
    }

    // Validate that batch exists
    const batch = await db.batch.findUnique({
      where: { id: validatedData.batchId }
    })

    if (!batch) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      )
    }

    // Validate that primary faculty exists and is faculty role
    const primaryFaculty = await db.user.findUnique({
      where: { id: validatedData.primaryFacultyId },
      include: {
        primarySubjects: {
          where: { isActive: true },
          select: { credits: true }
        },
        coFacultySubjects: {
          where: { isActive: true },
          select: { credits: true }
        }
      }
    })

    if (!primaryFaculty || primaryFaculty.role !== "FACULTY") {
      return NextResponse.json(
        { error: "Primary faculty not found or is not a faculty member" },
        { status: 400 }
      )
    }

    // Check faculty workload limit using centralized function
    const maxCredits = await getMaxFacultyCredits(departmentId!)
    const currentCredits = primaryFaculty.primarySubjects.reduce((sum, s) => sum + s.credits, 0) +
                          primaryFaculty.coFacultySubjects.reduce((sum, s) => sum + s.credits, 0)
    
    if (currentCredits + validatedData.credits > maxCredits) {
      return NextResponse.json(
        { error: `Primary faculty workload would exceed ${maxCredits} credits (current: ${currentCredits}, adding: ${validatedData.credits})` },
        { status: 400 }
      )
    }

    // Validate co-faculty if provided
    if (validatedData.coFacultyId) {
      if (validatedData.coFacultyId === validatedData.primaryFacultyId) {
        return NextResponse.json(
          { error: "Co-faculty cannot be the same as primary faculty" },
          { status: 400 }
        )
      }

      const coFaculty = await db.user.findUnique({
        where: { id: validatedData.coFacultyId },
        include: {
          primarySubjects: {
            where: { isActive: true },
            select: { credits: true }
          },
          coFacultySubjects: {
            where: { isActive: true },
            select: { credits: true }
          }
        }
      })

      if (!coFaculty || coFaculty.role !== "FACULTY") {
        return NextResponse.json(
          { error: "Co-faculty not found or is not a faculty member" },
          { status: 400 }
        )
      }

      // Check co-faculty workload limit using centralized function
      const coFacultyCurrentCredits = coFaculty.primarySubjects.reduce((sum, s) => sum + s.credits, 0) +
                                     coFaculty.coFacultySubjects.reduce((sum, s) => sum + s.credits, 0)
      
      if (coFacultyCurrentCredits + validatedData.credits > maxCredits) {
        return NextResponse.json(
          { error: `Co-faculty workload would exceed ${maxCredits} credits (current: ${coFacultyCurrentCredits}, adding: ${validatedData.credits})` },
          { status: 400 }
        )
      }
    }

    // Create subject
    const subject = await db.subject.create({
      data: {
        name: validatedData.name,
        code: validatedData.code,
        credits: validatedData.credits,
        totalHours: totalHours,
        batchId: validatedData.batchId,
        primaryFacultyId: validatedData.primaryFacultyId,
        coFacultyId: validatedData.coFacultyId || null,
        examType: validatedData.examType,
        subjectType: validatedData.subjectType,
        description: validatedData.description || null,
      },
      include: {
        batch: {
          select: {
            name: true,
            semester: true,
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
            },
            _count: {
              select: {
                students: true
              }
            }
          }
        },
        primaryFaculty: {
          select: {
            name: true,
            email: true,
          }
        },
        coFaculty: {
          select: {
            name: true,
            email: true,
          }
        },
        _count: {
          select: {
            attendanceSessions: true,
          }
        }
      }
    })

    return NextResponse.json(subject, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating subject:", error)
    return NextResponse.json(
      { error: "Failed to create subject" },
      { status: 500 }
    )
  }
}