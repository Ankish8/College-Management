import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
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

    const holiday = await db.holiday.findUnique({
      where: {
        id: params.id
      }
    })

    if (!holiday) {
      return NextResponse.json(
        { error: 'Holiday not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(holiday)
  } catch (error) {
    console.error('Error fetching holiday:', error)
    return NextResponse.json(
      { error: 'Failed to fetch holiday' },
      { status: 500 }
    )
  }
}

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

    const body = await request.json()

    const updatedHoliday = await db.holiday.update({
      where: {
        id: params.id
      },
      data: {
        ...body,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(updatedHoliday)
  } catch (error) {
    console.error('Error updating holiday:', error)
    return NextResponse.json(
      { error: 'Failed to update holiday' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    console.log('Attempting to delete holiday with ID:', params.id)

    // First check if the holiday exists
    const existingHoliday = await db.holiday.findUnique({
      where: {
        id: params.id
      }
    })

    if (!existingHoliday) {
      console.error('Holiday not found:', params.id)
      return NextResponse.json(
        { error: 'Holiday not found' },
        { status: 404 }
      )
    }

    // Delete the holiday
    await db.holiday.delete({
      where: {
        id: params.id
      }
    })

    console.log('Holiday deleted successfully:', params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting holiday:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete holiday' },
      { status: 500 }
    )
  }
}