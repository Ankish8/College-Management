# College Management System - Comprehensive Security Strategy

## Executive Summary

This document outlines a comprehensive security strategy for the College Management System at Jagran Lakecity University (JLU). Based on our security assessment, we have identified critical vulnerabilities and designed enterprise-grade security enhancements to protect sensitive educational data while ensuring compliance with FERPA, GDPR, and other regulatory requirements.

## Current Security Assessment

### Critical Vulnerabilities Identified

1. **Authentication Weaknesses**
   - Hardcoded passwords in authentication logic
   - No password hashing implementation
   - Lack of password complexity requirements
   - No multi-factor authentication
   - Session management vulnerabilities

2. **Data Protection Gaps**
   - Plaintext storage of sensitive data
   - No field-level encryption
   - Missing data classification framework
   - Insufficient access controls

3. **API Security Issues**
   - Basic authorization checks
   - No rate limiting
   - Limited input validation
   - Missing API security headers
   - No request/response encryption

4. **Audit and Compliance**
   - No security event logging
   - Missing audit trails
   - No compliance framework
   - Lack of data retention policies

## Threat Model for Educational Data

### Assets Classification

| Classification | Examples | Protection Level |
|---------------|----------|------------------|
| **Highly Sensitive** | Student SSN, Financial Aid, Medical Records | Full encryption, strict access, audit logs |
| **Sensitive** | Student Grades, Attendance Records, Personal Info | Encryption at rest, role-based access |
| **Internal** | Course Schedules, Faculty Info, Department Data | Access controls, basic encryption |
| **Public** | Course Catalogs, University Info, General Announcements | Standard security controls |

### Threat Vectors

1. **External Threats**
   - SQL injection attacks
   - Cross-site scripting (XSS)
   - Data breaches through API vulnerabilities
   - Credential stuffing attacks
   - Ransomware targeting educational institutions

2. **Internal Threats**
   - Unauthorized access by faculty/staff
   - Data exfiltration by malicious insiders
   - Accidental data exposure
   - Privilege escalation

3. **Compliance Threats**
   - FERPA violations
   - GDPR non-compliance
   - Data retention policy violations
   - Inadequate consent management

## Enhanced Security Implementation

### 1. Authentication & Authorization Framework

#### Multi-Factor Authentication (MFA)
```typescript
// src/lib/auth/mfa.ts
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

export interface MFAProvider {
  generateSecret(): string
  generateQRCode(secret: string, email: string): Promise<string>
  verifyToken(secret: string, token: string): boolean
}

export class TOTPProvider implements MFAProvider {
  generateSecret(): string {
    return authenticator.generateSecret()
  }

  async generateQRCode(secret: string, email: string): Promise<string> {
    const otpauth = authenticator.keyuri(email, 'JLU Attendance System', secret)
    return await QRCode.toDataURL(otpauth)
  }

  verifyToken(secret: string, token: string): boolean {
    return authenticator.verify({ token, secret })
  }
}

// Enhanced MFA verification middleware
export async function verifyMFA(userId: string, token: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { mfaSettings: true }
  })

  if (!user?.mfaSettings?.secret) {
    throw new Error('MFA not configured')
  }

  const provider = new TOTPProvider()
  return provider.verifyToken(user.mfaSettings.secret, token)
}
```

#### Enhanced Password Security
```typescript
// src/lib/auth/password.ts
import bcrypt from 'bcryptjs'
import zxcvbn from 'zxcvbn'

export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  minStrengthScore: number
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  minStrengthScore: 3
}

export class PasswordManager {
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 14
    return await bcrypt.hash(password, saltRounds)
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash)
  }

  static validatePassword(password: string, policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY): {
    isValid: boolean
    errors: string[]
    strengthScore: number
  } {
    const errors: string[] = []
    const result = zxcvbn(password)

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`)
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    if (result.score < policy.minStrengthScore) {
      errors.push('Password is too weak. Please choose a stronger password.')
    }

    return {
      isValid: errors.length === 0,
      errors,
      strengthScore: result.score
    }
  }
}
```

#### SSO Integration Framework
```typescript
// src/lib/auth/sso.ts
import { OAuthConfig } from 'next-auth/providers'

export interface SSOProvider {
  id: string
  name: string
  type: 'oidc' | 'oauth'
  clientId: string
  clientSecret: string
  issuer?: string
  wellKnown?: string
  authorization?: string
  token?: string
  userinfo?: string
}

export const configureSSO = (providers: SSOProvider[]): OAuthConfig<any>[] => {
  return providers.map(provider => ({
    id: provider.id,
    name: provider.name,
    type: provider.type,
    clientId: provider.clientId,
    clientSecret: provider.clientSecret,
    issuer: provider.issuer,
    wellKnown: provider.wellKnown,
    authorization: provider.authorization,
    token: provider.token,
    userinfo: provider.userinfo,
    profile(profile) {
      return {
        id: profile.sub || profile.id,
        name: profile.name,
        email: profile.email,
        image: profile.picture
      }
    }
  }))
}

