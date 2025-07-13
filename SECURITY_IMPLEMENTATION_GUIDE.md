# Security Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the comprehensive security strategy in the College Management System. Follow these phases in order to ensure a secure and compliant system.

## Phase 1: Critical Security Fixes (Week 1-2)

### 1.1 Fix Authentication Vulnerabilities

#### Replace Hardcoded Passwords

**Current Issue:** Passwords are hardcoded and not hashed.

**Fix:**

1. **Update the database schema** to include security fields:

```sql
-- Add to existing User table
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN password_changed_at DATETIME;
ALTER TABLE users ADD COLUMN password_reset_required BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN password_reset_token TEXT;
ALTER TABLE users ADD COLUMN password_reset_expires DATETIME;
ALTER TABLE users ADD COLUMN locked_until DATETIME;
ALTER TABLE users ADD COLUMN last_login_at DATETIME;
```

2. **Install required dependencies:**

```bash
npm install bcryptjs zxcvbn @types/bcryptjs
```

3. **Replace the current auth configuration:**

Replace `/src/lib/auth.ts` with `/src/lib/auth-enhanced.ts` and update imports throughout the application.

4. **Create password migration script:**

```typescript
// scripts/migrate-passwords.ts
import { db } from '../src/lib/db'
import { PasswordManager } from '../src/lib/security/password'

async function migratePasswords() {
  const users = await db.user.findMany({
    where: { passwordHash: null }
  })

  for (const user of users) {
    // Set temporary password - users will be forced to change on first login
    const tempPassword = PasswordManager.generateTemporaryPassword()
    const hashedPassword = await PasswordManager.hashPassword(tempPassword)
    
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        passwordResetRequired: true
      }
    })

    console.log(`User ${user.email}: temporary password: ${tempPassword}`)
  }
}

migratePasswords().catch(console.error)
```

### 1.2 Implement Input Validation

**Add Zod validation to all API endpoints:**

1. **Install Zod:**

```bash
npm install zod
```

2. **Update API routes with validation:**

Example for `/src/app/api/students/route.ts`:

```typescript
import { SecurityValidator } from '@/lib/security/validation'
import { withSecurity } from '@/lib/security/middleware'

// Replace existing POST handler
export const POST = withSecurity({
  requireAuth: true,
  requireRoles: ['ADMIN'],
  rateLimit: { requests: 10, windowMs: 60000 },
  auditEvent: 'DATA_MODIFICATION',
  resource: 'students'
})(async function(request: NextRequest) {
  const schema = SecurityValidator.createSecureStudentSchema()
  const validation = await validateRequest(schema)(request)
  
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    )
  }

  // Use validation.data for further processing
  // ... rest of the handler
})
```

### 1.3 Add Security Headers

**Update middleware:**

Replace `/src/middleware.ts`:

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { securityMiddleware } from '@/lib/security/middleware'

