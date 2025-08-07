import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { cancelled } = await request.json()

    // Update the timetable entry - use isActive field to represent cancellation
    const updatedEntry = await db.timetableEntry.update({
      where: {
        id: params.id
      },
      data: {
        isActive: !cancelled, // If cancelled=true, then isActive=false
        updatedAt: new Date()
      }
    })

    return NextResponse.json(updatedEntry)
  } catch (error) {
    console.error('Error cancelling timetable entry:', error)
    return NextResponse.json(
      { error: 'Failed to cancel timetable entry' },
      { status: 500 }
    )
  }
}