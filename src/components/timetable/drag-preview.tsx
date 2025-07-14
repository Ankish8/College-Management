'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Copy, ArrowRight, ArrowDown } from 'lucide-react'

interface DragPreviewProps {
  isVisible: boolean
  direction: 'vertical' | 'horizontal'
  previewSlots: string[]
  conflictingSlots?: string[]
  originalEvent?: {
    subjectName: string
    facultyName: string
    timeSlot: string
    dayOfWeek: string
  }
  onConfirm?: () => void
  onCancel?: () => void
}

export function DragPreview({
  isVisible,
  direction,
  previewSlots,
  conflictingSlots = [],
  originalEvent,
  onConfirm,
  onCancel
}: DragPreviewProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    if (isVisible) {
      document.addEventListener('mousemove', handleMouseMove)
      return () => document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [isVisible])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return
      
      if (e.key === 'Enter' && onConfirm) {
        onConfirm()
      } else if (e.key === 'Escape' && onCancel) {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, onConfirm, onCancel])

  if (!isVisible || !originalEvent) return null

  const getPreviewText = () => {
    const hasConflicts = conflictingSlots.length > 0
    const baseText = direction === 'vertical' 
      ? `Extending ${originalEvent?.subjectName} to ${previewSlots.length} time slot${previewSlots.length === 1 ? '' : 's'}`
      : `Extending ${originalEvent?.subjectName} to ${previewSlots.length} day${previewSlots.length === 1 ? '' : 's'}`
    
    if (hasConflicts) {
      return `${baseText} (${conflictingSlots.length} conflict${conflictingSlots.length === 1 ? '' : 's'})`
    }
    
    return baseText
  }

  const getPreviewIcon = () => {
    if (direction === 'vertical') {
      return <ArrowDown className="h-4 w-4" />
    } else {
      return <ArrowRight className="h-4 w-4" />
    }
  }

  const getPreviewDetails = () => {
    if (direction === 'vertical') {
      return previewSlots.map((slot, index) => {
        const hasConflict = conflictingSlots.includes(slot)
        return (
          <div key={index} className={cn(
            "flex items-center gap-2 text-xs",
            hasConflict && "text-red-600"
          )}>
            <Copy className={cn(
              "h-3 w-3",
              hasConflict ? "text-red-500" : "text-blue-500"
            )} />
            <span className="font-medium">{originalEvent?.subjectName}</span>
            <span className="text-muted-foreground">•</span>
            <span className={cn(
              hasConflict ? "text-red-600" : "text-muted-foreground"
            )}>{slot}</span>
            {hasConflict && (
              <span className="text-red-500 text-xs">⚠️ Conflict</span>
            )}
          </div>
        )
      })
    } else {
      return previewSlots.map((dayKey, index) => {
        const hasConflict = conflictingSlots.includes(dayKey)
        return (
          <div key={index} className={cn(
            "flex items-center gap-2 text-xs",
            hasConflict && "text-red-600"
          )}>
            <Copy className={cn(
              "h-3 w-3",
              hasConflict ? "text-red-500" : "text-blue-500"
            )} />
            <span className="font-medium">{originalEvent?.subjectName}</span>
            <span className="text-muted-foreground">•</span>
            <span className={cn(
              hasConflict ? "text-red-600" : "text-muted-foreground"
            )}>{dayKey}</span>
            {hasConflict && (
              <span className="text-red-500 text-xs">⚠️ Conflict</span>
            )}
          </div>
        )
      })
    }
  }

  return (
    <div
      className={cn(
        "fixed z-50 bg-white/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-4 max-w-sm",
        "transition-all duration-200 ease-out",
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      )}
      style={{
        left: mousePosition.x + 15,
        top: mousePosition.y - 10,
        transform: 'translate(0, -50%)'
      }}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center gap-2 mb-3",
        conflictingSlots.length > 0 && "text-red-600"
      )}>
        {getPreviewIcon()}
        <span className="font-medium text-sm">
          {getPreviewText()}
        </span>
      </div>

      {/* Preview List */}
      <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
        {getPreviewDetails()}
      </div>

      {/* Instructions */}
      <div className="text-xs text-muted-foreground border-t pt-2">
        <div className="flex items-center gap-4">
          {conflictingSlots.length > 0 ? (
            <span className="text-red-600">Conflicts detected - review before creating</span>
          ) : (
            <span>Release to create</span>
          )}
          <span>ESC to cancel</span>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="mt-2">
        <div className="w-full bg-muted rounded-full h-1">
          <div 
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              conflictingSlots.length > 0 ? "bg-red-500" : "bg-blue-500"
            )}
            style={{ width: `${Math.min((previewSlots.length / 4) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export function DragPreviewGhost({
  isVisible,
  children
}: {
  isVisible: boolean
  children: React.ReactNode
}) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      <div className="absolute inset-0 bg-black/5 backdrop-blur-[1px]" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50" />
      {children}
    </div>
  )
}