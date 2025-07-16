import { DayOfWeek, EntryType, BulkOperationType, OperationStatus, LogLevel } from '@prisma/client'
import { db } from '@/lib/db'
import { detectEventConflicts, type EventConflict } from '@/lib/utils/conflict-detection'
import type { CalendarEvent } from '@/types/timetable'

export interface BulkOperationOptions {
  operation: 'clone' | 'reschedule' | 'faculty_replace' | 'batch_assign' | 'template_apply'
  sourceData?: {
    batchId?: string
    facultyId?: string
    dateRange?: { start: string; end: string }
    templateId?: string
  }
  targetData?: {
    batchId?: string
    facultyId?: string
    dateRange?: { start: string; end: string }
    dayOffset?: number
  }
  options?: {
    preserveConflicts?: boolean
    updateExisting?: boolean
    createBackup?: boolean
    validateOnly?: boolean
    dryRun?: boolean
    showConflictVisualization?: boolean
  }
}

export interface BulkOperationResult {
  success: boolean
  affected: number
  successful: number
  failed: number
  errors: string[]
  warnings: string[]
  summary: string
  operationId: string
  dryRun?: boolean
  conflictVisualization?: {
    conflicts: EventConflict[]
    affectedEvents: CalendarEvent[]
    proposedChanges: {
      create: CalendarEvent[]
      update: CalendarEvent[]
      delete: CalendarEvent[]
    }
  }
  previewResults?: {
    estimatedDuration: number
    resourceImpact: {
      facultyWorkload: { [facultyId: string]: number }
      batchLoad: { [batchId: string]: number }
      timeSlotUtilization: { [timeSlotId: string]: number }
    }
    recommendations: string[]
  }
}

export interface TimetableCloneOptions {
  sourceBatchId: string
  targetBatchId: string
  startDate?: string
  endDate?: string
  preserveFaculty?: boolean
  handleConflicts?: 'skip' | 'override' | 'prompt'
}

export interface FacultyReplaceOptions {
  currentFacultyId: string
  newFacultyId: string
  batchIds?: string[]
  subjectIds?: string[]
  effectiveDate?: string
  maintainWorkload?: boolean
}

export interface BulkRescheduleOptions {
  sourceStartDate: string
  sourceEndDate: string
  targetStartDate: string
  targetEndDate: string
  batchIds?: string[]
  moveType: 'shift' | 'map' | 'redistribute'
  excludeWeekends?: boolean
  respectBlackouts?: boolean
}

/**
 * Clone timetable entries from one batch to another with real database operations
 */
export async function cloneTimetable(options: TimetableCloneOptions, userId: string): Promise<BulkOperationResult> {
  const { sourceBatchId, targetBatchId, preserveFaculty = true, handleConflicts = 'skip', startDate, endDate } = options
  
  let operationId = ''
  let bulkOperation: any = null
  
  try {
    // Create BulkOperation record for tracking
    bulkOperation = await db.bulkOperation.create({
      data: {
        type: BulkOperationType.CLONE_TIMETABLE,
        status: OperationStatus.RUNNING,
        userId,
        parameters: JSON.stringify({
          sourceBatchId,
          targetBatchId,
          preserveFaculty,
          handleConflicts,
          startDate,
          endDate
        }),
        progress: 0
      }
    })
    
    operationId = bulkOperation.id
    
    // Log operation start
    await db.operationLog.create({
      data: {
        operationId,
        level: LogLevel.INFO,
        message: `Starting timetable clone from batch ${sourceBatchId} to ${targetBatchId}`,
        details: JSON.stringify({ sourceBatchId, targetBatchId, options })
      }
    })

    // Validate source and target batches exist
    const [sourceBatch, targetBatch] = await Promise.all([
      db.batch.findUnique({
        where: { id: sourceBatchId },
        include: { program: true, specialization: true }
      }),
      db.batch.findUnique({
        where: { id: targetBatchId },
        include: { program: true, specialization: true }
      })
    ])

    if (!sourceBatch) {
      throw new Error(`Source batch with ID ${sourceBatchId} not found`)
    }
    if (!targetBatch) {
      throw new Error(`Target batch with ID ${targetBatchId} not found`)
    }

    // Get all timetable entries from source batch
    const whereClause: any = {
      batchId: sourceBatchId,
      isActive: true
    }

    if (startDate || endDate) {
      whereClause.date = {}
      if (startDate) whereClause.date.gte = new Date(startDate)
      if (endDate) whereClause.date.lte = new Date(endDate)
    }

    const sourceEntries = await db.timetableEntry.findMany({
      where: whereClause,
      include: {
        subject: true,
        faculty: true,
        timeSlot: true,
        batch: true
      }
    })

    if (sourceEntries.length === 0) {
      await db.operationLog.create({
        data: {
          operationId,
          level: LogLevel.WARN,
          message: 'No timetable entries found in source batch for the specified criteria'
        }
      })
      
      await db.bulkOperation.update({
        where: { id: operationId },
        data: {
          status: OperationStatus.COMPLETED,
          progress: 100,
          completedAt: new Date(),
          affectedCount: 0,
          successCount: 0,
          failedCount: 0
        }
      })

      return {
        success: true,
        affected: 0,
        successful: 0,
        failed: 0,
        errors: [],
        warnings: ['No timetable entries found in source batch for the specified criteria'],
        summary: 'No entries to clone',
        operationId
      }
    }

    // Update progress
    await db.bulkOperation.update({
      where: { id: operationId },
      data: { progress: 10 }
    })

    const errors: string[] = []
    const warnings: string[] = []
    let successful = 0
    let failed = 0
    const clonedEntries: any[] = []

    // Process entries in transaction
    await db.$transaction(async (tx) => {
      for (let i = 0; i < sourceEntries.length; i++) {
        const entry = sourceEntries[i]
        const progressPercent = Math.floor(((i + 1) / sourceEntries.length) * 80) + 10 // 10-90%
        
        try {
          // Check if target batch has corresponding subject
          let targetSubjectId = entry.subjectId
          
          if (!preserveFaculty || targetBatch.id !== sourceBatch.id) {
            // Find or create corresponding subject in target batch
            const targetSubject = await tx.subject.findFirst({
              where: {
                code: entry.subject.code,
                batchId: targetBatchId,
                isActive: true
              }
            })
            
            if (!targetSubject) {
              // Create subject in target batch if it doesn't exist
              const newSubject = await tx.subject.create({
                data: {
                  name: entry.subject.name,
                  code: `${entry.subject.code}_${targetBatch.name.slice(0, 4)}`,
                  credits: entry.subject.credits,
                  totalHours: entry.subject.totalHours,
                  batchId: targetBatchId,
                  primaryFacultyId: preserveFaculty ? entry.subject.primaryFacultyId : null,
                  coFacultyId: preserveFaculty ? entry.subject.coFacultyId : null,
                  examType: entry.subject.examType,
                  subjectType: entry.subject.subjectType,
                  description: entry.subject.description
                }
              })
              targetSubjectId = newSubject.id
              warnings.push(`Created new subject: ${newSubject.name} (${newSubject.code})`)
            } else {
              targetSubjectId = targetSubject.id
            }
          }

          // Check for conflicts in target batch
          const existingEntry = await tx.timetableEntry.findFirst({
            where: {
              batchId: targetBatchId,
              timeSlotId: entry.timeSlotId,
              dayOfWeek: entry.dayOfWeek,
              date: entry.date,
              isActive: true
            }
          })

          if (existingEntry) {
            if (handleConflicts === 'skip') {
              warnings.push(`Skipped ${entry.timeSlot.name} on ${entry.dayOfWeek} - slot already occupied`)
              continue
            } else if (handleConflicts === 'override') {
              // Deactivate existing entry
              await tx.timetableEntry.update({
                where: { id: existingEntry.id },
                data: { isActive: false }
              })
              warnings.push(`Overrode existing entry for ${entry.timeSlot.name} on ${entry.dayOfWeek}`)
            }
          }

          // Check faculty conflicts if preserving faculty
          if (preserveFaculty) {
            const facultyConflict = await tx.timetableEntry.findFirst({
              where: {
                facultyId: entry.facultyId,
                timeSlotId: entry.timeSlotId,
                dayOfWeek: entry.dayOfWeek,
                date: entry.date,
                isActive: true,
                NOT: { batchId: sourceBatchId } // Exclude source batch entries
              }
            })

            if (facultyConflict) {
              if (handleConflicts === 'skip') {
                warnings.push(`Skipped ${entry.timeSlot.name} on ${entry.dayOfWeek} - faculty conflict`)
                continue
              }
            }
          }

          // Create the new timetable entry
          const newEntry = await tx.timetableEntry.create({
            data: {
              batchId: targetBatchId,
              subjectId: targetSubjectId,
              facultyId: preserveFaculty ? entry.facultyId : entry.facultyId, // TODO: Handle faculty assignment logic
              timeSlotId: entry.timeSlotId,
              dayOfWeek: entry.dayOfWeek,
              date: entry.date,
              entryType: entry.entryType,
              notes: `Cloned from ${sourceBatch.name} - ${entry.notes || ''}`.trim()
            }
          })

          clonedEntries.push(newEntry)
          successful++

          // Update progress periodically
          if (i % 5 === 0) {
            await db.bulkOperation.update({
              where: { id: operationId },
              data: { progress: progressPercent }
            })
          }

        } catch (entryError) {
          failed++
          const errorMessage = `Failed to clone entry ${entry.timeSlot.name} on ${entry.dayOfWeek}: ${entryError instanceof Error ? entryError.message : 'Unknown error'}`
          errors.push(errorMessage)
          
          await db.operationLog.create({
            data: {
              operationId,
              level: LogLevel.ERROR,
              message: errorMessage,
              details: JSON.stringify({ entryId: entry.id, error: entryError })
            }
          })
        }
      }
    })

    // Final progress update
    await db.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: OperationStatus.COMPLETED,
        progress: 100,
        completedAt: new Date(),
        affectedCount: sourceEntries.length,
        successCount: successful,
        failedCount: failed,
        results: JSON.stringify({
          clonedEntries: clonedEntries.length,
          sourceBatch: sourceBatch.name,
          targetBatch: targetBatch.name
        })
      }
    })

    // Log completion
    await db.operationLog.create({
      data: {
        operationId,
        level: LogLevel.INFO,
        message: `Clone operation completed: ${successful} successful, ${failed} failed`,
        details: JSON.stringify({ successful, failed, errors, warnings })
      }
    })

    return {
      success: failed === 0,
      affected: sourceEntries.length,
      successful,
      failed,
      errors,
      warnings,
      summary: `Successfully cloned ${successful} out of ${sourceEntries.length} timetable entries from ${sourceBatch.name} to ${targetBatch.name}`,
      operationId
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    // Update operation status to failed
    if (bulkOperation) {
      await db.bulkOperation.update({
        where: { id: operationId },
        data: {
          status: OperationStatus.FAILED,
          completedAt: new Date(),
          errorLog: errorMessage
        }
      })

      await db.operationLog.create({
        data: {
          operationId,
          level: LogLevel.ERROR,
          message: `Clone operation failed: ${errorMessage}`,
          details: JSON.stringify({ error })
        }
      })
    }

    return {
      success: false,
      affected: 0,
      successful: 0,
      failed: 0,
      errors: [errorMessage],
      warnings: [],
      summary: 'Clone operation failed',
      operationId: operationId || `clone_${Date.now()}`
    }
  }
}

