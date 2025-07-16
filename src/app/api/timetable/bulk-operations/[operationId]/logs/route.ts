import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/utils/permissions'
import { db } from '@/lib/db'

interface RouteParams {
  params: {
    operationId: string
  }
}

// GET /api/timetable/bulk-operations/[operationId]/logs - Get operation logs
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { operationId } = params
    const { searchParams } = new URL(req.url)
    const level = searchParams.get('level') // Filter by log level
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Check if operation exists and user has permission
    const operation = await db.bulkOperation.findUnique({
      where: { id: operationId }
    })

    if (!operation) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 })
    }

    // Users can only view logs for their own operations unless they're admin
    if (operation.userId !== session.user.id && !isAdmin(session.user as any)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build where clause for logs
    const whereClause: any = { operationId }
    if (level) {
      whereClause.level = level.toUpperCase()
    }

    // Get logs with pagination
    const [logs, totalCount] = await Promise.all([
      db.operationLog.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      }),
      db.operationLog.count({ where: whereClause })
    ])

    const formattedLogs = logs.map(log => ({
      id: log.id,
      level: log.level.toLowerCase(),
      message: log.message,
      details: log.details ? JSON.parse(log.details) : null,
      timestamp: log.timestamp.toISOString()
    }))

    return NextResponse.json({
      logs: formattedLogs,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    })

  } catch (error) {
    console.error('Error fetching operation logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/timetable/bulk-operations/[operationId]/logs - Add custom log entry (admin only)
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { operationId } = params
    const body = await req.json()
    const { level, message, details } = body

    // Validate input
    if (!level || !message) {
      return NextResponse.json({ error: 'Level and message are required' }, { status: 400 })
    }

    const validLevels = ['INFO', 'WARN', 'ERROR', 'DEBUG']
    if (!validLevels.includes(level.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid log level' }, { status: 400 })
    }

    // Check if operation exists
    const operation = await db.bulkOperation.findUnique({
      where: { id: operationId }
    })

    if (!operation) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 })
    }

    // Create log entry
    const logEntry = await db.operationLog.create({
      data: {
        operationId,
        level: level.toUpperCase(),
        message,
        details: details ? JSON.stringify(details) : null
      }
    })

    return NextResponse.json({
      success: true,
      log: {
        id: logEntry.id,
        level: logEntry.level.toLowerCase(),
        message: logEntry.message,
        details: logEntry.details ? JSON.parse(logEntry.details) : null,
        timestamp: logEntry.timestamp.toISOString()
      }
    })

  } catch (error) {
    console.error('Error creating log entry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}