#!/usr/bin/env node

const fs = require('fs');
const { z } = require('zod');

// Same validation schema as the API
const TimetableImportSchema = z.object({
  metadata: z.object({
    importId: z.string().min(1, "Import ID is required"),
    createdAt: z.string().datetime().optional(),
    description: z.string().optional()
  }),
  batch: z.object({
    name: z.string().min(1, "Batch name is required"),
    semester: z.enum(["ODD", "EVEN"], { message: "Semester must be ODD or EVEN" }),
    year: z.number().int().min(2020).max(2030, "Year must be between 2020-2030"),
    department: z.string().min(1, "Department is required"),
    specialization: z.string().optional(),
    capacity: z.number().int().positive().optional()
  }),
  dateRange: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD format"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD format"),
    description: z.string().optional()
  }),
  timeSlots: z.array(z.object({
    name: z.string().min(1, "Time slot name is required"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be HH:MM format"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "End time must be HH:MM format"),
    duration: z.number().int().positive("Duration must be positive"),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().positive("Sort order must be positive")
  })).optional().default([]),
  entries: z.array(z.discriminatedUnion("type", [
    // SUBJECT entry
    z.object({
      type: z.literal("SUBJECT"),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
      dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
      timeSlot: z.string().min(1, "Time slot is required"),
      subject: z.object({
        name: z.string().min(1, "Subject name is required"),
        code: z.string().min(1, "Subject code is required"),
        credits: z.number().int().positive("Credits must be positive"),
        type: z.enum(["THEORY", "PRACTICAL", "LAB", "TUTORIAL"]).default("THEORY")
      }),
      faculty: z.object({
        name: z.string().min(1, "Faculty name is required"),
        email: z.string().email("Faculty email must be valid"),
        department: z.string().optional()
      }),
      recurring: z.boolean().default(false),
      notes: z.string().optional()
    }),
    // CUSTOM_EVENT entry
    z.object({
      type: z.literal("CUSTOM_EVENT"),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
      dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
      timeSlot: z.string().min(1, "Time slot is required"),
      title: z.string().min(1, "Event title is required"),
      description: z.string().optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be valid hex format (#rrggbb)").optional(),
      recurring: z.boolean().default(false)
    }),
    // HOLIDAY entry
    z.object({
      type: z.literal("HOLIDAY"),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
      name: z.string().min(1, "Holiday name is required"),
      description: z.string().optional(),
      holidayType: z.enum(["NATIONAL", "UNIVERSITY", "DEPARTMENT", "LOCAL"]).default("UNIVERSITY"),
      isRecurring: z.boolean().default(false)
    })
  ]))
})

async function validateTimetableData(filePath) {
  try {
    console.log(`🔍 Validating timetable data: ${filePath}`)
    
    // Read JSON file
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    
    // Validate against schema
    const validationResult = TimetableImportSchema.safeParse(jsonData)
    
    if (!validationResult.success) {
      console.log('❌ Validation failed:')
      const errors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        value: err.code === 'invalid_type' ? 'invalid_type' : undefined
      }))
      
      errors.forEach(error => {
        console.log(`  • ${error.field}: ${error.message}`)
      })
      
      return false
    }
    
    console.log('✅ Validation successful!')
    console.log(`📊 Summary:`)
    console.log(`   - Total entries: ${jsonData.entries.length}`)
    console.log(`   - Subject entries: ${jsonData.entries.filter(e => e.type === 'SUBJECT').length}`)
    console.log(`   - Custom events: ${jsonData.entries.filter(e => e.type === 'CUSTOM_EVENT').length}`)
    console.log(`   - Holidays: ${jsonData.entries.filter(e => e.type === 'HOLIDAY').length}`)
    console.log(`   - Time slots: ${jsonData.timeSlots.length}`)
    console.log(`   - Date range: ${jsonData.dateRange.startDate} to ${jsonData.dateRange.endDate}`)
    
    // Show sample entries
    console.log(`\n📋 Sample entries:`)
    const sampleSubject = jsonData.entries.find(e => e.type === 'SUBJECT')
    const sampleEvent = jsonData.entries.find(e => e.type === 'CUSTOM_EVENT')  
    const sampleHoliday = jsonData.entries.find(e => e.type === 'HOLIDAY')
    
    if (sampleSubject) {
      console.log(`   Subject: ${sampleSubject.subject.name} - ${sampleSubject.faculty.name} (${sampleSubject.date} ${sampleSubject.timeSlot})`)
    }
    if (sampleEvent) {
      console.log(`   Event: ${sampleEvent.title} (${sampleEvent.date} ${sampleEvent.timeSlot})`)
    }
    if (sampleHoliday) {
      console.log(`   Holiday: ${sampleHoliday.name} (${sampleHoliday.date})`)
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Validation error:', error.message)
    return false
  }
}

// Run validation
const filePath = process.argv[2] || 'batch5-week1-final.json'
validateTimetableData(filePath)
  .then(success => {
    if (success) {
      console.log('\n🚀 Ready for import!')
      process.exit(0)
    } else {
      console.log('\n💔 Please fix validation errors before importing')
      process.exit(1)  
    }
  })
  .catch(error => {
    console.error('Validation failed:', error)
    process.exit(1)
  })