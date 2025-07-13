// Enhanced Authentication System with Security Features
import CredentialsProvider from "next-auth/providers/credentials"
import type { NextAuthOptions, User } from "next-auth"
import type { Role, UserStatus } from "@prisma/client"
import { db } from "@/lib/db"
import { PasswordManager } from "@/lib/security/password"
import { AuditLogger, AuditEventType } from "@/lib/security/audit"
import { rateLimiters } from "@/lib/security/rate-limiting"
import crypto from 'crypto'

export interface SecureAuthUser extends User {
  id: string
  email: string
  name: string | null
  role: Role
  phone: string | null
  employeeId: string | null
  departmentId: string | null
  status: UserStatus
  department?: any
  student?: any
  mfaEnabled?: boolean
  requiresPasswordReset?: boolean
}

export const enhancedAuthOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaToken: { label: "MFA Token", type: "text" },
        rememberMe: { label: "Remember Me", type: "checkbox" }
      },
      async authorize(credentials, req) {
        try {
          if (!credentials?.email || !credentials?.password) {
            await logAuthEvent('LOGIN_FAILED', null, 'Missing credentials', req)
            return null
          }

          const clientIP = getClientIP(req)
          const userAgent = req.headers?.['user-agent'] || 'unknown'

          // Rate limiting check
          if (!rateLimiters.login.isAllowed(clientIP)) {
            await logAuthEvent('LOGIN_FAILED', null, 'Rate limit exceeded', req)
            throw new Error('Too many login attempts. Please try again later.')
          }

          // Find user by email
          const user = await db.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
            include: {
              department: true,
              student: {
                include: { batch: true }
              },
              mfaSettings: true
            }
          })

          if (!user) {
            await logFailedLogin(credentials.email, clientIP, userAgent, 'User not found')
            return null
          }

          // Check if account is locked or suspended
          if (user.status === 'SUSPENDED') {
            await logAuthEvent('LOGIN_FAILED', user, 'Account suspended', req)
            throw new Error('Account has been suspended. Contact administrator.')
          }

          if (user.status === 'INACTIVE') {
            await logAuthEvent('LOGIN_FAILED', user, 'Account inactive', req)
            throw new Error('Account is inactive. Contact administrator.')
          }

          // Check for account lockout
          if (await isAccountLocked(user.id)) {
            await logAuthEvent('LOGIN_FAILED', user, 'Account locked', req)
            throw new Error('Account is temporarily locked due to too many failed attempts.')
          }

          // Verify password
          if (!user.passwordHash) {
            await logAuthEvent('LOGIN_FAILED', user, 'No password set', req)
            throw new Error('Account not properly configured. Contact administrator.')
          }

          const isPasswordValid = await PasswordManager.verifyPassword(
            credentials.password, 
            user.passwordHash
          )

          if (!isPasswordValid) {
            await handleFailedLogin(user.id, clientIP, userAgent, 'Invalid password')
            return null
          }

          // Check if password reset is required
          if (user.passwordResetRequired) {
            await logAuthEvent('LOGIN_FAILED', user, 'Password reset required', req)
            throw new Error('Password reset required. Please check your email for reset instructions.')
          }

          // Check MFA if enabled
          if (user.mfaSettings?.isEnabled) {
            if (!credentials.mfaToken) {
              await logAuthEvent('LOGIN_FAILED', user, 'MFA token required', req)
              throw new Error('MFA token required')
            }

            const mfaValid = await verifyMFAToken(user.id, credentials.mfaToken)
            if (!mfaValid) {
              await handleFailedLogin(user.id, clientIP, userAgent, 'Invalid MFA token')
              return null
            }
          }

          // Successful login
          await handleSuccessfulLogin(user, clientIP, userAgent, credentials.rememberMe === 'true')

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            phone: user.phone,
            employeeId: user.employeeId,
            departmentId: user.departmentId,
            status: user.status,
            department: user.department,
            student: user.student,
            mfaEnabled: user.mfaSettings?.isEnabled || false,
            requiresPasswordReset: user.passwordResetRequired || false
          } as SecureAuthUser

        } catch (error) {
          console.error("Enhanced auth error:", error)
          
          if (error instanceof Error) {
            throw error // Re-throw known errors
          }
          
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (trigger === 'update' && session) {
        // Handle session updates
        return { ...token, ...session }
      }

      if (user) {
        // Store user data in JWT on login
        const secureUser = user as SecureAuthUser
        token.id = secureUser.id
        token.role = secureUser.role
        token.phone = secureUser.phone
        token.employeeId = secureUser.employeeId
        token.departmentId = secureUser.departmentId
        token.status = secureUser.status
        token.mfaEnabled = secureUser.mfaEnabled
        token.requiresPasswordReset = secureUser.requiresPasswordReset
        
        // Include related data
        token.department = secureUser.department
        token.student = secureUser.student

        // Add security metadata
        token.loginTime = Date.now()
        token.sessionId = crypto.randomUUID()
      }

      return token
    },
    
    async session({ session, token }) {
      if (session.user && token.id) {
        // Build secure session object
        session.user = {
          ...session.user,
          id: token.id as string,
          role: token.role as Role,
          phone: token.phone as string | null,
          employeeId: token.employeeId as string | null,
          departmentId: token.departmentId as string | null,
          status: token.status as UserStatus,
          department: token.department as any,
          student: token.student as any,
          mfaEnabled: token.mfaEnabled as boolean,
          requiresPasswordReset: token.requiresPasswordReset as boolean
        }

        // Add session metadata
        session.loginTime = token.loginTime as number
        session.sessionId = token.sessionId as string

        // Check if session is still valid
        if (await isSessionExpired(token.id as string, token.sessionId as string)) {
          throw new Error('Session expired')
        }
      }

      return session
    },

    async signIn({ user, account, profile, email, credentials }) {
      // Additional sign-in validation
      const secureUser = user as SecureAuthUser
      
      if (secureUser.status !== 'ACTIVE') {
        return false
      }

      if (secureUser.requiresPasswordReset) {
        return false
      }

      return true
    }
  },
  
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours default
    updateAge: 60 * 60,  // Update every hour
  },
  
  cookies: {
    sessionToken: {
      name: `jlu-attendance.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 8 * 60 * 60 // 8 hours
      },
    },
    callbackUrl: {
      name: `jlu-attendance.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `jlu-attendance.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      await logAuthEvent('LOGIN', user, 'User signed in', null)
    },
    
    async signOut({ session, token }) {
      await logAuthEvent('LOGOUT', session?.user, 'User signed out', null)
      
      // Invalidate session in database
      if (token?.sessionId) {
        await invalidateSession(token.sessionId as string)
      }
    }
  }
}

// Helper functions

async function handleSuccessfulLogin(
  user: any, 
  ipAddress: string, 
  userAgent: string, 
  rememberMe: boolean = false
): Promise<void> {
  // Clear failed login attempts
  await clearFailedLoginAttempts(user.id)
  
  // Update last login
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  })

  // Create session record
  const sessionExpiry = rememberMe 
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    : new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours

  await db.userSession.create({
    data: {
      userId: user.id,
      token: crypto.randomUUID(),
      ipAddress,
      userAgent,
      expiresAt: sessionExpiry
    }
  })

  // Log successful login
  await AuditLogger.logEvent({
    eventType: AuditEventType.LOGIN,
    userId: user.id,
    userRole: user.role,
    ipAddress,
    userAgent,
    resource: 'authentication',
    action: 'login',
    details: { rememberMe },
    riskLevel: 'LOW',
    success: true
  })
}

async function handleFailedLogin(
  userId: string, 
  ipAddress: string, 
  userAgent: string, 
  reason: string
): Promise<void> {
  // Log failed attempt in database
  await db.loginAttempt.create({
    data: {
      email: userId, // Using userId here, but could be email
      ipAddress,
      userAgent,
      success: false,
      failureReason: reason
    }
  })

  // Check if account should be locked
  const recentFailedAttempts = await db.loginAttempt.count({
    where: {
      email: userId,
      success: false,
      timestamp: {
        gte: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
      }
    }
  })

  if (recentFailedAttempts >= 5) {
    await lockAccount(userId)
  }

  // Log security event
  await AuditLogger.logEvent({
    eventType: AuditEventType.LOGIN_FAILED,
    userId,
    userRole: 'UNKNOWN',
    ipAddress,
    userAgent,
    resource: 'authentication',
    action: 'login_failed',
    details: { reason, attemptCount: recentFailedAttempts },
    riskLevel: recentFailedAttempts >= 3 ? 'HIGH' : 'MEDIUM',
    success: false
  })
}

async function logFailedLogin(
  email: string, 
  ipAddress: string, 
  userAgent: string, 
  reason: string
): Promise<void> {
  await db.loginAttempt.create({
    data: {
      email,
      ipAddress,
      userAgent,
      success: false,
      failureReason: reason
    }
  })
}

async function isAccountLocked(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { lockedUntil: true }
  })

  return user?.lockedUntil ? user.lockedUntil > new Date() : false
}

async function lockAccount(userId: string): Promise<void> {
  const lockUntil = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
  
  await db.user.update({
    where: { id: userId },
    data: { lockedUntil: lockUntil }
  })

  await AuditLogger.logEvent({
    eventType: AuditEventType.SYSTEM_CONFIG_CHANGE,
    userId: 'SYSTEM',
    userRole: 'SYSTEM',
    ipAddress: 'internal',
    userAgent: 'security-system',
    resource: 'user-account',
    action: 'account-locked',
    details: { targetUserId: userId, lockUntil },
    riskLevel: 'HIGH',
    success: true
  })
}

async function clearFailedLoginAttempts(userId: string): Promise<void> {
  await db.loginAttempt.deleteMany({
    where: {
      email: userId,
      success: false
    }
  })

  // Clear account lock if any
  await db.user.update({
    where: { id: userId },
    data: { lockedUntil: null }
  })
}

async function verifyMFAToken(userId: string, token: string): Promise<boolean> {
  const mfaSettings = await db.mfaSettings.findUnique({
    where: { userId }
  })

  if (!mfaSettings || !mfaSettings.isEnabled) {
    return false
  }

  // Implementation would depend on MFA provider
  // For TOTP: verify against the secret
  // For now, returning false as MFA implementation is not complete
  return false
}

async function isSessionExpired(userId: string, sessionId: string): Promise<boolean> {
  const session = await db.userSession.findFirst({
    where: {
      userId,
      token: sessionId,
      isActive: true,
      expiresAt: { gt: new Date() }
    }
  })

  return !session
}

async function invalidateSession(sessionId: string): Promise<void> {
  await db.userSession.updateMany({
    where: { token: sessionId },
    data: { isActive: false }
  })
}

async function logAuthEvent(
  eventType: string, 
  user: any, 
  details: string, 
  req: any
): Promise<void> {
  try {
    await AuditLogger.logEvent({
      eventType: eventType as AuditEventType,
      userId: user?.id || 'ANONYMOUS',
      userRole: user?.role || 'UNKNOWN',
      ipAddress: getClientIP(req) || 'unknown',
      userAgent: req?.headers?.['user-agent'] || 'unknown',
      resource: 'authentication',
      action: eventType.toLowerCase(),
      details: { details },
      riskLevel: eventType.includes('FAILED') ? 'MEDIUM' : 'LOW',
      success: !eventType.includes('FAILED')
    })
  } catch (error) {
    console.error('Failed to log auth event:', error)
  }
}

function getClientIP(req: any): string | null {
  if (!req) return null
  
  const forwarded = req.headers?.['x-forwarded-for']
  const realIP = req.headers?.['x-real-ip']
  const socketIP = req.connection?.remoteAddress
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  return realIP || socketIP || null
}