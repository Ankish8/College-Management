import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"
import { z } from "zod"

const createSpecializationSchema = z.object({
  name: z.string().min(1, "Specialization name is required"),
  shortName: z.string().min(1, "Short name is required").max(5, "Short name too long"),
  programId: z.string().min(1, "Program is required"),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (!isAdmin(session.user) && !isFaculty(session.user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const programId = searchParams.get("programId")

    const whereClause: Record<string, unknown> = {}
    
    if (programId) {
      whereClause.programId = programId
    }

    const specializations = await db.specialization.findMany({
      where: whereClause,
      include: {
        program: {
          select: {
            name: true,
            shortName: true,
          }
        },
        _count: {
          select: {
            batches: true,
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(specializations)
  } catch (error) {
    console.error("Error fetching specializations:", error)
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
    const validatedData = createSpecializationSchema.parse(body)

    // Check if program exists and is active
    const program = await db.program.findUnique({
      where: { id: validatedData.programId },
      select: { isActive: true }
    })

    if (!program || !program.isActive) {
      return NextResponse.json(
        { error: "Program not found or inactive" },
        { status: 400 }
      )
    }

    // Check if specialization with same short name exists in this program
    const existingSpecialization = await db.specialization.findFirst({
      where: {
        programId: validatedData.programId,
        shortName: validatedData.shortName
      }
    })

    if (existingSpecialization) {
      return NextResponse.json(
        { error: "A specialization with this short name already exists in this program" },
        { status: 400 }
      )
    }

    const specialization = await db.specialization.create({
      data: {
        name: validatedData.name,
        shortName: validatedData.shortName,
        programId: validatedData.programId,
        isActive: true,
      },
      include: {
        program: {
          select: {
            name: true,
            shortName: true,
          }
        },
        _count: {
          select: {
            batches: true,
          }
        }
      }
    })

    return NextResponse.json(specialization, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating specialization:", error)
    return NextResponse.json(
      { error: "Failed to create specialization" },
      { status: 500 }
    )
  }
}