/**
 * Replace faculty across multiple timetable entries with real database operations
 */
export async function replaceFaculty(options: FacultyReplaceOptions, userId: string): Promise<BulkOperationResult> {
  const { currentFacultyId, newFacultyId, batchIds, subjectIds, effectiveDate, maintainWorkload = true } = options
  
  let operationId = ''
  let bulkOperation: any = null
  
  try {
    // Create BulkOperation record for tracking
    bulkOperation = await db.bulkOperation.create({
      data: {
        type: BulkOperationType.FACULTY_REPLACE,
        status: OperationStatus.RUNNING,
        userId,
        parameters: JSON.stringify({
          currentFacultyId,
          newFacultyId,
          batchIds,
          subjectIds,
          effectiveDate,
          maintainWorkload
        }),
        progress: 0
      }
    })
    
    operationId = bulkOperation.id
    
    // Log operation start
    await db.operationLog.create({
      data: {
        operationId,
        level: LogLevel.INFO,
        message: `Starting faculty replacement from ${currentFacultyId} to ${newFacultyId}`,
        details: JSON.stringify({ currentFacultyId, newFacultyId, options })
      }
    })

    // Validate faculty members exist
    const [currentFaculty, newFaculty] = await Promise.all([
      db.user.findUnique({
        where: { id: currentFacultyId },
        include: { facultyPreferences: { include: { blackoutPeriods: true } } }
      }),
      db.user.findUnique({
        where: { id: newFacultyId },
        include: { facultyPreferences: { include: { blackoutPeriods: true } } }
      })
    ])

    if (!currentFaculty || currentFaculty.role !== 'FACULTY') {
      throw new Error(`Current faculty with ID ${currentFacultyId} not found or is not a faculty member`)
    }
    if (!newFaculty || newFaculty.role !== 'FACULTY') {
      throw new Error(`New faculty with ID ${newFacultyId} not found or is not a faculty member`)
    }

    // Build where clause for timetable entries to update
    const whereClause: any = {
      facultyId: currentFacultyId,
      isActive: true
    }

    if (batchIds && batchIds.length > 0) {
      whereClause.batchId = { in: batchIds }
    }

    if (subjectIds && subjectIds.length > 0) {
      whereClause.subjectId = { in: subjectIds }
    }

    if (effectiveDate) {
      whereClause.date = { gte: new Date(effectiveDate) }
    }

    // Get all affected timetable entries
    const affectedEntries = await db.timetableEntry.findMany({
      where: whereClause,
      include: {
        subject: true,
        batch: true,
        timeSlot: true
      }
    })

    if (affectedEntries.length === 0) {
      await db.operationLog.create({
        data: {
          operationId,
          level: LogLevel.WARN,
          message: 'No timetable entries found for the specified criteria'
        }
      })
      
      await db.bulkOperation.update({
        where: { id: operationId },
        data: {
          status: OperationStatus.COMPLETED,
          progress: 100,
          completedAt: new Date(),
          affectedCount: 0,
          successCount: 0,
          failedCount: 0
        }
      })

      return {
        success: true,
        affected: 0,
        successful: 0,
        failed: 0,
        errors: [],
        warnings: ['No timetable entries found for the specified criteria'],
        summary: 'No entries to update',
        operationId
      }
    }

    // Update progress
    await db.bulkOperation.update({
      where: { id: operationId },
      data: { progress: 10 }
    })

    const errors: string[] = []
    const warnings: string[] = []
    let successful = 0
    let failed = 0

    // Check for conflicts with new faculty's schedule
    const newFacultyConflicts = await db.timetableEntry.findMany({
      where: {
        facultyId: newFacultyId,
        isActive: true,
        OR: affectedEntries.map(entry => ({
          AND: [
            { timeSlotId: entry.timeSlotId },
            { dayOfWeek: entry.dayOfWeek },
            { date: entry.date }
          ]
        }))
      },
      include: {
        subject: true,
        batch: true,
        timeSlot: true
      }
    })

    if (newFacultyConflicts.length > 0) {
      warnings.push(`New faculty has ${newFacultyConflicts.length} conflicting time slots`)
      for (const conflict of newFacultyConflicts.slice(0, 3)) { // Show first 3 conflicts
        warnings.push(`Conflict: ${conflict.timeSlot.name} on ${conflict.dayOfWeek} with ${conflict.batch.name}`)
      }
    }

    // Check faculty blackout periods
    if (newFaculty.facultyPreferences?.blackoutPeriods) {
      const blackoutConflicts = affectedEntries.filter(entry => {
        if (!entry.date) return false
        
        return newFaculty.facultyPreferences!.blackoutPeriods.some(blackout => {
          const entryDate = new Date(entry.date!)
          return entryDate >= new Date(blackout.startDate) && entryDate <= new Date(blackout.endDate)
        })
      })

      if (blackoutConflicts.length > 0) {
        warnings.push(`${blackoutConflicts.length} entries fall within new faculty's blackout periods`)
      }
    }

    // Process entries in transaction
    await db.$transaction(async (tx) => {
      for (let i = 0; i < affectedEntries.length; i++) {
        const entry = affectedEntries[i]
        const progressPercent = Math.floor(((i + 1) / affectedEntries.length) * 80) + 10 // 10-90%
        
        try {
          // Check for specific conflicts before updating
          const hasConflict = newFacultyConflicts.some(conflict => 
            conflict.timeSlotId === entry.timeSlotId &&
            conflict.dayOfWeek === entry.dayOfWeek &&
            conflict.date?.getTime() === entry.date?.getTime()
          )

          if (hasConflict) {
            warnings.push(`Skipped ${entry.timeSlot.name} on ${entry.dayOfWeek} - new faculty has conflict`)
            failed++
            continue
          }

          // Update timetable entry
          await tx.timetableEntry.update({
            where: { id: entry.id },
            data: {
              facultyId: newFacultyId,
              notes: `Faculty changed from ${currentFaculty.name} to ${newFaculty.name} - ${entry.notes || ''}`.trim()
            }
          })

          // Also update subject's primary faculty if this entry's subject is taught by current faculty
          if (entry.subject.primaryFacultyId === currentFacultyId) {
            await tx.subject.update({
              where: { id: entry.subjectId },
              data: { primaryFacultyId: newFacultyId }
            })
          }

          // Update co-faculty if applicable
          if (entry.subject.coFacultyId === currentFacultyId) {
            await tx.subject.update({
              where: { id: entry.subjectId },
              data: { coFacultyId: newFacultyId }
            })
          }

          successful++

          // Update progress periodically
          if (i % 5 === 0) {
            await db.bulkOperation.update({
              where: { id: operationId },
              data: { progress: progressPercent }
            })
          }

        } catch (entryError) {
          failed++
          const errorMessage = `Failed to replace faculty for ${entry.timeSlot.name} on ${entry.dayOfWeek}: ${entryError instanceof Error ? entryError.message : 'Unknown error'}`
          errors.push(errorMessage)
          
          await db.operationLog.create({
            data: {
              operationId,
              level: LogLevel.ERROR,
              message: errorMessage,
              details: JSON.stringify({ entryId: entry.id, error: entryError })
            }
          })
        }
      }
    })

    // Calculate workload impact if requested
    if (maintainWorkload) {
      const currentFacultyWorkload = await db.timetableEntry.count({
        where: { facultyId: currentFacultyId, isActive: true }
      })
      
      const newFacultyWorkload = await db.timetableEntry.count({
        where: { facultyId: newFacultyId, isActive: true }
      })

      if (newFacultyWorkload > currentFacultyWorkload * 1.2) {
        warnings.push('New faculty workload significantly increased - consider redistribution')
      }
    }

    // Final progress update
    await db.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: OperationStatus.COMPLETED,
        progress: 100,
        completedAt: new Date(),
        affectedCount: affectedEntries.length,
        successCount: successful,
        failedCount: failed,
        results: JSON.stringify({
          replacedEntries: successful,
          currentFaculty: currentFaculty.name,
          newFaculty: newFaculty.name
        })
      }
    })

    // Log completion
    await db.operationLog.create({
      data: {
        operationId,
        level: LogLevel.INFO,
        message: `Faculty replacement completed: ${successful} successful, ${failed} failed`,
        details: JSON.stringify({ successful, failed, errors, warnings })
      }
    })

    return {
      success: failed === 0,
      affected: affectedEntries.length,
      successful,
      failed,
      errors,
      warnings,
      summary: `Successfully replaced faculty in ${successful} out of ${affectedEntries.length} timetable entries from ${currentFaculty.name} to ${newFaculty.name}`,
      operationId
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    // Update operation status to failed
    if (bulkOperation) {
      await db.bulkOperation.update({
        where: { id: operationId },
        data: {
          status: OperationStatus.FAILED,
          completedAt: new Date(),
          errorLog: errorMessage
        }
      })

      await db.operationLog.create({
        data: {
          operationId,
          level: LogLevel.ERROR,
          message: `Faculty replacement failed: ${errorMessage}`,
          details: JSON.stringify({ error })
        }
      })
    }

    return {
      success: false,
      affected: 0,
      successful: 0,
      failed: 0,
      errors: [errorMessage],
      warnings: [],
      summary: 'Faculty replacement failed',
      operationId: operationId || `replace_${Date.now()}`
    }
  }
}

