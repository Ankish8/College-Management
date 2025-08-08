/**
 * Database Adapter Utility
 * 
 * Provides database-agnostic utilities and handles differences between
 * SQLite and PostgreSQL implementations.
 */

import { PrismaClient } from '@prisma/client'

export type DatabaseProvider = 'sqlite' | 'postgresql'

export class DatabaseAdapter {
  private provider: DatabaseProvider
  private client: PrismaClient

  constructor(client: PrismaClient, provider?: DatabaseProvider) {
    this.client = client
    this.provider = provider || this.detectProvider()
  }

  private detectProvider(): DatabaseProvider {
    const dbUrl = process.env.DATABASE_URL || ''
    const provider = process.env.DATABASE_PROVIDER || ''
    
    if (provider === 'postgresql' || dbUrl.startsWith('postgres')) {
      return 'postgresql'
    }
    return 'sqlite'
  }

  /**
   * Get database provider type
   */
  getProvider(): DatabaseProvider {
    return this.provider
  }

  /**
   * Check if database is PostgreSQL
   */
  isPostgreSQL(): boolean {
    return this.provider === 'postgresql'
  }

  /**
   * Check if database is SQLite
   */
  isSQLite(): boolean {
    return this.provider === 'sqlite'
  }

  /**
   * Execute raw SQL with provider-specific optimizations
   */
  async executeRaw(sql: string, params?: any[]): Promise<any> {
    if (this.isPostgreSQL()) {
      // PostgreSQL-specific optimizations
      return this.client.$executeRaw`${sql}`
    } else {
      // SQLite-specific handling
      return this.client.$executeRawUnsafe(sql, ...(params || []))
    }
  }

  /**
   * Query raw SQL with provider-specific optimizations
   */
  async queryRaw(sql: string, params?: any[]): Promise<any> {
    if (this.isPostgreSQL()) {
      // PostgreSQL supports prepared statements better
      return this.client.$queryRaw`${sql}`
    } else {
      // SQLite raw query
      return this.client.$queryRawUnsafe(sql, ...(params || []))
    }
  }

  /**
   * Get database-specific date formatting
   */
  formatDate(date: Date): string {
    if (this.isPostgreSQL()) {
      return date.toISOString()
    } else {
      // SQLite prefers ISO string format
      return date.toISOString()
    }
  }

  /**
   * Get database-specific pagination
   */
  getPaginationClause(page: number, limit: number): { skip: number; take: number } {
    const skip = (page - 1) * limit
    return { skip, take: limit }
  }

  /**
   * Get database-specific full-text search
   */
  getSearchClause(field: string, searchTerm: string): any {
    if (this.isPostgreSQL()) {
      // PostgreSQL full-text search
      return {
        [field]: {
          search: searchTerm
        }
      }
    } else {
      // SQLite LIKE-based search
      return {
        [field]: {
          contains: searchTerm,
          mode: 'insensitive' as const
        }
      }
    }
  }

  /**
   * Get database-specific case-insensitive search
   */
  getCaseInsensitiveSearch(field: string, value: string): any {
    if (this.isPostgreSQL()) {
      return {
        [field]: {
          equals: value,
          mode: 'insensitive' as const
        }
      }
    } else {
      return {
        [field]: {
          equals: value,
          mode: 'insensitive' as const
        }
      }
    }
  }

  /**
   * Get database-specific JSON operations
   */
  getJsonContains(field: string, value: any): any {
    if (this.isPostgreSQL()) {
      // PostgreSQL native JSON operators
      return {
        [field]: {
          path: [],
          contains: value
        }
      }
    } else {
      // SQLite JSON operations
      return {
        [field]: {
          path: [],
          equals: value
        }
      }
    }
  }

  /**
   * Execute database vacuum/analyze for optimization
   */
  async optimizeDatabase(): Promise<void> {
    try {
      if (this.isPostgreSQL()) {
        // PostgreSQL optimization
        await this.client.$executeRaw`ANALYZE;`
        console.log('✅ PostgreSQL database analyzed')
        
        // Optional: Update statistics
        await this.client.$executeRaw`UPDATE pg_stats SET last_analyzed = NOW();`
      } else {
        // SQLite optimization
        await this.client.$executeRaw`VACUUM;`
        await this.client.$executeRaw`ANALYZE;`
        console.log('✅ SQLite database vacuumed and analyzed')
      }
    } catch (error) {
      console.error('❌ Database optimization failed:', error)
    }
  }

