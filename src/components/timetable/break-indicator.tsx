"use client"

import React from 'react'
import { BreakSlot, getBreakStyling } from '@/lib/utils/break-utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreakIndicatorProps {
  breakSlot: BreakSlot
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showConflicts?: boolean
  onClick?: (breakSlot: BreakSlot) => void
}

export function BreakIndicator({
  breakSlot,
  className,
  size = 'md',
  showConflicts = true,
  onClick
}: BreakIndicatorProps) {
  const styling = getBreakStyling(breakSlot.type)
  
  const sizeClasses = {
    sm: 'p-1 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-3 text-base'
  }
  
  const handleClick = () => {
    if (onClick) {
      onClick(breakSlot)
    }
  }

  if (breakSlot.isOverridden && !showConflicts) {
    return null
  }

  return (
    <Card
      className={cn(
        'transition-all border-2 border-dashed',
        styling.background,
        styling.border,
        breakSlot.isOverridden && 'opacity-60',
        onClick && 'cursor-pointer hover:shadow-sm',
        className
      )}
      onClick={handleClick}
    >
      <CardContent className={cn('flex items-center gap-2', sizeClasses[size])}>
        <span className="text-lg" role="img" aria-label={breakSlot.name}>
          {styling.icon}
        </span>
        
        <div className="flex-1">
          <div className={cn('font-medium', styling.text)}>
            {breakSlot.name}
          </div>
          
          <div className={cn('flex items-center gap-1 text-xs', styling.text, 'opacity-75')}>
            <Clock className="h-3 w-3" />
            <span>
              {breakSlot.startTime} - {breakSlot.endTime} ({breakSlot.duration}m)
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Badge 
            variant={breakSlot.isEmpty ? 'secondary' : 'destructive'} 
            className="text-xs"
          >
            {breakSlot.isEmpty ? 'Available' : 'Conflict'}
          </Badge>
          
          {breakSlot.type !== 'CUSTOM' && (
            <Badge variant="outline" className="text-xs">
              {breakSlot.type}
            </Badge>
          )}
        </div>
      </CardContent>
      
      {/* Conflict Alert */}
      {breakSlot.isOverridden && showConflicts && breakSlot.conflictingEvents && (
        <Alert className="mt-2 border-destructive/50 bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-xs">
            <strong>Break time conflict:</strong> 
            {breakSlot.conflictingEvents.length} class{breakSlot.conflictingEvents.length !== 1 ? 'es' : ''} scheduled during this break.
            <div className="mt-1">
              {breakSlot.conflictingEvents.map((event, index) => (
                <div key={event.id} className="text-muted-foreground">
                  • {event.extendedProps?.subjectName} - {event.extendedProps?.facultyName}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </Card>
  )
}

interface BreakTimeRowProps {
  breakSlot: BreakSlot
  className?: string
  showTimeColumn?: boolean
}

export function BreakTimeRow({
  breakSlot,
  className,
  showTimeColumn = true
}: BreakTimeRowProps) {
  const styling = getBreakStyling(breakSlot.type)
  
  return (
    <div className={cn('flex min-h-[60px] border-b border-border/50', className)}>
      {/* Time Column */}
      {showTimeColumn && (
        <div className={cn(
          'w-20 flex-shrink-0 p-3 border-r flex flex-col items-center justify-center',
          styling.background,
          styling.border
        )}>
          <div className={cn('text-sm font-medium', styling.text)}>
            {breakSlot.startTime}
          </div>
          <div className={cn('text-xs', styling.text, 'opacity-75')}>
            {breakSlot.duration}m
          </div>
        </div>
      )}
      
      {/* Break Content */}
      <div className={cn(
        'flex-1 p-3 flex items-center',
        styling.background,
        breakSlot.isOverridden && 'opacity-60'
      )}>
        <div className="flex items-center gap-3 flex-1">
          <span className="text-2xl" role="img" aria-label={breakSlot.name}>
            {styling.icon}
          </span>
          
          <div>
            <div className={cn('font-medium', styling.text)}>
              {breakSlot.name}
            </div>
            <div className={cn('text-sm', styling.text, 'opacity-75')}>
              {breakSlot.startTime} - {breakSlot.endTime}
            </div>
          </div>
        </div>
        
        {breakSlot.isOverridden && (
          <Badge variant="destructive" className="ml-auto">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Conflict
          </Badge>
        )}
      </div>
    </div>
  )
}

interface BreakSummaryProps {
  breakSlots: BreakSlot[]
  className?: string
}

export function BreakSummary({
  breakSlots,
  className
}: BreakSummaryProps) {
  const totalBreakTime = breakSlots.reduce((total, slot) => total + slot.duration, 0)
  const conflictCount = breakSlots.filter(slot => slot.isOverridden).length
  const availableBreaks = breakSlots.filter(slot => slot.isEmpty).length
  
  return (
    <div className={cn('p-3 bg-muted/30 border rounded-lg', className)}>
      <h4 className="font-medium text-sm mb-2">Break Summary</h4>
      
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <div className="font-medium text-lg">{totalBreakTime}m</div>
          <div className="text-muted-foreground text-xs">Total Break Time</div>
        </div>
        
        <div className="text-center">
          <div className="font-medium text-lg">{availableBreaks}</div>
          <div className="text-muted-foreground text-xs">Available Breaks</div>
        </div>
        
        <div className="text-center">
          <div className={cn(
            'font-medium text-lg',
            conflictCount > 0 && 'text-destructive'
          )}>
            {conflictCount}
          </div>
          <div className="text-muted-foreground text-xs">Conflicts</div>
        </div>
      </div>
    </div>
  )
}