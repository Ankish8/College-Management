import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

export interface ImportValidationError {
  row: number
  column: string
  message: string
  severity: 'error' | 'warning'
}

export interface ImportResult {
  success: boolean
  totalRows: number
  validRows: number
  invalidRows: number
  errors: ImportValidationError[]
  data: TimetableImportData[]
  summary: string
}

export interface TimetableImportData {
  batchName: string
  subjectName: string
  subjectCode: string
  facultyName: string
  facultyEmail: string
  dayOfWeek: string
  timeSlot: string
  startTime: string
  endTime: string
  entryType?: string
  notes?: string
}

export interface ExportOptions {
  format: 'excel' | 'csv' | 'pdf' | 'ical'
  batchIds?: string[]
  dateRange?: { start: string; end: string }
  includeFaculty?: boolean
  includeSubjects?: boolean
  includeTimeSlots?: boolean
  template?: 'standard' | 'detailed' | 'printable'
}

export interface ExportResult {
  success: boolean
  fileUrl?: string
  fileName: string
  fileSize: number
  format: string
  message: string
}

/**
 * Validate imported timetable data
 */
export function validateImportData(data: any[]): ImportResult {
  const errors: ImportValidationError[] = []
  const validData: TimetableImportData[] = []
  
  const requiredColumns = [
    'batchName',
    'subjectName', 
    'subjectCode',
    'facultyName',
    'dayOfWeek',
    'timeSlot'
  ]

  data.forEach((row, index) => {
    const rowNumber = index + 2 // Account for header row
    
    // Check required fields
    requiredColumns.forEach(column => {
      if (!row[column] || row[column].toString().trim() === '') {
        errors.push({
          row: rowNumber,
          column,
          message: `${column} is required`,
          severity: 'error'
        })
      }
    })

    // Validate day of week
    const validDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
    if (row.dayOfWeek && !validDays.includes(row.dayOfWeek.toUpperCase())) {
      errors.push({
        row: rowNumber,
        column: 'dayOfWeek',
        message: `Invalid day of week. Must be one of: ${validDays.join(', ')}`,
        severity: 'error'
      })
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (row.startTime && !timeRegex.test(row.startTime)) {
      errors.push({
        row: rowNumber,
        column: 'startTime',
        message: 'Invalid time format. Use HH:MM (24-hour format)',
        severity: 'error'
      })
    }
    
    if (row.endTime && !timeRegex.test(row.endTime)) {
      errors.push({
        row: rowNumber,
        column: 'endTime',
        message: 'Invalid time format. Use HH:MM (24-hour format)',
        severity: 'error'
      })
    }

    // Validate email format if provided
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (row.facultyEmail && !emailRegex.test(row.facultyEmail)) {
      errors.push({
        row: rowNumber,
        column: 'facultyEmail',
        message: 'Invalid email format',
        severity: 'warning'
      })
    }

    // Validate subject code format
    if (row.subjectCode && !/^[A-Z]{2,4}[0-9]{3}$/.test(row.subjectCode)) {
      errors.push({
        row: rowNumber,
        column: 'subjectCode',
        message: 'Subject code should be 2-4 letters followed by 3 digits (e.g., UXD101)',
        severity: 'warning'
      })
    }

    // If no critical errors for this row, add to valid data
    const rowErrors = errors.filter(e => e.row === rowNumber && e.severity === 'error')
    if (rowErrors.length === 0) {
      validData.push({
        batchName: row.batchName?.toString().trim(),
        subjectName: row.subjectName?.toString().trim(),
        subjectCode: row.subjectCode?.toString().trim(),
        facultyName: row.facultyName?.toString().trim(),
        facultyEmail: row.facultyEmail?.toString().trim(),
        dayOfWeek: row.dayOfWeek?.toString().toUpperCase().trim(),
        timeSlot: row.timeSlot?.toString().trim(),
        startTime: row.startTime?.toString().trim(),
        endTime: row.endTime?.toString().trim(),
        entryType: row.entryType?.toString().trim() || 'REGULAR',
        notes: row.notes?.toString().trim()
      })
    }
  })

  const criticalErrors = errors.filter(e => e.severity === 'error').length
  
  return {
    success: criticalErrors === 0,
    totalRows: data.length,
    validRows: validData.length,
    invalidRows: data.length - validData.length,
    errors,
    data: validData,
    summary: `Processed ${data.length} rows: ${validData.length} valid, ${data.length - validData.length} invalid, ${criticalErrors} critical errors`
  }
}

/**
 * Parse Excel file and extract timetable data
 */
export async function parseExcelFile(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // Use first sheet
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        
        // Validate and process data
        const result = validateImportData(jsonData)
        resolve(result)
      } catch (error) {
        reject(new Error('Failed to parse Excel file: ' + (error instanceof Error ? error.message : 'Unknown error')))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Parse CSV file and extract timetable data
 */
export async function parseCSVFile(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string
        const workbook = XLSX.read(csvText, { type: 'string' })
        
        // Use first sheet
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        
        // Validate and process data
        const result = validateImportData(jsonData)
        resolve(result)
      } catch (error) {
        reject(new Error('Failed to parse CSV file: ' + (error instanceof Error ? error.message : 'Unknown error')))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsText(file)
  })
}

/**
 * Export timetable data to Excel format
 */