// University SSO configuration
export const JLU_SSO_CONFIG: SSOProvider = {
  id: 'jlu-sso',
  name: 'JLU Single Sign-On',
  type: 'oidc',
  clientId: process.env.JLU_SSO_CLIENT_ID!,
  clientSecret: process.env.JLU_SSO_CLIENT_SECRET!,
  issuer: process.env.JLU_SSO_ISSUER_URL!
}
```

### 2. Data Protection & Encryption

#### Field-Level Encryption
```typescript
// src/lib/security/encryption.ts
import crypto from 'crypto'

export class FieldEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm'
  private static readonly KEY_LENGTH = 32
  private static readonly IV_LENGTH = 16
  private static readonly TAG_LENGTH = 16

  private static getKey(): Buffer {
    const key = process.env.FIELD_ENCRYPTION_KEY
    if (!key) throw new Error('FIELD_ENCRYPTION_KEY not configured')
    return Buffer.from(key, 'hex')
  }

  static encrypt(plaintext: string): string {
    const key = this.getKey()
    const iv = crypto.randomBytes(this.IV_LENGTH)
    const cipher = crypto.createCipher(this.ALGORITHM, key)
    cipher.setAAD(Buffer.from('JLU_ATTENDANCE_SYSTEM'))

    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted
  }

  static decrypt(encryptedData: string): string {
    const [ivHex, tagHex, encrypted] = encryptedData.split(':')
    const key = this.getKey()
    const iv = Buffer.from(ivHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')
    
    const decipher = crypto.createDecipher(this.ALGORITHM, key)
    decipher.setAAD(Buffer.from('JLU_ATTENDANCE_SYSTEM'))
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }
}

// Prisma middleware for automatic encryption/decryption
export function createEncryptionMiddleware() {
  return async (params: any, next: any) => {
    const sensitiveFields = ['phone', 'guardianPhone', 'address', 'dateOfBirth', 'ssn']
    
    // Encrypt before create/update
    if (params.action === 'create' || params.action === 'update') {
      if (params.args?.data) {
        for (const field of sensitiveFields) {
          if (params.args.data[field]) {
            params.args.data[field] = FieldEncryption.encrypt(params.args.data[field])
          }
        }
      }
    }
    
    const result = await next(params)
    
    // Decrypt after find operations
    if (params.action === 'findMany' || params.action === 'findUnique' || params.action === 'findFirst') {
      if (Array.isArray(result)) {
        result.forEach(record => decryptRecord(record, sensitiveFields))
      } else if (result) {
        decryptRecord(result, sensitiveFields)
      }
    }
    
    return result
  }
}

function decryptRecord(record: any, fields: string[]) {
  for (const field of fields) {
    if (record[field] && typeof record[field] === 'string') {
      try {
        record[field] = FieldEncryption.decrypt(record[field])
      } catch (error) {
        // Field might not be encrypted (legacy data)
        console.warn(`Failed to decrypt field ${field}:`, error)
      }
    }
  }
}
```

#### Data Classification System
```typescript
// src/lib/security/classification.ts
export enum DataClassification {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  SENSITIVE = 'SENSITIVE',
  HIGHLY_SENSITIVE = 'HIGHLY_SENSITIVE'
}

export interface ClassificationMetadata {
  classification: DataClassification
  retentionPeriod: number // in days
  encryptionRequired: boolean
  auditRequired: boolean
  accessRestrictions: string[]
}

export const DATA_CLASSIFICATION_MAP: Record<string, ClassificationMetadata> = {
  // Student Personal Information
  'student.ssn': {
    classification: DataClassification.HIGHLY_SENSITIVE,
    retentionPeriod: 2555, // 7 years
    encryptionRequired: true,
    auditRequired: true,
    accessRestrictions: ['ADMIN', 'REGISTRAR']
  },
  'student.dateOfBirth': {
    classification: DataClassification.SENSITIVE,
    retentionPeriod: 2555,
    encryptionRequired: true,
    auditRequired: true,
    accessRestrictions: ['ADMIN', 'FACULTY', 'STUDENT_SELF']
  },
  'student.phone': {
    classification: DataClassification.SENSITIVE,
    retentionPeriod: 1825, // 5 years
    encryptionRequired: true,
    auditRequired: false,
    accessRestrictions: ['ADMIN', 'FACULTY', 'STUDENT_SELF']
  },
  // Academic Records
  'attendanceRecord.status': {
    classification: DataClassification.SENSITIVE,
    retentionPeriod: 2555, // 7 years per FERPA
    encryptionRequired: false,
    auditRequired: true,
    accessRestrictions: ['ADMIN', 'FACULTY', 'STUDENT_SELF']
  },
  // System Data
  'user.email': {
    classification: DataClassification.INTERNAL,
    retentionPeriod: 1095, // 3 years
    encryptionRequired: false,
    auditRequired: false,
    accessRestrictions: ['ADMIN', 'FACULTY']
  }
}

export class DataClassificationManager {
  static getClassification(fieldPath: string): ClassificationMetadata | null {
    return DATA_CLASSIFICATION_MAP[fieldPath] || null
  }

  static requiresEncryption(fieldPath: string): boolean {
    const metadata = this.getClassification(fieldPath)
    return metadata?.encryptionRequired || false
  }

  static requiresAudit(fieldPath: string): boolean {
    const metadata = this.getClassification(fieldPath)
    return metadata?.auditRequired || false
  }

