import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Get user with password field
    const user = await db.user.findUnique({
      where: { id: (session.user as any).id },
      select: {
        id: true,
        email: true,
        password: true,
        role: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check current password based on role
    let isCurrentPasswordValid = false
    
    // For admin - check against admin password
    if (user.email === 'admin@jlu.edu.in') {
      isCurrentPasswordValid = currentPassword === 'JLU@2025admin'
    } 
    // For faculty - check against faculty password
    else if (user.role === 'FACULTY') {
      isCurrentPasswordValid = currentPassword === 'JLU@2025faculty'
    }
    // If user has a hashed password in database, check against it
    else if (user.password) {
      isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
    }

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update user password
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    })

    return NextResponse.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    )
  }
}