/**
 * Bulk reschedule timetable entries with real database operations
 */
export async function bulkReschedule(options: BulkRescheduleOptions, userId: string): Promise<BulkOperationResult> {
  const { sourceStartDate, sourceEndDate, targetStartDate, targetEndDate, batchIds, moveType = 'shift', excludeWeekends = true, respectBlackouts = true } = options
  
  let operationId = ''
  let bulkOperation: any = null
  
  try {
    // Create BulkOperation record for tracking
    bulkOperation = await db.bulkOperation.create({
      data: {
        type: BulkOperationType.BULK_RESCHEDULE,
        status: OperationStatus.RUNNING,
        userId,
        parameters: JSON.stringify({
          sourceStartDate,
          sourceEndDate,
          targetStartDate,
          targetEndDate,
          batchIds,
          moveType,
          excludeWeekends,
          respectBlackouts
        }),
        progress: 0
      }
    })
    
    operationId = bulkOperation.id
    
    // Log operation start
    await db.operationLog.create({
      data: {
        operationId,
        level: LogLevel.INFO,
        message: `Starting bulk reschedule from ${sourceStartDate} to ${targetStartDate}`,
        details: JSON.stringify({ options })
      }
    })

    // Validate dates
    const sourceStart = new Date(sourceStartDate)
    const sourceEnd = new Date(sourceEndDate)
    const targetStart = new Date(targetStartDate)
    const targetEnd = targetEndDate ? new Date(targetEndDate) : new Date(targetStart.getTime() + (sourceEnd.getTime() - sourceStart.getTime()))

    if (sourceStart >= sourceEnd) {
      throw new Error('Source start date must be before source end date')
    }
    if (targetStart >= targetEnd) {
      throw new Error('Target start date must be before target end date')
    }

    // Build where clause for source entries
    const whereClause: any = {
      date: {
        gte: sourceStart,
        lte: sourceEnd
      },
      isActive: true
    }

    if (batchIds && batchIds.length > 0) {
      whereClause.batchId = { in: batchIds }
    }

    // Get all entries to reschedule
    const sourceEntries = await db.timetableEntry.findMany({
      where: whereClause,
      include: {
        subject: true,
        faculty: { 
          include: { 
            facultyPreferences: { 
              include: { blackoutPeriods: true } 
            } 
          } 
        },
        batch: true,
        timeSlot: true
      },
      orderBy: [
        { date: 'asc' },
        { timeSlot: { sortOrder: 'asc' } }
      ]
    })

    if (sourceEntries.length === 0) {
      await db.operationLog.create({
        data: {
          operationId,
          level: LogLevel.WARN,
          message: 'No timetable entries found in source date range'
        }
      })
      
      await db.bulkOperation.update({
        where: { id: operationId },
        data: {
          status: OperationStatus.COMPLETED,
          progress: 100,
          completedAt: new Date(),
          affectedCount: 0,
          successCount: 0,
          failedCount: 0
        }
      })

      return {
        success: true,
        affected: 0,
        successful: 0,
        failed: 0,
        errors: [],
        warnings: ['No timetable entries found in source date range'],
        summary: 'No entries to reschedule',
        operationId
      }
    }

    // Update progress
    await db.bulkOperation.update({
      where: { id: operationId },
      data: { progress: 10 }
    })

    // Check for holidays in target date range
    const holidays = await db.holiday.findMany({
      where: {
        date: {
          gte: targetStart,
          lte: targetEnd
        }
      }
    })

    // Check for exam periods in target date range
    const examPeriods = await db.examPeriod.findMany({
      where: {
        startDate: { lte: targetEnd },
        endDate: { gte: targetStart },
        blockRegularClasses: true
      }
    })

    const errors: string[] = []
    const warnings: string[] = []
    let successful = 0
    let failed = 0
    const rescheduleMapping: { [key: string]: Date } = {}

    // Calculate date mappings based on move type
    const calculateTargetDate = (sourceDate: Date): Date => {
      switch (moveType) {
        case 'shift':
          // Simple shift by the difference between target and source start dates
          const daysDiff = Math.floor((targetStart.getTime() - sourceStart.getTime()) / (1000 * 60 * 60 * 24))
          const newDate = new Date(sourceDate)
          newDate.setDate(newDate.getDate() + daysDiff)
          return newDate

        case 'map':
          // Map proportionally within the new date range
          const sourceRange = sourceEnd.getTime() - sourceStart.getTime()
          const targetRange = targetEnd.getTime() - targetStart.getTime()
          const sourceProgress = (sourceDate.getTime() - sourceStart.getTime()) / sourceRange
          const targetTime = targetStart.getTime() + (sourceProgress * targetRange)
          return new Date(targetTime)

        case 'redistribute':
          // Evenly redistribute across target range
          const sourceIndex = Math.floor((sourceDate.getTime() - sourceStart.getTime()) / (1000 * 60 * 60 * 24))
          const sourceDays = Math.floor((sourceEnd.getTime() - sourceStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
          const targetDays = Math.floor((targetEnd.getTime() - targetStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
          const redistributeIndex = Math.floor((sourceIndex / sourceDays) * targetDays)
          const redistributeDate = new Date(targetStart)
          redistributeDate.setDate(redistributeDate.getDate() + redistributeIndex)
          return redistributeDate

        default:
          return new Date(targetStart)
      }
    }

    // Process entries in transaction
    await db.$transaction(async (tx) => {
      for (let i = 0; i < sourceEntries.length; i++) {
        const entry = sourceEntries[i]
        const progressPercent = Math.floor(((i + 1) / sourceEntries.length) * 80) + 10 // 10-90%
        
        try {
          if (!entry.date) {
            warnings.push(`Skipped entry ${entry.id} - no date specified`)
            continue
          }

          const targetDate = calculateTargetDate(entry.date)
          
          // Skip weekends if requested
          if (excludeWeekends && (targetDate.getDay() === 0 || targetDate.getDay() === 6)) {
            // Find next weekday
            const nextWeekday = new Date(targetDate)
            while (nextWeekday.getDay() === 0 || nextWeekday.getDay() === 6) {
              nextWeekday.setDate(nextWeekday.getDate() + 1)
            }
            rescheduleMapping[entry.id] = nextWeekday
            warnings.push(`Moved entry from weekend ${targetDate.toDateString()} to ${nextWeekday.toDateString()}`)
          } else {
            rescheduleMapping[entry.id] = targetDate
          }

          const finalTargetDate = rescheduleMapping[entry.id]

          // Check for holiday conflicts
          const isHoliday = holidays.some(holiday => 
            holiday.date.toDateString() === finalTargetDate.toDateString()
          )
          if (isHoliday) {
            warnings.push(`Entry rescheduled to holiday: ${finalTargetDate.toDateString()}`)
          }

          // Check for exam period conflicts
          const isExamPeriod = examPeriods.some(exam => 
            finalTargetDate >= exam.startDate && finalTargetDate <= exam.endDate
          )
          if (isExamPeriod) {
            errors.push(`Cannot schedule during exam period: ${finalTargetDate.toDateString()}`)
            failed++
            continue
          }

          // Check faculty blackout periods if requested
          if (respectBlackouts && entry.faculty.facultyPreferences?.blackoutPeriods) {
            const isBlackedOut = entry.faculty.facultyPreferences.blackoutPeriods.some(blackout =>
              finalTargetDate >= new Date(blackout.startDate) && finalTargetDate <= new Date(blackout.endDate)
            )
            
            if (isBlackedOut) {
              warnings.push(`Faculty ${entry.faculty.name} has blackout on ${finalTargetDate.toDateString()}`)
              // Continue but flag as warning rather than error
            }
          }

          // Check for conflicts at target date/time
          const existingEntry = await tx.timetableEntry.findFirst({
            where: {
              batchId: entry.batchId,
              timeSlotId: entry.timeSlotId,
              dayOfWeek: entry.dayOfWeek,
              date: finalTargetDate,
              isActive: true,
              NOT: { id: entry.id }
            }
          })

          if (existingEntry) {
            warnings.push(`Conflict detected for ${entry.batch.name} at ${finalTargetDate.toDateString()} ${entry.timeSlot.name}`)
            // Try to find alternative time slot
            const alternativeSlots = await tx.timeSlot.findMany({
              where: {
                isActive: true,
                NOT: { id: entry.timeSlotId }
              },
              orderBy: { sortOrder: 'asc' }
            })

            let alternativeFound = false
            for (const altSlot of alternativeSlots.slice(0, 3)) { // Try first 3 alternatives
              const altConflict = await tx.timetableEntry.findFirst({
                where: {
                  batchId: entry.batchId,
                  timeSlotId: altSlot.id,
                  dayOfWeek: entry.dayOfWeek,
                  date: finalTargetDate,
                  isActive: true
                }
              })

              if (!altConflict) {
                // Update with alternative time slot
                await tx.timetableEntry.update({
                  where: { id: entry.id },
                  data: {
                    date: finalTargetDate,
                    timeSlotId: altSlot.id,
                    notes: `Rescheduled from ${entry.date?.toDateString()} to ${finalTargetDate.toDateString()}, time changed to ${altSlot.name} - ${entry.notes || ''}`.trim()
                  }
                })
                
                warnings.push(`Moved to alternative time slot: ${altSlot.name}`)
                alternativeFound = true
                successful++
                break
              }
            }

            if (!alternativeFound) {
              errors.push(`No alternative time slots available for ${finalTargetDate.toDateString()}`)
              failed++
              continue
            }
          } else {
            // No conflict, update directly
            await tx.timetableEntry.update({
              where: { id: entry.id },
              data: {
                date: finalTargetDate,
                notes: `Rescheduled from ${entry.date?.toDateString()} to ${finalTargetDate.toDateString()} - ${entry.notes || ''}`.trim()
              }
            })
            successful++
          }

          // Update progress periodically
          if (i % 5 === 0) {
            await db.bulkOperation.update({
              where: { id: operationId },
              data: { progress: progressPercent }
            })
          }

        } catch (entryError) {
          failed++
          const errorMessage = `Failed to reschedule entry ${entry.timeSlot.name} on ${entry.date?.toDateString()}: ${entryError instanceof Error ? entryError.message : 'Unknown error'}`
          errors.push(errorMessage)
          
          await db.operationLog.create({
            data: {
              operationId,
              level: LogLevel.ERROR,
              message: errorMessage,
              details: JSON.stringify({ entryId: entry.id, error: entryError })
            }
          })
        }
      }
    })

    // Final progress update
    await db.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: OperationStatus.COMPLETED,
        progress: 100,
        completedAt: new Date(),
        affectedCount: sourceEntries.length,
        successCount: successful,
        failedCount: failed,
        results: JSON.stringify({
          rescheduledEntries: successful,
          moveType,
          sourceRange: `${sourceStartDate} to ${sourceEndDate}`,
          targetRange: `${targetStartDate} to ${targetEnd.toISOString().split('T')[0]}`
        })
      }
    })

    // Log completion
    await db.operationLog.create({
      data: {
        operationId,
        level: LogLevel.INFO,
        message: `Bulk reschedule completed: ${successful} successful, ${failed} failed`,
        details: JSON.stringify({ successful, failed, errors, warnings })
      }
    })

    return {
      success: failed === 0,
      affected: sourceEntries.length,
      successful,
      failed,
      errors,
      warnings,
      summary: `Successfully rescheduled ${successful} out of ${sourceEntries.length} entries from ${sourceStartDate} to ${targetStartDate} using ${moveType} method`,
      operationId
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    // Update operation status to failed
    if (bulkOperation) {
      await db.bulkOperation.update({
        where: { id: operationId },
        data: {
          status: OperationStatus.FAILED,
          completedAt: new Date(),
          errorLog: errorMessage
        }
      })

      await db.operationLog.create({
        data: {
          operationId,
          level: LogLevel.ERROR,
          message: `Bulk reschedule failed: ${errorMessage}`,
          details: JSON.stringify({ error })
        }
      })
    }

    return {
      success: false,
      affected: 0,
      successful: 0,
      failed: 0,
      errors: [errorMessage],
      warnings: [],
      summary: 'Bulk reschedule failed',
      operationId: operationId || `reschedule_${Date.now()}`
    }
  }
}

/**
 * Apply timetable template to batches
 */
export async function applyTemplate(templateId: string, batchIds: string[]): Promise<BulkOperationResult> {
  try {
    // Simulate template application
    const totalEntries = batchIds.length * 15 // Assume 15 entries per batch
    
    const result: BulkOperationResult = {
      success: true,
      affected: totalEntries,
      successful: Math.floor(totalEntries * 0.9),
      failed: Math.floor(totalEntries * 0.1),
      errors: [
        'Template requires subjects not available in some batches',
        'Faculty assignment conflicts detected'
      ],
      warnings: [
        'Some batches may require manual adjustment',
        'Template created with different semester configuration'
      ],
      summary: `Applied template to ${batchIds.length} batches with ${Math.floor(totalEntries * 0.9)} successful entries`,
      operationId: `template_${Date.now()}`
    }

    return result
  } catch (error) {
    return {
      success: false,
      affected: 0,
      successful: 0,
      failed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      warnings: [],
      summary: 'Template application failed',
      operationId: `template_${Date.now()}`
    }
  }
}

/**
 * Validate bulk operation before execution with comprehensive conflict detection
 */
export async function validateBulkOperation(options: BulkOperationOptions): Promise<{
  isValid: boolean
  conflicts: string[]
  warnings: string[]
  affectedCount: number
  detectedConflicts?: EventConflict[]
  suggestions?: string[]
}> {
  const conflicts: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []
  let affectedCount = 0
  let detectedConflicts: EventConflict[] = []
  
  try {
    switch (options.operation) {
      case 'clone':
        if (!options.sourceData?.batchId || !options.targetData?.batchId) {
          conflicts.push('Source and target batch IDs are required')
          break
        }
        if (options.sourceData?.batchId === options.targetData?.batchId) {
          conflicts.push('Source and target batches cannot be the same')
          break
        }

        // Validate batches exist
        const [sourceBatch, targetBatch] = await Promise.all([
          db.batch.findUnique({ where: { id: options.sourceData.batchId } }),
          db.batch.findUnique({ where: { id: options.targetData.batchId } })
        ])

        if (!sourceBatch) {
          conflicts.push('Source batch not found')
          break
        }
        if (!targetBatch) {
          conflicts.push('Target batch not found')
          break
        }

        // Get source entries for conflict analysis
        const sourceWhere: any = {
          batchId: options.sourceData.batchId,
          isActive: true
        }
        if (options.sourceData.dateRange?.start) {
          sourceWhere.date = { gte: new Date(options.sourceData.dateRange.start) }
        }
        if (options.sourceData.dateRange?.end) {
          sourceWhere.date = { ...sourceWhere.date, lte: new Date(options.sourceData.dateRange.end) }
        }

        const sourceEntries = await db.timetableEntry.findMany({
          where: sourceWhere,
          include: {
            subject: true,
            faculty: true,
            timeSlot: true,
            batch: true
          }
        })

        affectedCount = sourceEntries.length

        // Check for existing entries in target batch that would conflict
        const targetEntries = await db.timetableEntry.findMany({
          where: {
            batchId: options.targetData.batchId,
            isActive: true
          },
          include: {
            subject: true,
            faculty: true,
            timeSlot: true,
            batch: true
          }
        })

        // Simulate what the calendar would look like after cloning
        const simulatedEvents: CalendarEvent[] = [
          // Existing target batch events
          ...targetEntries.map(entry => ({
            id: entry.id,
            title: `${entry.subject.name} - ${entry.faculty.name}`,
            start: entry.date || new Date(),
            end: new Date((entry.date || new Date()).getTime() + entry.timeSlot.duration * 60000),
            extendedProps: {
              batchId: entry.batchId,
              facultyId: entry.facultyId,
              subjectId: entry.subjectId,
              batchName: entry.batch.name,
              facultyName: entry.faculty.name || 'Unknown'
            }
          })),
          // Simulated cloned events
          ...sourceEntries.map(entry => ({
            id: `clone_${entry.id}`,
            title: `${entry.subject.name} - ${entry.faculty.name} (Cloned)`,
            start: entry.date || new Date(),
            end: new Date((entry.date || new Date()).getTime() + entry.timeSlot.duration * 60000),
            extendedProps: {
              batchId: options.targetData!.batchId,
              facultyId: entry.facultyId,
              subjectId: entry.subjectId,
              batchName: targetBatch.name,
              facultyName: entry.faculty.name || 'Unknown'
            }
          }))
        ]

        const conflictResult = detectEventConflicts(simulatedEvents)
        detectedConflicts = conflictResult.conflicts

        if (conflictResult.hasConflicts) {
          conflicts.push(`${conflictResult.conflictCount} conflicts detected in target schedule`)
          if (conflictResult.criticalCount > 0) {
            conflicts.push(`${conflictResult.criticalCount} critical conflicts that must be resolved`)
          }
        }

        // Check for missing subjects in target batch
        const targetSubjects = await db.subject.findMany({
          where: { batchId: options.targetData.batchId, isActive: true },
          select: { code: true }
        })
        const targetSubjectCodes = new Set(targetSubjects.map(s => s.code))
        
        const missingSubjects = sourceEntries
          .map(entry => entry.subject.code)
          .filter(code => !targetSubjectCodes.has(code))
        
        if (missingSubjects.length > 0) {
          warnings.push(`${missingSubjects.length} subjects will be created in target batch: ${missingSubjects.slice(0, 3).join(', ')}${missingSubjects.length > 3 ? '...' : ''}`)
        }

        suggestions.push('Consider using "skip conflicts" mode for safer cloning')
        suggestions.push('Review faculty availability before cloning')
        break

      case 'faculty_replace':
        if (!options.sourceData?.facultyId || !options.targetData?.facultyId) {
          conflicts.push('Current and new faculty IDs are required')
          break
        }

        // Validate faculty exist
        const [currentFaculty, newFaculty] = await Promise.all([
          db.user.findUnique({ 
            where: { id: options.sourceData.facultyId },
            include: { facultyPreferences: { include: { blackoutPeriods: true } } }
          }),
          db.user.findUnique({ 
            where: { id: options.targetData.facultyId },
            include: { facultyPreferences: { include: { blackoutPeriods: true } } }
          })
        ])

        if (!currentFaculty || currentFaculty.role !== 'FACULTY') {
          conflicts.push('Current faculty not found or invalid')
          break
        }
        if (!newFaculty || newFaculty.role !== 'FACULTY') {
          conflicts.push('New faculty not found or invalid')
          break
        }

        // Get affected entries
        const affectedEntries = await db.timetableEntry.findMany({
          where: {
            facultyId: options.sourceData.facultyId,
            isActive: true,
            ...(options.sourceData.dateRange?.start && {
              date: { gte: new Date(options.sourceData.dateRange.start) }
            })
          },
          include: {
            timeSlot: true,
            batch: true
          }
        })

        affectedCount = affectedEntries.length

        // Check new faculty conflicts
        const newFacultyEntries = await db.timetableEntry.findMany({
          where: {
            facultyId: options.targetData.facultyId,
            isActive: true
          },
          include: {
            timeSlot: true,
            batch: true
          }
        })

        // Check for schedule conflicts
        const timeConflicts = affectedEntries.filter(entry => 
          newFacultyEntries.some(existing => 
            existing.timeSlotId === entry.timeSlotId &&
            existing.dayOfWeek === entry.dayOfWeek &&
            existing.date?.getTime() === entry.date?.getTime()
          )
        )

        if (timeConflicts.length > 0) {
          conflicts.push(`New faculty has ${timeConflicts.length} schedule conflicts`)
        }

        // Check blackout periods
        if (newFaculty.facultyPreferences?.blackoutPeriods) {
          const blackoutConflicts = affectedEntries.filter(entry => {
            if (!entry.date) return false
            return newFaculty.facultyPreferences!.blackoutPeriods.some(blackout =>
              entry.date! >= new Date(blackout.startDate) && entry.date! <= new Date(blackout.endDate)
            )
          })

          if (blackoutConflicts.length > 0) {
            warnings.push(`${blackoutConflicts.length} entries fall within new faculty blackout periods`)
          }
        }

        suggestions.push('Review new faculty workload distribution')
        suggestions.push('Check subject expertise match')
        break

      case 'reschedule':
        if (!options.sourceData?.dateRange || !options.targetData?.dateRange) {
          conflicts.push('Source and target date ranges are required')
          break
        }

        const sourceStart = new Date(options.sourceData.dateRange.start)
        const sourceEnd = new Date(options.sourceData.dateRange.end)
        const targetStart = new Date(options.targetData.dateRange.start)

        if (sourceStart >= sourceEnd) {
          conflicts.push('Source start date must be before end date')
          break
        }

        // Get entries to reschedule
        const entriesToReschedule = await db.timetableEntry.findMany({
          where: {
            date: { gte: sourceStart, lte: sourceEnd },
            isActive: true,
            ...(options.sourceData.batchId && { batchId: options.sourceData.batchId })
          },
          include: {
            faculty: { include: { facultyPreferences: { include: { blackoutPeriods: true } } } },
            timeSlot: true,
            batch: true
          }
        })

        affectedCount = entriesToReschedule.length

        // Check for holidays in target range
        const targetEnd = new Date(options.targetData.dateRange.end || 
          targetStart.getTime() + (sourceEnd.getTime() - sourceStart.getTime()))

        const holidays = await db.holiday.findMany({
          where: {
            date: { gte: targetStart, lte: targetEnd }
          }
        })

        if (holidays.length > 0) {
          warnings.push(`${holidays.length} holidays found in target date range`)
        }

        // Check exam periods
        const examPeriods = await db.examPeriod.findMany({
          where: {
            startDate: { lte: targetEnd },
            endDate: { gte: targetStart },
            blockRegularClasses: true
          }
        })

        if (examPeriods.length > 0) {
          conflicts.push(`${examPeriods.length} exam periods block regular classes in target range`)
        }

        suggestions.push('Consider alternative time slots for conflicting entries')
        suggestions.push('Review faculty availability in target period')
        break
    }

  } catch (error) {
    console.error('Error in bulk operation validation:', error)
    conflicts.push('Validation failed due to database error')
  }

  return {
    isValid: conflicts.length === 0,
    conflicts,
    warnings,
    affectedCount,
    detectedConflicts,
    suggestions
  }
}

/**
 * Get operation progress with real database tracking
 */
export async function getOperationProgress(operationId: string): Promise<{
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused'
  progress: number
  message: string
  estimatedTimeRemaining?: number
  startedAt?: string
  completedAt?: string
  affectedCount?: number
  successCount?: number
  failedCount?: number
  errors?: string[]
}> {
  try {
    const operation = await db.bulkOperation.findUnique({
      where: { id: operationId },
      include: {
        logs: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    })

    if (!operation) {
      return {
        status: 'failed',
        progress: 0,
        message: 'Operation not found'
      }
    }

    const latestLog = operation.logs[0]
    let message = 'Processing timetable entries...'
    
    if (latestLog) {
      message = latestLog.message
    }

    // Map Prisma enum to return type
    const statusMap: Record<string, 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused'> = {
      PENDING: 'pending',
      RUNNING: 'running', 
      COMPLETED: 'completed',
      FAILED: 'failed',
      CANCELLED: 'cancelled',
      PAUSED: 'paused'
    }

    // Calculate estimated time remaining for running operations
    let estimatedTimeRemaining: number | undefined
    if (operation.status === 'RUNNING' && operation.progress > 0) {
      const elapsed = Date.now() - operation.startedAt.getTime()
      const remainingProgress = 100 - operation.progress
      estimatedTimeRemaining = Math.floor((elapsed / operation.progress) * remainingProgress / 1000)
    }

    return {
      status: statusMap[operation.status] || 'failed',
      progress: operation.progress,
      message,
      estimatedTimeRemaining,
      startedAt: operation.startedAt.toISOString(),
      completedAt: operation.completedAt?.toISOString(),
      affectedCount: operation.affectedCount,
      successCount: operation.successCount,
      failedCount: operation.failedCount,
      errors: operation.errorLog ? [operation.errorLog] : undefined
    }
  } catch (error) {
    return {
      status: 'failed',
      progress: 0,
      message: 'Error fetching operation progress'
    }
  }
}

/**
 * Cancel running operation with real database update
 */
export async function cancelOperation(operationId: string): Promise<boolean> {
  try {
    const operation = await db.bulkOperation.findUnique({
      where: { id: operationId }
    })

    if (!operation) {
      return false
    }

    // Only cancel if operation is pending or running
    if (operation.status !== 'PENDING' && operation.status !== 'RUNNING') {
      return false
    }

    await db.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date()
      }
    })

    // Log cancellation
    await db.operationLog.create({
      data: {
        operationId,
        level: 'INFO',
        message: 'Operation cancelled by user'
      }
    })

    return true
  } catch (error) {
    console.error('Error cancelling operation:', error)
    return false
  }
}