  static canAccess(fieldPath: string, userRole: string, context?: string): boolean {
    const metadata = this.getClassification(fieldPath)
    if (!metadata) return true

    if (context === 'STUDENT_SELF' && metadata.accessRestrictions.includes('STUDENT_SELF')) {
      return true
    }

    return metadata.accessRestrictions.includes(userRole)
  }
}
```

### 3. API Security Framework

#### Rate Limiting & DDoS Protection
```typescript
// src/lib/security/rate-limiting.ts
import { LRUCache } from 'lru-cache'

interface RateLimitOptions {
  windowMs: number
  maxRequests: number
  keyGenerator?: (req: Request) => string
}

export class RateLimiter {
  private cache: LRUCache<string, number[]>

  constructor(private options: RateLimitOptions) {
    this.cache = new LRUCache({
      max: 1000,
      ttl: options.windowMs
    })
  }

  isAllowed(key: string): boolean {
    const now = Date.now()
    const windowStart = now - this.options.windowMs
    
    let requests = this.cache.get(key) || []
    requests = requests.filter(timestamp => timestamp > windowStart)
    
    if (requests.length >= this.options.maxRequests) {
      return false
    }
    
    requests.push(now)
    this.cache.set(key, requests)
    return true
  }

  getRemainingRequests(key: string): number {
    const requests = this.cache.get(key) || []
    return Math.max(0, this.options.maxRequests - requests.length)
  }
}

// Different rate limits for different endpoints
export const rateLimiters = {
  auth: new RateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 5 }), // 5 requests per 15 minutes
  api: new RateLimiter({ windowMs: 60 * 1000, maxRequests: 100 }), // 100 requests per minute
  sensitive: new RateLimiter({ windowMs: 60 * 1000, maxRequests: 10 }) // 10 requests per minute
}

// Middleware for Next.js API routes
export function withRateLimit(limiter: RateLimiter, keyGenerator?: (req: Request) => string) {
  return function middleware(handler: Function) {
    return async function(req: Request, res: Response) {
      const key = keyGenerator ? keyGenerator(req) : getClientIP(req)
      
      if (!limiter.isAllowed(key)) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded' }),
          { 
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Remaining': limiter.getRemainingRequests(key).toString()
            }
          }
        )
      }
      
      return handler(req, res)
    }
  }
}

function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  return realIP || 'unknown'
}
```

#### Enhanced Input Validation & Sanitization
```typescript
// src/lib/security/validation.ts
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import validator from 'validator'

export class SecurityValidator {
  // Sanitize HTML input to prevent XSS
  static sanitizeHTML(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    })
  }

  // Validate and sanitize email addresses
  static validateEmail(email: string): { isValid: boolean; sanitized: string } {
    const sanitized = validator.normalizeEmail(email) || ''
    return {
      isValid: validator.isEmail(sanitized),
      sanitized
    }
  }

  // SQL injection prevention
  static preventSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(--|\*\/|\/\*)/,
      /(\b(OR|AND)\b.*[=<>])/i,
      /(char|nchar|varchar|nvarchar)\s*\(/i
    ]
    
    return !sqlPatterns.some(pattern => pattern.test(input))
  }

  // Enhanced Zod schemas with security validation
  static createSecureStudentSchema() {
    return z.object({
      email: z.string()
        .email('Invalid email format')
        .transform(email => this.validateEmail(email).sanitized)
        .refine(email => this.validateEmail(email).isValid, 'Invalid email'),
      
      name: z.string()
        .min(1, 'Name is required')
        .max(100, 'Name too long')
        .transform(name => this.sanitizeHTML(name))
        .refine(name => this.preventSQLInjection(name), 'Invalid characters in name'),
      
      phone: z.string()
        .optional()
        .transform(phone => phone ? validator.escape(phone) : undefined)
        .refine(phone => !phone || validator.isMobilePhone(phone), 'Invalid phone number'),
      
      studentId: z.string()
        .min(1, 'Student ID is required')
        .regex(/^[A-Z0-9]+$/, 'Student ID must contain only letters and numbers')
        .transform(id => id.toUpperCase()),
      
      rollNumber: z.string()
        .min(1, 'Roll number is required')
        .regex(/^[A-Z0-9\/\-]+$/, 'Invalid roll number format'),
      
      batchId: z.string()
        .uuid('Invalid batch ID')
    })
  }
}

// API request validation middleware
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async function(req: Request): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const body = await req.json()
      const validatedData = schema.parse(body)
      return { success: true, data: validatedData }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: `Validation failed: ${error.issues.map(i => i.message).join(', ')}`
        }
      }
      return { success: false, error: 'Invalid request data' }
    }
  }
}
```

### 4. Security Headers & HTTPS Enforcement
```typescript
// src/lib/security/headers.ts
export function getSecurityHeaders(): Record<string, string> {
  return {
    // HTTPS enforcement
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    
    // XSS protection
    'X-XSS-Protection': '1; mode=block',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    
    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions policy
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'accelerometer=()',
      'gyroscope=()'
    ].join(', ')
  }
}

