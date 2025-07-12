import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"
import { z } from "zod"

const createBatchSchema = z.object({
  programId: z.string(),
  specializationId: z.string().optional(),
  semester: z.number().min(1).max(8),
  startYear: z.number().min(2020).max(2030),
  maxCapacity: z.number().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (!isAdmin(session.user) && !isFaculty(session.user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get("active")
    const search = searchParams.get("search")

    const whereClause: any = {}
    
    if (isActive !== null) {
      whereClause.isActive = isActive === "true"
    }

    if (search) {
      whereClause.name = {
        contains: search,
        mode: "insensitive"
      }
    }

    const batches = await db.batch.findMany({
      where: whereClause,
      include: {
        program: {
          select: {
            name: true,
            shortName: true,
            duration: true,
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
            students: true,
            subjects: true,
          }
        }
      },
      orderBy: [
        { isActive: "desc" },
        { startYear: "desc" },
        { semester: "desc" }
      ]
    })

    return NextResponse.json(batches)
  } catch (error) {
    console.error("Error fetching batches:", error)
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
    const validatedData = createBatchSchema.parse(body)

    // Get program and specialization details
    const program = await db.program.findUnique({
      where: { id: validatedData.programId },
      include: { department: true }
    })

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 })
    }

    let specialization = null
    if (validatedData.specializationId) {
      specialization = await db.specialization.findUnique({
        where: { id: validatedData.specializationId }
      })
    }

    // Calculate end year based on program duration
    const endYear = validatedData.startYear + program.duration - 1

    // Generate batch name
    const specializationPart = specialization ? ` ${specialization.shortName}` : ""
    const batchName = `${program.shortName}${specializationPart} Semester ${validatedData.semester} Batch ${validatedData.startYear}-${endYear}`

    // Check for duplicate batch
    const existingBatch = await db.batch.findFirst({
      where: {
        programId: validatedData.programId,
        specializationId: validatedData.specializationId || null,
        semester: validatedData.semester,
        startYear: validatedData.startYear,
      }
    })

    if (existingBatch) {
      return NextResponse.json(
        { error: "A batch with these details already exists" },
        { status: 400 }
      )
    }

    // Create batch
    const batch = await db.batch.create({
      data: {
        name: batchName,
        programId: validatedData.programId,
        specializationId: validatedData.specializationId || null,
        semester: validatedData.semester,
        startYear: validatedData.startYear,
        endYear: endYear,
        maxCapacity: validatedData.maxCapacity,
        semType: validatedData.semester % 2 === 1 ? "ODD" : "EVEN",
      },
      include: {
        program: {
          select: {
            name: true,
            shortName: true,
            duration: true,
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
            students: true,
            subjects: true,
          }
        }
      }
    })

    return NextResponse.json(batch, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating batch:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}