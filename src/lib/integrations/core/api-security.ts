/**
 * API Security Manager for Integration Platform
 * Handles authentication, rate limiting, monitoring, and security for all API endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimiters, educationRateLimiters } from '@/lib/security/rate-limiting'
import { z } from 'zod'
import { createHash, createHmac, randomBytes } from 'crypto'
import { db } from '@/lib/db'

export interface APIKey {
  id: string
  name: string
  key: string
  secret: string
  integrationId?: string
  userId: string
  scopes: string[]
  isActive: boolean
  expiresAt?: Date
  lastUsedAt?: Date
  requestCount: number
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface APISecurityConfig {
  enableRateLimit: boolean
  enableAPIKeys: boolean
  enableIPWhitelist: boolean
  enableLogging: boolean
  enableMonitoring: boolean
  defaultScopes: string[]
  allowedOrigins: string[]
  maxRequestSize: number
  requireHTTPS: boolean
}

export interface SecurityContext {
  apiKey?: APIKey
  userId?: string
  integrationId?: string
  requestId: string
  clientIP: string
  userAgent: string
  origin?: string
  scopes: string[]
  rateLimit: {
    remaining: number
    resetTime: Date
    total: number
  }
}

export interface APIRequest {
  method: string
  path: string
  headers: Record<string, string>
  body?: any
  query: Record<string, string>
  clientIP: string
  userAgent: string
  timestamp: Date
}

export interface APIResponse {
  status: number
  headers: Record<string, string>
  body?: any
  timestamp: Date
  duration: number
}

export interface APILog {
  id: string
  requestId: string
  apiKeyId?: string
  userId?: string
  integrationId?: string
  method: string
  path: string
  status: number
  duration: number
  requestSize: number
  responseSize: number
  clientIP: string
  userAgent: string
  error?: string
  timestamp: Date
}

export interface SecurityAlert {
  id: string
  type: 'RATE_LIMIT_EXCEEDED' | 'INVALID_API_KEY' | 'SUSPICIOUS_ACTIVITY' | 'SECURITY_VIOLATION'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  details: Record<string, unknown>
  requestId?: string
  apiKeyId?: string
  userId?: string
  clientIP: string
  timestamp: Date
  resolved: boolean
}

const APIKeyCreateSchema = z.object({
  name: z.string().min(1),
  integrationId: z.string().optional(),
  scopes: z.array(z.string()).min(1),
  expiresAt: z.date().optional(),
  metadata: z.record(z.unknown()).optional()
})

const defaultConfig: APISecurityConfig = {
  enableRateLimit: true,
  enableAPIKeys: true,
  enableIPWhitelist: false,
  enableLogging: true,
  enableMonitoring: true,
  defaultScopes: ['read'],
  allowedOrigins: ['*'],
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  requireHTTPS: true
}

export class APISecurityManager {
  private config: APISecurityConfig
  private apiKeys: Map<string, APIKey> = new Map()
  private whitelistedIPs: Set<string> = new Set()
  private suspiciousIPs: Map<string, number> = new Map()

  constructor(config: Partial<APISecurityConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
    this.loadAPIKeys()
    this.loadWhitelistedIPs()
  }

  /**
   * Main security middleware function
   */
  async validateRequest(request: NextRequest): Promise<{ 
    allowed: boolean
    context?: SecurityContext
    error?: string
    response?: NextResponse 
  }> {
    try {
      const requestId = this.generateRequestId()
      const clientIP = this.getClientIP(request)
      const userAgent = request.headers.get('user-agent') || ''
      const origin = request.headers.get('origin')

      // Check HTTPS requirement
      if (this.config.requireHTTPS && !request.url.startsWith('https://') && process.env.NODE_ENV === 'production') {
        await this.logSecurityAlert({
          type: 'SECURITY_VIOLATION',
          severity: 'MEDIUM',
          message: 'HTTP request rejected - HTTPS required',
          details: { url: request.url },
          clientIP,
          requestId
        })
        return {
          allowed: false,
          error: 'HTTPS required',
          response: NextResponse.json({ error: 'HTTPS required' }, { status: 426 })
        }
      }

      // Check request size
      const contentLength = parseInt(request.headers.get('content-length') || '0')
      if (contentLength > this.config.maxRequestSize) {
        return {
          allowed: false,
          error: 'Request too large',
          response: NextResponse.json({ error: 'Request too large' }, { status: 413 })
        }
      }

      // Check IP whitelist (if enabled)
      if (this.config.enableIPWhitelist && !this.isIPWhitelisted(clientIP)) {
        await this.logSecurityAlert({
          type: 'SECURITY_VIOLATION',
          severity: 'HIGH',
          message: 'IP not whitelisted',
          details: { clientIP },
          clientIP,
          requestId
        })
        return {
          allowed: false,
          error: 'IP not allowed',
          response: NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
      }

      // Check for suspicious activity
      if (this.isSuspiciousIP(clientIP)) {
        await this.logSecurityAlert({
          type: 'SUSPICIOUS_ACTIVITY',
          severity: 'HIGH',
          message: 'Request from suspicious IP',
          details: { clientIP },
          clientIP,
          requestId
        })
        return {
          allowed: false,
          error: 'Suspicious activity detected',
          response: NextResponse.json({ error: 'Access temporarily blocked' }, { status: 429 })
        }
      }

      // Validate API key (if required)
      let apiKey: APIKey | undefined
      let scopes: string[] = this.config.defaultScopes

      if (this.config.enableAPIKeys) {
        const authHeader = request.headers.get('authorization')
        const apiKeyHeader = request.headers.get('x-api-key')
        
        if (authHeader?.startsWith('Bearer ') || apiKeyHeader) {
          const keyValue = authHeader?.substring(7) || apiKeyHeader!
          const keyValidation = await this.validateAPIKey(keyValue, request)
          
          if (!keyValidation.valid) {
            await this.logSecurityAlert({
              type: 'INVALID_API_KEY',
              severity: 'MEDIUM',
              message: 'Invalid API key used',
              details: { keyValue: keyValue.substring(0, 8) + '...' },
              clientIP,
              requestId
            })
            return {
              allowed: false,
              error: keyValidation.error,
              response: NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
            }
          }
          
          apiKey = keyValidation.apiKey
          scopes = apiKey!.scopes
        } else {
          // API key required but not provided
          return {
            allowed: false,
            error: 'API key required',
            response: NextResponse.json({ error: 'API key required' }, { status: 401 })
          }
        }
      }

      // Check rate limits
      let rateLimitResult
      if (this.config.enableRateLimit) {
        const identifier = apiKey?.id || clientIP
        const userRole = apiKey?.metadata?.role as string || 'default'
        
        rateLimitResult = await educationRateLimiters.checkLimit(identifier, userRole)
        
        if (!rateLimitResult.allowed) {
          await this.logSecurityAlert({
            type: 'RATE_LIMIT_EXCEEDED',
            severity: 'MEDIUM',
            message: 'Rate limit exceeded',
            details: { 
              identifier,
              remainingRequests: rateLimitResult.remainingRequests,
              resetTime: rateLimitResult.resetTime
            },
            apiKeyId: apiKey?.id,
            clientIP,
            requestId
          })
          
          const response = NextResponse.json(
            { 
              error: 'Rate limit exceeded',
              retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
            }, 
            { status: 429 }
          )
          
          response.headers.set('X-RateLimit-Limit', rateLimitResult.totalRequests.toString())
          response.headers.set('X-RateLimit-Remaining', rateLimitResult.remainingRequests.toString())
          response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString())
          
          return {
            allowed: false,
            error: 'Rate limit exceeded',
            response
          }
        }
      }

      // Update API key usage
      if (apiKey) {
        await this.updateAPIKeyUsage(apiKey.id)
      }

      // Create security context
      const context: SecurityContext = {
        apiKey,
        userId: apiKey?.userId,
        integrationId: apiKey?.integrationId,
        requestId,
        clientIP,
        userAgent,
        origin: origin || undefined,
        scopes,
        rateLimit: {
          remaining: rateLimitResult?.remainingRequests || 1000,
          resetTime: new Date(rateLimitResult?.resetTime || Date.now() + 60000),
          total: rateLimitResult?.totalRequests || 1000
        }
      }

      return {
        allowed: true,
        context
      }
    } catch (error) {
      console.error('Security validation error:', error)
      return {
        allowed: false,
        error: 'Security validation failed',
        response: NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }
    }
  }

  /**
   * Create a new API key
   */
  async createAPIKey(userId: string, data: z.infer<typeof APIKeyCreateSchema>): Promise<APIKey> {
    const validatedData = APIKeyCreateSchema.parse(data)
    
    const apiKey: APIKey = {
      id: this.generateAPIKeyId(),
      name: validatedData.name,
      key: this.generateAPIKey(),
      secret: this.generateAPISecret(),
      integrationId: validatedData.integrationId,
      userId,
      scopes: validatedData.scopes,
      isActive: true,
      expiresAt: validatedData.expiresAt,
      requestCount: 0,
      metadata: validatedData.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.apiKeys.set(apiKey.id, apiKey)
    await this.saveAPIKey(apiKey)

    return apiKey
  }

  /**
   * Revoke an API key
   */
  async revokeAPIKey(apiKeyId: string): Promise<void> {
    const apiKey = this.apiKeys.get(apiKeyId)
    if (apiKey) {
      apiKey.isActive = false
      apiKey.updatedAt = new Date()
      await this.saveAPIKey(apiKey)
    }
  }

  /**
   * Get API keys for a user
   */
  getUserAPIKeys(userId: string): APIKey[] {
    return Array.from(this.apiKeys.values()).filter(key => key.userId === userId)
  }

  /**
   * Log API request for monitoring
   */
  async logAPIRequest(context: SecurityContext, request: APIRequest, response: APIResponse): Promise<void> {
    if (!this.config.enableLogging) return

    const apiLog: APILog = {
      id: this.generateLogId(),
      requestId: context.requestId,
      apiKeyId: context.apiKey?.id,
      userId: context.userId,
      integrationId: context.integrationId,
      method: request.method,
      path: request.path,
      status: response.status,
      duration: response.duration,
      requestSize: JSON.stringify(request.body || {}).length,
      responseSize: JSON.stringify(response.body || {}).length,
      clientIP: context.clientIP,
      userAgent: context.userAgent,
      timestamp: request.timestamp
    }

    await this.saveAPILog(apiLog)
  }

  /**
   * Add IP to whitelist
   */
  addToWhitelist(ip: string): void {
    this.whitelistedIPs.add(ip)
    this.saveWhitelistedIPs()
  }

  /**
   * Remove IP from whitelist
   */
  removeFromWhitelist(ip: string): void {
    this.whitelistedIPs.delete(ip)
    this.saveWhitelistedIPs()
  }

  /**
   * Check if scope is allowed for operation
   */
  checkScope(context: SecurityContext, requiredScope: string): boolean {
    return context.scopes.includes(requiredScope) || context.scopes.includes('admin')
  }

  /**
   * Get security statistics
   */
  async getSecurityStats(): Promise<{
    totalAPIKeys: number
    activeAPIKeys: number
    totalRequests24h: number
    blockedRequests24h: number
    topIPs: { ip: string; requests: number }[]
    recentAlerts: SecurityAlert[]
  }> {
    // In a real implementation, this would query the database
    const activeAPIKeys = Array.from(this.apiKeys.values()).filter(key => key.isActive)
    
    return {
      totalAPIKeys: this.apiKeys.size,
      activeAPIKeys: activeAPIKeys.length,
      totalRequests24h: 0, // Would be calculated from logs
      blockedRequests24h: 0, // Would be calculated from logs
      topIPs: [], // Would be calculated from logs
      recentAlerts: [] // Would be fetched from database
    }
  }

  // Private methods
  private async validateAPIKey(keyValue: string, request: NextRequest): Promise<{
    valid: boolean
    apiKey?: APIKey
    error?: string
  }> {
    try {
      // Find API key by key value
      const apiKey = Array.from(this.apiKeys.values()).find(key => key.key === keyValue)
      
      if (!apiKey) {
        return { valid: false, error: 'API key not found' }
      }

      if (!apiKey.isActive) {
        return { valid: false, error: 'API key inactive' }
      }

      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return { valid: false, error: 'API key expired' }
      }

      // Validate request signature if secret is provided
      const signature = request.headers.get('x-signature')
      if (signature && !this.validateSignature(request, apiKey.secret, signature)) {
        return { valid: false, error: 'Invalid signature' }
      }

      return { valid: true, apiKey }
    } catch (error) {
      return { valid: false, error: 'Validation error' }
    }
  }

  private validateSignature(request: NextRequest, secret: string, signature: string): boolean {
    try {
      const timestamp = request.headers.get('x-timestamp')
      const method = request.method
      const path = new URL(request.url).pathname
      
      const payload = `${timestamp}.${method}.${path}`
      const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex')
      
      return signature === `sha256=${expectedSignature}`
    } catch {
      return false
    }
  }

  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const real = request.headers.get('x-real-ip')
    const remoteAddr = request.headers.get('remote-addr')
    
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    
    return real || remoteAddr || 'unknown'
  }

  private isIPWhitelisted(ip: string): boolean {
    return this.whitelistedIPs.has(ip)
  }

  private isSuspiciousIP(ip: string): boolean {
    const suspicionLevel = this.suspiciousIPs.get(ip) || 0
    return suspicionLevel > 10 // Threshold for suspicious activity
  }

  private async updateAPIKeyUsage(apiKeyId: string): Promise<void> {
    const apiKey = this.apiKeys.get(apiKeyId)
    if (apiKey) {
      apiKey.requestCount++
      apiKey.lastUsedAt = new Date()
      apiKey.updatedAt = new Date()
      await this.saveAPIKey(apiKey)
    }
  }

  private async logSecurityAlert(alert: Omit<SecurityAlert, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    const securityAlert: SecurityAlert = {
      ...alert,
      id: this.generateAlertId(),
      timestamp: new Date(),
      resolved: false
    }

    // In a real implementation, this would save to database and trigger notifications
    console.warn('Security Alert:', securityAlert)
  }

  private generateRequestId(): string {
    return `req_${randomBytes(16).toString('hex')}`
  }

  private generateAPIKeyId(): string {
    return `key_${randomBytes(16).toString('hex')}`
  }

  private generateAPIKey(): string {
    return `cms_${randomBytes(32).toString('hex')}`
  }

  private generateAPISecret(): string {
    return randomBytes(64).toString('hex')
  }

  private generateLogId(): string {
    return `log_${randomBytes(16).toString('hex')}`
  }

  private generateAlertId(): string {
    return `alert_${randomBytes(16).toString('hex')}`
  }

  private async loadAPIKeys(): Promise<void> {
    // In a real implementation, this would load from database
    console.log('Loading API keys from database...')
  }

  private async saveAPIKey(apiKey: APIKey): Promise<void> {
    // In a real implementation, this would save to database
    console.log('Saving API key:', apiKey.id)
  }

  private async loadWhitelistedIPs(): Promise<void> {
    // In a real implementation, this would load from database
    console.log('Loading whitelisted IPs from database...')
  }

  private async saveWhitelistedIPs(): Promise<void> {
    // In a real implementation, this would save to database
    console.log('Saving whitelisted IPs to database...')
  }

  private async saveAPILog(log: APILog): Promise<void> {
    // In a real implementation, this would save to database
    console.log('Saving API log:', log.id)
  }
}

