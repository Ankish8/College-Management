"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { UndoToastProps } from '@/types/undo'
import { Undo2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function UndoToast({ operation, onUndo, onExpire }: UndoToastProps) {
  const [remainingTime, setRemainingTime] = useState<number>(0)
  const [isUndoing, setIsUndoing] = useState(false)
  const [totalTime, setTotalTime] = useState<number>(0)

  // Calculate initial time
  useEffect(() => {
    const total = Math.floor((operation.expiresAt.getTime() - Date.now()) / 1000)
    setTotalTime(total)
    setRemainingTime(total)
  }, [operation.expiresAt])

  // Update countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.floor((operation.expiresAt.getTime() - Date.now()) / 1000)
      
      if (remaining <= 0) {
        setRemainingTime(0)
        onExpire(operation.id)
        toast.dismiss(`undo-${operation.id}`)
        clearInterval(interval)
      } else {
        setRemainingTime(remaining)
      }
    }, 100) // Update every 100ms for smooth progress bar

    return () => clearInterval(interval)
  }, [operation.expiresAt, operation.id, onExpire])

  // Calculate progress percentage (inverted - 100% at start, 0% at end)
  const progressPercentage = totalTime > 0 ? (remainingTime / totalTime) * 100 : 0

  // Handle undo click
  const handleUndo = async () => {
    if (isUndoing || remainingTime <= 0) return
    
    setIsUndoing(true)
    try {
      await onUndo(operation.id)
      toast.dismiss(`undo-${operation.id}`)
    } catch (error) {
      setIsUndoing(false)
      // Error handling is done in the hook
    }
  }

  // Handle dismiss
  const handleDismiss = () => {
    onExpire(operation.id)
    toast.dismiss(`undo-${operation.id}`)
  }

  return (
    <div className={cn(
      "flex items-center gap-3 p-4 bg-background border rounded-lg shadow-lg",
      "min-w-[350px] max-w-[500px]"
    )}>
      {/* Icon */}
      <div className="flex-shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
          <Undo2 className="h-4 w-4 text-orange-600" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-foreground">
            Deleted {operation.description}
          </p>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
            disabled={isUndoing}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <Progress 
            value={progressPercentage} 
            className="h-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {remainingTime}s remaining
          </p>
        </div>
      </div>

      {/* Undo button */}
      <div className="flex-shrink-0">
        <Button
          onClick={handleUndo}
          disabled={isUndoing || remainingTime <= 0}
          size="sm"
          variant="default"
          className={cn(
            "gap-2 min-w-[80px]",
            remainingTime <= 5 && "animate-pulse"
          )}
        >
          {isUndoing ? (
            <>
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Undoing...
            </>
          ) : (
            <>
              <Undo2 className="h-3 w-3" />
              Undo
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// Helper component for simple undo toasts without custom UI
export function SimpleUndoToast({ 
  description, 
  onUndo, 
  onExpire,
  timeoutSeconds = 30 
}: {
  description: string
  onUndo: () => Promise<void>
  onExpire: () => void
  timeoutSeconds?: number
}) {
  const [remainingTime, setRemainingTime] = useState(timeoutSeconds)
  const [isUndoing, setIsUndoing] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          onExpire()
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [onExpire])

  const handleUndo = async () => {
    setIsUndoing(true)
    try {
      await onUndo()
    } catch (error) {
      setIsUndoing(false)
    }
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-background border rounded-lg shadow-lg min-w-[300px]">
      <div className="flex-1">
        <p className="text-sm font-medium">Deleted {description}</p>
        <p className="text-xs text-muted-foreground">{remainingTime}s remaining</p>
      </div>
      <Button
        onClick={handleUndo}
        disabled={isUndoing}
        size="sm"
        variant="outline"
      >
        {isUndoing ? 'Undoing...' : 'Undo'}
      </Button>
    </div>
  )
}