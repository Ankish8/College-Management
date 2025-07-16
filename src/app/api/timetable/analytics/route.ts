import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/utils/permissions'
import {
  calculateFacultyWorkload,
  generateWorkloadAnalytics,
  calculateTimetableEfficiency,
  analyzeConflicts,
  generateOptimizationSuggestions,
  calculateSubjectAnalytics,
  calculateBatchCoverage,
  exportAnalytics
} from '@/lib/timetable/analytics'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get('type')
    const facultyId = searchParams.get('facultyId')
    const export_format = searchParams.get('export')

    switch (type) {
      case 'faculty_workload':
        const workloadData = await calculateFacultyWorkload(facultyId || undefined)
        return NextResponse.json({ data: workloadData })

      case 'workload_analytics':
        const analytics = await generateWorkloadAnalytics()
        return NextResponse.json({ data: analytics })

      case 'efficiency':
        const efficiency = await calculateTimetableEfficiency()
        return NextResponse.json({ data: efficiency })

      case 'conflicts':
        const conflicts = await analyzeConflicts()
        return NextResponse.json({ data: conflicts })

      case 'optimization':
        const suggestions = await generateOptimizationSuggestions()
        return NextResponse.json({ data: suggestions })

      case 'subjects':
        const subjectAnalytics = await calculateSubjectAnalytics()
        return NextResponse.json({ data: subjectAnalytics })

      case 'batches':
        const batchCoverage = await calculateBatchCoverage()
        return NextResponse.json({ data: batchCoverage })

      case 'summary':
        // Return a summary of all analytics
        const [
          summaryWorkload,
          summaryEfficiency,
          summaryConflicts,
          summarySubjects,
          summaryBatches
        ] = await Promise.all([
          generateWorkloadAnalytics(),
          calculateTimetableEfficiency(),
          analyzeConflicts(),
          calculateSubjectAnalytics(),
          calculateBatchCoverage()
        ])

        return NextResponse.json({
          data: {
            workload: {
              totalFaculty: summaryWorkload.departmentSummary.totalFaculty,
              averageLoad: summaryWorkload.departmentSummary.averageWorkload,
              overloadedCount: summaryWorkload.distribution.overloaded,
              utilizationRate: summaryWorkload.departmentSummary.utilizationRate
            },
            efficiency: {
              optimizationScore: summaryEfficiency.optimizationScore,
              facultyUtilization: summaryEfficiency.facultyUtilization,
              conflictRate: summaryEfficiency.conflictRate,
              batchCoverage: summaryEfficiency.batchCoverage
            },
            conflicts: {
              totalConflicts: summaryConflicts.totalConflicts,
              criticalConflicts: summaryConflicts.conflictTrends.filter(c => c.severity === 'high').length,
              autoResolvable: summaryConflicts.resolutionSuggestions.filter(s => s.autoResolvable).length
            },
            subjects: {
              totalSubjects: summarySubjects.totalSubjects,
              averageCredits: summarySubjects.averageCredits
            },
            batches: {
              totalBatches: summaryBatches.totalBatches,
              fullyScheduled: summaryBatches.fullyScheduled,
              averageCoverage: summaryBatches.averageCoverage
            }
          }
        })

      default:
        return NextResponse.json({ error: 'Invalid analytics type' }, { status: 400 })
    }

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { type, format, options } = body

    // Export analytics data
    const result = await exportAnalytics(type, format)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        message: `${type} analytics exported successfully`
      })
    } else {
      return NextResponse.json({
        error: result.error
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Analytics export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}