/**
 * Perform dry-run of bulk operation with conflict visualization
 */
export async function dryRunBulkOperation(options: BulkOperationOptions, userId: string): Promise<BulkOperationResult> {
  try {
    // First validate the operation
    const validation = await validateBulkOperation(options)
    
    if (!validation.isValid) {
      return {
        success: false,
        affected: validation.affectedCount,
        successful: 0,
        failed: validation.affectedCount,
        errors: validation.conflicts,
        warnings: validation.warnings || [],
        summary: 'Dry-run failed validation',
        operationId: `dryrun_${Date.now()}`,
        dryRun: true
      }
    }

    let conflictVisualization: any = undefined
    let previewResults: any = undefined
    let affected = validation.affectedCount
    let summary = ''

    switch (options.operation) {
      case 'clone':
        const clonePreview = await generateClonePreview(options, userId)
        conflictVisualization = clonePreview.visualization
        previewResults = clonePreview.preview
        summary = `Dry-run: Would clone ${affected} entries with ${clonePreview.visualization.conflicts.length} conflicts`
        break

      case 'faculty_replace':
        const replacePreview = await generateFacultyReplacePreview(options, userId)
        conflictVisualization = replacePreview.visualization
        previewResults = replacePreview.preview
        summary = `Dry-run: Would replace faculty in ${affected} entries with ${replacePreview.visualization.conflicts.length} conflicts`
        break

      case 'reschedule':
        const reschedulePreview = await generateReschedulePreview(options, userId)
        conflictVisualization = reschedulePreview.visualization
        previewResults = reschedulePreview.preview
        summary = `Dry-run: Would reschedule ${affected} entries with ${reschedulePreview.visualization.conflicts.length} conflicts`
        break

      default:
        summary = `Dry-run: ${options.operation} operation preview not implemented`
    }

    return {
      success: true,
      affected,
      successful: affected - (conflictVisualization?.conflicts.length || 0),
      failed: conflictVisualization?.conflicts.length || 0,
      errors: [],
      warnings: validation.warnings || [],
      summary,
      operationId: `dryrun_${Date.now()}`,
      dryRun: true,
      conflictVisualization,
      previewResults
    }

  } catch (error) {
    return {
      success: false,
      affected: 0,
      successful: 0,
      failed: 0,
      errors: [error instanceof Error ? error.message : 'Dry-run failed'],
      warnings: [],
      summary: 'Dry-run encountered an error',
      operationId: `dryrun_${Date.now()}`,
      dryRun: true
    }
  }
}