// Enhanced middleware with security headers
export function securityMiddleware(request: Request): Response | null {
  const response = NextResponse.next()
  
  // Add security headers
  const headers = getSecurityHeaders()
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  // HTTPS enforcement in production
  if (process.env.NODE_ENV === 'production') {
    const proto = request.headers.get('x-forwarded-proto')
    if (proto && proto !== 'https') {
      const httpsUrl = request.url.replace(/^http:/, 'https:')
      return NextResponse.redirect(httpsUrl, 301)
    }
  }
  
  return response
}
```

### 5. Audit Logging & Monitoring System

#### Comprehensive Audit Logging
```typescript
// src/lib/security/audit.ts
export enum AuditEventType {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  MFA_SETUP = 'MFA_SETUP',
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_MODIFICATION = 'DATA_MODIFICATION',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  SYSTEM_CONFIG_CHANGE = 'SYSTEM_CONFIG_CHANGE',
  EXPORT_DATA = 'EXPORT_DATA',
  ATTENDANCE_MARKED = 'ATTENDANCE_MARKED',
  ATTENDANCE_MODIFIED = 'ATTENDANCE_MODIFIED',
  GRADE_ENTERED = 'GRADE_ENTERED',
  GRADE_MODIFIED = 'GRADE_MODIFIED'
}

export interface AuditEvent {
  id: string
  timestamp: Date
  eventType: AuditEventType
  userId: string
  userRole: string
  ipAddress: string
  userAgent: string
  resource: string
  action: string
  details: Record<string, any>
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  success: boolean
}

export class AuditLogger {
  static async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...event
    }

    // Store in database
    await db.auditLog.create({
      data: auditEvent
    })

    // Send high-risk events to security team
    if (event.riskLevel === 'HIGH' || event.riskLevel === 'CRITICAL') {
      await this.sendSecurityAlert(auditEvent)
    }

    // Real-time monitoring for suspicious patterns
    await this.analyzeSecurityPatterns(auditEvent)
  }

  private static async sendSecurityAlert(event: AuditEvent): Promise<void> {
    // Implementation for sending alerts to security team
    // Could be email, Slack, SMS, or security monitoring system
    console.log(`SECURITY ALERT: ${event.eventType} - ${event.details}`)
  }

  private static async analyzeSecurityPatterns(event: AuditEvent): Promise<void> {
    // Check for suspicious patterns
    const recentEvents = await db.auditLog.findMany({
      where: {
        userId: event.userId,
        timestamp: {
          gte: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
        }
      },
      orderBy: { timestamp: 'desc' }
    })

    // Multiple failed login attempts
    if (event.eventType === AuditEventType.LOGIN_FAILED) {
      const failedAttempts = recentEvents.filter(e => e.eventType === AuditEventType.LOGIN_FAILED)
      if (failedAttempts.length >= 5) {
        await this.lockUserAccount(event.userId)
      }
    }

    // Unusual access patterns
    if (event.eventType === AuditEventType.DATA_ACCESS) {
      const accessEvents = recentEvents.filter(e => e.eventType === AuditEventType.DATA_ACCESS)
      if (accessEvents.length >= 50) { // Unusual volume
        await this.flagSuspiciousActivity(event.userId, 'HIGH_VOLUME_DATA_ACCESS')
      }
    }
  }

  private static async lockUserAccount(userId: string): Promise<void> {
    await db.user.update({
      where: { id: userId },
      data: { status: 'SUSPENDED' }
    })

    await this.logEvent({
      eventType: AuditEventType.SYSTEM_CONFIG_CHANGE,
      userId: 'SYSTEM',
      userRole: 'SYSTEM',
      ipAddress: 'internal',
      userAgent: 'security-system',
      resource: 'user-account',
      action: 'account-locked',
      details: { targetUserId: userId, reason: 'multiple-failed-logins' },
      riskLevel: 'HIGH',
      success: true
    })
  }

  private static async flagSuspiciousActivity(userId: string, reason: string): Promise<void> {
    // Create security incident
    await db.securityIncident.create({
      data: {
        type: 'SUSPICIOUS_ACTIVITY',
        userId,
        description: reason,
        severity: 'MEDIUM',
        status: 'OPEN',
        metadata: { detectedAt: new Date() }
      }
    })
  }
}

// Middleware for automatic audit logging
export function auditMiddleware(eventType: AuditEventType, resource: string) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function(...args: any[]) {
      const req = args[0] // Assuming first argument is request
      const session = await getServerSession(authOptions)
      
      const startTime = Date.now()
      let success = true
      let error: any = null

      try {
        const result = await method.apply(this, args)
        return result
      } catch (err) {
        success = false
        error = err
        throw err
      } finally {
        await AuditLogger.logEvent({
          eventType,
          userId: session?.user?.id || 'ANONYMOUS',
          userRole: session?.user?.role || 'UNKNOWN',
          ipAddress: getClientIP(req),
          userAgent: req.headers.get('user-agent') || 'unknown',
          resource,
          action: propertyName,
          details: {
            duration: Date.now() - startTime,
            error: error?.message,
            args: args.slice(1) // Don't log the request object
          },
          riskLevel: success ? 'LOW' : 'MEDIUM',
          success
        })
      }
    }
  }
}
```

### 6. FERPA & GDPR Compliance Framework

#### FERPA Compliance
```typescript
// src/lib/compliance/ferpa.ts
export enum FERPARecordType {
  EDUCATION_RECORD = 'EDUCATION_RECORD',
  DIRECTORY_INFORMATION = 'DIRECTORY_INFORMATION',
  NON_EDUCATION_RECORD = 'NON_EDUCATION_RECORD'
}

