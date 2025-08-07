import { getPooledDB } from '@/lib/db'

/**
 * Database Pool Migration Utilities
 * 
 * These utilities help migrate existing API endpoints to use connection pooling
 * while maintaining backward compatibility and gradual rollout.
 */

interface PoolMigrationOptions {
  enablePooling?: boolean
  fallbackOnError?: boolean
  logPerformance?: boolean
}

/**
 * Enhanced database client getter with optional connection pooling
 * 
 * This function allows gradual migration to connection pooling by:
 * 1. Checking environment flags
 * 2. Providing fallback to regular client
 * 3. Logging performance metrics
 */
export async function getDbClient(options: PoolMigrationOptions = {}) {
  const {
    enablePooling = process.env.ENABLE_CONNECTION_POOL === 'true' || process.env.NODE_ENV === 'production',
    fallbackOnError = true,
    logPerformance = process.env.LOG_DB_PERFORMANCE === 'true'
  } = options

  const startTime = logPerformance ? Date.now() : 0

  try {
    if (enablePooling) {
      const client = await getPooledDB()
      
      if (logPerformance) {
        const duration = Date.now() - startTime
        console.log(`📊 Pooled DB client acquired in ${duration}ms`)
      }
      
      return client
    } else {
      // Use regular client for backward compatibility
      const { db } = await import('@/lib/db')
      
      if (logPerformance) {
        const duration = Date.now() - startTime
        console.log(`📊 Regular DB client used in ${duration}ms`)
      }
      
      return db
    }
  } catch (error) {
    console.error('❌ Error acquiring database client:', error)
    
    if (fallbackOnError) {
      console.log('🔄 Falling back to regular database client')
      const { db } = await import('@/lib/db')
      return db
    }
    
    throw error
  }
}

/**
 * Performance monitoring wrapper for database operations
 */
export async function withDbPerformanceMonitoring<T>(
  operation: () => Promise<T>,
  operationName: string = 'Database Operation'
): Promise<T> {
  const startTime = Date.now()
  
  try {
    const result = await operation()
    const duration = Date.now() - startTime
    
    // Log performance metrics
    if (process.env.LOG_DB_PERFORMANCE === 'true' || duration > 1000) {
      console.log(`⚡ ${operationName} completed in ${duration}ms`)
    }
    
    // Track slow queries
    if (duration > 2000) {
      console.warn(`🐌 Slow query detected: ${operationName} took ${duration}ms`)
    }
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`❌ ${operationName} failed after ${duration}ms:`, error)
    throw error
  }
}

/**
 * Connection pool health checker
 */
export async function checkConnectionPoolHealth() {
  try {
    const { dbPool } = await import('@/lib/db')
    const isHealthy = await dbPool.healthCheck()
    const stats = dbPool.getStats()
    
    return {
      healthy: isHealthy,
      stats,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Gradual rollout helper
 * 
 * This function helps implement gradual rollout of connection pooling
 * based on user ID, request path, or other criteria.
 */
export function shouldUseConnectionPool(criteria: {
  userId?: string
  path?: string
  rolloutPercentage?: number
}): boolean {
  const {
    userId,
    path,
    rolloutPercentage = parseInt(process.env.CONNECTION_POOL_ROLLOUT_PERCENTAGE || '100', 10)
  } = criteria

  // Always use in production
  if (process.env.NODE_ENV === 'production') {
    return true
  }

  // Force enable via environment variable
  if (process.env.FORCE_CONNECTION_POOL === 'true') {
    return true
  }

  // Rollout based on percentage
  if (rolloutPercentage < 100) {
    if (userId) {
      // Use user ID to determine if they're in the rollout group
      const hash = simpleHash(userId)
      return (hash % 100) < rolloutPercentage
    }
    
    if (path) {
      // Use path to determine rollout
      const hash = simpleHash(path)
      return (hash % 100) < rolloutPercentage
    }
    
    // Random rollout if no specific criteria
    return Math.random() * 100 < rolloutPercentage
  }

  return rolloutPercentage >= 100
}

/**
 * Simple hash function for rollout decisions
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * API endpoint migration helper
 * 
 * Use this in your API routes to easily test connection pooling:
 * 
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const db = await getDbClient({ enablePooling: true })
 *   // ... your existing code
 * }
 * ```
 */
export async function migrateApiToPool(
  handler: (db: any) => Promise<any>,
  options: PoolMigrationOptions = {}
) {
  const db = await getDbClient(options)
  
  return withDbPerformanceMonitoring(
    () => handler(db),
    'API Database Operation'
  )
}