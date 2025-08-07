import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const params = await context.params
    const { id } = params
    const userId = (session.user as any).id

    // Find the undo operation
    const undoOperation = await db.undoOperation.findFirst({
      where: {
        id,
        userId, // Ensure user owns this operation
      },
    })

    if (!undoOperation) {
      return NextResponse.json(
        { error: "Undo operation not found or expired" },
        { status: 404 }
      )
    }

    // Check if operation has expired
    if (new Date() > undoOperation.expiresAt) {
      // Clean up expired operation
      await db.undoOperation.delete({
        where: { id },
      })
      
      return NextResponse.json(
        { error: "Undo operation has expired" },
        { status: 410 } // Gone
      )
    }

    // Execute the undo based on entity type
    let result: any
    const entityData = undoOperation.data as any
    const metadata = undoOperation.metadata as any

    try {
      switch (undoOperation.entityType) {
        case 'TIMETABLE_ENTRY':
          result = await undoTimetableEntry(undoOperation.entityId, entityData, metadata)
          break
        
        case 'STUDENT':
          throw new Error('Student undo not yet implemented')
        
        case 'FACULTY':
          throw new Error('Faculty undo not yet implemented')
        
        case 'SUBJECT':
          throw new Error('Subject undo not yet implemented')
        
        case 'BATCH':
          throw new Error('Batch undo not yet implemented')
        
        case 'HOLIDAY':
          result = await undoHoliday(undoOperation.entityId, entityData, metadata)
          break
        
        case 'TIMESLOT':
          throw new Error('TimeSlot undo not yet implemented')
        
        default:
          throw new Error(`Unsupported entity type: ${undoOperation.entityType}`)
      }

      // Remove the undo operation after successful execution
      await db.undoOperation.delete({
        where: { id },
      })

      return NextResponse.json({
        success: true,
        message: result.message || `Successfully restored ${undoOperation.entityType.toLowerCase()}`,
        data: result.data,
      })

    } catch (undoError) {
      console.error(`Undo failed for ${undoOperation.entityType}:`, undoError)
      
      return NextResponse.json({
        success: false,
        message: `Failed to restore ${undoOperation.entityType.toLowerCase()}`,
        error: undoError instanceof Error ? undoError.message : 'Unknown error',
      }, { status: 500 })
    }

  } catch (error) {
    console.error("Error executing undo operation:", error)
    return NextResponse.json(
      { error: "Failed to execute undo operation" },
      { status: 500 }
    )
  }
}

// Undo functions for different entity types

async function undoTimetableEntry(entityId: string, data: any, metadata: any) {
  const restored = await db.timetableEntry.create({
    data: {
      id: entityId, // Restore with original ID
      batchId: data.batchId,
      subjectId: data.subjectId,
      facultyId: data.facultyId,
      timeSlotId: data.timeSlotId,
      dayOfWeek: data.dayOfWeek,
      date: data.date ? new Date(data.date) : null,
      entryType: data.entryType,
      notes: data.notes,
      customEventTitle: data.customEventTitle,
      customEventColor: data.customEventColor,
      isActive: true,
    },
  })

  return {
    message: `Restored timetable entry for ${metadata?.entityName || 'class'}`,
    data: restored,
  }
}


async function undoHoliday(entityId: string, data: any, metadata: any) {
  const restored = await db.holiday.create({
    data: {
      id: entityId,
      name: data.name,
      date: new Date(data.date),
      type: data.type,
      description: data.description,
      isRecurring: data.isRecurring,
      departmentId: data.departmentId,
    },
  })

  return {
    message: `Restored holiday ${metadata?.entityName || data.name}`,
    data: restored,
  }
}