export interface FERPAAccessLog {
  studentId: string
  accessedBy: string
  accessType: 'VIEW' | 'MODIFY' | 'SHARE'
  recordType: FERPARecordType
  legitimateEducationalInterest: boolean
  consentObtained: boolean
  purpose: string
  timestamp: Date
}

export class FERPAComplianceManager {
  // Directory information that can be disclosed without consent
  private static readonly DIRECTORY_INFO_FIELDS = [
    'name', 'email', 'phone', 'program', 'batch', 'major', 'enrollment_status'
  ]

  static async checkAccessPermission(
    accessorId: string,
    studentId: string,
    requestedFields: string[],
    purpose: string
  ): Promise<{ allowed: boolean; requiresConsent: boolean; restrictedFields: string[] }> {
    const accessor = await db.user.findUnique({ where: { id: accessorId } })
    const student = await db.student.findUnique({ 
      where: { id: studentId },
      include: { user: true, batch: true }
    })

    if (!accessor || !student) {
      return { allowed: false, requiresConsent: false, restrictedFields: requestedFields }
    }

    // Check if accessor has legitimate educational interest
    const hasLegitimateInterest = await this.hasLegitimateEducationalInterest(
      accessor, student, purpose
    )

    const directoryFields = requestedFields.filter(field => 
      this.DIRECTORY_INFO_FIELDS.includes(field)
    )
    const protectedFields = requestedFields.filter(field => 
      !this.DIRECTORY_INFO_FIELDS.includes(field)
    )

    // Directory information can be disclosed without consent
    if (protectedFields.length === 0) {
      return { allowed: true, requiresConsent: false, restrictedFields: [] }
    }

    // Protected fields require legitimate educational interest or consent
    if (!hasLegitimateInterest) {
      const hasConsent = await this.hasStudentConsent(studentId, accessorId, protectedFields)
      return {
        allowed: hasConsent,
        requiresConsent: !hasConsent,
        restrictedFields: hasConsent ? [] : protectedFields
      }
    }

    // Log access for FERPA compliance
    await this.logFERPAAccess({
      studentId,
      accessedBy: accessorId,
      accessType: 'VIEW',
      recordType: FERPARecordType.EDUCATION_RECORD,
      legitimateEducationalInterest: hasLegitimateInterest,
      consentObtained: false,
      purpose,
      timestamp: new Date()
    })

    return { allowed: true, requiresConsent: false, restrictedFields: [] }
  }

  private static async hasLegitimateEducationalInterest(
    accessor: any,
    student: any,
    purpose: string
  ): Promise<boolean> {
    // Faculty can access records of students in their classes
    if (accessor.role === 'FACULTY') {
      const teachesStudent = await db.subject.findFirst({
        where: {
          batchId: student.batchId,
          OR: [
            { primaryFacultyId: accessor.id },
            { coFacultyId: accessor.id }
          ]
        }
      })
      return !!teachesStudent
    }

    // Admin has legitimate interest for administrative purposes
    if (accessor.role === 'ADMIN') {
      return ['ACADEMIC_ADMINISTRATION', 'ENROLLMENT', 'FINANCIAL_AID'].includes(purpose)
    }

    // Students can only access their own records
    if (accessor.role === 'STUDENT') {
      return accessor.student?.id === student.id
    }

    return false
  }

  private static async hasStudentConsent(
    studentId: string,
    accessorId: string,
    fields: string[]
  ): Promise<boolean> {
    const consent = await db.ferpaConsent.findFirst({
      where: {
        studentId,
        grantedTo: accessorId,
        isActive: true,
        expiresAt: { gt: new Date() }
      }
    })

    return consent && fields.every(field => consent.allowedFields.includes(field))
  }

  static async logFERPAAccess(log: FERPAAccessLog): Promise<void> {
    await db.ferpaAccessLog.create({ data: log })
  }
}
```

#### GDPR Compliance
```typescript
// src/lib/compliance/gdpr.ts
export enum GDPRLegalBasis {
  CONSENT = 'CONSENT',
  CONTRACT = 'CONTRACT',
  LEGAL_OBLIGATION = 'LEGAL_OBLIGATION',
  VITAL_INTERESTS = 'VITAL_INTERESTS',
  PUBLIC_TASK = 'PUBLIC_TASK',
  LEGITIMATE_INTERESTS = 'LEGITIMATE_INTERESTS'
}

export interface GDPRDataSubjectRequest {
  id: string
  type: 'ACCESS' | 'RECTIFICATION' | 'ERASURE' | 'PORTABILITY' | 'RESTRICTION'
  subjectId: string
  requestDate: Date
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
  completionDate?: Date
  rejectionReason?: string
}

export class GDPRComplianceManager {
  // Data retention periods (in days)
  private static readonly RETENTION_PERIODS = {
    'student_records': 2555, // 7 years
    'attendance_records': 2555, // 7 years
    'audit_logs': 2190, // 6 years
    'session_data': 30, // 30 days
    'temporary_files': 7 // 7 days
  }

  static async processDataSubjectRequest(request: GDPRDataSubjectRequest): Promise<void> {
    switch (request.type) {
      case 'ACCESS':
        await this.handleAccessRequest(request)
        break
      case 'RECTIFICATION':
        await this.handleRectificationRequest(request)
        break
      case 'ERASURE':
        await this.handleErasureRequest(request)
        break
      case 'PORTABILITY':
        await this.handlePortabilityRequest(request)
        break
      case 'RESTRICTION':
        await this.handleRestrictionRequest(request)
        break
    }
  }

