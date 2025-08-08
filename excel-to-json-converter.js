#!/usr/bin/env node

/**
 * Excel to Timetable JSON Converter
 * 
 * This utility converts Excel timetable data to the standardized JSON format
 * that can be imported via the /api/timetable/import endpoint.
 * 
 * Usage:
 * node excel-to-json-converter.js --help
 * node excel-to-json-converter.js input.xlsx --batch "B.Des UX Batch 3" --output batch3.json
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Configuration for different Excel layouts
const LAYOUT_CONFIGS = {
  'JLU_STANDARD': {
    name: 'JLU Standard Layout',
    description: 'Standard JLU timetable format with days as columns',
    timeSlotColumn: 'A',
    dayColumns: {
      'MONDAY': 'B',
      'TUESDAY': 'C', 
      'WEDNESDAY': 'D',
      'THURSDAY': 'E',
      'FRIDAY': 'F'
    },
    startRow: 2, // First data row (0-based)
    dateRow: 1,  // Row containing dates (0-based)
  },
  'JLU_ACTUAL': {
    name: 'JLU Actual Format',
    description: 'Actual JLU timetable format from July-December 2025',
    weekColumn: 0,    // Column A - Week numbers
    dateColumn: 1,    // Column B - Dates
    dayColumn: 2,     // Column C - Day names
    firstTimeSlotColumn: 4, // Column E - First time slot (skip empty column D)
    timeSlotHeaderRow: 11,  // Row with time slot headers (0-based)
    dataStartRow: 12, // First data row after headers (0-based)
    facultyColumn: 12 // Column M - Faculty names
  },
  'HORIZONTAL': {
    name: 'Horizontal Layout', 
    description: 'Time slots as columns, days as rows',
    dayColumn: 'A',
    timeSlotColumns: ['B', 'C', 'D', 'E', 'F'],
    startRow: 2,
    headerRow: 1
  }
}

// Default time slots for JLU (updated based on actual data)
const DEFAULT_TIME_SLOTS = [
  { name: "9:30-10:30", startTime: "09:30", endTime: "10:30", duration: 60, sortOrder: 1 },
  { name: "10:30-11:30", startTime: "10:30", endTime: "11:30", duration: 60, sortOrder: 2 },
  { name: "11:30-12:30", startTime: "11:30", endTime: "12:30", duration: 60, sortOrder: 3 },
  { name: "13:30-14:30", startTime: "13:30", endTime: "14:30", duration: 60, sortOrder: 4 },
  { name: "14:30-15:30", startTime: "14:30", endTime: "15:30", duration: 60, sortOrder: 5 },
  { name: "15:30-16:30", startTime: "15:30", endTime: "16:30", duration: 60, sortOrder: 6 }
]

// Updated patterns based on actual JLU data
const CUSTOM_EVENT_PATTERNS = [
  /^orientation$/i,
  /summer.*internship/i,
  /design.*hive.*club/i,
  /university.*level.*clubs/i,
  /club.*activity/i,
  /internal.*\(/i, // Internal exams
  /workshop/i,
  /seminar/i,
  /event/i
]

// Holiday patterns - updated based on actual data
const HOLIDAY_PATTERNS = [
  /independence.*day/i,
  /ganesh.*chaturthi/i,
  /gandhi.*jayanti/i,
  /diwali/i,
  /holi/i,
  /eid/i,
  /christmas/i,
  /dussehra/i,
  /durgashtami/i,
  /navratri/i
]

// Subject patterns - to identify actual subjects
const SUBJECT_PATTERNS = [
  /ui.*dev/i,           // UI Development  
  /design.*thinking/i,  // Design Thinking
  /visual.*design/i,    // Visual Design
  /semiotics/i,         // Semiotics
  /ux.*design/i,        // UX Design
  /open.*elective/i     // Open Elective (could be subject or event)
]

class ExcelToJsonConverter {
  constructor(options = {}) {
    this.options = {
      layout: 'JLU_ACTUAL', // Updated to use actual format
      defaultDepartment: 'Design',
      defaultSemester: 'ODD',
      defaultYear: new Date().getFullYear(),
      ...options
    }
    
    this.layoutConfig = LAYOUT_CONFIGS[this.options.layout]
    this.subjects = new Map()
    this.faculty = new Map()
    this.timeSlots = [...DEFAULT_TIME_SLOTS]
  }

  /**
   * Convert Excel file to JSON format
   */
  async convertExcelToJson(excelPath, batchName, dateRange = null, sheetName = null) {
    try {
      console.log(`📊 Converting Excel file: ${excelPath}`)
      console.log(`🎓 Batch: ${batchName}`)
      
      // Read Excel file
      const workbook = XLSX.readFile(excelPath)
      
      // Find the correct sheet based on batch name or use specified sheet
      let targetSheet = sheetName
      if (!targetSheet) {
        // Auto-detect sheet based on batch name
        if (batchName.includes('Batch 5') || batchName.includes('B.Des UX')) {
          targetSheet = workbook.SheetNames.find(name => 
            name.toLowerCase().includes('sem 5') && 
            name.toLowerCase().includes('bdes') && 
            name.toLowerCase().includes('ux')
          )
        }
        
        // Fallback to first sheet if no match
        if (!targetSheet) {
          targetSheet = workbook.SheetNames[0]
        }
      }
      
      const worksheet = workbook.Sheets[targetSheet]
      
      console.log(`📋 Available sheets: ${workbook.SheetNames.join(', ')}`)
      console.log(`📋 Processing sheet: ${targetSheet}`)
      
      // Convert to JSON with intelligent parsing
      const jsonData = this.parseWorksheet(worksheet, batchName, dateRange)
      
      // Validate and enhance data
      this.validateAndEnhanceData(jsonData)
      
      console.log(`✅ Conversion completed:`)
      console.log(`   - Total entries: ${jsonData.entries.length}`)
      console.log(`   - Subject entries: ${jsonData.entries.filter(e => e.type === 'SUBJECT').length}`)
      console.log(`   - Custom events: ${jsonData.entries.filter(e => e.type === 'CUSTOM_EVENT').length}`)
      console.log(`   - Holidays: ${jsonData.entries.filter(e => e.type === 'HOLIDAY').length}`)
      
      return jsonData
      
    } catch (error) {
      console.error('❌ Conversion failed:', error.message)
      throw error
    }
  }

  /**
   * Parse worksheet based on layout configuration
   */
  parseWorksheet(worksheet, batchName, dateRange) {
    const range = XLSX.utils.decode_range(worksheet['!ref'])
    const config = this.layoutConfig
    
    // Generate import ID
    const importId = this.generateImportId(batchName)
    
    // Initialize JSON structure
    const jsonData = {
      metadata: {
        importId,
        createdAt: new Date().toISOString(),
        description: `Timetable for ${batchName} - Converted from Excel`
      },
      batch: this.parseBatchInfo(batchName),
      dateRange: dateRange || this.detectDateRange(worksheet),
      timeSlots: [...this.timeSlots],
      entries: []
    }

    
    if (config.name === 'JLU Standard Layout') {
      this.parseJLUStandardLayout(worksheet, jsonData, range)
    } else if (config.name === 'JLU Actual Format') {
      this.parseJLUActualFormat(worksheet, jsonData, range)
    } else if (config.name === 'Horizontal Layout') {
      this.parseHorizontalLayout(worksheet, jsonData, range)
    } else {
      console.log('⚠️  Unknown layout, using JLU Actual Format as fallback')
      this.parseJLUActualFormat(worksheet, jsonData, range)
    }

    return jsonData
  }

  /**
   * Parse JLU Standard Layout (most common)
   */
  parseJLUStandardLayout(worksheet, jsonData, range) {
    const config = this.layoutConfig
    
    // Extract dates from header row
    const dates = this.extractDatesFromHeader(worksheet, config.dateRow)
    
    // Process each time slot row
    for (let row = config.startRow; row <= range.e.r; row++) {
      const timeSlotCell = worksheet[XLSX.utils.encode_cell({r: row, c: 0})]
      if (!timeSlotCell || !timeSlotCell.v) continue
      
      const timeSlot = this.parseTimeSlot(timeSlotCell.v)
      if (!timeSlot) continue
      
      // Process each day column
      Object.entries(config.dayColumns).forEach(([dayOfWeek, colLetter]) => {
        const colIndex = colLetter.charCodeAt(0) - 65 // Convert A=0, B=1, etc.
        const cell = worksheet[XLSX.utils.encode_cell({r: row, c: colIndex})]
        
        if (cell && cell.v && cell.v.toString().trim()) {
          const cellValue = cell.v.toString().trim()
          const date = dates[dayOfWeek]
          
          if (date && cellValue) {
            const entry = this.parseCellValue(cellValue, date, dayOfWeek, timeSlot)
            if (entry) {
              jsonData.entries.push(entry)
            }
          }
        }
      })
    }
  }

  /**
   * Parse JLU Actual Format (vertical layout with dates in rows)
   */
  parseJLUActualFormat(worksheet, jsonData, range) {
    const config = this.layoutConfig
    
    // Extract time slot headers from the header row
    const timeSlotHeaders = []
    
    for (let col = config.firstTimeSlotColumn; col <= config.facultyColumn - 1; col++) {
      const cellAddress = XLSX.utils.encode_cell({r: config.timeSlotHeaderRow, c: col})
      const headerCell = worksheet[cellAddress]
      
      if (headerCell && headerCell.v) {
        const headerValue = headerCell.v.toString().trim()
        // Skip lunch break and empty columns
        if (headerValue && 
            !headerValue.toLowerCase().includes('lunch') && 
            !headerValue.toLowerCase().includes('break') &&
            headerValue !== 'Faculty Name') {
          const timeSlot = this.normalizeTimeSlot(headerValue)
          if (timeSlot && timeSlot !== headerValue) { // Only accept if it was successfully parsed
            timeSlotHeaders.push({ column: col, timeSlot })
          }
        }
      }
    }
    
    console.log(`📅 Found ${timeSlotHeaders.length} time slots:`, timeSlotHeaders.map(h => h.timeSlot))
    
    // Process each data row
    let processedRows = 0
    for (let row = config.dataStartRow; row <= Math.min(config.dataStartRow + 50, range.e.r); row++) { // Limit to first 50 rows for testing
      // Get basic info for this row
      const dateCell = worksheet[XLSX.utils.encode_cell({r: row, c: config.dateColumn})]
      const dayCell = worksheet[XLSX.utils.encode_cell({r: row, c: config.dayColumn})]
      const facultyCell = worksheet[XLSX.utils.encode_cell({r: row, c: config.facultyColumn})]
      
      
      if (!dateCell || !dayCell) continue
      
      const dateStr = dateCell.v ? dateCell.v.toString().trim() : ''
      const dayOfWeek = this.normalizeDayOfWeek(dayCell.v ? dayCell.v.toString().trim() : '')
      const facultyName = facultyCell && facultyCell.v ? facultyCell.v.toString().trim() : ''
      
      if (!dateStr || !dayOfWeek) continue
      
      const date = this.parseDate(dateStr)
      if (!date) continue
      
      processedRows++
      
      // Check if this is a full-day holiday (special case)
      if (timeSlotHeaders.length > 0) {
        const firstSlotCell = worksheet[XLSX.utils.encode_cell({r: row, c: timeSlotHeaders[0].column})]
        if (firstSlotCell && firstSlotCell.v) {
          const firstCellValue = firstSlotCell.v.toString().trim()
          if (this.isFullDayHoliday(firstCellValue)) {
            // Create a full-day holiday entry
            jsonData.entries.push({
              type: 'HOLIDAY',
              date: this.formatDate(date),
              name: this.extractHolidayName(firstCellValue),
              description: firstCellValue,
              holidayType: this.detectHolidayType(firstCellValue),
              isRecurring: false
            })
            continue
          }
        }
      }
      
      // Process each time slot for this day
      timeSlotHeaders.forEach(({ column, timeSlot }) => {
        const cell = worksheet[XLSX.utils.encode_cell({r: row, c: column})]
        if (cell && cell.v) {
          const cellValue = cell.v.toString().trim()
          if (cellValue) {
            const entry = this.parseCellValueActual(cellValue, date, dayOfWeek, timeSlot, facultyName)
            if (entry) {
              jsonData.entries.push(entry)
            }
          }
        }
      })
    }
  }

  /**
   * Parse cell value for JLU Actual format
   */
  parseCellValueActual(cellValue, date, dayOfWeek, timeSlot, facultyName) {
    // Check if it's a holiday (should be handled at row level)
    if (this.isHoliday(cellValue)) {
      return {
        type: 'HOLIDAY',
        date: this.formatDate(date),
        name: this.extractHolidayName(cellValue),
        description: cellValue,
        holidayType: this.detectHolidayType(cellValue),
        isRecurring: false
      }
    }
    
    // Check if it's a custom event
    if (this.isCustomEvent(cellValue)) {
      return {
        type: 'CUSTOM_EVENT',
        date: this.formatDate(date),
        dayOfWeek,
        timeSlot,
        title: cellValue,
        description: `Custom event: ${cellValue}`,
        color: this.assignEventColor(cellValue),
        recurring: false
      }
    }
    
    // Check if it's a subject
    if (this.isSubject(cellValue)) {
      const subjectName = this.extractSubjectName(cellValue)
      const facultyEmail = this.generateFacultyEmail(facultyName || 'Unknown')
      
      return {
        type: 'SUBJECT',
        date: this.formatDate(date),
        dayOfWeek,
        timeSlot,
        subject: {
          name: subjectName,
          code: this.generateSubjectCode(subjectName),
          credits: 3, // Default credits
          type: 'THEORY'
        },
        faculty: {
          name: facultyName || 'Unknown',
          email: facultyEmail,
          department: this.options.defaultDepartment
        },
        recurring: false,
        notes: `Original text: ${cellValue}`
      }
    }
    
    return null
  }

  /**
   * Parse cell value and determine entry type
   */
  parseCellValue(cellValue, date, dayOfWeek, timeSlot) {
    // Check if it's a holiday
    if (this.isHoliday(cellValue)) {
      return {
        type: 'HOLIDAY',
        date: this.formatDate(date),
        name: this.extractHolidayName(cellValue),
        description: cellValue,
        holidayType: this.detectHolidayType(cellValue),
        isRecurring: false
      }
    }
    
    // Check if it's a custom event
    if (this.isCustomEvent(cellValue)) {
      return {
        type: 'CUSTOM_EVENT',
        date: this.formatDate(date),
        dayOfWeek,
        timeSlot,
        title: cellValue,
        description: `Custom event: ${cellValue}`,
        color: this.assignEventColor(cellValue),
        recurring: false
      }
    }
    
    // Parse as subject
    const subjectInfo = this.parseSubjectInfo(cellValue)
    if (subjectInfo) {
      return {
        type: 'SUBJECT',
        date: this.formatDate(date),
        dayOfWeek,
        timeSlot,
        subject: {
          name: subjectInfo.name,
          code: subjectInfo.code,
          credits: subjectInfo.credits || 3,
          type: subjectInfo.type || 'THEORY'
        },
        faculty: {
          name: subjectInfo.facultyName,
          email: subjectInfo.facultyEmail,
          department: this.options.defaultDepartment
        },
        recurring: false,
        notes: subjectInfo.notes
      }
    }
    
    return null
  }

  /**
   * Check if cell value represents a holiday
   */
  isHoliday(cellValue) {
    return HOLIDAY_PATTERNS.some(pattern => pattern.test(cellValue))
  }

  /**
   * Check if cell value represents a custom event
   */
  isCustomEvent(cellValue) {
    return CUSTOM_EVENT_PATTERNS.some(pattern => pattern.test(cellValue))
  }

  /**
   * Check if cell value represents a subject
   */
  isSubject(cellValue) {
    return SUBJECT_PATTERNS.some(pattern => pattern.test(cellValue))
  }

  /**
   * Check if cell value represents a full-day holiday
   */
  isFullDayHoliday(cellValue) {
    return HOLIDAY_PATTERNS.some(pattern => pattern.test(cellValue))
  }

  /**
   * Extract subject name from cell value
   */
  extractSubjectName(cellValue) {
    // Clean up common variations
    return cellValue.replace(/devolopment/i, 'Development')
                   .replace(/^ui\s*/i, 'UI ')
                   .replace(/\s+/g, ' ')
                   .trim()
  }

  /**
   * Normalize time slot format
   */
  normalizeTimeSlot(timeSlotStr) {
    // Handle various formats: "9:30 AM - 10:30 AM", "1:30 PM - 2:30 ", "3: 30 PM  to 4:30PM"
    const cleanStr = timeSlotStr.replace(/\s+/g, ' ').trim()
    const match = cleanStr.match(/(\d{1,2}):?\s*(\d{2})\s*(AM|PM)?\s*(?:to|[-–])\s*(\d{1,2}):?\s*(\d{2})\s*(AM|PM)?/i)
    
    if (match) {
      let startHour = parseInt(match[1])
      let startMin = match[2]
      let endHour = parseInt(match[4])
      let endMin = match[5]
      
      // Convert to 24-hour format if needed
      if (match[3] && match[3].toUpperCase() === 'PM' && startHour !== 12) {
        startHour += 12
      }
      if (match[6] && match[6].toUpperCase() === 'PM' && endHour !== 12) {
        endHour += 12
      }
      
      // Handle AM/PM when start time doesn't have it but end time does 
      if (!match[3] && match[6] && match[6].toUpperCase() === 'PM' && startHour < 12 && startHour >= 1) {
        startHour += 12
      }
      
      // Handle when end time doesn't have AM/PM but should be PM (common in afternoon slots)
      if (!match[6] && match[3] && match[3].toUpperCase() === 'PM' && endHour < startHour && endHour < 12) {
        endHour += 12
      }
      
      return `${startHour.toString().padStart(2, '0')}:${startMin}-${endHour.toString().padStart(2, '0')}:${endMin}`
    }
    
    return timeSlotStr // Return as-is if no match
  }

  /**
   * Normalize day of week
   */
  normalizeDayOfWeek(dayStr) {
    const dayMap = {
      'monday': 'MONDAY',
      'tuesday': 'TUESDAY', 
      'wednesday': 'WEDNESDAY',
      'thursday': 'THURSDAY',
      'friday': 'FRIDAY',
      'saturday': 'SATURDAY',
      'sunday': 'SUNDAY'
    }
    
    return dayMap[dayStr.toLowerCase()] || dayStr.toUpperCase()
  }

  /**
   * Parse date from various formats
   */
  parseDate(dateStr) {
    // Handle Excel serial number (like 45859)
    if (/^\d{5}$/.test(dateStr)) {
      // Excel serial number (days since 1900-01-01, with a leap year bug)
      const excelEpoch = new Date(1900, 0, 1) // January 1, 1900
      const serialNumber = parseInt(dateStr)
      // Excel incorrectly treats 1900 as a leap year, so subtract 2 days for dates after Feb 28, 1900
      const days = serialNumber > 59 ? serialNumber - 2 : serialNumber - 1
      const date = new Date(excelEpoch)
      date.setDate(date.getDate() + days)
      return date
    }
    
    // Handle formats like "21 Jul 2025", "22-Jul-2025", "23/07/2025"
    const formats = [
      /(\d{1,2})\s+(\w{3})\s+(\d{4})/,     // "21 Jul 2025"
      /(\d{1,2})-(\w{3})-(\d{4})/,         // "22-Jul-2025"
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/      // "23/07/2025"
    ]
    
    const monthMap = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    }
    
    for (const format of formats) {
      const match = dateStr.match(format)
      if (match) {
        let day = match[1].padStart(2, '0')
        let month = match[2]
        let year = match[3]
        
        if (month.length === 3) {
          // Convert month name to number
          month = monthMap[month.toLowerCase()] || month
        } else if (month.length <= 2) {
          // Pad month number
          month = month.padStart(2, '0')
        }
        
        return new Date(`${year}-${month}-${day}`)
      }
    }
    
    return null
  }

  /**
   * Parse subject information from cell value
   */
  parseSubjectInfo(cellValue) {
    // Common patterns for JLU timetable entries:
    // "Design for Social Innovation - Sushmita Shahi"
    // "Seminar & Research Writing (Madhu Toppo)"
    // "DSI301: Design for Social Innovation"
    
    let name = ''
    let code = ''
    let facultyName = ''
    let facultyEmail = ''
    let notes = ''
    
    // Extract subject code if present
    const codeMatch = cellValue.match(/([A-Z]{2,4}\d{3}):?\s*(.+)/i)
    if (codeMatch) {
      code = codeMatch[1].toUpperCase()
      name = codeMatch[2].split(/[-\(]/)[0].trim()
    } else {
      // No code, extract name
      name = cellValue.split(/[-\(]/)[0].trim()
      code = this.generateSubjectCode(name)
    }
    
    // Extract faculty name
    const facultyMatch = cellValue.match(/[-\(]\s*([^)]+)\s*[)\]]?$/)
    if (facultyMatch) {
      facultyName = facultyMatch[1].trim()
      facultyEmail = this.generateFacultyEmail(facultyName)
    } else {
      facultyName = 'TBD'
      facultyEmail = 'tbd@jlu.edu.in'
    }
    
    // Store subject and faculty for reuse
    if (code && name) {
      this.subjects.set(code, { name, code, facultyName, facultyEmail })
    }
    
    return {
      name: name || 'Unknown Subject',
      code: code || 'UNKNOWN',
      facultyName,
      facultyEmail,
      notes
    }
  }

  /**
   * Generate subject code from name
   */
  generateSubjectCode(name) {
    const words = name.split(/\s+/)
    let code = ''
    
    if (words.length >= 2) {
      code = words.slice(0, 2).map(w => w.substring(0, 2).toUpperCase()).join('')
    } else {
      code = name.substring(0, 4).toUpperCase()
    }
    
    // Add numeric suffix
    code += '301'
    
    return code
  }

  /**
   * Generate faculty email from name
   */
  generateFacultyEmail(name) {
    const parts = name.toLowerCase().split(/\s+/)
    let email = ''
    
    if (parts.length >= 2) {
      email = `${parts[0]}.${parts[parts.length - 1]}@jlu.edu.in`
    } else {
      email = `${parts[0]}@jlu.edu.in`
    }
    
    return email.replace(/[^a-z0-9.@]/g, '')
  }

  /**
   * Extract dates from header row
   */
  extractDatesFromHeader(worksheet, dateRow) {
    const dates = {}
    const config = this.layoutConfig
    
    Object.entries(config.dayColumns).forEach(([dayOfWeek, colLetter]) => {
      const colIndex = colLetter.charCodeAt(0) - 65
      const cell = worksheet[XLSX.utils.encode_cell({r: dateRow, c: colIndex})]
      
      if (cell && cell.v) {
        const dateValue = cell.v
        let date = null
        
        if (dateValue instanceof Date) {
          date = dateValue
        } else if (typeof dateValue === 'number') {
          // Excel date serial number
          date = XLSX.SSF.parse_date_code(dateValue)
          date = new Date(date.y, date.m - 1, date.d)
        } else if (typeof dateValue === 'string') {
          // Try to parse date string
          date = this.parseFlexibleDate(dateValue)
        }
        
        if (date) {
          dates[dayOfWeek] = date
        }
      }
    })
    
    return dates
  }

  /**
   * Parse flexible date formats
   */
  parseFlexibleDate(dateStr) {
    // Common date formats in Excel headers
    const formats = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,  // MM/DD/YYYY or DD/MM/YYYY
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,  // YYYY/MM/DD
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i
    ]
    
    for (const format of formats) {
      const match = dateStr.match(format)
      if (match) {
        // Handle different formats appropriately
        if (format.source.includes('Jan|Feb')) {
          // Month name format
          const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                             'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
          const monthIndex = monthNames.findIndex(m => match[2].toLowerCase().startsWith(m))
          return new Date(parseInt(match[3]), monthIndex, parseInt(match[1]))
        } else if (format.source.startsWith('(\\d{4})')) {
          // YYYY-MM-DD
          return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
        } else {
          // MM/DD/YYYY - assume US format for JLU
          return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]))
        }
      }
    }
    
    // Fallback: try native Date parsing
    const fallback = new Date(dateStr)
    return isNaN(fallback.getTime()) ? null : fallback
  }

  /**
   * Parse time slot string
   */
  parseTimeSlot(timeSlotStr) {
    const cleaned = timeSlotStr.toString().trim()
    
    // Match patterns like "10:15-11:05", "10:15 AM - 11:05 AM", "10:15 to 11:05"
    const timePattern = /(\d{1,2}):(\d{2})\s*(?:AM|PM)?\s*[-–to]+\s*(\d{1,2}):(\d{2})\s*(?:AM|PM)?/i
    const match = cleaned.match(timePattern)
    
    if (match) {
      const startHour = parseInt(match[1])
      const startMin = parseInt(match[2])
      const endHour = parseInt(match[3])
      const endMin = parseInt(match[4])
      
      const startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
      
      return `${startTime}-${endTime}`
    }
    
    return null
  }

  /**
   * Parse batch information
   */
  parseBatchInfo(batchName) {
    return {
      name: batchName,
      semester: this.options.defaultSemester,
      year: this.options.defaultYear,
      department: this.options.defaultDepartment,
      specialization: this.extractSpecialization(batchName),
      capacity: 30
    }
  }

  /**
   * Extract specialization from batch name
   */
  extractSpecialization(batchName) {
    const specializationPatterns = [
      { pattern: /UX|User.*Experience/i, name: 'User Experience Design' },
      { pattern: /Graphics?|Graphic.*Design/i, name: 'Graphic Design' },
      { pattern: /Product.*Design/i, name: 'Product Design' },
      { pattern: /Fashion/i, name: 'Fashion Design' },
      { pattern: /Interior/i, name: 'Interior Design' }
    ]
    
    for (const spec of specializationPatterns) {
      if (spec.pattern.test(batchName)) {
        return spec.name
      }
    }
    
    return 'Design'
  }

  /**
   * Detect date range from data
   */
  detectDateRange(worksheet) {
    // This would analyze the worksheet to find date patterns
    // For now, return a default range
    const now = new Date()
    const startDate = new Date(now.getFullYear(), 6, 1)  // July 1st
    const endDate = new Date(now.getFullYear(), 11, 31)  // December 31st
    
    return {
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate),
      description: "Academic semester date range"
    }
  }

  /**
   * Format date as YYYY-MM-DD
   */
  formatDate(date) {
    if (!date) return null
    
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    
    return `${year}-${month}-${day}`
  }

  /**
   * Generate unique import ID
   */
  generateImportId(batchName) {
    const timestamp = new Date().toISOString().split('T')[0]
    const batchSlug = batchName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    return `${batchSlug}-${timestamp}-${Math.random().toString(36).substr(2, 6)}`
  }

  /**
   * Extract holiday name
   */
  extractHolidayName(cellValue) {
    const cleaned = cellValue.replace(/holiday/i, '').trim()
    return cleaned || 'Holiday'
  }

  /**
   * Detect holiday type
   */
  detectHolidayType(cellValue) {
    const nationalHolidays = /independence|gandhi|republic/i
    const religiousHolidays = /diwali|holi|eid|christmas|ganesh/i
    
    if (nationalHolidays.test(cellValue)) return 'NATIONAL'
    if (religiousHolidays.test(cellValue)) return 'LOCAL'
    
    return 'UNIVERSITY'
  }

  /**
   * Assign color to custom events
   */
  assignEventColor(title) {
    const colorMap = [
      { pattern: /club/i, color: '#3b82f6' },
      { pattern: /workshop/i, color: '#10b981' },
      { pattern: /seminar/i, color: '#f59e0b' },
      { pattern: /event/i, color: '#ef4444' },
      { pattern: /elective/i, color: '#8b5cf6' }
    ]
    
    for (const mapping of colorMap) {
      if (mapping.pattern.test(title)) {
        return mapping.color
      }
    }
    
    return '#6b7280'
  }

  /**
   * Validate and enhance the generated data
   */
  validateAndEnhanceData(jsonData) {
    // Sort entries by date
    jsonData.entries.sort((a, b) => new Date(a.date) - new Date(b.date))
    
    // Remove duplicates
    const seen = new Set()
    jsonData.entries = jsonData.entries.filter(entry => {
      if (entry.type === 'HOLIDAY') {
        const key = `${entry.type}-${entry.date}-${entry.name}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      } else {
        const key = `${entry.type}-${entry.date}-${entry.timeSlot}-${entry.dayOfWeek}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      }
    })
    
    // Ensure time slots are unique
    const uniqueTimeSlots = new Map()
    jsonData.timeSlots.forEach(ts => {
      if (!uniqueTimeSlots.has(ts.name)) {
        uniqueTimeSlots.set(ts.name, ts)
      }
    })
    jsonData.timeSlots = Array.from(uniqueTimeSlots.values())
  }
}