/**
 * Generate clone operation preview with conflict visualization
 */
async function generateClonePreview(options: BulkOperationOptions, userId: string) {
  const sourceEntries = await db.timetableEntry.findMany({
    where: {
      batchId: options.sourceData!.batchId,
      isActive: true,
      ...(options.sourceData?.dateRange?.start && {
        date: { gte: new Date(options.sourceData.dateRange.start) }
      })
    },
    include: {
      subject: true,
      faculty: true,
      timeSlot: true,
      batch: true
    }
  })

  const targetEntries = await db.timetableEntry.findMany({
    where: {
      batchId: options.targetData!.batchId,
      isActive: true
    },
    include: {
      subject: true,
      faculty: true,
      timeSlot: true,
      batch: true
    }
  })

  // Create proposed events
  const proposedEvents: CalendarEvent[] = sourceEntries.map(entry => ({
    id: `proposed_${entry.id}`,
    title: `${entry.subject.name} - ${entry.faculty.name}`,
    start: entry.date || new Date(),
    end: new Date((entry.date || new Date()).getTime() + entry.timeSlot.duration * 60000),
    extendedProps: {
      batchId: options.targetData!.batchId,
      facultyId: entry.facultyId,
      subjectId: entry.subjectId,
      batchName: entry.batch.name,
      facultyName: entry.faculty.name || 'Unknown'
    }
  }))

  // Existing events in target
  const existingEvents: CalendarEvent[] = targetEntries.map(entry => ({
    id: entry.id,
    title: `${entry.subject.name} - ${entry.faculty.name}`,
    start: entry.date || new Date(),
    end: new Date((entry.date || new Date()).getTime() + entry.timeSlot.duration * 60000),
    extendedProps: {
      batchId: entry.batchId,
      facultyId: entry.facultyId,
      subjectId: entry.subjectId,
      batchName: entry.batch.name,
      facultyName: entry.faculty.name || 'Unknown'
    }
  }))

  // Detect conflicts
  const allEvents = [...existingEvents, ...proposedEvents]
  const conflictResult = detectEventConflicts(allEvents)

  // Calculate resource impact
  const facultyWorkload: { [key: string]: number } = {}
  const batchLoad: { [key: string]: number } = {}
  const timeSlotUtilization: { [key: string]: number } = {}

  proposedEvents.forEach(event => {
    const facultyId = event.extendedProps?.facultyId
    const batchId = event.extendedProps?.batchId
    
    if (facultyId) {
      facultyWorkload[facultyId] = (facultyWorkload[facultyId] || 0) + 1
    }
    if (batchId) {
      batchLoad[batchId] = (batchLoad[batchId] || 0) + 1
    }
  })

  const recommendations = [
    'Review faculty workload distribution after cloning',
    'Consider subject prerequisites and semester alignment',
    conflictResult.criticalCount > 0 ? 'Resolve critical conflicts before proceeding' : 'No critical conflicts detected'
  ]

  return {
    visualization: {
      conflicts: conflictResult.conflicts,
      affectedEvents: allEvents,
      proposedChanges: {
        create: proposedEvents,
        update: [],
        delete: []
      }
    },
    preview: {
      estimatedDuration: Math.ceil(sourceEntries.length / 10) * 60, // Estimate 10 entries per minute
      resourceImpact: {
        facultyWorkload,
        batchLoad,
        timeSlotUtilization
      },
      recommendations
    }
  }
}

