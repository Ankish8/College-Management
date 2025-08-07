import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbPool } from '@/lib/db'
import { isAdmin } from '@/lib/utils/permissions'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get connection pool statistics
    const poolStats = dbPool.getStats()
    
    // Perform health check
    const isHealthy = await dbPool.healthCheck()
    
    // Get additional database metrics
    const startTime = Date.now()
    let queryPerformance = null
    
    try {
      // Test query performance
      await dbPool.getClient().then(client => client.$queryRaw`SELECT COUNT(*) as count FROM User`)
      const queryTime = Date.now() - startTime
      queryPerformance = {
        queryTime,
        status: queryTime < 100 ? 'excellent' : queryTime < 500 ? 'good' : 'slow'
      }
    } catch (error) {
      queryPerformance = {
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'failed'
      }
    }

    const healthData = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      connectionPool: {
        ...poolStats,
        efficiency: poolStats.activeConnections > 0 
          ? Math.round((poolStats.availableClients / poolStats.activeConnections) * 100) 
          : 0,
        utilization: poolStats.poolSize > 0 
          ? Math.round((poolStats.activeConnections / poolStats.poolSize) * 100) 
          : 0
      },
      performance: queryPerformance,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing',
        poolSize: process.env.DB_POOL_SIZE || 'default(5)',
        maxConnections: process.env.DB_MAX_CONNECTIONS || 'default(10)',
        connectionTimeout: process.env.DB_CONNECTION_TIMEOUT || 'default(10000)'
      }
    }

    return NextResponse.json(healthData)
  } catch (error) {
    console.error('Database health check failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check database health',
        details: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        timestamp: new Date().toISOString()
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
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { action } = await request.json()

    switch (action) {
      case 'refresh_pool':
        // Close and reinitialize connection pool
        await dbPool.closeAll()
        const newClient = await dbPool.getClient()
        return NextResponse.json({
          success: true,
          message: 'Connection pool refreshed',
          stats: dbPool.getStats()
        })

      case 'health_check':
        const isHealthy = await dbPool.healthCheck()
        return NextResponse.json({
          success: true,
          healthy: isHealthy,
          stats: dbPool.getStats()
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: refresh_pool, health_check' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Database management action failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to perform database action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}