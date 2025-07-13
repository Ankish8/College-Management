/**
 * Individual Webhook API Routes
 * Handles specific webhook operations (get, update, delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/utils/permissions'
import { webhookManager } from '@/lib/integrations/core/webhook-manager'
import { z } from 'zod'

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const webhook = webhookManager.getWebhook(params.id)

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    }

    return NextResponse.json({
      webhook: {
        ...webhook,
        secret: undefined // Don't expose secret in response
      }
    })
  } catch (error) {
    console.error("Error fetching webhook:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const webhook = webhookManager.getWebhook(params.id)
    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = updateWebhookSchema.parse(body)

    const result = await webhookManager.updateWebhook(params.id, validatedData)

    if (result.success) {
      const updatedWebhook = webhookManager.getWebhook(params.id)
      
      return NextResponse.json({
        webhook: {
          ...updatedWebhook,
          secret: undefined // Don't expose secret in response
        }
      })
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

    console.error("Error updating webhook:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const webhook = webhookManager.getWebhook(params.id)
    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    }

    const result = await webhookManager.unregisterWebhook(params.id)

    if (result.success) {
      return NextResponse.json({ message: "Webhook deleted successfully" })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error deleting webhook:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}