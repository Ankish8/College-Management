"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type AttendanceMode = 'detailed' | 'fast' | 'predictive'

interface AttendanceModeToggleProps {
  mode: AttendanceMode
  onModeChange: (mode: AttendanceMode) => void
}

export function AttendanceModeToggle({ mode, onModeChange }: AttendanceModeToggleProps) {
  return (
    <div className="flex justify-end">
      <div className="flex items-center gap-4">
        <div className="text-xs text-muted-foreground flex items-center gap-3">
          <span>Navigate: ↑↓←→</span>
          <span>Present: Space</span>
          <span>Absent: Alt</span>
          {mode === 'detailed' ? (
            <span>Medical: Right-click or M</span>
          ) : mode === 'fast' ? (
            <span>Medical: M</span>
          ) : (
            <span>Confirm: Space • Override: Click</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Mode:</span>
          <div className="flex bg-background rounded-md p-1 border">
            <Button
              variant={mode === 'detailed' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onModeChange('detailed')}
              className={cn(
                "text-xs px-2 py-1",
                mode === 'detailed' && "shadow-sm"
              )}
            >
              Detailed
            </Button>
            <Button
              variant={mode === 'fast' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onModeChange('fast')}
              className={cn(
                "text-xs px-2 py-1",
                mode === 'fast' && "shadow-sm"
              )}
            >
              Fast
            </Button>
            <Button
              variant={mode === 'predictive' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onModeChange('predictive')}
              className={cn(
                "text-xs px-2 py-1",
                mode === 'predictive' && "shadow-sm"
              )}
            >
              Predictive
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}