// Security Middleware for Next.js API Routes and App Router
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { RateLimiter } from './rate-limiting'
import { AuditLogger, AuditEventType } from './audit'
import { getClientIP } from '@/lib/utils/network'

export interface SecurityConfig {
  rateLimit?: {
    requests: number
    windowMs: number
  }
  requireAuth?: boolean
  requireRoles?: string[]
  auditEvent?: AuditEventType
  resource?: string
}

/**
 * Comprehensive security middleware factory
 */
export function withSecurity(config: SecurityConfig = {}) {
  return function middleware(handler: Function) {
    return async function securedHandler(req: NextRequest, ...args: any[]) {
      const startTime = Date.now()
      let session: any = null
      let success = true
      let error: any = null

      try {
        // 1. Rate Limiting
        if (config.rateLimit) {
          const rateLimiter = new RateLimiter({
            windowMs: config.rateLimit.windowMs,
            maxRequests: config.rateLimit.requests
          })

          const clientIP = getClientIP(req)
          if (!rateLimiter.isAllowed(clientIP)) {
            await logSecurityEvent(req, 'RATE_LIMIT_EXCEEDED', null, config.resource)
            return NextResponse.json(
              { error: 'Rate limit exceeded. Please try again later.' },
              { 
                status: 429,
                headers: {
                  'X-RateLimit-Remaining': rateLimiter.getRemainingRequests(clientIP).toString(),
                  'Retry-After': Math.ceil(config.rateLimit.windowMs / 1000).toString()
                }
              }
            )
          }
        }

        // 2. Authentication Check
        if (config.requireAuth) {
          session = await getServerSession(authOptions)
          if (!session?.user) {
            await logSecurityEvent(req, 'UNAUTHORIZED_ACCESS_ATTEMPT', null, config.resource)
            return NextResponse.json(
              { error: 'Authentication required' },
              { status: 401 }
            )
          }
        }

        // 3. Role-based Authorization
        if (config.requireRoles && session?.user) {
          const userRole = session.user.role
          if (!config.requireRoles.includes(userRole)) {
            await logSecurityEvent(req, 'INSUFFICIENT_PRIVILEGES', session.user, config.resource)
            return NextResponse.json(
              { error: 'Insufficient privileges' },
              { status: 403 }
            )
          }
        }

        // 4. Security Headers
        const response = await handler(req, ...args)
        addSecurityHeaders(response)

        // 5. Audit Logging (success)
        if (config.auditEvent) {
          await logSecurityEvent(req, config.auditEvent, session?.user, config.resource, {
            success: true,
            duration: Date.now() - startTime
          })
        }

        return response

      } catch (err) {
        success = false
        error = err

        // 6. Audit Logging (failure)
        if (config.auditEvent) {
          await logSecurityEvent(req, config.auditEvent, session?.user, config.resource, {
            success: false,
            error: error?.message,
            duration: Date.now() - startTime
          })
        }

        // Re-throw to let normal error handling take over
        throw err
      }
    }
  }
}

/**
 * Enhanced Next.js middleware with security features
 */
export function securityMiddleware(request: NextRequest): NextResponse | null {
  const response = NextResponse.next()

  // Add security headers to all responses
  addSecurityHeaders(response)

  // HTTPS enforcement in production
  if (process.env.NODE_ENV === 'production') {
    const proto = request.headers.get('x-forwarded-proto')
    if (proto && proto !== 'https') {
      const httpsUrl = request.url.replace(/^http:/, 'https:')
      return NextResponse.redirect(httpsUrl, 301)
    }
  }

  // Block requests from suspicious user agents
  const userAgent = request.headers.get('user-agent') || ''
  if (isSuspiciousUserAgent(userAgent)) {
    return NextResponse.json(
      { error: 'Request blocked' },
      { status: 403 }
    )
  }

  // Content type validation for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
      const contentType = request.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        return NextResponse.json(
          { error: 'Invalid content type. Expected application/json' },
          { status: 400 }
        )
      }
    }
  }

  return response
}

/**
 * Add comprehensive security headers
 */
