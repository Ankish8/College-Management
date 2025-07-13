/**
 * Integration Management API Routes
 * Handles integration registration, configuration, and management
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/utils/permissions'
import { integrationManager, IntegrationType } from '@/lib/integrations/core/integration-manager'
import { z } from 'zod'

const createIntegrationSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(IntegrationType),
  credentials: z.record(z.unknown()),
  settings: z.record(z.unknown()).optional().default({}),
  metadata: z.record(z.unknown()).optional()
})

const syncRequestSchema = z.object({
  integrationId: z.string().min(1),
  operation: z.enum(['IMPORT', 'EXPORT', 'SYNC', 'VALIDATE']),
  options: z.record(z.unknown()).optional()
})

const batchSyncSchema = z.object({
  syncs: z.array(syncRequestSchema).min(1)
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as IntegrationType
    const status = searchParams.get('status')

    let integrations = integrationManager.getAllIntegrations()

    // Filter by type if specified
    if (type && Object.values(IntegrationType).includes(type)) {
      integrations = integrationManager.getIntegrationsByType(type)
    }

    // Filter by status if specified
    if (status) {
      integrations = integrations.filter(integration => integration.getStatus() === status)
    }

    const integrationData = integrations.map(integration => ({
      id: integration.getId(),
      name: integration.getName(),
      type: integration.getType(),
      status: integration.getStatus(),
      // Don't expose sensitive credentials
      settings: integration['config'].settings,
      metadata: integration['config'].metadata
    }))

    return NextResponse.json({ integrations: integrationData })
  } catch (error) {
    console.error("Error fetching integrations:", error)
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
    const validatedData = createIntegrationSchema.parse(body)

    // Generate unique ID for the integration
    const integrationId = `${validatedData.type.toLowerCase()}_${Date.now()}`

    const config = {
      id: integrationId,
      name: validatedData.name,
      type: validatedData.type,
      status: 'PENDING' as any,
      credentials: validatedData.credentials,
      settings: validatedData.settings,
      metadata: validatedData.metadata
    }

    // Create integration instance based on type
    let integration
    try {
      integration = await createIntegrationInstance(config)
    } catch (error) {
      return NextResponse.json(
        { error: `Failed to create integration: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 400 }
      )
    }

    // Register the integration
    const result = await integrationManager.registerIntegration(integration)

    if (result.success) {
      return NextResponse.json({
        integration: {
          id: integration.getId(),
          name: integration.getName(),
          type: integration.getType(),
          status: integration.getStatus(),
          settings: integration['config'].settings,
          metadata: integration['config'].metadata
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

    console.error("Error creating integration:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Sync endpoint
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'sync') {
      const body = await request.json()
      
      // Check if it's a single sync or batch sync
      if (body.syncs) {
        // Batch sync
        const validatedData = batchSyncSchema.parse(body)
        
        const syncConfigs = validatedData.syncs.map(sync => ({
          integrationId: sync.integrationId,
          operation: sync.operation as any,
          options: sync.options
        }))

        const results = await integrationManager.batchSync(syncConfigs)
        
        return NextResponse.json({ results })
      } else {
        // Single sync
        const validatedData = syncRequestSchema.parse(body)
        
        const result = await integrationManager.syncData(
          validatedData.integrationId,
          validatedData.operation as any,
          validatedData.options
        )
        
        return NextResponse.json({ result })
      }
    } else if (action === 'health-check') {
      const results = await integrationManager.healthCheckAll()
      return NextResponse.json({ healthChecks: results })
    } else {
      return NextResponse.json(
        { error: "Invalid action parameter" },
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

    console.error("Error in sync operation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Helper function to create integration instances
async function createIntegrationInstance(config: any) {
  const { MoodleIntegration } = await import('@/lib/integrations/providers/lms/moodle-integration')
  const { TeamsIntegration } = await import('@/lib/integrations/providers/communication/teams-integration')
  const { SAMLIntegration } = await import('@/lib/integrations/providers/auth/saml-integration')
  const { StripeIntegration } = await import('@/lib/integrations/providers/payment/stripe-integration')

  switch (config.type) {
    case IntegrationType.LMS:
      // For now, defaulting to Moodle. In a real implementation, 
      // you'd have logic to determine which LMS provider to use
      return new MoodleIntegration(config)
      
    case IntegrationType.COMMUNICATION:
      // For now, defaulting to Teams. You'd have logic for different providers
      return new TeamsIntegration(config)
      
    case IntegrationType.AUTHENTICATION:
      // For now, defaulting to SAML. You'd have logic for OAuth, LDAP, etc.
      return new SAMLIntegration(config)
      
    case IntegrationType.PAYMENT:
      // For now, defaulting to Stripe. You'd have logic for different payment providers
      return new StripeIntegration(config)
      
    default:
      throw new Error(`Unsupported integration type: ${config.type}`)
  }
}