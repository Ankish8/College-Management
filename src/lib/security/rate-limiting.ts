// Advanced Rate Limiting System
import { LRUCache } from 'lru-cache'
import { db } from '@/lib/db'

export interface RateLimitConfig {
  windowMs: number       // Time window in milliseconds
  maxRequests: number    // Maximum requests in window
  keyGenerator?: (identifier: string) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  onLimitReached?: (key: string) => Promise<void>
}

export interface RateLimitResult {
  allowed: boolean
  remainingRequests: number
  resetTime: number
  totalRequests: number
}

/**
 * In-memory rate limiter using LRU cache
 */
export class RateLimiter {
  private cache: LRUCache<string, RequestWindow>

  constructor(private config: RateLimitConfig) {
    this.cache = new LRUCache({
      max: 10000, // Maximum number of keys to track
      ttl: config.windowMs
    })
  }

  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const key = this.config.keyGenerator ? this.config.keyGenerator(identifier) : identifier
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    let window = this.cache.get(key)
    
    if (!window) {
      window = {
        requests: [],
        windowStart: now
      }
    }

    // Remove old requests outside the window
    window.requests = window.requests.filter(timestamp => timestamp > windowStart)

    const allowed = window.requests.length < this.config.maxRequests
    
    if (allowed) {
      window.requests.push(now)
      this.cache.set(key, window)
    } else {
      // Rate limit exceeded
      if (this.config.onLimitReached) {
        await this.config.onLimitReached(key)
      }
    }

    return {
      allowed,
      remainingRequests: Math.max(0, this.config.maxRequests - window.requests.length),
      resetTime: Math.min(...window.requests) + this.config.windowMs,
      totalRequests: window.requests.length
    }
  }

  isAllowed(identifier: string): boolean {
    // Synchronous version for simpler use cases
    const key = this.config.keyGenerator ? this.config.keyGenerator(identifier) : identifier
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    let window = this.cache.get(key) || { requests: [], windowStart: now }
    window.requests = window.requests.filter(timestamp => timestamp > windowStart)

    if (window.requests.length >= this.config.maxRequests) {
      return false
    }

    window.requests.push(now)
    this.cache.set(key, window)
    return true
  }

  getRemainingRequests(identifier: string): number {
    const key = this.config.keyGenerator ? this.config.keyGenerator(identifier) : identifier
    const window = this.cache.get(key)
    
    if (!window) return this.config.maxRequests

    const now = Date.now()
    const windowStart = now - this.config.windowMs
    const validRequests = window.requests.filter(timestamp => timestamp > windowStart)
    
    return Math.max(0, this.config.maxRequests - validRequests.length)
  }

  reset(identifier: string): void {
    const key = this.config.keyGenerator ? this.config.keyGenerator(identifier) : identifier
    this.cache.delete(key)
  }
}

/**
 * Database-backed rate limiter for distributed systems
 */
export class DistributedRateLimiter {
  constructor(private config: RateLimitConfig) {}

  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const key = this.config.keyGenerator ? this.config.keyGenerator(identifier) : identifier
    const now = new Date()
    const windowStart = new Date(now.getTime() - this.config.windowMs)

    // Clean up old entries
    await db.rateLimitEntry.deleteMany({
      where: {
        windowStart: { lt: windowStart }
      }
    })

    // Get or create current window entry
    let entry = await db.rateLimitEntry.findUnique({
      where: {
        key_endpoint: {
          key,
          endpoint: 'default'
        }
      }
    })

    if (!entry || entry.windowStart < windowStart) {
      // Create new window
      entry = await db.rateLimitEntry.upsert({
        where: {
          key_endpoint: {
            key,
            endpoint: 'default'
          }
        },
        create: {
          key,
          endpoint: 'default',
          requests: 1,
          windowStart: now
        },
        update: {
          requests: 1,
          windowStart: now
        }
      })
    } else {
      // Increment existing window
      entry = await db.rateLimitEntry.update({
        where: { id: entry.id },
        data: { requests: { increment: 1 } }
      })
    }

    const allowed = entry.requests <= this.config.maxRequests

    if (!allowed && this.config.onLimitReached) {
      await this.config.onLimitReached(key)
    }

    return {
      allowed,
      remainingRequests: Math.max(0, this.config.maxRequests - entry.requests),
      resetTime: entry.windowStart.getTime() + this.config.windowMs,
      totalRequests: entry.requests
    }
  }
}

/**
 * Multi-tier rate limiting system
 */
export class TieredRateLimiter {
  private limiters: Map<string, RateLimiter> = new Map()

  constructor(private tiers: Record<string, RateLimitConfig>) {
    for (const [name, config] of Object.entries(tiers)) {
      this.limiters.set(name, new RateLimiter(config))
    }
  }