  /**
   * Get connection status and health
   */
  async getConnectionStatus(): Promise<{
    healthy: boolean
    provider: DatabaseProvider
    version?: string
    connectionCount?: number
  }> {
    try {
      if (this.isPostgreSQL()) {
        // PostgreSQL health check
        const result = await this.client.$queryRaw`
          SELECT version() as version, 
                 count(*) as connection_count 
          FROM pg_stat_activity;
        ` as any[]
        
        return {
          healthy: true,
          provider: 'postgresql',
          version: result[0]?.version,
          connectionCount: result[0]?.connection_count
        }
      } else {
        // SQLite health check
        const result = await this.client.$queryRaw`SELECT sqlite_version() as version;` as any[]
        
        return {
          healthy: true,
          provider: 'sqlite',
          version: result[0]?.version
        }
      }
    } catch (error) {
      return {
        healthy: false,
        provider: this.provider
      }
    }
  }

  /**
   * Get database size information
   */
  async getDatabaseSize(): Promise<{
    size: number
    unit: string
    tables?: Record<string, number>
  }> {
    try {
      if (this.isPostgreSQL()) {
        // PostgreSQL database size
        const result = await this.client.$queryRaw`
          SELECT pg_size_pretty(pg_database_size(current_database())) as size,
                 pg_database_size(current_database()) as size_bytes;
        ` as any[]
        
        return {
          size: result[0]?.size_bytes || 0,
          unit: result[0]?.size || 'Unknown'
        }
      } else {
        // SQLite database size (approximate)
        const result = await this.client.$queryRaw`
          SELECT page_count * page_size as size_bytes 
          FROM pragma_page_count(), pragma_page_size();
        ` as any[]
        
        return {
          size: result[0]?.size_bytes || 0,
          unit: `${Math.round((result[0]?.size_bytes || 0) / 1024 / 1024)} MB`
        }
      }
    } catch (error) {
      console.error('❌ Failed to get database size:', error)
      return { size: 0, unit: 'Unknown' }
    }
  }

  /**
   * Create database backup command
   */
  getBackupCommand(): string {
    if (this.isPostgreSQL()) {
      const dbUrl = new URL(process.env.DATABASE_URL || '')
      return `pg_dump ${dbUrl.href} > backup_$(date +%Y%m%d_%H%M%S).sql`
    } else {
      return `cp ${process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev.db'} backup_$(date +%Y%m%d_%H%M%S).db`
    }
  }

  /**
   * Get performance tuning recommendations
   */
  getPerformanceTuning(): string[] {
    if (this.isPostgreSQL()) {
      return [
        'Consider increasing shared_buffers to 25% of RAM',
        'Set effective_cache_size to 75% of RAM', 
        'Enable pg_stat_statements for query analysis',
        'Consider connection pooling with pgBouncer',
        'Regular VACUUM ANALYZE for table statistics'
      ]
    } else {
      return [
        'Enable WAL mode for better concurrency',
        'Regular VACUUM for database cleanup',
        'Consider page_size optimization for your workload',
        'Use PRAGMA cache_size for memory tuning',
        'Enable foreign_keys pragma for referential integrity'
      ]
    }
  }
}

// Global adapter instance
let globalAdapter: DatabaseAdapter | null = null

export function getDatabaseAdapter(client?: PrismaClient): DatabaseAdapter {
  if (!globalAdapter) {
    if (!client) {
      throw new Error('Database client must be provided for first initialization')
    }
    globalAdapter = new DatabaseAdapter(client)
  }
  return globalAdapter
}

// Utility functions for common operations
export const dbUtils = {
  isPostgreSQL: () => process.env.DATABASE_PROVIDER === 'postgresql',
  isSQLite: () => process.env.DATABASE_PROVIDER !== 'postgresql',
  getProvider: (): DatabaseProvider => process.env.DATABASE_PROVIDER === 'postgresql' ? 'postgresql' : 'sqlite'
}