export type UndoEntityType = 
  | 'TIMETABLE_ENTRY'
  | 'STUDENT'
  | 'FACULTY' 
  | 'SUBJECT'
  | 'BATCH'
  | 'HOLIDAY'
  | 'TIMESLOT'

export type UndoOperationType = 
  | 'DELETE'
  | 'BATCH_DELETE'
  | 'SOFT_DELETE'

export interface UndoOperation {
  id: string
  userId: string
  entityType: UndoEntityType
  entityId: string
  operation: UndoOperationType
  data: Record<string, any> // Original entity data
  metadata?: {
    relatedIds?: string[]
    description?: string
    entityName?: string
    additionalContext?: Record<string, any>
  }
  expiresAt: Date
  createdAt: Date
}

export interface PendingUndoOperation {
  id: string
  entityType: UndoEntityType
  entityId: string
  operation: UndoOperationType
  description: string
  expiresAt: Date
  timeoutId?: NodeJS.Timeout
}

export interface UndoToastProps {
  operation: PendingUndoOperation
  onUndo: (operationId: string) => Promise<void>
  onExpire: (operationId: string) => void
}

export interface UndoResult {
  success: boolean
  message: string
  error?: string
}

export interface CreateUndoOperationParams {
  entityType: UndoEntityType
  entityId: string
  operation: UndoOperationType
  data: Record<string, any>
  metadata?: UndoOperation['metadata']
  timeoutSeconds?: number
}