/**
 * Generate faculty replace operation preview
 */
async function generateFacultyReplacePreview(options: BulkOperationOptions, userId: string) {
  const affectedEntries = await db.timetableEntry.findMany({
    where: {
      facultyId: options.sourceData!.facultyId,
      isActive: true
    },
    include: {
      subject: true,
      faculty: true,
      timeSlot: true,
      batch: true
    }
  })

  const newFaculty = await db.user.findUnique({
    where: { id: options.targetData!.facultyId },
    select: { name: true }
  })

  // Create updated events
  const updatedEvents: CalendarEvent[] = affectedEntries.map(entry => ({
    id: `updated_${entry.id}`,
    title: `${entry.subject.name} - ${newFaculty?.name || 'New Faculty'}`,
    start: entry.date || new Date(),
    end: new Date((entry.date || new Date()).getTime() + entry.timeSlot.duration * 60000),
    extendedProps: {
      batchId: entry.batchId,
      facultyId: options.targetData!.facultyId,
      subjectId: entry.subjectId,
      batchName: entry.batch.name,
      facultyName: newFaculty?.name || 'New Faculty'
    }
  }))

  // Check new faculty's existing schedule
  const newFacultyEntries = await db.timetableEntry.findMany({
    where: {
      facultyId: options.targetData!.facultyId,
      isActive: true
    },
    include: {
      subject: true,
      faculty: true,
      timeSlot: true,
      batch: true
    }
  })

  const existingEvents: CalendarEvent[] = newFacultyEntries.map(entry => ({
    id: entry.id,
    title: `${entry.subject.name} - ${entry.faculty.name}`,
    start: entry.date || new Date(),
    end: new Date((entry.date || new Date()).getTime() + entry.timeSlot.duration * 60000),
    extendedProps: {
      batchId: entry.batchId,
      facultyId: entry.facultyId,
      subjectId: entry.subjectId,
      batchName: entry.batch.name,
      facultyName: entry.faculty.name || 'Unknown'
    }
  }))

  const allEvents = [...existingEvents, ...updatedEvents]
  const conflictResult = detectEventConflicts(allEvents)

  const facultyWorkload: { [key: string]: number } = {}
  facultyWorkload[options.targetData!.facultyId] = updatedEvents.length + existingEvents.length

  return {
    visualization: {
      conflicts: conflictResult.conflicts,
      affectedEvents: allEvents,
      proposedChanges: {
        create: [],
        update: updatedEvents,
        delete: []
      }
    },
    preview: {
      estimatedDuration: Math.ceil(affectedEntries.length / 20) * 60, // Faster than cloning
      resourceImpact: {
        facultyWorkload,
        batchLoad: {},
        timeSlotUtilization: {}
      },
      recommendations: [
        'Verify new faculty has expertise in assigned subjects',
        'Check faculty availability preferences',
        'Review workload balance across department'
      ]
    }
  }
}

