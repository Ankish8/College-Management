// Enhanced Password Security Implementation
import bcrypt from 'bcryptjs'
import zxcvbn from 'zxcvbn'
import { db } from '@/lib/db'

export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  minStrengthScore: number
  preventReuse: number // Number of previous passwords to check
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  minStrengthScore: 3,
  preventReuse: 5
}

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  strengthScore: number
  strengthText: string
  suggestions: string[]
}

export class PasswordManager {
  /**
   * Hash password using bcrypt with high salt rounds
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 14 // High security for educational data
    return await bcrypt.hash(password, saltRounds)
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash)
    } catch (error) {
      console.error('Password verification error:', error)
      return false
    }
  }

  /**
   * Validate password against policy and strength requirements
   */
  static validatePassword(
    password: string, 
    policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
    userInfo?: { email?: string; name?: string }
  ): PasswordValidationResult {
    const errors: string[] = []
    const result = zxcvbn(password, userInfo ? [userInfo.email, userInfo.name].filter(Boolean) : [])

    // Length check
    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`)
    }

    // Character type requirements
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

    // Strength check
    if (result.score < policy.minStrengthScore) {
      errors.push('Password is too weak. Please choose a stronger password.')
    }

    // Common password patterns
    const commonPatterns = [
      /password/i,
      /123456/,
      /qwerty/i,
      /admin/i,
      /letmein/i,
      /welcome/i
    ]

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        errors.push('Password contains common patterns and is easily guessable')
        break
      }
    }

    // Personal information check
    if (userInfo) {
      const personalInfo = [userInfo.email?.split('@')[0], userInfo.name].filter(Boolean)
      for (const info of personalInfo) {
        if (info && password.toLowerCase().includes(info.toLowerCase())) {
          errors.push('Password should not contain personal information')
          break
        }
      }
    }

    const strengthTexts = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']

    return {
      isValid: errors.length === 0 && result.score >= policy.minStrengthScore,
      errors,
      strengthScore: result.score,
      strengthText: strengthTexts[result.score] || 'Unknown',
      suggestions: result.feedback.suggestions || []
    }
  }

  /**
   * Check if password was used recently (prevents reuse)
   */
  static async checkPasswordReuse(userId: string, newPassword: string, policy: PasswordPolicy): Promise<boolean> {
    if (policy.preventReuse === 0) return false

    const passwordHistory = await db.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: policy.preventReuse
    })

    for (const historicalPassword of passwordHistory) {
      if (await this.verifyPassword(newPassword, historicalPassword.passwordHash)) {
        return true // Password was used before
      }
    }

    return false
  }

  /**
   * Store password in history for reuse prevention
   */
  static async storePasswordHistory(userId: string, passwordHash: string): Promise<void> {
    await db.passwordHistory.create({
      data: {
        userId,
        passwordHash
      }
    })

    // Clean up old password history (keep only last 10)
    const oldPasswords = await db.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: 10
    })

    if (oldPasswords.length > 0) {
      await db.passwordHistory.deleteMany({
        where: {
          id: { in: oldPasswords.map(p => p.id) }
        }
      })
    }
  }

  /**
   * Change user password with full security checks
   */
  static async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string,
    policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
  ): Promise<{ success: boolean; errors: string[] }> {
    // Get current user
    const user = await db.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return { success: false, errors: ['User not found'] }
    }

    // Verify current password (if user has one)
    if (user.passwordHash && !(await this.verifyPassword(currentPassword, user.passwordHash))) {
      return { success: false, errors: ['Current password is incorrect'] }
    }

    // Validate new password
    const validation = this.validatePassword(newPassword, policy, {
      email: user.email,
      name: user.name || undefined
    })

    if (!validation.isValid) {
      return { success: false, errors: validation.errors }
    }

    // Check password reuse
    if (await this.checkPasswordReuse(userId, newPassword, policy)) {
      return { 
        success: false, 
        errors: [`Cannot reuse any of your last ${policy.preventReuse} passwords`] 
      }
    }

    // Hash and store new password
    const newPasswordHash = await this.hashPassword(newPassword)
    
    await db.user.update({
      where: { id: userId },
      data: { 
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date()
      }
    })

    // Store in password history
    await this.storePasswordHistory(userId, newPasswordHash)

    // Invalidate all user sessions (force re-login)
    await this.invalidateUserSessions(userId)

    return { success: true, errors: [] }
  }

  /**
   * Force password reset (admin function)
   */
  static async forcePasswordReset(userIds: string[]): Promise<void> {
    await db.user.updateMany({
      where: { id: { in: userIds } },
      data: { 
        passwordResetRequired: true,
        passwordResetToken: crypto.randomUUID(),
        passwordResetExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    })

    // Invalidate all sessions for these users
    for (const userId of userIds) {
      await this.invalidateUserSessions(userId)
    }
  }

  /**
   * Generate secure temporary password
   */
  static generateTemporaryPassword(length: number = 16): string {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*'
    let password = ''
    
    // Ensure at least one character from each required type
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const lower = 'abcdefghijkmnpqrstuvwxyz'
    const numbers = '23456789'
    const special = '!@#$%^&*'
    
    password += upper[Math.floor(Math.random() * upper.length)]
    password += lower[Math.floor(Math.random() * lower.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += special[Math.floor(Math.random() * special.length)]
    
    // Fill remaining length
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)]
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  /**
   * Invalidate all user sessions
   */
  private static async invalidateUserSessions(userId: string): Promise<void> {
    await db.userSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false }
    })
  }
}

/**
 * Middleware to enforce password policy
 */
export function enforcePasswordPolicy(policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY) {
  return async function(userId: string, newPassword: string): Promise<void> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    })

    const validation = PasswordManager.validatePassword(newPassword, policy, {
      email: user?.email,
      name: user?.name || undefined
    })

    if (!validation.isValid) {
      throw new Error(`Password policy violation: ${validation.errors.join(', ')}`)
    }

    if (await PasswordManager.checkPasswordReuse(userId, newPassword, policy)) {
      throw new Error(`Cannot reuse any of your last ${policy.preventReuse} passwords`)
    }
  }
}