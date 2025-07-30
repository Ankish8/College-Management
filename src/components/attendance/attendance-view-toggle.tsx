"use client"

import { Button } from "@/components/ui/button"
import { Calendar, Grid, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ViewMode } from "@/types/attendance"

interface AttendanceViewToggleProps {
  currentView: ViewMode
  onViewChange: (view: ViewMode) => void
  className?: string
}

export function AttendanceViewToggle({
  currentView,
  onViewChange,
  className
}: AttendanceViewToggleProps) {
  return (
    <div className={cn("flex items-center gap-1 p-1 bg-muted rounded-lg border", className)}>
      <Button
        variant={currentView === 'session' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('session')}
        className={cn(
          "gap-2 transition-all text-foreground",
          currentView === 'session' 
            ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90" 
            : "hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground"
        )}
      >
        <Grid className="h-4 w-4" />
        <span className="hidden sm:inline">Session View</span>
        <span className="sm:hidden">Sessions</span>
      </Button>
      
      <Button
        variant={currentView === 'weekly' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('weekly')}
        className={cn(
          "gap-2 transition-all text-foreground",
          currentView === 'weekly' 
            ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90" 
            : "hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground"
        )}
      >
        <Calendar className="h-4 w-4" />
        <span className="hidden sm:inline">Weekly View</span>
        <span className="sm:hidden">Weekly</span>
      </Button>
    </div>
  )
}