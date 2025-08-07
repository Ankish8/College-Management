import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getMonitoredDB } from '@/lib/db'
import { withQueryMonitoring } from '@/lib/utils/query-monitor'

/**
 * Example API route showing how to integrate query monitoring
 * 
 * This demonstrates:
 * 1. Using getMonitoredDB() for automatic query tracking
 * 2. Using withQueryMonitoring() wrapper for API operations
 * 3. Tracking user context for performance analytics
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    
    // Method 1: Use monitored database client
    const db = await getMonitoredDB(user.id)
    
    // This query will be automatically tracked by the query monitor
    const students = await db.student.findMany({
      take: 10,
      include: {
        batch: true,
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    })

    // Method 2: Manually wrap operations with monitoring
    const monitoredOperation = withQueryMonitoring(
      async () => {
        return await db.subject.count()
      },
      'Count all subjects',
      {
        endpoint: '/api/example-monitored',
        userId: user.id
      }
    )

    const subjectCount = await monitoredOperation()

    return NextResponse.json({
      success: true,
      data: {
        students: students.map(student => ({
          id: student.id,
          name: student.user.name,
          rollNumber: student.rollNumber,
          batch: student.batch.name
        })),
        totalSubjects: subjectCount,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Example monitored API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    const { action, data } = await request.json()

    // Example of monitoring a complex operation with multiple queries
    const result = await withQueryMonitoring(
      async () => {
        const db = await getMonitoredDB(user.id)
        
        switch (action) {
          case 'create_test_data':
            // Simulate creating test data
            const createdRecords = await db.$transaction(async (tx) => {
              // Each query in the transaction will be monitored separately
              const batchCount = await tx.batch.count()
              const userCount = await tx.user.count()
              
              return { batchCount, userCount }
            })
            return createdRecords

          case 'complex_query':
            // Example of a complex query that might be slow
            const result = await db.student.findMany({
              include: {
                user: true,
                batch: {
                  include: {
                    specialization: {
                      include: {
                        program: {
                          include: {
                            department: true
                          }
                        }
                      }
                    }
                  }
                }
              },
              orderBy: {
                createdAt: 'desc'
              },
              take: 100
            })
            return result

          default:
            throw new Error('Invalid action')
        }
      },
      `POST /api/example-monitored - ${action}`,
      {
        endpoint: '/api/example-monitored',
        userId: user.id
      }
    )

    return NextResponse.json({
      success: true,
      data: result,
      action
    })

  } catch (error) {
    console.error('Example monitored POST error:', error)
    return NextResponse.json(
      { 
        error: 'Operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Usage Notes:
 * 
 * 1. Replace existing db imports with:
 *    import { getMonitoredDB } from '@/lib/db'
 * 
 * 2. Get monitored client in your API routes:
 *    const db = await getMonitoredDB(userId)
 * 
 * 3. For additional monitoring of complex operations:
 *    import { withQueryMonitoring } from '@/lib/utils/query-monitor'
 * 
 * 4. All database operations will be automatically tracked with:
 *    - Query duration
 *    - Success/error status
 *    - User context
 *    - Record counts
 *    - Operation type
 * 
 * 5. View performance data at /api/admin/performance
 *    or use the PerformanceDashboard component
 */