import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// Simple in-memory store for import status (in production, use Redis/database)
declare global {
  var importStatus: Map<string, {
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
    progress: number
    results?: any
    errors?: any[]
    createdAt: Date
    updatedAt?: Date
  }>
}

// Initialize global import status store
if (!global.importStatus) {
  global.importStatus = new Map()
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ importId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const params = await context.params
    const { importId } = params

    if (!importId) {
      return NextResponse.json({ 
        error: "Import ID is required" 
      }, { status: 400 })
    }

    const status = global.importStatus.get(importId)

    if (!status) {
      return NextResponse.json({ 
        error: "Import not found",
        message: `No import found with ID: ${importId}`,
        suggestion: "Check if the import ID is correct or if the import has expired"
      }, { status: 404 })
    }

    // Calculate time elapsed
    const now = new Date()
    const elapsed = now.getTime() - status.createdAt.getTime()
    const elapsedMinutes = Math.floor(elapsed / 60000)
    const elapsedSeconds = Math.floor((elapsed % 60000) / 1000)

    const response = {
      importId,
      status: status.status,
      progress: status.progress,
      timeElapsed: {
        minutes: elapsedMinutes,
        seconds: elapsedSeconds,
        totalMs: elapsed
      },
      createdAt: status.createdAt.toISOString(),
      updatedAt: status.updatedAt?.toISOString() || status.createdAt.toISOString()
    }

    // Add results if completed
    if (status.status === 'COMPLETED' && status.results) {
      Object.assign(response, {
        results: status.results,
        summary: {
          success: true,
          message: "Import completed successfully",
          ...status.results
        }
      })
    }

    // Add errors if failed
    if (status.status === 'FAILED' && status.errors) {
      Object.assign(response, {
        errors: status.errors,
        summary: {
          success: false,
          message: "Import failed",
          errorCount: status.errors.length
        }
      })
    }

    // Add estimated completion time for processing imports
    if (status.status === 'PROCESSING' && status.progress > 0) {
      const estimatedTotal = (elapsed / status.progress) * 100
      const estimatedRemaining = estimatedTotal - elapsed
      Object.assign(response, {
        estimation: {
          totalTimeMs: Math.round(estimatedTotal),
          remainingTimeMs: Math.round(estimatedRemaining),
          remainingSeconds: Math.round(estimatedRemaining / 1000),
          expectedCompletion: new Date(now.getTime() + estimatedRemaining).toISOString()
        }
      })
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Status API Error:', error)
    return NextResponse.json({
      error: "Internal server error",
      message: error.message
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ importId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const params = await context.params
    const { importId } = params

    if (!importId) {
      return NextResponse.json({ 
        error: "Import ID is required" 
      }, { status: 400 })
    }

    const status = global.importStatus.get(importId)

    if (!status) {
      return NextResponse.json({ 
        error: "Import not found" 
      }, { status: 404 })
    }

    // Only allow deletion of completed or failed imports
    if (status.status === 'PROCESSING') {
      return NextResponse.json({ 
        error: "Cannot delete active import",
        message: "Wait for import to complete or fail before deleting"
      }, { status: 400 })
    }

    // Delete from status store
    global.importStatus.delete(importId)

    return NextResponse.json({
      success: true,
      message: `Import status for '${importId}' deleted successfully`
    })

  } catch (error: any) {
    console.error('Status Delete API Error:', error)
    return NextResponse.json({
      error: "Internal server error",
      message: error.message
    }, { status: 500 })
  }
}

// List all import statuses (for debugging/admin)
export async function HEAD(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const allStatuses = Array.from(global.importStatus.entries()).map(([id, status]) => ({
      importId: id,
      status: status.status,
      progress: status.progress,
      createdAt: status.createdAt.toISOString(),
      timeElapsed: Date.now() - status.createdAt.getTime()
    }))

    return NextResponse.json({
      message: "All import statuses",
      count: allStatuses.length,
      statuses: allStatuses.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    })

  } catch (error: any) {
    console.error('Status List API Error:', error)
    return NextResponse.json({
      error: "Internal server error", 
      message: error.message
    }, { status: 500 })
  }
}