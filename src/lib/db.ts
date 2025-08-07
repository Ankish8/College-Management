import { PrismaClient } from '@prisma/client'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  connectionPool: ConnectionPool | undefined
}

// Connection Pool Manager for Prisma Client instances
class ConnectionPool {
  private clients: PrismaClient[] = []
  private readonly poolSize: number
  private currentIndex = 0
  private readonly maxConnections: number
  private activeConnections = 0
  private readonly connectionTimeout: number

  constructor() {
    // Connection pool configuration
    this.poolSize = parseInt(process.env.DB_POOL_SIZE || '5', 10)
    this.maxConnections = parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10)
    this.connectionTimeout = parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10)
    
    console.log(`📊 Database connection pool initialized with ${this.poolSize} connections`)
  }

  private createClient(): PrismaClient {
    return new PrismaClient({
      // Optimized logging for production
      log: process.env.NODE_ENV === 'production' 
        ? ['error'] 
        : process.env.NODE_ENV === 'development' 
        ? ['error', 'warn'] 
        : ['error', 'warn', 'info'],
      
      datasources: {
        db: {
          url: getDatabaseUrl(),
        },
      },
      
      // Note: Prisma Client doesn't expose internal engine configuration
      // Connection pooling is handled at the application level
    })
  }

  private async initializePool(): Promise<void> {
    console.log('🔄 Initializing database connection pool...')
    
    for (let i = 0; i < this.poolSize; i++) {
      try {
        const client = this.createClient()
        
        // Test the connection
        await client.$connect()
        this.clients.push(client)
        this.activeConnections++
        
        console.log(`✅ Connection ${i + 1}/${this.poolSize} established`)
      } catch (error) {
        console.error(`❌ Failed to create connection ${i + 1}:`, error)
        throw new Error(`Failed to initialize connection pool: ${error}`)
      }
    }
    
    console.log(`🎉 Connection pool ready with ${this.clients.length} active connections`)
  }

  async getClient(): Promise<PrismaClient> {
    // Initialize pool if not already done
    if (this.clients.length === 0) {
      await this.initializePool()
    }

    // Round-robin client selection for load balancing
    const client = this.clients[this.currentIndex]
    this.currentIndex = (this.currentIndex + 1) % this.clients.length
    
    return client
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.getClient()
      await client.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      console.error('❌ Database health check failed:', error)
      return false
    }
  }

  async closeAll(): Promise<void> {
    console.log('🔄 Closing all database connections...')
    
    const disconnectPromises = this.clients.map(async (client, index) => {
      try {
        await client.$disconnect()
        console.log(`✅ Connection ${index + 1} closed`)
      } catch (error) {
        console.error(`❌ Error closing connection ${index + 1}:`, error)
      }
    })
    
    await Promise.allSettled(disconnectPromises)
    this.clients = []
    this.activeConnections = 0
    console.log('✅ All database connections closed')
  }

  getStats() {
    return {
      poolSize: this.poolSize,
      maxConnections: this.maxConnections,
      activeConnections: this.activeConnections,
      availableClients: this.clients.length,
      connectionTimeout: this.connectionTimeout,
    }
  }
}

// Convert relative SQLite path to absolute path if needed
function getDatabaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url) return undefined
  
  // Check if it's a relative SQLite file path
  if (url.startsWith('file:./') || url.startsWith('file:../')) {
    const relativePath = url.replace('file:', '')
    const absolutePath = path.resolve(process.cwd(), relativePath)
    return `file:${absolutePath}`
  }
  
  return url
}

// Initialize connection pool
const connectionPool = globalForPrisma.connectionPool ?? new ConnectionPool()
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.connectionPool = connectionPool
}

// Primary database client with connection pooling fallback
export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
})

// Enhanced database client with connection pooling
export async function getPooledDB(): Promise<PrismaClient> {
  try {
    return await connectionPool.getClient()
  } catch (error) {
    console.error('❌ Failed to get pooled client, using fallback:', error)
    return db
  }
}

// Enhanced database client with query monitoring
export async function getMonitoredDB(userId?: string): Promise<PrismaClient> {
  const client = await getPooledDB()
  
  // Add query monitoring middleware if enabled
  if (process.env.ENABLE_QUERY_MONITORING === 'true' || process.env.NODE_ENV === 'development') {
    const { createQueryMonitorMiddleware } = await import('@/lib/utils/query-monitor')
    client.$use(createQueryMonitorMiddleware(userId))
  }
  
  return client
}

// Export connection pool for advanced usage and monitoring
export const dbPool = connectionPool

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    console.log('📴 Received SIGINT, closing database connections...')
    await connectionPool.closeAll()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('📴 Received SIGTERM, closing database connections...')
    await connectionPool.closeAll()
    process.exit(0)
  })

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('💥 Uncaught exception:', error)
    await connectionPool.closeAll()
    process.exit(1)
  })
}

// Store reference globally for development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}