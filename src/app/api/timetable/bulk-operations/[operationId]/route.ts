import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin, isFaculty } from '@/lib/utils/permissions'
import { getOperationProgress, cancelOperation } from '@/lib/timetable/bulk-operations'
import { db } from '@/lib/db'

interface RouteParams {
  params: {
    operationId: string
  }
}

// GET /api/timetable/bulk-operations/[operationId] - Get specific operation status
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { operationId } = params

    // Check if user has permission to view this operation
    const operation = await db.bulkOperation.findUnique({
      where: { id: operationId }
    })

    if (!operation) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 })
    }

    // Users can only view their own operations unless they're admin
    if (operation.userId !== session.user.id && !isAdmin(session.user as any)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const progress = await getOperationProgress(operationId)
    return NextResponse.json(progress)

  } catch (error) {
    console.error('Error fetching operation status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/timetable/bulk-operations/[operationId] - Cancel specific operation
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { operationId } = params

    // Check if user has permission to cancel this operation
    const operation = await db.bulkOperation.findUnique({
      where: { id: operationId }
    })

    if (!operation) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 })
    }

    // Users can only cancel their own operations unless they're admin
    if (operation.userId !== session.user.id && !isAdmin(session.user as any)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const cancelled = await cancelOperation(operationId)

    if (cancelled) {
      return NextResponse.json({ 
        success: true, 
        message: 'Operation cancelled successfully' 
      })
    } else {
      return NextResponse.json({ 
        error: 'Failed to cancel operation or operation is not cancellable' 
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Error cancelling operation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/timetable/bulk-operations/[operationId] - Update operation (e.g., pause/resume)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { operationId } = params
    const body = await req.json()
    const { action } = body // 'pause' | 'resume'

    const operation = await db.bulkOperation.findUnique({
      where: { id: operationId }
    })

    if (!operation) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 })
    }

    let newStatus: string
    let message: string

    switch (action) {
      case 'pause':
        if (operation.status !== 'RUNNING') {
          return NextResponse.json({ error: 'Can only pause running operations' }, { status: 400 })
        }
        newStatus = 'PAUSED'
        message = 'Operation paused by admin'
        break

      case 'resume':
        if (operation.status !== 'PAUSED') {
          return NextResponse.json({ error: 'Can only resume paused operations' }, { status: 400 })
        }
        newStatus = 'RUNNING'
        message = 'Operation resumed by admin'
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update operation status
    await db.bulkOperation.update({
      where: { id: operationId },
      data: { status: newStatus as any }
    })

    // Log the action
    await db.operationLog.create({
      data: {
        operationId,
        level: 'INFO',
        message
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: `Operation ${action}d successfully`,
      status: newStatus.toLowerCase()
    })

  } catch (error) {
    console.error('Error updating operation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}