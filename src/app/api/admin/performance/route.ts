import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { queryMonitor } from '@/lib/utils/query-monitor'
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

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const timeWindow = searchParams.get('timeWindow')
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const windowMs = timeWindow ? parseInt(timeWindow, 10) * 1000 : undefined

    switch (action) {
      case 'stats':
        const stats = queryMonitor.getStats(windowMs)
        return NextResponse.json({
          success: true,
          data: {
            ...stats,
            timestamp: new Date().toISOString(),
            timeWindow: windowMs ? `${timeWindow}s` : 'all time'
          }
        })

      case 'slow_queries':
        const slowQueries = queryMonitor.getSlowQueries(limit)
        return NextResponse.json({
          success: true,
          data: slowQueries.map(query => ({
            ...query,
            timestamp: new Date(query.timestamp).toISOString()
          }))
        })

      case 'recent_queries':
        const recentQueries = queryMonitor.getRecentQueries(limit)
        return NextResponse.json({
          success: true,
          data: recentQueries.map(query => ({
            ...query,
            timestamp: new Date(query.timestamp).toISOString()
          }))
        })

      case 'errors':
        const errorQueries = queryMonitor.getErrorQueries(limit)
        return NextResponse.json({
          success: true,
          data: errorQueries.map(query => ({
            ...query,
            timestamp: new Date(query.timestamp).toISOString()
          }))
        })

      case 'trends':
        const bucketSize = parseInt(searchParams.get('bucket') || '300', 10) * 1000 // 5 minutes default
        const trends = queryMonitor.getQueryTrends(bucketSize)
        return NextResponse.json({
          success: true,
          data: Object.values(trends).map((bucket: any) => ({
            ...bucket,
            timestamp: new Date(bucket.timestamp).toISOString()
          }))
        })

      case 'export':
        const allMetrics = queryMonitor.exportMetrics()
        return NextResponse.json({
          success: true,
          data: allMetrics.map(metric => ({
            ...metric,
            timestamp: new Date(metric.timestamp).toISOString()
          })),
          total: allMetrics.length
        })

      default:
        // Default response includes overview
        const overviewStats = queryMonitor.getStats(windowMs)
        const recentOverview = queryMonitor.getRecentQueries(5)
        const slowOverview = queryMonitor.getSlowQueries(5)

        return NextResponse.json({
          success: true,
          data: {
            overview: {
              ...overviewStats,
              timestamp: new Date().toISOString()
            },
            recentQueries: recentOverview.map(q => ({
              ...q,
              timestamp: new Date(q.timestamp).toISOString()
            })),
            slowQueries: slowOverview.map(q => ({
              ...q,
              timestamp: new Date(q.timestamp).toISOString()
            }))
          }
        })
    }
  } catch (error) {
    console.error('Performance monitoring API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve performance data',
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
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { action } = await request.json()

    switch (action) {
      case 'clear_metrics':
        queryMonitor.clearMetrics()
        return NextResponse.json({
          success: true,
          message: 'Performance metrics cleared'
        })

      case 'test_slow_query':
        // Simulate a slow query for testing
        await queryMonitor.monitorQuery(
          'test_slow_operation',
          () => new Promise(resolve => setTimeout(resolve, 2000)),
          {
            model: 'Test',
            userId: user.id,
            endpoint: '/api/admin/performance'
          }
        )
        return NextResponse.json({
          success: true,
          message: 'Test slow query executed'
        })

      case 'test_error_query':
        // Simulate an error query for testing
        try {
          await queryMonitor.monitorQuery(
            'test_error_operation',
            () => Promise.reject(new Error('Simulated test error')),
            {
              model: 'Test',
              userId: user.id,
              endpoint: '/api/admin/performance'
            }
          )
        } catch {
          // Expected error
        }
        return NextResponse.json({
          success: true,
          message: 'Test error query executed'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: clear_metrics, test_slow_query, test_error_query' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Performance monitoring action failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}