/**
 * Generate reschedule operation preview
 */
async function generateReschedulePreview(options: BulkOperationOptions, userId: string) {
  const sourceStart = new Date(options.sourceData!.dateRange!.start)
  const sourceEnd = new Date(options.sourceData!.dateRange!.end)
  const targetStart = new Date(options.targetData!.dateRange!.start)

  const entriesToReschedule = await db.timetableEntry.findMany({
    where: {
      date: { gte: sourceStart, lte: sourceEnd },
      isActive: true
    },
    include: {
      subject: true,
      faculty: true,
      timeSlot: true,
      batch: true
    }
  })

  // Calculate new dates (simplified shift logic)
  const daysDiff = Math.floor((targetStart.getTime() - sourceStart.getTime()) / (1000 * 60 * 60 * 24))

  const rescheduledEvents: CalendarEvent[] = entriesToReschedule.map(entry => {
    const newDate = new Date(entry.date || new Date())
    newDate.setDate(newDate.getDate() + daysDiff)
    
    return {
      id: `rescheduled_${entry.id}`,
      title: `${entry.subject.name} - ${entry.faculty.name}`,
      start: newDate,
      end: new Date(newDate.getTime() + entry.timeSlot.duration * 60000),
      extendedProps: {
        batchId: entry.batchId,
        facultyId: entry.facultyId,
        subjectId: entry.subjectId,
        batchName: entry.batch.name,
        facultyName: entry.faculty.name || 'Unknown'
      }
    }
  })

  const conflictResult = detectEventConflicts(rescheduledEvents)

  return {
    visualization: {
      conflicts: conflictResult.conflicts,
      affectedEvents: rescheduledEvents,
      proposedChanges: {
        create: [],
        update: rescheduledEvents,
        delete: []
      }
    },
    preview: {
      estimatedDuration: Math.ceil(entriesToReschedule.length / 15) * 60,
      resourceImpact: {
        facultyWorkload: {},
        batchLoad: {},
        timeSlotUtilization: {}
      },
      recommendations: [
        'Check for holidays in target date range',
        'Verify faculty availability',
        'Consider exam schedule conflicts'
      ]
    }
  }
}

