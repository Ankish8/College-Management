import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const UndoEntityTypeValues = ['TIMETABLE_ENTRY', 'STUDENT', 'FACULTY', 'SUBJECT', 'BATCH', 'HOLIDAY', 'TIMESLOT'] as const
const UndoOperationTypeValues = ['DELETE', 'BATCH_DELETE', 'SOFT_DELETE'] as const

const createUndoOperationSchema = z.object({
  entityType: z.enum(UndoEntityTypeValues),
  entityId: z.string().min(1),
  operation: z.enum(UndoOperationTypeValues),
  data: z.record(z.string(), z.any()),
  metadata: z.object({
    entityName: z.string().optional(),
    description: z.string().optional(),
    relatedIds: z.array(z.string()).optional(),
    additionalContext: z.record(z.string(), z.any()).optional(),
  }).optional(),
  timeoutSeconds: z.number().min(1).max(300).default(30), // Max 5 minutes
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createUndoOperationSchema.parse(body)

    const userId = (session.user as any).id
    const expiresAt = new Date(Date.now() + validatedData.timeoutSeconds * 1000)

    const undoOperation = await db.undoOperation.create({
      data: {
        userId,
        entityType: validatedData.entityType,
        entityId: validatedData.entityId,
        operation: validatedData.operation,
        data: validatedData.data,
        metadata: validatedData.metadata || {},
        expiresAt,
      },
    })

    return NextResponse.json({ id: undoOperation.id }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating undo operation:", error)
    return NextResponse.json(
      { error: "Failed to create undo operation" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')

    const whereClause: any = {
      userId,
      expiresAt: { gt: new Date() }, // Only return non-expired operations
    }

    if (entityType && UndoEntityTypeValues.includes(entityType as any)) {
      whereClause.entityType = entityType
    }

    const operations = await db.undoOperation.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to recent operations
    })

    return NextResponse.json({ operations })
  } catch (error) {
    console.error("Error fetching undo operations:", error)
    return NextResponse.json(
      { error: "Failed to fetch undo operations" },
      { status: 500 }
    )
  }
}

// Cleanup expired operations (can be called periodically)
export async function DELETE() {
  try {
    const deletedCount = await db.undoOperation.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    })

    return NextResponse.json({ 
      message: `Cleaned up ${deletedCount.count} expired undo operations` 
    })
  } catch (error) {
    console.error("Error cleaning up undo operations:", error)
    return NextResponse.json(
      { error: "Failed to cleanup undo operations" },
      { status: 500 }
    )
  }
}