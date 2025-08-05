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

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (!isAdmin(session.user as any) && !isFaculty(session.user as any))) {
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
    
    if (!session?.user || !isAdmin(session.user as any)) {
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
      where: { id: (session.user as any).id },
      include: { department: true }
    })

    // Handle admin users who may not have a department
    let departmentId = user?.department?.id;
    
    if (!departmentId && user?.role === "ADMIN") {
      // For admin users, require departmentId in request body
      const { departmentId: requestDepartmentId } = validatedData;
      if (requestDepartmentId) {
        departmentId = requestDepartmentId;
      } else {
        // If no departments exist, return appropriate error
        const departmentCount = await db.department.count();
        if (departmentCount === 0) {
          return NextResponse.json(
            { error: "No departments found. Please create a department first." },
            { status: 400 }
          )
        }
        
        return NextResponse.json(
          { error: "Department ID is required for program creation." },
          { status: 400 }
        )
      }
    }

    if (!departmentId) {
      return NextResponse.json(
        { error: "Department assignment required" },
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
        departmentId: departmentId,
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
        { error: "Invalid input", details: error.issues },
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