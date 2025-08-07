import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/utils/permissions"
import { z } from "zod"

const updateBatchSchema = z.object({
  name: z.string().optional(),
  isActive: z.boolean().optional(),
  maxCapacity: z.number().optional(),
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const { id } = params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const batch = await db.batch.findUnique({
      where: { id: id },
      include: {
        program: {
          select: {
            name: true,
            shortName: true,
            duration: true,
            department: {
              select: {
                name: true,
                shortName: true,
              }
            }
          }
        },
        specialization: {
          select: {
            name: true,
            shortName: true,
          }
        },
        students: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        },
        subjects: {
          include: {
            primaryFaculty: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        },
        _count: {
          select: {
            students: true,
            subjects: true,
            timetableEntries: true,
            attendanceSessions: true,
          }
        }
      }
    })

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    }

    return NextResponse.json(batch)
  } catch (error) {
    console.error("Error fetching batch:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const { id } = params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateBatchSchema.parse(body)

    const batch = await db.batch.findUnique({
      where: { id: id }
    })

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    }

    const updatedBatch = await db.batch.update({
      where: { id: id },
      data: validatedData,
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

    return NextResponse.json(updatedBatch)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating batch:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const { id } = params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const batch = await db.batch.findUnique({
      where: { id: id },
      include: {
        _count: {
          select: {
            students: true,
            subjects: true,
            timetableEntries: true,
            attendanceSessions: true,
          }
        }
      }
    })

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    }

    // Check if batch has any dependencies
    const totalDependencies = 
      batch._count.students + 
      batch._count.subjects + 
      batch._count.timetableEntries + 
      batch._count.attendanceSessions

    if (totalDependencies > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete batch with existing students, subjects, or attendance records",
          details: {
            students: batch._count.students,
            subjects: batch._count.subjects,
            timetableEntries: batch._count.timetableEntries,
            attendanceSessions: batch._count.attendanceSessions,
          }
        },
        { status: 400 }
      )
    }

    await db.batch.delete({
      where: { id: id }
    })

    return NextResponse.json({ message: "Batch deleted successfully" })
  } catch (error) {
    console.error("Error deleting batch:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}