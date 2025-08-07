"use client"

import { EventConflict, getConflictStyling } from '@/lib/utils/conflict-detection'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip'
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle,
  X,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConflictIndicatorProps {
  conflict: EventConflict
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showDetails?: boolean
  onResolve?: (conflict: EventConflict) => void
}

export function ConflictIndicator({
  conflict,
  className,
  size = 'sm',
  showDetails = false,
  onResolve
}: ConflictIndicatorProps) {
  const styling = getConflictStyling(conflict.severity)
  
  const getIcon = () => {
    switch (conflict.severity) {
      case 'CRITICAL':
        return <AlertTriangle className="h-3 w-3" />
      case 'HIGH':
        return <AlertCircle className="h-3 w-3" />
      case 'MEDIUM':
        return <Info className="h-3 w-3" />
      case 'LOW':
        return <CheckCircle className="h-3 w-3" />
      default:
        return <Info className="h-3 w-3" />
    }
  }

  const getSeverityLabel = () => {
    switch (conflict.severity) {
      case 'CRITICAL':
        return 'Critical'
      case 'HIGH':
        return 'High'
      case 'MEDIUM':
        return 'Medium'
      case 'LOW':
        return 'Low'
      default:
        return 'Unknown'
    }
  }

  const getConflictTypeLabel = () => {
    switch (conflict.conflictType) {
      case 'BATCH_DOUBLE_BOOKING':
        return 'Batch Double Booking'
      case 'FACULTY_CONFLICT':
        return 'Faculty Conflict'
      case 'TIME_OVERLAP':
        return 'Time Overlap'
      case 'BREAK_CONFLICT':
        return 'Break Conflict'
      default:
        return 'Unknown Conflict'
    }
  }

  if (size === 'sm' && !showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="destructive" 
              className={cn("text-xs cursor-help", className)}
            >
              {getIcon()}
              <span className="ml-1">{getSeverityLabel()}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <div className="font-medium">{getConflictTypeLabel()}</div>
              <div className="text-sm">{conflict.message}</div>
              {conflict.conflictingEvents.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Affects {conflict.conflictingEvents.length} other event(s)
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Alert className={cn(styling.border, styling.background, className)}>
      <div className="flex items-start gap-3">
        <div className={cn("p-1 rounded-full", styling.indicator)}>
          {React.cloneElement(getIcon(), { 
            className: "h-4 w-4 text-white" 
          })}
        </div>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className={cn("font-medium", styling.text)}>
                {getConflictTypeLabel()}
              </div>
              <Badge variant="outline" className="text-xs mt-1">
                Severity: {getSeverityLabel()}
              </Badge>
            </div>
            
            {onResolve && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onResolve(conflict)}
                className="ml-2"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Resolve
              </Button>
            )}
          </div>
          
          <AlertDescription className={styling.text}>
            {conflict.message}
          </AlertDescription>
          
          {conflict.conflictingEvents.length > 0 && (
            <div className="space-y-1">
              <div className="text-sm font-medium">Conflicting Events:</div>
              {conflict.conflictingEvents.map((event, index) => (
                <div key={event.id} className="text-sm bg-white/50 p-2 rounded border">
                  <div className="font-medium">
                    {event.extendedProps?.subjectName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {event.extendedProps?.facultyName} • 
                    {event.extendedProps?.batchName} • 
                    {new Date(event.start).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })} - {new Date(event.end).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Alert>
  )
}

interface ConflictSummaryProps {
  conflicts: EventConflict[]
  className?: string
  onResolveAll?: () => void
}

export function ConflictSummary({
  conflicts,
  className,
  onResolveAll
}: ConflictSummaryProps) {
  const criticalCount = conflicts.filter(c => c.severity === 'CRITICAL').length
  const highCount = conflicts.filter(c => c.severity === 'HIGH').length
  const mediumCount = conflicts.filter(c => c.severity === 'MEDIUM').length
  const lowCount = conflicts.filter(c => c.severity === 'LOW').length

  if (conflicts.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          No conflicts detected. All events are properly scheduled.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className={cn("border-red-200 bg-red-50", className)}>
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <AlertDescription className="text-red-800">
            <strong>{conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} detected</strong>
          </AlertDescription>
          
          <div className="flex gap-2 flex-wrap">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} Critical
              </Badge>
            )}
            {highCount > 0 && (
              <Badge className="text-xs bg-orange-500 hover:bg-orange-600">
                {highCount} High
              </Badge>
            )}
            {mediumCount > 0 && (
              <Badge className="text-xs bg-yellow-500 hover:bg-yellow-600">
                {mediumCount} Medium
              </Badge>
            )}
            {lowCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {lowCount} Low
              </Badge>
            )}
          </div>
        </div>
        
        {onResolveAll && conflicts.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onResolveAll}
            className="ml-4"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Resolve All
          </Button>
        )}
      </div>
    </Alert>
  )
}

interface ConflictMarkerProps {
  severity: EventConflict['severity']
  className?: string
  size?: number
}

export function ConflictMarker({
  severity,
  className,
  size = 8
}: ConflictMarkerProps) {
  const styling = getConflictStyling(severity)
  
  return (
    <div
      className={cn(
        "rounded-full border-2 border-white shadow-sm",
        styling.indicator,
        className
      )}
      style={{ width: size, height: size }}
      title={`${severity} severity conflict`}
    />
  )
}