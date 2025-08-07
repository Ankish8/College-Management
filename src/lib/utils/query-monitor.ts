/**
 * Query Performance Monitor
 * 
 * Comprehensive query performance monitoring system for tracking
 * database operations, identifying slow queries, and collecting
 * performance analytics.
 */

interface QueryMetric {
  id: string
  operation: string
  query: string
  duration: number
  timestamp: number
  model?: string
  userId?: string
  endpoint?: string
  success: boolean
  error?: string
  params?: Record<string, any>
  recordCount?: number
}

interface PerformanceStats {
  totalQueries: number
  averageDuration: number
  slowQueries: number
  errorCount: number
  fastestQuery: number
  slowestQuery: number
  queryBreakdown: Record<string, {
    count: number
    totalDuration: number
    averageDuration: number
    errors: number
  }>
}

class QueryMonitor {
  private metrics: QueryMetric[] = []
  private readonly maxMetrics: number
  private readonly slowQueryThreshold: number
  private readonly enableLogging: boolean
  
  constructor() {
    this.maxMetrics = parseInt(process.env.MAX_QUERY_METRICS || '1000', 10)
    this.slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000', 10)
    this.enableLogging = process.env.ENABLE_QUERY_LOGGING === 'true'
    
    console.log(`📊 Query Monitor initialized (max: ${this.maxMetrics}, slow: ${this.slowQueryThreshold}ms)`)
  }

  /**
   * Record a query execution
   */
  recordQuery(metric: Omit<QueryMetric, 'id' | 'timestamp'>): void {
    const queryMetric: QueryMetric = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...metric
    }

    // Add to metrics array
    this.metrics.push(queryMetric)

