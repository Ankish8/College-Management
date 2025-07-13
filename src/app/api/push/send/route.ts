import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import webpush from 'web-push'
import { isAdmin, isFaculty } from '@/lib/utils/permissions'

// Initialize web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@jlu.edu.in',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: any
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  urgent?: boolean
  url?: string
}

interface SendNotificationRequest {
  userIds?: string[]
  roles?: string[]
  batchIds?: string[]
  payload: NotificationPayload
  scheduleAt?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only faculty and admin can send notifications
    if (!isFaculty(session.user as any) && !isAdmin(session.user as any)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const {
      userIds,
      roles,
      batchIds,
      payload,
      scheduleAt
    }: SendNotificationRequest = await request.json()

    if (!payload.title || !payload.body) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      )
    }

    // Build user query based on targeting criteria
    let whereClause: any = {}

    if (userIds && userIds.length > 0) {
      whereClause.id = { in: userIds }
    } else {
      // Build complex query for roles and batches
      const conditions: any[] = []

      if (roles && roles.length > 0) {
        conditions.push({ role: { in: roles } })
      }

      if (batchIds && batchIds.length > 0) {
        conditions.push({
          student: {
            batchId: { in: batchIds }
          }
        })
      }

      if (conditions.length > 0) {
        whereClause.OR = conditions
      }
    }

    // Get target users and their subscriptions
    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        pushSubscriptions: true,
        student: {
          include: {
            batch: true
          }
        }
      }
    })

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'No users found matching criteria' },
        { status: 404 }
      )
    }

    // Prepare notification payload
    const notificationPayload = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/attendance-96x96.png',
      tag: payload.tag || `jlu-cms-${Date.now()}`,
      data: {
        url: payload.url || '/dashboard',
        timestamp: new Date().toISOString(),
        ...payload.data
      },
      actions: payload.actions || [
        {
          action: 'view',
          title: 'View Details'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      requireInteraction: payload.urgent || false
    }

    // Send notifications
    const notifications: Promise<any>[] = []
    let totalSubscriptions = 0

    for (const user of users) {
      for (const subscription of user.pushSubscriptions) {
        totalSubscriptions++
        
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dhKey,
            auth: subscription.authKey
          }
        }

        notifications.push(
          webpush.sendNotification(
            pushSubscription,
            JSON.stringify(notificationPayload),
            {
              urgency: payload.urgent ? 'high' : 'normal',
              TTL: 24 * 60 * 60 // 24 hours
            }
          ).catch(async (error) => {
            console.error('Push notification failed:', error)
            
            // Remove invalid subscriptions
            if (error.statusCode === 410 || error.statusCode === 404) {
              await prisma.pushSubscription.delete({
                where: { id: subscription.id }
              }).catch(() => {})
            }
            
            return { error: error.message, subscriptionId: subscription.id }
          })
        )
      }
    }

    // Wait for all notifications to be sent
    const results = await Promise.allSettled(notifications)
    
    const successful = results.filter(result => 
      result.status === 'fulfilled' && !result.value?.error
    ).length

    const failed = totalSubscriptions - successful

    // Log notification for analytics
    await prisma.notificationLog.create({
      data: {
        senderId: session.user.id,
        title: payload.title,
        body: payload.body,
        targetCount: totalSubscriptions,
        successCount: successful,
        failureCount: failed,
        metadata: {
          roles,
          batchIds,
          userIds: userIds?.slice(0, 10), // Limit for storage
          tag: payload.tag
        }
      }
    }).catch(error => {
      console.error('Failed to log notification:', error)
    })

    return NextResponse.json({
      success: true,
      targetUsers: users.length,
      totalSubscriptions,
      successful,
      failed,
      messageId: payload.tag
    })

  } catch (error) {
    console.error('Send notification error:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}

// Get notification statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!isAdmin(session.user as any)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const stats = await prisma.notificationLog.groupBy({
      by: ['senderId'],
      _count: {
        id: true
      },
      _sum: {
        targetCount: true,
        successCount: true,
        failureCount: true
      },
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    })

    const totalNotifications = await prisma.notificationLog.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    })

    const totalSubscriptions = await prisma.pushSubscription.count()

    return NextResponse.json({
      totalNotifications,
      totalSubscriptions,
      senderStats: stats
    })

  } catch (error) {
    console.error('Get notification stats error:', error)
    return NextResponse.json(
      { error: 'Failed to get statistics' },
      { status: 500 }
    )
  }
}