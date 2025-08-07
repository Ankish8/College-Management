"use client"

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { undoManager, createUndoOperation, executeUndo } from '@/lib/undo-manager'
import { 
  PendingUndoOperation, 
  UndoEntityType, 
  UndoOperationType,
  UndoResult
} from '@/types/undo'

interface UseUndoOptions {
  onUndoSuccess?: (result: UndoResult) => void
  onUndoError?: (error: string) => void
  onOperationExpired?: (operationId: string) => void
}

export function useUndo(options: UseUndoOptions = {}) {
  const [pendingOperations, setPendingOperations] = useState<PendingUndoOperation[]>([])
  const [isUndoing, setIsUndoing] = useState<Record<string, boolean>>({})

  // Sync with undo manager
  const refreshPendingOperations = useCallback(() => {
    setPendingOperations(undoManager.getPendingOperations())
  }, [])

  // Handle undo execution
  const handleUndo = useCallback(async (operationId: string): Promise<void> => {
    setIsUndoing(prev => ({ ...prev, [operationId]: true }))
    
    try {
      const result = await executeUndo(operationId)
      
      if (result.success) {
        toast.success(result.message, {
          duration: 3000,
        })
        options.onUndoSuccess?.(result)
        
        // Trigger page refresh to show restored data
        window.location.reload()
      } else {
        toast.error(result.message || 'Failed to undo operation', {
          duration: 5000,
        })
        options.onUndoError?.(result.error || result.message)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Undo failed: ${errorMessage}`, {
        duration: 5000,
      })
      options.onUndoError?.(errorMessage)
    } finally {
      setIsUndoing(prev => {
        const newState = { ...prev }
        delete newState[operationId]
        return newState
      })
      refreshPendingOperations()
    }
  }, [options, refreshPendingOperations])

  // Handle operation expiration
  const handleExpire = useCallback((operationId: string) => {
    undoManager.expireOperation(operationId)
    refreshPendingOperations()
    options.onOperationExpired?.(operationId)
  }, [options, refreshPendingOperations])

  // Create a new undo operation and show toast
  const registerUndoOperation = useCallback(async (
    entityType: UndoEntityType,
    entityId: string,
    operation: UndoOperationType,
    data: Record<string, any>,
    metadata?: {
      entityName?: string
      description?: string
      relatedIds?: string[]
      additionalContext?: Record<string, any>
    },
    timeoutSeconds?: number
  ): Promise<void> => {
    try {
      const operationId = await createUndoOperation({
        entityType,
        entityId,
        operation,
        data,
        metadata,
        timeoutSeconds
      })

      refreshPendingOperations()
      
      // Show the undo toast using a simple action-based toast
      const pendingOp = undoManager.getPendingOperation(operationId)
      if (pendingOp) {
        const remainingSeconds = Math.ceil((pendingOp.expiresAt.getTime() - Date.now()) / 1000)
        
        toast.success(
          `Deleted ${pendingOp.description}`,
          {
            id: `undo-${operationId}`,
            duration: timeoutSeconds ? timeoutSeconds * 1000 : 30000,
            description: `${remainingSeconds}s remaining to undo`,
            action: {
              label: 'Undo',
              onClick: async () => {
                await handleUndo(operationId)
                toast.dismiss(`undo-${operationId}`)
              },
            },
            onDismiss: () => {
              handleExpire(operationId)
            },
          }
        )
      }
    } catch (error) {
      console.error('Failed to register undo operation:', error)
      toast.error('Failed to create undo option', {
        duration: 3000,
      })
    }
  }, [handleUndo, handleExpire, refreshPendingOperations])

  // Get pending operation status
  const getOperationStatus = useCallback((operationId: string) => {
    return {
      isPending: undoManager.canUndo(operationId),
      remainingTime: undoManager.getRemainingTime(operationId),
      isUndoing: isUndoing[operationId] || false,
    }
  }, [isUndoing])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      undoManager.clearAllPending()
    }
  }, [])

  return {
    pendingOperations,
    registerUndoOperation,
    handleUndo,
    getOperationStatus,
    isUndoing,
    refreshPendingOperations,
  }
}

// Simplified hook for common delete operations
export function useDeleteWithUndo(options: UseUndoOptions = {}) {
  const { registerUndoOperation, ...undoState } = useUndo(options)

  const deleteWithUndo = useCallback(async (
    entityType: UndoEntityType,
    entityId: string,
    entityData: Record<string, any>,
    entityName: string,
    deleteAction: () => Promise<void>
  ): Promise<void> => {
    try {
      // Register the undo operation BEFORE executing the delete
      // This ensures the undo toast appears before any page refresh
      await registerUndoOperation(
        entityType,
        entityId,
        'DELETE',
        entityData,
        { entityName }
      )

      // Then execute the delete action
      await deleteAction()
    } catch (error) {
      console.error('Delete operation failed:', error)
      throw error
    }
  }, [registerUndoOperation])

  return {
    ...undoState,
    deleteWithUndo,
  }
}