    // Trim metrics if exceeding max
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift()
    }

    // Log slow queries
    if (metric.duration > this.slowQueryThreshold) {
      console.warn(`🐌 Slow query detected: ${metric.operation} took ${metric.duration}ms`, {
        query: metric.query,
        model: metric.model,
        endpoint: metric.endpoint,
        userId: metric.userId
      })
    }

    // Log all queries if enabled
    if (this.enableLogging) {
      console.log(`📊 Query: ${metric.operation} (${metric.duration}ms)`, {
        success: metric.success,
        model: metric.model,
        recordCount: metric.recordCount
      })
    }
  }

  /**
   * Monitor a database operation
   */
  async monitorQuery<T>(
    operation: string,
    queryFn: () => Promise<T>,
    context: {
      model?: string
      userId?: string
      endpoint?: string
      params?: Record<string, any>
    } = {}
  ): Promise<T> {
    const startTime = performance.now()
    let result: T
    let success = false
    let error: string | undefined
    let recordCount: number | undefined

    try {
      result = await queryFn()
      success = true
      
      // Try to extract record count
      if (Array.isArray(result)) {
        recordCount = result.length
      } else if (result && typeof result === 'object' && 'length' in result) {
        recordCount = (result as any).length
      }

      return result
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      const duration = performance.now() - startTime
      
      this.recordQuery({
        operation,
        query: this.sanitizeQuery(operation, context.params),
        duration,
        model: context.model,
        userId: context.userId,
        endpoint: context.endpoint,
        success,
        error,
        params: context.params,
        recordCount
      })
    }
  }

  /**
   * Get performance statistics
   */
  getStats(timeWindow?: number): PerformanceStats {
    const windowStart = timeWindow ? Date.now() - timeWindow : 0
    const relevantMetrics = this.metrics.filter(m => m.timestamp >= windowStart)

    if (relevantMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowQueries: 0,
        errorCount: 0,
        fastestQuery: 0,
        slowestQuery: 0,
        queryBreakdown: {}
      }
    }

    const durations = relevantMetrics.map(m => m.duration)
    const queryBreakdown: Record<string, any> = {}

    // Build query breakdown stats
    relevantMetrics.forEach(metric => {
      const key = `${metric.model || 'unknown'}:${metric.operation}`
      if (!queryBreakdown[key]) {
        queryBreakdown[key] = {
          count: 0,
          totalDuration: 0,
          averageDuration: 0,
          errors: 0
        }
      }

      queryBreakdown[key].count++
      queryBreakdown[key].totalDuration += metric.duration
      if (!metric.success) queryBreakdown[key].errors++
    })

    // Calculate averages
    Object.values(queryBreakdown).forEach((stats: any) => {
      stats.averageDuration = stats.totalDuration / stats.count
    })

    return {
      totalQueries: relevantMetrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      slowQueries: relevantMetrics.filter(m => m.duration > this.slowQueryThreshold).length,
      errorCount: relevantMetrics.filter(m => !m.success).length,
      fastestQuery: Math.min(...durations),
      slowestQuery: Math.max(...durations),
      queryBreakdown
    }
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit: number = 10): QueryMetric[] {
    return this.metrics
      .filter(m => m.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
  }

  /**
   * Get recent queries
   */
  getRecentQueries(limit: number = 20): QueryMetric[] {
    return this.metrics
      .slice(-limit)
      .reverse()
  }

  /**
   * Get error queries
   */
  getErrorQueries(limit: number = 10): QueryMetric[] {
    return this.metrics
      .filter(m => !m.success)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = []
    console.log('📊 Query metrics cleared')
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): QueryMetric[] {
    return [...this.metrics]
  }

  /**
   * Get query trends over time
   */
  getQueryTrends(bucketSize: number = 5 * 60 * 1000): Record<string, any> {
    const now = Date.now()
    const trends: Record<string, any> = {}

    this.metrics.forEach(metric => {
      const bucket = Math.floor((now - metric.timestamp) / bucketSize) * bucketSize
      const key = new Date(now - bucket).toISOString()

      if (!trends[key]) {
        trends[key] = {
          timestamp: now - bucket,
          count: 0,
          averageDuration: 0,
          totalDuration: 0,
          errors: 0
        }
      }

      trends[key].count++
      trends[key].totalDuration += metric.duration
      if (!metric.success) trends[key].errors++
    })

    // Calculate averages
    Object.values(trends).forEach((bucket: any) => {
      bucket.averageDuration = bucket.totalDuration / bucket.count
    })

    return trends
  }

  private generateId(): string {
    return `qm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private sanitizeQuery(operation: string, params?: Record<string, any>): string {
    if (!params) return operation
    
    // Create a sanitized version of the query with params
    try {
      const sanitizedParams = this.sanitizeParams(params)
      return `${operation}(${JSON.stringify(sanitizedParams)})`
    } catch {
      return operation
    }
  }

  private sanitizeParams(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(params)) {
      // Don't log sensitive data
      if (key.toLowerCase().includes('password') || 
          key.toLowerCase().includes('token') || 
          key.toLowerCase().includes('secret')) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = `${value.substring(0, 97)}...`
      } else {
        sanitized[key] = value
      }
    }
    
    return sanitized
  }
}

// Global query monitor instance
const queryMonitor = new QueryMonitor()

/**
 * Prisma middleware for automatic query monitoring
 */
export function createQueryMonitorMiddleware(userId?: string) {
  return async (params: any, next: any) => {
    const operation = `${params.model}.${params.action}`
    
    return queryMonitor.monitorQuery(
      operation,
      () => next(params),
      {
        model: params.model,
        userId,
        params: params.args
      }
    )
  }
}

/**
 * Higher-order function to monitor API routes
 */
export function withQueryMonitoring<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operationName: string,
  context: {
    endpoint?: string
    userId?: string
  } = {}
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    return queryMonitor.monitorQuery(
      operationName,
      () => fn(...args),
      context
    )
  }
}

/**
 * React Query performance monitoring
 */
export function createReactQueryMetrics() {
  return {
    onSuccess: (data: any, query: any) => {
      queryMonitor.recordQuery({
        operation: `ReactQuery.${query.queryKey.join('.')}`,
        query: JSON.stringify(query.queryKey),
        duration: Date.now() - (query.state.dataUpdateCount * 100), // Approximate
        success: true,
        recordCount: Array.isArray(data) ? data.length : undefined
      })
    },
    onError: (error: any, query: any) => {
      queryMonitor.recordQuery({
        operation: `ReactQuery.${query.queryKey.join('.')}`,
        query: JSON.stringify(query.queryKey),
        duration: Date.now() - (query.state.dataUpdateCount * 100),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

export { queryMonitor }
export type { QueryMetric, PerformanceStats }