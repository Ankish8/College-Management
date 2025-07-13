/**
 * Webhook API Routes
 * Handles webhook registration, management, and event delivery
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/utils/permissions'
import { webhookManager } from '@/lib/integrations/core/webhook-manager'
import { z } from 'zod'

const createWebhookSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  integrationId: z.string().optional(),
  headers: z.record(z.string()).optional(),
  timeout: z.number().min(1000).max(60000).optional(),
  retryConfig: z.object({
    maxAttempts: z.number().min(1).max(10).optional(),
    backoffMultiplier: z.number().min(1).optional(),
    initialDelay: z.number().min(100).optional(),
    maxDelay: z.number().min(1000).optional()
  }).optional()
})

const updateWebhookSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
  headers: z.record(z.string()).optional(),
  timeout: z.number().min(1000).max(60000).optional(),
  retryConfig: z.object({
    maxAttempts: z.number().min(1).max(10).optional(),
    backoffMultiplier: z.number().min(1).optional(),
    initialDelay: z.number().min(100).optional(),
    maxDelay: z.number().min(1000).optional()
  }).optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const integrationId = searchParams.get('integrationId')
    const isActive = searchParams.get('active')

    let webhooks = webhookManager.getAllWebhooks()

    // Filter by integration if specified
    if (integrationId) {
      webhooks = webhooks.filter(webhook => webhook.integrationId === integrationId)
    }

    // Filter by active status if specified
    if (isActive !== null) {
      const activeFilter = isActive === 'true'
      webhooks = webhooks.filter(webhook => webhook.isActive === activeFilter)
    }

    return NextResponse.json({
      webhooks: webhooks.map(webhook => ({
        ...webhook,
        secret: undefined // Don't expose secret in response
      }))
    })
  } catch (error) {
    console.error("Error fetching webhooks:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createWebhookSchema.parse(body)

    const result = await webhookManager.registerWebhook(validatedData)

    if (result.success) {
      const webhook = webhookManager.getWebhook(result.webhookId!)
      
      return NextResponse.json({
        webhook: {
          ...webhook,
          secret: undefined // Don't expose secret in response
        }
      }, { status: 201 })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating webhook:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}