  private static async handleAccessRequest(request: GDPRDataSubjectRequest): Promise<void> {
    const userData = await this.exportUserData(request.subjectId)
    
    // Create secure download link
    const exportFile = await this.createSecureExport(userData)
    
    // Notify user
    await this.notifyDataSubject(request.subjectId, 'ACCESS_REQUEST_COMPLETE', {
      downloadLink: exportFile.secureUrl,
      expiresAt: exportFile.expiresAt
    })

    await this.updateRequestStatus(request.id, 'COMPLETED')
  }

  private static async exportUserData(userId: string): Promise<any> {
    // Collect all user data across the system
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        student: {
          include: {
            attendanceRecords: true,
            attendanceDisputes: true,
            batch: true
          }
        },
        primarySubjects: true,
        coFacultySubjects: true,
        timetableEntries: true
      }
    })

    const auditLogs = await db.auditLog.findMany({
      where: { userId }
    })

    return {
      personalData: user,
      auditTrail: auditLogs,
      dataProcessingPurpose: 'Educational record management',
      legalBasis: GDPRLegalBasis.CONTRACT,
      retentionPeriod: this.RETENTION_PERIODS.student_records,
      exportDate: new Date(),
      dataController: {
        name: 'Jagran Lakecity University',
        contact: 'privacy@jlu.edu.in'
      }
    }
  }

  static async scheduleDataRetention(): Promise<void> {
    // Clean up expired data based on retention policies
    for (const [dataType, retentionDays] of Object.entries(this.RETENTION_PERIODS)) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      switch (dataType) {
        case 'audit_logs':
          await db.auditLog.deleteMany({
            where: { timestamp: { lt: cutoffDate } }
          })
          break
        case 'session_data':
          await db.session.deleteMany({
            where: { expires: { lt: cutoffDate } }
          })
          break
        // Add other data types as needed
      }
    }
  }

  static async obtainConsent(
    userId: string,
    purpose: string,
    dataTypes: string[],
    legalBasis: GDPRLegalBasis = GDPRLegalBasis.CONSENT
  ): Promise<string> {
    const consent = await db.gdprConsent.create({
      data: {
        userId,
        purpose,
        dataTypes,
        legalBasis,
        isActive: true,
        grantedAt: new Date()
      }
    })

    return consent.id
  }

  static async withdrawConsent(consentId: string): Promise<void> {
    await db.gdprConsent.update({
      where: { id: consentId },
      data: { 
        isActive: false,
        withdrawnAt: new Date()
      }
    })

    // Handle data deletion if required
    const consent = await db.gdprConsent.findUnique({ where: { id: consentId } })
    if (consent && consent.legalBasis === GDPRLegalBasis.CONSENT) {
      await this.deleteConsentBasedData(consent.userId, consent.dataTypes)
    }
  }
}
```

### 7. Incident Response Plan

#### Security Incident Management
```typescript
// src/lib/security/incident-response.ts
export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum IncidentType {
  DATA_BREACH = 'DATA_BREACH',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  MALWARE = 'MALWARE',
  PHISHING = 'PHISHING',
  DDOS = 'DDOS',
  INSIDER_THREAT = 'INSIDER_THREAT',
  SYSTEM_COMPROMISE = 'SYSTEM_COMPROMISE'
}

export interface SecurityIncident {
  id: string
  type: IncidentType
  severity: IncidentSeverity
  title: string
  description: string
  detectedAt: Date
  reportedBy: string
  assignedTo?: string
  status: 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED' | 'CLOSED'
  affectedAssets: string[]
  timeline: IncidentTimelineEvent[]
  metadata: Record<string, any>
}

export interface IncidentTimelineEvent {
  timestamp: Date
  action: string
  performedBy: string
  details: string
}

export class IncidentResponseManager {
  private static readonly SEVERITY_RESPONSE_TIMES = {
    [IncidentSeverity.CRITICAL]: 15, // 15 minutes
    [IncidentSeverity.HIGH]: 60, // 1 hour
    [IncidentSeverity.MEDIUM]: 240, // 4 hours
    [IncidentSeverity.LOW]: 1440 // 24 hours
  }

  static async createIncident(incident: Omit<SecurityIncident, 'id' | 'status' | 'timeline'>): Promise<string> {
    const incidentId = crypto.randomUUID()
    
    const fullIncident: SecurityIncident = {
      ...incident,
      id: incidentId,
      status: 'OPEN',
      timeline: [{
        timestamp: new Date(),
        action: 'INCIDENT_CREATED',
        performedBy: incident.reportedBy,
        details: `Incident created: ${incident.title}`
      }]
    }

    await db.securityIncident.create({ data: fullIncident })

    // Auto-assign based on severity and type
    await this.autoAssignIncident(incidentId, incident.type, incident.severity)

    // Execute immediate response actions
    await this.executeImmediateResponse(fullIncident)

    return incidentId
  }