export async function exportToExcel(data: any[], options: ExportOptions = { format: 'excel' }): Promise<ExportResult> {
  try {
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Timetable')
    
    // Generate file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    const fileName = `timetable-export-${new Date().toISOString().split('T')[0]}.xlsx`
    saveAs(blob, fileName)
    
    return {
      success: true,
      fileName,
      fileSize: blob.size,
      format: 'excel',
      message: 'Excel export completed successfully'
    }
  } catch (error) {
    return {
      success: false,
      fileName: '',
      fileSize: 0,
      format: 'excel',
      message: 'Excel export failed: ' + (error instanceof Error ? error.message : 'Unknown error')
    }
  }
}

/**
 * Export timetable data to CSV format
 */
export async function exportToCSV(data: any[], options: ExportOptions = { format: 'csv' }): Promise<ExportResult> {
  try {
    // Create worksheet and convert to CSV
    const worksheet = XLSX.utils.json_to_sheet(data)
    const csvContent = XLSX.utils.sheet_to_csv(worksheet)
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const fileName = `timetable-export-${new Date().toISOString().split('T')[0]}.csv`
    saveAs(blob, fileName)
    
    return {
      success: true,
      fileName,
      fileSize: blob.size,
      format: 'csv',
      message: 'CSV export completed successfully'
    }
  } catch (error) {
    return {
      success: false,
      fileName: '',
      fileSize: 0,
      format: 'csv',
      message: 'CSV export failed: ' + (error instanceof Error ? error.message : 'Unknown error')
    }
  }
}

/**
 * Generate Excel template for timetable import
 */
export function generateImportTemplate(): void {
  const templateData = [
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

  // Create workbook with template data
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(templateData)
  
  // Add column widths for better readability
  const columnWidths = [
    { wch: 20 }, // batchName
    { wch: 25 }, // subjectName
    { wch: 12 }, // subjectCode
    { wch: 20 }, // facultyName
    { wch: 25 }, // facultyEmail
    { wch: 12 }, // dayOfWeek
    { wch: 15 }, // timeSlot
    { wch: 10 }, // startTime
    { wch: 10 }, // endTime
    { wch: 12 }, // entryType
    { wch: 20 }  // notes
  ]
  worksheet['!cols'] = columnWidths
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Timetable Template')
  
  // Add instructions sheet
  const instructions = [
    { Field: 'batchName', Description: 'Full batch name (e.g., B.Des UX Semester 5)', Required: 'Yes' },
    { Field: 'subjectName', Description: 'Complete subject name', Required: 'Yes' },
    { Field: 'subjectCode', Description: 'Subject code (e.g., UXD101)', Required: 'Yes' },
    { Field: 'facultyName', Description: 'Faculty full name with title', Required: 'Yes' },
    { Field: 'facultyEmail', Description: 'Faculty email address', Required: 'No' },
    { Field: 'dayOfWeek', Description: 'Day of week (MONDAY, TUESDAY, etc.)', Required: 'Yes' },
    { Field: 'timeSlot', Description: 'Time slot description (e.g., 10:00-11:30)', Required: 'Yes' },
    { Field: 'startTime', Description: 'Start time in HH:MM format', Required: 'No' },
    { Field: 'endTime', Description: 'End time in HH:MM format', Required: 'No' },
    { Field: 'entryType', Description: 'Entry type (REGULAR, MAKEUP, EXTRA, SPECIAL)', Required: 'No' },
    { Field: 'notes', Description: 'Additional notes or comments', Required: 'No' }
  ]
  
  const instructionsSheet = XLSX.utils.json_to_sheet(instructions)
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions')
  
  // Generate and download template
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, 'timetable-import-template.xlsx')
}

/**
 * Generate CSV template for timetable import
 */
export function generateCSVTemplate(): void {
  const templateData = [
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
    }
  ]

  const worksheet = XLSX.utils.json_to_sheet(templateData)
  const csvContent = XLSX.utils.sheet_to_csv(worksheet)
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  saveAs(blob, 'timetable-import-template.csv')
}

/**
 * Convert timetable data to iCalendar format
 */
export async function exportToICalendar(data: any[], options: ExportOptions = { format: 'ical' }): Promise<ExportResult> {
  try {
    // This would require actual ical-generator implementation
    // For now, return a placeholder
    const icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//JLU Timetable//EN',
      'CALSCALE:GREGORIAN',
      ...data.map(entry => [
        'BEGIN:VEVENT',
        `SUMMARY:${entry.subjectName} - ${entry.facultyName}`,
        `DESCRIPTION:Batch: ${entry.batchName}\\nSubject Code: ${entry.subjectCode}`,
        `DTSTART:${entry.startDateTime}`,
        `DTEND:${entry.endDateTime}`,
        `LOCATION:${entry.location || 'TBD'}`,
        'END:VEVENT'
      ]).flat(),
      'END:VCALENDAR'
    ].join('\n')

    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8;' })
    const fileName = `timetable-${new Date().toISOString().split('T')[0]}.ics`
    saveAs(blob, fileName)

    return {
      success: true,
      fileName,
      fileSize: blob.size,
      format: 'ical',
      message: 'iCalendar export completed successfully'
    }
  } catch (error) {
    return {
      success: false,
      fileName: '',
      fileSize: 0,
      format: 'ical',
      message: 'iCalendar export failed: ' + (error instanceof Error ? error.message : 'Unknown error')
    }
  }
}