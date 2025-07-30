import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/utils/permissions'
import { 
  cloneTimetable, 
  replaceFaculty, 
  bulkReschedule, 
  applyTemplate,
  validateBulkOperation,
  dryRunBulkOperation,
  BulkOperationOptions
} from '@/lib/timetable/bulk-operations'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { operation, options } = body as { operation: string; options: BulkOperationOptions }

    // Handle dry-run requests
    if (options.options?.dryRun) {
      const dryRunResult = await dryRunBulkOperation(options, (session.user as any).id)
      return NextResponse.json(dryRunResult)
    }

    // Validate the operation first (for real operations)
    const validation = await validateBulkOperation(options)
    if (!validation.isValid) {
      return NextResponse.json({
        error: 'Validation failed',
        conflicts: validation.conflicts,
        warnings: validation.warnings,
        suggestions: validation.suggestions,
        detectedConflicts: validation.detectedConflicts
      }, { status: 400 })
    }

    let result

    switch (operation) {
      case 'clone':
        if (!options.sourceData?.batchId || !options.targetData?.batchId) {
          return NextResponse.json({ error: 'Source and target batch IDs are required' }, { status: 400 })
        }
        result = await cloneTimetable({
          sourceBatchId: options.sourceData.batchId,
          targetBatchId: options.targetData.batchId,
          startDate: options.sourceData.dateRange?.start,
          endDate: options.sourceData.dateRange?.end,
          preserveFaculty: options.options?.preserveConflicts !== false,
          handleConflicts: options.options?.updateExisting ? 'override' : 'skip'
        }, (session.user as any).id)
        break

      case 'faculty_replace':
        if (!options.sourceData?.facultyId || !options.targetData?.facultyId) {
          return NextResponse.json({ error: 'Current and new faculty IDs are required' }, { status: 400 })
        }
        result = await replaceFaculty({
          currentFacultyId: options.sourceData.facultyId,
          newFacultyId: options.targetData.facultyId,
          batchIds: options.targetData?.batchId ? [options.targetData.batchId] : undefined,
          effectiveDate: options.sourceData.dateRange?.start,
          maintainWorkload: true
        }, (session.user as any).id)
        break

      case 'reschedule':
        if (!options.sourceData?.dateRange || !options.targetData?.dateRange) {
          return NextResponse.json({ error: 'Source and target date ranges are required' }, { status: 400 })
        }
        result = await bulkReschedule({
          sourceStartDate: options.sourceData.dateRange.start,
          sourceEndDate: options.sourceData.dateRange.end,
          targetStartDate: options.targetData.dateRange.start,
          targetEndDate: options.targetData.dateRange.end,
          batchIds: options.targetData?.batchId ? [options.targetData.batchId] : undefined,
          moveType: options.targetData?.dayOffset ? 'shift' : 'map',
          excludeWeekends: true,
          respectBlackouts: true
        }, (session.user as any).id)
        break

      case 'template_apply':
        if (!options.sourceData?.templateId || !options.targetData?.batchId) {
          return NextResponse.json({ error: 'Template ID and target batch ID are required' }, { status: 400 })
        }
        result = await applyTemplate(
          options.sourceData.templateId,
          [options.targetData.batchId]
        )
        break

      default:
        return NextResponse.json({ error: 'Invalid operation type' }, { status: 400 })
    }

    return NextResponse.json({
      success: result.success,
      operationId: result.operationId,
      summary: result.summary,
      affected: result.affected,
      successful: result.successful,
      failed: result.failed,
      errors: result.errors,
      warnings: result.warnings
    })

  } catch (error) {
    console.error('Bulk operation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const operationId = searchParams.get('operationId')
    const history = searchParams.get('history')

    if (operationId) {
      // Get specific operation status
      const { getOperationProgress } = await import('@/lib/timetable/bulk-operations')
      const progress = await getOperationProgress(operationId)
      return NextResponse.json(progress)
    }

    if (history) {
      // Get operation history
      const { getOperationHistory } = await import('@/lib/timetable/bulk-operations')
      const limit = parseInt(searchParams.get('limit') || '10')
      const operations = await getOperationHistory(limit, (session.user as any).id)
      return NextResponse.json({ operations })
    }

    return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 })

  } catch (error) {
    console.error('Bulk operation GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const operationId = searchParams.get('operationId')

    if (!operationId) {
      return NextResponse.json({ error: 'Operation ID is required' }, { status: 400 })
    }

    const { cancelOperation } = await import('@/lib/timetable/bulk-operations')
    const cancelled = await cancelOperation(operationId)

    if (cancelled) {
      return NextResponse.json({ success: true, message: 'Operation cancelled successfully' })
    } else {
      return NextResponse.json({ error: 'Failed to cancel operation' }, { status: 400 })
    }

  } catch (error) {
    console.error('Bulk operation DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}