// CLI Interface
function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    console.log(`
🎓 Excel to Timetable JSON Converter

Usage:
  node excel-to-json-converter.js <input.xlsx> --batch "Batch Name" [options]

Options:
  --batch <name>     Batch name (required)
  --output <file>    Output JSON file (optional)
  --department <name>  Department name (default: Design)
  --semester <sem>   Semester: ODD|EVEN (default: ODD)  
  --year <year>      Academic year (default: current year)
  --layout <layout>  Excel layout: JLU_STANDARD|HORIZONTAL (default: JLU_STANDARD)
  --help, -h         Show this help

Examples:
  node excel-to-json-converter.js timetable.xlsx --batch "B.Des UX Batch 3" --output batch3.json
  node excel-to-json-converter.js data.xlsx --batch "CSE Batch 5" --department "Computer Science"
  node excel-to-json-converter.js input.xlsx --batch "Graphics Batch 2" --semester EVEN --year 2025
`)
    process.exit(0)
  }
  
  const inputFile = args[0]
  const batchIndex = args.findIndex(arg => arg === '--batch') + 1
  const batchName = batchIndex > 0 ? args[batchIndex] : null
  
  if (!batchName) {
    console.error('❌ Error: --batch parameter is required')
    process.exit(1)
  }
  
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Error: Input file not found: ${inputFile}`)
    process.exit(1)
  }
  
  // Parse options
  const options = {
    layout: args.includes('--layout') ? args[args.indexOf('--layout') + 1] : 'JLU_STANDARD',
    defaultDepartment: args.includes('--department') ? args[args.indexOf('--department') + 1] : 'Design',
    defaultSemester: args.includes('--semester') ? args[args.indexOf('--semester') + 1] : 'ODD',
    defaultYear: args.includes('--year') ? parseInt(args[args.indexOf('--year') + 1]) : new Date().getFullYear()
  }
  
  const outputFile = args.includes('--output') ? args[args.indexOf('--output') + 1] : 
                    `${path.parse(inputFile).name}-converted.json`
  
  const sheetName = args.includes('--sheet') ? args[args.indexOf('--sheet') + 1] : null
  
  // Convert Excel to JSON
  const converter = new ExcelToJsonConverter(options)
  
  converter.convertExcelToJson(inputFile, batchName, null, sheetName)
    .then(jsonData => {
      // Write output file
      fs.writeFileSync(outputFile, JSON.stringify(jsonData, null, 2))
      console.log(`✅ Conversion successful!`)
      console.log(`📄 Output file: ${outputFile}`)
      console.log(`\n📋 Summary:`)
      console.log(`   Batch: ${jsonData.batch.name}`)
      console.log(`   Department: ${jsonData.batch.department}`)
      console.log(`   Date Range: ${jsonData.dateRange.startDate} to ${jsonData.dateRange.endDate}`)
      console.log(`   Total Entries: ${jsonData.entries.length}`)
      console.log(`   Time Slots: ${jsonData.timeSlots.length}`)
      console.log(`\n🚀 Next Steps:`)
      console.log(`   1. Validate: curl -X POST /api/timetable/validate -d @${outputFile}`)
      console.log(`   2. Import: curl -X POST /api/timetable/import -d @${outputFile}`)
    })
    .catch(error => {
      console.error('❌ Conversion failed:', error.message)
      process.exit(1)
    })
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { ExcelToJsonConverter, LAYOUT_CONFIGS, DEFAULT_TIME_SLOTS }