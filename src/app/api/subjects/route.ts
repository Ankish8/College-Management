import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"
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
    if (!session?.user || (!isAdmin(session.user) && !isFaculty(session.user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get("batchId")
    const search = searchParams.get("search")

    const whereClause: any = {}
    
    if (batchId) {
      whereClause.batchId = batchId
    }

    if (search) {
      whereClause.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          code: {
            contains: search,
            mode: "insensitive"
          }
        }
      ]
    }

    const subjects = await db.subject.findMany({
      where: whereClause,
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
    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createSubjectSchema.parse(body)

    // Get user's department to fetch credit hours ratio
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { 
        department: {
          include: {
            settings: true
          }
        }
      }
    })

    if (!user?.department) {
      return NextResponse.json(
        { error: "User department not found" },
        { status: 400 }
      )
    }

    // Get credit hours ratio (default 15 if no settings)
    const creditHoursRatio = user.department.settings?.creditHoursRatio || 15
    const totalHours = validatedData.credits * creditHoursRatio

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
      where: { id: validatedData.primaryFacultyId }
    })

    if (!primaryFaculty || primaryFaculty.role !== "FACULTY") {
      return NextResponse.json(
        { error: "Primary faculty not found or is not a faculty member" },
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
        where: { id: validatedData.coFacultyId }
      })

      if (!coFaculty || coFaculty.role !== "FACULTY") {
        return NextResponse.json(
          { error: "Co-faculty not found or is not a faculty member" },
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
        { error: "Invalid input", details: error.errors },
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