import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"
import { z } from "zod"

const createProgramSchema = z.object({
  name: z.string().min(1, "Program name is required"),
  shortName: z.string().min(1, "Short name is required").max(10, "Short name too long"),
  programType: z.enum(["UNDERGRADUATE", "POSTGRADUATE", "DIPLOMA"]),
  duration: z.number().min(1).max(6),
  totalSems: z.number().min(2).max(12),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (!isAdmin(session.user) && !isFaculty(session.user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const programs = await db.program.findMany({
      include: {
        department: {
          select: {
            name: true,
            shortName: true,
          }
        },
        specializations: {
          select: {
            id: true,
            name: true,
            shortName: true,
            isActive: true,
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

    return NextResponse.json(programs)
  } catch (error) {
    console.error("Error fetching programs:", error)
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
    const validatedData = createProgramSchema.parse(body)

    // Check if short name already exists
    const existingProgram = await db.program.findFirst({
      where: {
        shortName: validatedData.shortName
      }
    })

    if (existingProgram) {
      return NextResponse.json(
        { error: "A program with this short name already exists" },
        { status: 400 }
      )
    }

    // Get the user's department (assuming admin belongs to specific department)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { department: true }
    })

    if (!user?.department) {
      return NextResponse.json(
        { error: "User department not found" },
        { status: 400 }
      )
    }

    const program = await db.program.create({
      data: {
        name: validatedData.name,
        shortName: validatedData.shortName,
        programType: validatedData.programType,
        duration: validatedData.duration,
        totalSems: validatedData.totalSems,
        departmentId: user.department.id,
        isActive: true,
      },
      include: {
        department: {
          select: {
            name: true,
            shortName: true,
          }
        },
        specializations: {
          select: {
            id: true,
            name: true,
            shortName: true,
            isActive: true,
          }
        },
        _count: {
          select: {
            batches: true,
          }
        }
      }
    })

    return NextResponse.json(program, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating program:", error)
    return NextResponse.json(
      { error: "Failed to create program" },
      { status: 500 }
    )
  }
}