  private static async autoAssignIncident(
    incidentId: string,
    type: IncidentType,
    severity: IncidentSeverity
  ): Promise<void> {
    let assignedTo: string

    // Critical incidents go to security team lead
    if (severity === IncidentSeverity.CRITICAL) {
      assignedTo = await this.getSecurityTeamLead()
    } else {
      // Route based on incident type
      assignedTo = await this.getSpecialistForIncidentType(type)
    }

    await this.assignIncident(incidentId, assignedTo)
  }

  private static async executeImmediateResponse(incident: SecurityIncident): Promise<void> {
    switch (incident.type) {
      case IncidentType.DATA_BREACH:
        await this.handleDataBreachResponse(incident)
        break
      case IncidentType.UNAUTHORIZED_ACCESS:
        await this.handleUnauthorizedAccessResponse(incident)
        break
      case IncidentType.DDOS:
        await this.handleDDoSResponse(incident)
        break
      case IncidentType.MALWARE:
        await this.handleMalwareResponse(incident)
        break
    }
  }

  private static async handleDataBreachResponse(incident: SecurityIncident): Promise<void> {
    // 1. Immediate containment
    await this.addTimelineEvent(incident.id, {
      timestamp: new Date(),
      action: 'CONTAINMENT_INITIATED',
      performedBy: 'SYSTEM',
      details: 'Automatic containment measures activated'
    })

    // 2. Identify affected data
    const affectedData = await this.identifyAffectedData(incident.affectedAssets)
    
    // 3. Assess if personal data is involved (GDPR notification required)
    if (affectedData.includesPersonalData) {
      await this.triggerGDPRNotification(incident.id, affectedData)
    }

    // 4. Notify security team immediately
    await this.notifySecurityTeam(incident, 'IMMEDIATE')

    // 5. If critical, notify legal and compliance teams
    if (incident.severity === IncidentSeverity.CRITICAL) {
      await this.notifyLegalTeam(incident)
      await this.notifyComplianceTeam(incident)
    }
  }

  private static async handleUnauthorizedAccessResponse(incident: SecurityIncident): Promise<void> {
    // 1. Lock compromised accounts
    const compromisedUsers = incident.metadata.compromisedUsers || []
    for (const userId of compromisedUsers) {
      await this.lockUserAccount(userId, incident.id)
    }

    // 2. Reset sessions
    await this.invalidateUserSessions(compromisedUsers)

    // 3. Force password reset
    await this.forcePasswordReset(compromisedUsers)

    // 4. Monitor for further suspicious activity
    await this.enhanceMonitoring(compromisedUsers)
  }

  static async generateIncidentReport(incidentId: string): Promise<any> {
    const incident = await db.securityIncident.findUnique({
      where: { id: incidentId }
    })

    if (!incident) throw new Error('Incident not found')

    return {
      incidentSummary: {
        id: incident.id,
        type: incident.type,
        severity: incident.severity,
        title: incident.title,
        detectedAt: incident.detectedAt,
        resolvedAt: incident.timeline.find(t => t.action === 'INCIDENT_RESOLVED')?.timestamp
      },
      impactAssessment: await this.assessIncidentImpact(incident),
      rootCauseAnalysis: await this.performRootCauseAnalysis(incident),
      lessonsLearned: await this.extractLessonsLearned(incident),
      recommendations: await this.generateRecommendations(incident),
      complianceImplications: await this.assessComplianceImplications(incident)
    }
  }
}
```

### 8. Security Testing Framework

#### Automated Security Testing
```typescript
// src/lib/security/testing.ts
export interface SecurityTest {
  name: string
  category: 'AUTHENTICATION' | 'AUTHORIZATION' | 'INPUT_VALIDATION' | 'DATA_PROTECTION' | 'API_SECURITY'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  execute(): Promise<SecurityTestResult>
}

export interface SecurityTestResult {
  passed: boolean
  vulnerabilities: SecurityVulnerability[]
  recommendations: string[]
  score: number // 0-100
}

export interface SecurityVulnerability {
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  location: string
  remediation: string
}

export class SecurityTestSuite {
  private tests: SecurityTest[] = []

  constructor() {
    this.registerTests()
  }

  private registerTests(): void {
    // Authentication tests
    this.tests.push(new PasswordPolicyTest())
    this.tests.push(new SessionSecurityTest())
    this.tests.push(new MFAEnforcementTest())

    // Authorization tests
    this.tests.push(new RBACTest())
    this.tests.push(new PrivilegeEscalationTest())

    // Input validation tests
    this.tests.push(new SQLInjectionTest())
    this.tests.push(new XSSTest())
    this.tests.push(new CSRFTest())

    // API security tests
    this.tests.push(new RateLimitingTest())
    this.tests.push(new APIAuthenticationTest())

    // Data protection tests
    this.tests.push(new EncryptionTest())
    this.tests.push(new DataLeakageTest())
  }

  async runAllTests(): Promise<SecurityTestResult[]> {
    const results: SecurityTestResult[] = []

    for (const test of this.tests) {
      try {
        console.log(`Running security test: ${test.name}`)
        const result = await test.execute()
        results.push(result)
      } catch (error) {
        console.error(`Security test failed: ${test.name}`, error)
        results.push({
          passed: false,
          vulnerabilities: [{
            type: 'TEST_EXECUTION_ERROR',
            severity: 'HIGH',
            description: `Security test ${test.name} failed to execute`,
            location: test.name,
            remediation: 'Fix test execution environment'
          }],
          recommendations: [`Fix test execution for ${test.name}`],
          score: 0
        })
      }
    }

    return results
  }