// Singleton instance
export const apiSecurityManager = new APISecurityManager()

// Middleware function for Next.js
export function createSecurityMiddleware() {
  return async function securityMiddleware(request: NextRequest) {
    const validation = await apiSecurityManager.validateRequest(request)
    
    if (!validation.allowed) {
      return validation.response || NextResponse.json(
        { error: validation.error || 'Access denied' },
        { status: 403 }
      )
    }

    // Add security context to request headers for downstream handlers
    const response = NextResponse.next()
    
    if (validation.context) {
      response.headers.set('x-request-id', validation.context.requestId)
      response.headers.set('x-rate-limit-remaining', validation.context.rateLimit.remaining.toString())
      response.headers.set('x-rate-limit-reset', validation.context.rateLimit.resetTime.toISOString())
      
      if (validation.context.apiKey) {
        response.headers.set('x-api-key-id', validation.context.apiKey.id)
      }
    }

    return response
  }
}

// Utility functions for API endpoints
export const SecurityUtils = {
  requireScope: (context: SecurityContext, scope: string) => {
    if (!apiSecurityManager.checkScope(context, scope)) {
      throw new Error(`Insufficient permissions. Required scope: ${scope}`)
    }
  },

  extractSecurityContext: (request: NextRequest): SecurityContext | null => {
    const requestId = request.headers.get('x-request-id')
    const apiKeyId = request.headers.get('x-api-key-id')
    
    if (!requestId) return null

    // In a real implementation, you'd reconstruct the full context
    return {
      requestId,
      clientIP: request.headers.get('x-client-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
      scopes: [],
      rateLimit: {
        remaining: parseInt(request.headers.get('x-rate-limit-remaining') || '0'),
        resetTime: new Date(request.headers.get('x-rate-limit-reset') || Date.now()),
        total: 1000
      }
    }
  }
}