  async checkAllTiers(identifier: string): Promise<{ tier: string; result: RateLimitResult }[]> {
    const results: { tier: string; result: RateLimitResult }[] = []

    for (const [tier, limiter] of this.limiters) {
      const result = await limiter.checkLimit(identifier)
      results.push({ tier, result })
      
      // If any tier blocks the request, stop checking
      if (!result.allowed) {
        break
      }
    }

    return results
  }

  isAllowedByAllTiers(identifier: string): boolean {
    for (const [, limiter] of this.limiters) {
      if (!limiter.isAllowed(identifier)) {
        return false
      }
    }
    return true
  }
}

/**
 * Predefined rate limiters for different scenarios
 */
export const rateLimiters = {
  // Authentication endpoints - very strict
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    onLimitReached: async (key) => {
      console.warn(`Authentication rate limit exceeded for ${key}`)
      // Could trigger account lockout here
    }
  }),

  // Login attempts - extremely strict
  login: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 3,
    onLimitReached: async (key) => {
      console.warn(`Login rate limit exceeded for ${key}`)
      // Log security event
      await logFailedLoginAttempt(key)
    }
  }),

  // General API endpoints
  api: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100
  }),

  // Sensitive data access
  sensitiveData: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    onLimitReached: async (key) => {
      console.warn(`Sensitive data access rate limit exceeded for ${key}`)
      // Could trigger security alert
    }
  }),

  // File uploads
  upload: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5
  }),

  // Password reset requests
  passwordReset: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3
  }),

  // Email sending
  email: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10
  }),

  // Student data export (GDPR requests)
  dataExport: new RateLimiter({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 2
  })
}

/**
 * Role-based rate limiting
 */
export class RoleBasedRateLimiter {
  private roleLimits: Record<string, RateLimitConfig>
  private limiters: Map<string, RateLimiter> = new Map()

  constructor(roleLimits: Record<string, RateLimitConfig>) {
    this.roleLimits = roleLimits
    
    for (const [role, config] of Object.entries(roleLimits)) {
      this.limiters.set(role, new RateLimiter(config))
    }
  }

  async checkLimit(identifier: string, role: string): Promise<RateLimitResult> {
    const limiter = this.limiters.get(role) || this.limiters.get('default')
    
    if (!limiter) {
      throw new Error(`No rate limiter configured for role: ${role}`)
    }

    return await limiter.checkLimit(identifier)
  }
}

/**
 * Educational system specific rate limiters
 */
export const educationRateLimiters = new RoleBasedRateLimiter({
  ADMIN: {
    windowMs: 60 * 1000,
    maxRequests: 1000 // Higher limits for admins
  },
  FACULTY: {
    windowMs: 60 * 1000,
    maxRequests: 200 // Moderate limits for faculty
  },
  STUDENT: {
    windowMs: 60 * 1000,
    maxRequests: 50 // Conservative limits for students
  },
  default: {
    windowMs: 60 * 1000,
    maxRequests: 10 // Very restrictive for unknown roles
  }
})

/**
 * Adaptive rate limiting based on user behavior
 */
export class AdaptiveRateLimiter {
  private baseLimiter: RateLimiter
  private trustScores: Map<string, number> = new Map()

  constructor(baseConfig: RateLimitConfig) {
    this.baseLimiter = new RateLimiter(baseConfig)
  }

  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const trustScore = this.getTrustScore(identifier)
    
    // Adjust limits based on trust score
    const adjustedMaxRequests = Math.floor(
      this.baseLimiter['config'].maxRequests * (0.5 + trustScore * 0.5)
    )

    const tempLimiter = new RateLimiter({
      ...this.baseLimiter['config'],
      maxRequests: adjustedMaxRequests
    })

    return await tempLimiter.checkLimit(identifier)
  }

  private getTrustScore(identifier: string): number {
    // Return trust score between 0 and 1
    // Higher score = more trusted = higher limits
    return this.trustScores.get(identifier) || 0.5
  }

  updateTrustScore(identifier: string, score: number): void {
    this.trustScores.set(identifier, Math.max(0, Math.min(1, score)))
  }
}

// Helper interfaces
interface RequestWindow {
  requests: number[]
  windowStart: number
}

// Helper functions
async function logFailedLoginAttempt(identifier: string): Promise<void> {
  try {
    await db.loginAttempt.create({
      data: {
        email: identifier,
        ipAddress: 'unknown', // This would be filled by the calling code
        userAgent: 'unknown',
        success: false,
        failureReason: 'Rate limit exceeded'
      }
    })
  } catch (error) {
    console.error('Failed to log login attempt:', error)
  }
}

/**
 * Express middleware for rate limiting
 */
export function createRateLimitMiddleware(limiter: RateLimiter, keyGenerator?: (req: any) => string) {
  return async function(req: any, res: any, next: any) {
    const key = keyGenerator ? keyGenerator(req) : req.ip || 'unknown'
    const result = await limiter.checkLimit(key)

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': limiter['config'].maxRequests.toString(),
      'X-RateLimit-Remaining': result.remainingRequests.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
    })

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      })
    }

    next()
  }
}