"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Keyboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface KeyboardHintProps {
  isVisible: boolean
  onDismiss?: () => void
}

interface UserBehavior {
  keyboardUsage: number
  mouseUsage: number
  totalInteractions: number
  sessionDismissed: boolean
}

export function KeyboardHint({ isVisible, onDismiss }: KeyboardHintProps) {
  const [behavior, setBehavior] = useState<UserBehavior>({
    keyboardUsage: 0,
    mouseUsage: 0,
    totalInteractions: 0,
    sessionDismissed: false
  })
  const [shouldShow, setShouldShow] = useState(false)
  const [animationClass, setAnimationClass] = useState("")

  // Track user behavior and determine if hint should be shown
  const updateBehavior = useCallback((type: 'keyboard' | 'mouse') => {
    setBehavior(prev => {
      const newBehavior = {
        ...prev,
        [type === 'keyboard' ? 'keyboardUsage' : 'mouseUsage']: prev[type === 'keyboard' ? 'keyboardUsage' : 'mouseUsage'] + 1,
        totalInteractions: prev.totalInteractions + 1
      }
      
      // Auto-hide logic: if user has made 10+ interactions with >80% mouse usage, hide hint
      if (newBehavior.totalInteractions >= 10 && 
          newBehavior.mouseUsage / newBehavior.totalInteractions > 0.8) {
        setShouldShow(false)
      }
      // Show hint if user is primarily using mouse after a few interactions
      else if (newBehavior.totalInteractions >= 3 && 
               newBehavior.mouseUsage / newBehavior.totalInteractions > 0.6 &&
               !newBehavior.sessionDismissed) {
        setShouldShow(true)
      }
      
      return newBehavior
    })
  }, [])

  // Listen for keyboard and mouse events on attendance interactions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'Alt', ' '].includes(e.key)) {
        updateBehavior('keyboard')
      }
    }

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('.attendance-status-button') || 
          target.closest('[data-cell-id]')) {
        updateBehavior('mouse')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('click', handleClick)
    }
  }, [updateBehavior])

  // Handle dismiss for session
  const handleDismiss = () => {
    setBehavior(prev => ({ ...prev, sessionDismissed: true }))
    setShouldShow(false)
    if (onDismiss) {
      onDismiss()
    }
  }

  // Animation effects
  useEffect(() => {
    if (shouldShow && isVisible && !behavior.sessionDismissed) {
      setAnimationClass("animate-slide-up")
      const timer = setTimeout(() => setAnimationClass(""), 300)
      return () => clearTimeout(timer)
    }
  }, [shouldShow, isVisible, behavior.sessionDismissed])

  if (!isVisible || !shouldShow || behavior.sessionDismissed) {
    return null
  }

  const keyboardPercentage = behavior.totalInteractions > 0 
    ? Math.round((behavior.keyboardUsage / behavior.totalInteractions) * 100)
    : 0

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className={cn(
        "bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg px-4 py-3 max-w-sm",
        "transition-all duration-300 ease-in-out",
        animationClass
      )}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <div className="font-medium text-foreground">Keyboard shortcuts available</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                <span className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">Space</span>
                <span className="mx-1 text-muted-foreground/70">for Present</span>
                <span className="mx-1">•</span>
                <span className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">Alt</span>
                <span className="mx-1 text-muted-foreground/70">for Absent</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {behavior.totalInteractions > 0 && (
              <div className="text-xs text-muted-foreground">
                {keyboardPercentage}% ⌨️
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 hover:bg-muted"
              title="Don't show again this session"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
