import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { cancelled } = await request.json()

    // Update the timetable entry
    const updatedEntry = await prisma.timetableEntry.update({
      where: {
        id: params.id
      },
      data: {
        cancelled: cancelled,
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