export function middleware(request: NextRequest) {
  // Apply security middleware first
  const securityResponse = securityMiddleware(request)
  if (securityResponse) {
    return securityResponse
  }

  // Your existing middleware logic
  const pathname = request.nextUrl.pathname
  
  if (pathname.match(/^\/(batches|students|subjects|faculty)$/) && 
      !pathname.startsWith('/api/')) {
    const isApiRequest = request.headers.get('accept')?.includes('application/json')
    
    if (isApiRequest) {
      return new NextResponse(
        JSON.stringify({ error: 'Not Found - Use /api' + pathname }),
        { status: 404, headers: { 'content-type': 'application/json' } }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

## Phase 2: Advanced Security Features (Week 3-6)

### 2.1 Implement Rate Limiting

**Add rate limiting to all API routes:**

```typescript
// Example for login endpoint
import { rateLimiters } from '@/lib/security/rate-limiting'

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request)
  
  // Check rate limit
  if (!rateLimiters.login.isAllowed(clientIP)) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429 }
    )
  }

  // ... rest of login logic
}
```

### 2.2 Add Audit Logging

**Create audit log table:**

```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  event_type TEXT NOT NULL,
  user_id TEXT,
  user_role TEXT,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSON,
  risk_level TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  session_id TEXT
);

CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_risk_level ON audit_logs(risk_level);
```

**Add audit logging to critical operations:**

```typescript
import { AuditLogger, AuditEventType } from '@/lib/security/audit'

// Example in attendance marking
export async function markAttendance(sessionId: string, records: AttendanceRecord[]) {
  try {
    // ... attendance logic
    
    await AuditLogger.logEvent({
      eventType: AuditEventType.ATTENDANCE_MARKED,
      userId: session.user.id,
      userRole: session.user.role,
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      resource: 'attendance',
      action: 'mark_attendance',
      details: { sessionId, recordCount: records.length },
      riskLevel: 'MEDIUM',
      success: true
    })
  } catch (error) {
    // Log failure
    await AuditLogger.logEvent({
      eventType: AuditEventType.ATTENDANCE_MARKED,
      userId: session.user.id,
      userRole: session.user.role,
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      resource: 'attendance',
      action: 'mark_attendance',
      details: { error: error.message },
      riskLevel: 'HIGH',
      success: false
    })
    throw error
  }
}
```

### 2.3 Implement Data Encryption

**Add encryption for sensitive fields:**

1. **Generate encryption key:**

```bash
# Generate a 256-bit key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. **Add to environment variables:**

```env
FIELD_ENCRYPTION_KEY=your_generated_key_here
```

3. **Apply encryption middleware to Prisma:**

```typescript
// In your Prisma client setup
import { createEncryptionMiddleware } from '@/lib/security/encryption'

const prisma = new PrismaClient()
prisma.$use(createEncryptionMiddleware())
```

## Phase 3: Compliance Implementation (Week 7-12)

### 3.1 FERPA Compliance

**Create FERPA consent tables:**

```sql
CREATE TABLE ferpa_consents (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  granted_to TEXT NOT NULL,
  allowed_fields JSON NOT NULL,
  purpose TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  revoked_at DATETIME,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE ferpa_access_logs (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  accessed_by TEXT NOT NULL,
  access_type TEXT NOT NULL,
  record_type TEXT NOT NULL,
  legitimate_educational_interest BOOLEAN NOT NULL,
  consent_obtained BOOLEAN NOT NULL,
  purpose TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Implement FERPA access control:**

```typescript
import { FERPAComplianceManager } from '@/lib/compliance/ferpa'

// Before accessing student data
const accessCheck = await FERPAComplianceManager.checkAccessPermission(
  session.user.id,
  studentId,
  ['grades', 'attendance', 'personal_info'],
  'Academic Monitoring'
)

if (!accessCheck.allowed) {
  if (accessCheck.requiresConsent) {
    return NextResponse.json(
      { 
        error: 'Student consent required',
        consentRequired: true,
        restrictedFields: accessCheck.restrictedFields
      },
      { status: 403 }
    )
  }
  
  return NextResponse.json(
    { error: 'Access denied' },
    { status: 403 }
  )
}
```

### 3.2 GDPR Compliance

**Create GDPR tables:**

```sql
CREATE TABLE gdpr_consents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  data_types JSON NOT NULL,
  legal_basis TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  withdrawn_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE data_subject_requests (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'PENDING',
  completion_date DATETIME,
  rejection_reason TEXT,
  metadata JSON
);
```

**Implement data subject rights:**

```typescript
import { GDPRComplianceManager } from '@/lib/compliance/gdpr'

// Handle data export request
export async function handleDataExportRequest(userId: string) {
  const request: GDPRDataSubjectRequest = {
    id: crypto.randomUUID(),
    type: 'ACCESS',
    subjectId: userId,
    requestDate: new Date(),
    status: 'PENDING'
  }

  await GDPRComplianceManager.processDataSubjectRequest(request)
}

// Schedule data retention cleanup
export async function scheduleDataCleanup() {
  await GDPRComplianceManager.scheduleDataRetention()
}
```

## Phase 4: Monitoring and Testing (Week 13-16)

### 4.1 Security Monitoring Dashboard

**Create monitoring endpoints:**

```typescript
// /src/app/api/admin/security/dashboard/route.ts
export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!isAdmin(session?.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dashboard = await generateSecurityDashboard()
  return NextResponse.json(dashboard)
}

async function generateSecurityDashboard() {
  const now = new Date()
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  return {
    failedLogins: await db.loginAttempt.count({
      where: { success: false, timestamp: { gte: last24Hours } }
    }),
    suspiciousActivity: await db.auditLog.count({
      where: { riskLevel: 'HIGH', timestamp: { gte: last24Hours } }
    }),
    activeIncidents: await db.securityIncident.count({
      where: { status: { in: ['OPEN', 'INVESTIGATING'] } }
    }),
    // ... more metrics
  }
}
```

### 4.2 Automated Security Testing

**Create security test suite:**

```typescript
// /src/lib/security/tests/security-test-suite.ts
import { SecurityTestSuite } from '@/lib/security/testing'

export async function runSecurityTests() {
  const testSuite = new SecurityTestSuite()
  const results = await testSuite.runAllTests()
  const report = await testSuite.generateSecurityReport(results)
  
  return report
}

// Schedule regular security tests
export function scheduleSecurityTests() {
  // Run daily security tests
  setInterval(async () => {
    const report = await runSecurityTests()
    
    if (report.summary.securityGrade === 'F' || report.vulnerabilities.critical > 0) {
      await notifySecurityTeam(report)
    }
  }, 24 * 60 * 60 * 1000) // 24 hours
}
```

## Environment Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth.js
NEXTAUTH_SECRET="your-super-secure-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Security
FIELD_ENCRYPTION_KEY="your-32-byte-hex-key-here"
SESSION_ENCRYPTION_KEY="your-session-encryption-key"

# Rate Limiting (optional - for distributed systems)
REDIS_URL="redis://localhost:6379"

# Monitoring (optional)
SENTRY_DSN="your-sentry-dsn"
MONITORING_WEBHOOK="your-slack-webhook-url"

# SMTP for security notifications
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-password"
SECURITY_EMAIL_FROM="security@youruniversity.edu"
SECURITY_EMAIL_TO="security-team@youruniversity.edu"
```

### Production Security Checklist

- [ ] All default passwords changed
- [ ] HTTPS enforced
- [ ] Security headers implemented
- [ ] Rate limiting active
- [ ] Audit logging enabled
- [ ] Data encryption implemented
- [ ] Access controls tested
- [ ] Backup procedures tested
- [ ] Incident response plan documented
- [ ] Security monitoring active
- [ ] Regular security scans scheduled
- [ ] Staff security training completed

### Security Monitoring Commands

```bash
# Check failed login attempts
npm run security:check-failed-logins

# Run security audit
npm run security:audit

# Generate security report
npm run security:report

# Test rate limiting
npm run security:test-rate-limits

# Validate FERPA compliance
npm run compliance:ferpa-check

# Validate GDPR compliance
npm run compliance:gdpr-check

# Run penetration tests
npm run security:pentest
```

### Incident Response Procedures

1. **Immediate Response (0-15 minutes):**
   - Identify and contain the threat
   - Notify security team
   - Preserve evidence

2. **Assessment (15-60 minutes):**
   - Assess impact and scope
   - Determine if personal data is involved
   - Notify relevant authorities if required

3. **Recovery (1-24 hours):**
   - Implement fixes
   - Restore services
   - Update security controls

4. **Follow-up (24-72 hours):**
   - Complete incident report
   - Update security procedures
   - Conduct lessons learned session

## Support and Maintenance

### Regular Security Tasks

**Daily:**
- Monitor security dashboard
- Review failed login attempts
- Check for security alerts

**Weekly:**
- Review audit logs
- Update threat intelligence
- Test backup procedures

**Monthly:**
- Security vulnerability scan
- Access review
- Update security documentation

**Quarterly:**
- Penetration testing
- Security training updates
- Policy review

### Getting Help

For security issues or questions:

1. **Emergency Security Issues:** Contact security team immediately
2. **Implementation Questions:** Review this guide and security documentation
3. **Compliance Questions:** Consult with legal/compliance team
4. **Technical Issues:** File issues in the project repository

Remember: Security is an ongoing process, not a one-time implementation. Regularly review and update security measures as threats evolve.