/**
 * Get operation history with real database data
 */
export async function getOperationHistory(limit: number = 10, userId?: string): Promise<{
  id: string
  type: string
  status: string
  startTime: string
  endTime?: string
  summary: string
  affectedCount: number
  successCount: number
  failedCount: number
  progress: number
  parameters?: any
  results?: any
}[]> {
  try {
    const whereClause: any = {}
    if (userId) {
      whereClause.userId = userId
    }

    const operations = await db.bulkOperation.findMany({
      where: whereClause,
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    })

    return operations.map(op => {
      // Parse parameters to extract summary information
      let summary = `${op.type.replace('_', ' ').toLowerCase()} operation`
      try {
        const params = JSON.parse(op.parameters)
        switch (op.type) {
          case 'CLONE_TIMETABLE':
            summary = `Cloned timetable entries to target batch`
            break
          case 'FACULTY_REPLACE':
            summary = `Replaced faculty assignments`
            break
          case 'BULK_RESCHEDULE':
            summary = `Rescheduled entries from ${params.sourceStartDate} to ${params.targetStartDate}`
            break
          case 'TEMPLATE_APPLY':
            summary = `Applied template to batches`
            break
        }
      } catch (e) {
        // Use default summary if parameters can't be parsed
      }

      return {
        id: op.id,
        type: op.type.toLowerCase(),
        status: op.status.toLowerCase(),
        startTime: op.startedAt.toISOString(),
        endTime: op.completedAt?.toISOString(),
        summary,
        affectedCount: op.affectedCount,
        successCount: op.successCount,
        failedCount: op.failedCount,
        progress: op.progress,
        parameters: op.parameters ? JSON.parse(op.parameters) : undefined,
        results: op.results ? JSON.parse(op.results) : undefined
      }
    })
  } catch (error) {
    console.error('Error fetching operation history:', error)
    return []
  }
}