  async generateSecurityReport(results: SecurityTestResult[]): Promise<any> {
    const totalTests = results.length
    const passedTests = results.filter(r => r.passed).length
    const overallScore = results.reduce((sum, r) => sum + r.score, 0) / totalTests

    const vulnerabilities = results.flatMap(r => r.vulnerabilities)
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'CRITICAL')
    const highVulns = vulnerabilities.filter(v => v.severity === 'HIGH')

    return {
      summary: {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        overallScore: Math.round(overallScore),
        securityGrade: this.calculateSecurityGrade(overallScore)
      },
      vulnerabilities: {
        total: vulnerabilities.length,
        critical: criticalVulns.length,
        high: highVulns.length,
        medium: vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
        low: vulnerabilities.filter(v => v.severity === 'LOW').length
      },
      recommendations: this.prioritizeRecommendations(results),
      complianceStatus: {
        ferpa: this.assessFERPACompliance(results),
        gdpr: this.assessGDPRCompliance(results),
        iso27001: this.assessISO27001Compliance(results)
      }
    }
  }

  private calculateSecurityGrade(score: number): string {
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }
}

// Example security test implementation
class PasswordPolicyTest implements SecurityTest {
  name = 'Password Policy Enforcement'
  category = 'AUTHENTICATION' as const
  severity = 'HIGH' as const

  async execute(): Promise<SecurityTestResult> {
    const vulnerabilities: SecurityVulnerability[] = []
    
    // Test password complexity requirements
    const weakPasswords = [
      'password',
      '123456',
      'admin',
      'qwerty',
      'abc123'
    ]

    for (const password of weakPasswords) {
      const validation = PasswordManager.validatePassword(password)
      if (validation.isValid) {
        vulnerabilities.push({
          type: 'WEAK_PASSWORD_ACCEPTED',
          severity: 'HIGH',
          description: `Weak password "${password}" was accepted by the system`,
          location: 'Password validation logic',
          remediation: 'Strengthen password policy requirements'
        })
      }
    }

    // Test password hashing
    const testPassword = 'TestPassword123!'
    const hashedPassword = await PasswordManager.hashPassword(testPassword)
    
    if (hashedPassword === testPassword) {
      vulnerabilities.push({
        type: 'PASSWORD_NOT_HASHED',
        severity: 'CRITICAL',
        description: 'Passwords are not being hashed',
        location: 'Password storage mechanism',
        remediation: 'Implement proper password hashing with bcrypt'
      })
    }

    const score = vulnerabilities.length === 0 ? 100 : Math.max(0, 100 - (vulnerabilities.length * 25))

    return {
      passed: vulnerabilities.length === 0,
      vulnerabilities,
      recommendations: vulnerabilities.length > 0 ? [
        'Implement stronger password policy',
        'Ensure all passwords are properly hashed',
        'Add password strength meter to UI'
      ] : [],
      score
    }
  }
}
```

## Implementation Roadmap

### Phase 1: Critical Security Fixes (Weeks 1-2)
1. **Immediate Password Security**
   - Implement proper password hashing with bcrypt
   - Remove hardcoded passwords
   - Add password complexity requirements

2. **Authentication Enhancement**
   - Implement secure session management
   - Add login attempt monitoring
   - Implement account lockout mechanisms

3. **Basic API Security**
   - Add input validation to all endpoints
   - Implement basic rate limiting
   - Add security headers

### Phase 2: Advanced Security Features (Weeks 3-6)
1. **Multi-Factor Authentication**
   - TOTP-based 2FA implementation
   - Backup codes system
   - Recovery mechanisms

2. **Data Protection**
   - Field-level encryption for sensitive data
   - Data classification implementation
   - Encryption key management

3. **Enhanced Monitoring**
   - Security event logging
   - Suspicious activity detection
   - Real-time alerting

### Phase 3: Compliance & Advanced Features (Weeks 7-12)
1. **FERPA Compliance**
   - Access control based on educational interest
   - Consent management system
   - Directory information handling

2. **GDPR Compliance**
   - Data subject rights implementation
   - Consent management
   - Data retention policies

3. **Security Testing & Monitoring**
   - Automated security testing suite
   - Penetration testing framework
   - Continuous security monitoring

### Phase 4: Enterprise Features (Weeks 13-16)
1. **SSO Integration**
   - SAML/OIDC integration
   - University SSO integration
   - Identity provider management

2. **Advanced Threat Protection**
   - Anomaly detection
   - Machine learning-based threat detection
   - Incident response automation

3. **Security Operations**
   - Security dashboard
   - Compliance reporting
   - Security metrics and KPIs

## Conclusion

This comprehensive security strategy addresses the critical vulnerabilities in the current College Management System and provides a roadmap for implementing enterprise-grade security. The strategy focuses on protecting sensitive educational data while ensuring compliance with FERPA, GDPR, and other regulatory requirements.

Key priorities include:
1. Immediate remediation of critical vulnerabilities
2. Implementation of robust authentication and authorization
3. Data protection through encryption and access controls
4. Comprehensive audit logging and monitoring
5. Compliance with educational data protection regulations

The phased implementation approach ensures that critical security issues are addressed first while building toward a comprehensive security posture that protects the institution and its students' data.