function addSecurityHeaders(response: NextResponse): void {
  const headers = {
    // HTTPS enforcement
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    
    // XSS protection
    'X-XSS-Protection': '1; mode=block',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    
    // Content Security Policy - Educational system specific
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ].join('; '),
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions policy - Restrict dangerous features
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'accelerometer=()',
      'gyroscope=()',
      'bluetooth=()',
      'midi=()'
    ].join(', '),

    // Additional security headers
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none'
  }

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
}

/**
 * Detect suspicious user agents
 */
function isSuspiciousUserAgent(userAgent: string): boolean {
  const suspiciousPatterns = [
    /curl/i,
    /wget/i,
    /python/i,
    /scanner/i,
    /bot/i,
    /crawl/i,
    /spider/i,
    /scraper/i,
    /hack/i,
    /injection/i,
    /sql/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /zap/i,
    /burp/i
  ]

  // Allow legitimate bots
  const legitBots = [
    /googlebot/i,
    /bingbot/i,
    /slurp/i,
    /duckduckbot/i
  ]

  // Check if it's a legitimate bot first
  if (legitBots.some(pattern => pattern.test(userAgent))) {
    return false
  }

  // Check for suspicious patterns
  return suspiciousPatterns.some(pattern => pattern.test(userAgent))
}

/**
 * Log security events
 */
async function logSecurityEvent(
  req: NextRequest,
  eventType: string,
  user: any,
  resource?: string,
  details?: any
): Promise<void> {
  try {
    await AuditLogger.logEvent({
      eventType: eventType as AuditEventType,
      userId: user?.id || 'ANONYMOUS',
      userRole: user?.role || 'UNKNOWN',
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('user-agent') || 'unknown',
      resource: resource || req.nextUrl.pathname,
      action: req.method,
      details: {
        url: req.url,
        method: req.method,
        ...details
      },
      riskLevel: getRiskLevel(eventType),
      success: details?.success ?? true
    })
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

/**
 * Determine risk level based on event type
 */
function getRiskLevel(eventType: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const riskMap: Record<string, 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = {
    'LOGIN': 'LOW',
    'LOGOUT': 'LOW',
    'LOGIN_FAILED': 'MEDIUM',
    'UNAUTHORIZED_ACCESS_ATTEMPT': 'HIGH',
    'INSUFFICIENT_PRIVILEGES': 'MEDIUM',
    'RATE_LIMIT_EXCEEDED': 'MEDIUM',
    'DATA_ACCESS': 'LOW',
    'DATA_MODIFICATION': 'MEDIUM',
    'PRIVILEGE_ESCALATION': 'CRITICAL',
    'SYSTEM_CONFIG_CHANGE': 'HIGH',
    'PASSWORD_CHANGE': 'MEDIUM',
    'MFA_SETUP': 'MEDIUM'
  }

  return riskMap[eventType] || 'LOW'
}

/**
 * Input validation middleware
 */
export function withInputValidation(schema: any) {
  return function(handler: Function) {
    return async function(req: NextRequest, ...args: any[]) {
      try {
        const body = await req.json()
        
        // Validate against schema
        const validatedData = schema.parse(body)
        
        // Add validated data to request context
        (req as any).validatedData = validatedData
        
        return await handler(req, ...args)
      } catch (error) {
        if (error.name === 'ZodError') {
          return NextResponse.json(
            { 
              error: 'Validation failed',
              details: error.issues?.map((issue: any) => ({
                field: issue.path.join('.'),
                message: issue.message
              }))
            },
            { status: 400 }
          )
        }
        
        return NextResponse.json(
          { error: 'Invalid request data' },
          { status: 400 }
        )
      }
    }
  }
}

/**
 * CORS security middleware
 */
export function withCORS(allowedOrigins: string[] = []) {
  return function(handler: Function) {
    return async function(req: NextRequest, ...args: any[]) {
      const origin = req.headers.get('origin')
      const response = await handler(req, ...args)

      // Set CORS headers
      if (origin && allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin)
      } else if (allowedOrigins.length === 0) {
        // Default to same origin only
        response.headers.set('Access-Control-Allow-Origin', new URL(req.url).origin)
      }

      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      response.headers.set('Access-Control-Max-Age', '86400')

      return response
    }
  }
}

/**
 * Compose multiple middleware functions
 */
export function compose(...middlewares: Function[]) {
  return function(handler: Function) {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler)
  }
}