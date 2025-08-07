import { 
  UndoOperation, 
  PendingUndoOperation, 
  UndoEntityType, 
  UndoOperationType,
  CreateUndoOperationParams,
  UndoResult 
} from '@/types/undo'

class UndoManager {
  private pendingOperations = new Map<string, PendingUndoOperation>()
  private readonly DEFAULT_TIMEOUT_SECONDS = 30

  /**
   * Create and register a new undo operation
   */
  async createUndoOperation({
    entityType,
    entityId,
    operation,
    data,
    metadata,
    timeoutSeconds = this.DEFAULT_TIMEOUT_SECONDS
  }: CreateUndoOperationParams): Promise<string> {
    try {
      // Create the undo operation in the database
      const response = await fetch('/api/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          entityType,
          entityId,
          operation,
          data,
          metadata,
          timeoutSeconds
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create undo operation')
      }

      const { id }: { id: string } = await response.json()
      
      // Register the pending operation locally
      const expiresAt = new Date(Date.now() + timeoutSeconds * 1000)
      const pendingOperation: PendingUndoOperation = {
        id,
        entityType,
        entityId,
        operation,
        description: this.generateDescription(entityType, metadata?.entityName, operation),
        expiresAt
      }

      this.pendingOperations.set(id, pendingOperation)
      
      // Set up automatic cleanup
      const timeoutId = setTimeout(() => {
        this.expireOperation(id)
      }, timeoutSeconds * 1000)

      pendingOperation.timeoutId = timeoutId

      return id
    } catch (error) {
      console.error('Failed to create undo operation:', error)
      throw error
    }
  }

  /**
   * Execute an undo operation
   */
  async executeUndo(operationId: string): Promise<UndoResult> {
    try {
      const pendingOp = this.pendingOperations.get(operationId)
      if (!pendingOp) {
        return { success: false, message: 'Undo operation not found or expired' }
      }

      // Clear the timeout
      if (pendingOp.timeoutId) {
        clearTimeout(pendingOp.timeoutId)
      }

      // Execute the undo via API
      const response = await fetch(`/api/undo/${operationId}`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { 
          success: false, 
          message: errorData.message || 'Failed to undo operation',
          error: errorData.error 
        }
      }

      const result = await response.json()
      
      // Remove from pending operations
      this.pendingOperations.delete(operationId)

      return {
        success: true,
        message: result.message || `Successfully restored ${pendingOp.description}`
      }
    } catch (error) {
      console.error('Failed to execute undo:', error)
      return { 
        success: false, 
        message: 'An error occurred while undoing the operation',
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get a pending operation by ID
   */
  getPendingOperation(operationId: string): PendingUndoOperation | undefined {
    return this.pendingOperations.get(operationId)
  }

  /**
   * Get all pending operations
   */
  getPendingOperations(): PendingUndoOperation[] {
    return Array.from(this.pendingOperations.values())
  }

  /**
   * Expire an operation (remove from pending and cleanup)
   */
  expireOperation(operationId: string): void {
    const pendingOp = this.pendingOperations.get(operationId)
    if (pendingOp) {
      if (pendingOp.timeoutId) {
        clearTimeout(pendingOp.timeoutId)
      }
      this.pendingOperations.delete(operationId)
    }
  }

  /**
   * Clear all pending operations (useful for cleanup on page unload)
   */
  clearAllPending(): void {
    for (const [id, operation] of this.pendingOperations) {
      if (operation.timeoutId) {
        clearTimeout(operation.timeoutId)
      }
    }
    this.pendingOperations.clear()
  }

  /**
   * Generate a user-friendly description for an operation
   */
  private generateDescription(
    entityType: UndoEntityType, 
    entityName?: string, 
    operation?: UndoOperationType
  ): string {
    const name = entityName || 'item'
    
    switch (entityType) {
      case 'TIMETABLE_ENTRY':
        return `class "${name}"`
      case 'STUDENT':
        return `student "${name}"`
      case 'FACULTY':
        return `faculty "${name}"`
      case 'SUBJECT':
        return `subject "${name}"`
      case 'BATCH':
        return `batch "${name}"`
      case 'HOLIDAY':
        return `holiday "${name}"`
      case 'TIMESLOT':
        return `time slot "${name}"`
      default:
        return `${entityType.toLowerCase()} "${name}"`
    }
  }

  /**
   * Check if an operation can still be undone
   */
  canUndo(operationId: string): boolean {
    const operation = this.pendingOperations.get(operationId)
    return operation ? new Date() < operation.expiresAt : false
  }

  /**
   * Get remaining time for an operation in seconds
   */
  getRemainingTime(operationId: string): number {
    const operation = this.pendingOperations.get(operationId)
    if (!operation) return 0
    
    const remaining = operation.expiresAt.getTime() - Date.now()
    return Math.max(0, Math.floor(remaining / 1000))
  }
}

// Export singleton instance
export const undoManager = new UndoManager()

// Helper function to create undo operation with common defaults
export async function createUndoOperation(params: CreateUndoOperationParams): Promise<string> {
  return undoManager.createUndoOperation(params)
}

// Helper function to execute undo
export async function executeUndo(operationId: string): Promise<UndoResult> {
  return undoManager.executeUndo(operationId)
}