import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/utils/permissions'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const operation = formData.get('operation') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type and size
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB' }, { status: 400 })
    }

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed' 
      }, { status: 400 })
    }

    let result

    try {
      if (operation === 'validate' || operation === 'import') {
        // Import and validate timetable data
        if (file.type === 'text/csv') {
          const { parseCSVFile } = await import('@/lib/timetable/import-export')
          result = await parseCSVFile(file)
        } else {
          const { parseExcelFile } = await import('@/lib/timetable/import-export')
          result = await parseExcelFile(file)
        }

        if (operation === 'validate') {
          // Return validation results only
          return NextResponse.json({
            success: result.success,
            totalRows: result.totalRows,
            validRows: result.validRows,
            invalidRows: result.invalidRows,
            errors: result.errors,
            summary: result.summary
          })
        } else if (operation === 'import' && result.success) {
          // Actually import the data (simulation)
          // In a real implementation, you would save the validated data to the database
          
          // Simulate import process
          const importedCount = result.validRows
          const failedCount = 0 // In real implementation, some might fail during database insertion
          
          return NextResponse.json({
            success: true,
            message: 'Timetable data imported successfully',
            imported: importedCount,
            failed: failedCount,
            total: result.totalRows,
            details: {
              validationErrors: result.errors.filter(e => e.severity === 'error').length,
              warnings: result.errors.filter(e => e.severity === 'warning').length
            }
          })
        } else {
          // Validation failed
          return NextResponse.json({
            success: false,
            message: 'Validation failed. Please fix the errors before importing.',
            errors: result.errors,
            summary: result.summary
          }, { status: 400 })
        }
      } else {
        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 })
      }
    } catch (parseError) {
      console.error('File parsing error:', parseError)
      return NextResponse.json({
        error: 'Failed to parse file. Please ensure the file format is correct.',
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Import/Export API error:', error)
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
    const operation = searchParams.get('operation')
    const format = searchParams.get('format')
    const batchId = searchParams.get('batchId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (operation === 'export') {
      // Export timetable data
      try {
        // In a real implementation, you would fetch actual data from the database
        // For now, we'll return mock data
        const mockData = [
          {
            batchName: 'B.Des UX Semester 5',
            subjectName: 'User Experience Design',
            subjectCode: 'UXD101',
            facultyName: 'Prof. Ankish Khatri',
            facultyEmail: 'ankish.khatri@jlu.edu.in',
            dayOfWeek: 'MONDAY',
            timeSlot: '10:00-11:30',
            startTime: '10:00',
            endTime: '11:30',
            entryType: 'REGULAR',
            notes: 'Design Studio Session'
          },
          {
            batchName: 'B.Des GD Semester 3',
            subjectName: 'Typography',
            subjectCode: 'TYP201',
            facultyName: 'Prof. Sarah Johnson',
            facultyEmail: 'sarah.johnson@jlu.edu.in',
            dayOfWeek: 'TUESDAY',
            timeSlot: '14:00-15:30',
            startTime: '14:00',
            endTime: '15:30',
            entryType: 'REGULAR',
            notes: 'Typography Workshop'
          }
        ]

        let exportResult

        switch (format) {
          case 'excel':
            const { exportToExcel } = await import('@/lib/timetable/import-export')
            exportResult = await exportToExcel(mockData, { format: 'excel' })
            break
          case 'csv':
            const { exportToCSV } = await import('@/lib/timetable/import-export')
            exportResult = await exportToCSV(mockData, { format: 'csv' })
            break
          case 'ical':
            const { exportToICalendar } = await import('@/lib/timetable/import-export')
            exportResult = await exportToICalendar(mockData, { format: 'ical' })
            break
          default:
            return NextResponse.json({ error: 'Invalid export format' }, { status: 400 })
        }

        return NextResponse.json({
          success: exportResult.success,
          message: exportResult.message,
          fileName: exportResult.fileName,
          fileSize: exportResult.fileSize,
          format: exportResult.format
        })

      } catch (exportError) {
        console.error('Export error:', exportError)
        return NextResponse.json({
          error: 'Failed to export data',
          details: exportError instanceof Error ? exportError.message : 'Unknown export error'
        }, { status: 500 })
      }
    } else if (operation === 'template') {
      // Generate import template
      const templateType = searchParams.get('type') || 'excel'
      
      try {
        if (templateType === 'csv') {
          const { generateCSVTemplate } = await import('@/lib/timetable/import-export')
          generateCSVTemplate()
        } else {
          const { generateImportTemplate } = await import('@/lib/timetable/import-export')
          generateImportTemplate()
        }

        return NextResponse.json({
          success: true,
          message: `${templateType.toUpperCase()} template generated successfully`,
          fileName: `timetable-import-template.${templateType === 'csv' ? 'csv' : 'xlsx'}`
        })
      } catch (templateError) {
        console.error('Template generation error:', templateError)
        return NextResponse.json({
          error: 'Failed to generate template',
          details: templateError instanceof Error ? templateError.message : 'Unknown template error'
        }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: 'Invalid operation' }, { status: 400 })
    }

  } catch (error) {
    console.error('Import/Export GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}