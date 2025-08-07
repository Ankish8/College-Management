import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/utils/permissions"
import { z } from "zod"

const updateProgramSchema = z.object({
  isActive: z.boolean().optional(),
})

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id } = params
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateProgramSchema.parse(body)

    const program = await db.program.update({
      where: { id },
      data: validatedData,
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

    return NextResponse.json(program)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating program:", error)
    return NextResponse.json(
      { error: "Failed to update program" },
      { status: 500 }
    )
  }
}