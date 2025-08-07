"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  AlertTriangle, 
  Clock, 
  Users, 
  User, 
  Calendar, 
  BookOpen, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  ArrowRight,
  Lightbulb,
  AlertCircle
} from 'lucide-react'
import { ConflictInfo } from '@/types/timetable'
import { useQuery } from '@tanstack/react-query'

interface ConflictResolutionModalProps {
  isOpen: boolean
  onClose: () => void
  conflicts: ConflictInfo[]
  proposedEntry: {
    batchName: string
    subjectName: string
    facultyName: string
    timeSlotName: string
    dayOfWeek: string
    date?: string
  }
  onForceCreate: () => void
  onModifyEntry: () => void
  onAutoResolve?: () => void
  showAlternatives?: boolean
}

interface AlternativeSlot {
  timeSlotId: string
  timeSlotName: string
  startTime: string
  endTime: string
  dayOfWeek: string
  date?: string
  conflictCount: number
}

interface AlternativeDay {
  dayOfWeek: string
  date: string
  availableSlots: number
  conflicts: number
}

// API functions
const fetchAlternativeTimeSlots = async (params: {
  batchId: string
  facultyId: string
  dayOfWeek: string
  date?: string
}): Promise<AlternativeSlot[]> => {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.append(key, value)
  })
  
  const response = await fetch(`/api/timetable/alternatives/timeslots?${searchParams}`)
  if (!response.ok) throw new Error('Failed to fetch alternative time slots')
  return response.json()
}

const fetchAlternativeDays = async (params: {
  batchId: string
  facultyId: string
  timeSlotId: string
}): Promise<AlternativeDay[]> => {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.append(key, value)
  })
  
  const response = await fetch(`/api/timetable/alternatives/days?${searchParams}`)
  if (!response.ok) throw new Error('Failed to fetch alternative days')
  return response.json()
}

export function ConflictResolutionModal({
  isOpen,
  onClose,
  conflicts,
  proposedEntry,
  onForceCreate,
  onModifyEntry,
  onAutoResolve,
  showAlternatives = true,
}: ConflictResolutionModalProps) {
  const [selectedTab, setSelectedTab] = useState('conflicts')

  // Fetch alternatives data if needed
  const { data: alternativeTimeSlots = [] } = useQuery({
    queryKey: ['alternative-timeslots', proposedEntry],
    queryFn: () => fetchAlternativeTimeSlots({
      batchId: '', // Would need to be passed from parent
      facultyId: '', // Would need to be passed from parent
      dayOfWeek: proposedEntry.dayOfWeek,
      date: proposedEntry.date,
    }),
    enabled: isOpen && showAlternatives,
  })

  const { data: alternativeDays = [] } = useQuery({
    queryKey: ['alternative-days', proposedEntry],
    queryFn: () => fetchAlternativeDays({
      batchId: '', // Would need to be passed from parent
      facultyId: '', // Would need to be passed from parent
      timeSlotId: '', // Would need to be passed from parent
    }),
    enabled: isOpen && showAlternatives,
  })

  const getConflictSeverity = (type: string) => {
    switch (type) {
      case 'BATCH_DOUBLE_BOOKING':
        return { level: 'critical', color: 'destructive', icon: XCircle }
      case 'FACULTY_CONFLICT':
        return { level: 'critical', color: 'destructive', icon: XCircle }
      case 'MODULE_OVERLAP':
        return { level: 'high', color: 'destructive', icon: AlertTriangle }
      case 'HOLIDAY_SCHEDULING':
        return { level: 'medium', color: 'secondary', icon: AlertCircle }
      case 'EXAM_PERIOD_CONFLICT':
        return { level: 'low', color: 'outline', icon: AlertCircle }
      default:
        return { level: 'medium', color: 'secondary', icon: AlertTriangle }
    }
  }

  const getConflictDescription = (conflict: ConflictInfo) => {
    switch (conflict.type) {
      case 'BATCH_DOUBLE_BOOKING':
        return {
          title: 'Batch Double Booking',
          description: 'The selected batch already has a class scheduled at this time.',
          impact: 'Students cannot attend two classes simultaneously.',
          recommendation: 'Choose a different time slot or day for this class.'
        }
      case 'FACULTY_CONFLICT':
        return {
          title: 'Faculty Schedule Conflict',
          description: 'The selected faculty is already teaching another class at this time.',
          impact: 'Faculty cannot teach multiple classes simultaneously.',
          recommendation: 'Choose a different time slot, assign a different faculty, or reschedule the existing class.'
        }
      case 'MODULE_OVERLAP':
        return {
          title: 'Module Schedule Overlap',
          description: 'This time conflicts with a module or full-day class.',
          impact: 'Classes cannot overlap with module sessions.',
          recommendation: 'Schedule around the module time or modify the module schedule.'
        }
      case 'HOLIDAY_SCHEDULING':
        return {
          title: 'Holiday Conflict',
          description: 'This date is a scheduled holiday.',
          impact: 'Classes may have low attendance or need to be rescheduled.',
          recommendation: 'Choose a different date or mark as a special session.'
        }
      case 'EXAM_PERIOD_CONFLICT':
        return {
          title: 'Exam Period Conflict',
          description: 'Regular classes are typically blocked during exam periods.',
          impact: 'May interfere with exam schedule and student preparation.',
          recommendation: 'Reschedule to non-exam period or mark as exam review session.'
        }
      default:
        return {
          title: 'Scheduling Conflict',
          description: conflict.message,
          impact: 'May cause scheduling issues.',
          recommendation: 'Review and resolve the conflict.'
        }
    }
  }

  const groupedConflicts = conflicts.reduce((groups, conflict) => {
    const severity = getConflictSeverity(conflict.type).level
    if (!groups[severity]) groups[severity] = []
    groups[severity].push(conflict)
    return groups
  }, {} as Record<string, ConflictInfo[]>)

  const criticalConflicts = groupedConflicts.critical || []
  const hasBlockingConflicts = criticalConflicts.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Scheduling Conflicts Detected
          </DialogTitle>
          <DialogDescription>
            {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} found for the proposed schedule entry.
            Review the conflicts below and choose how to proceed.
          </DialogDescription>
        </DialogHeader>

        {/* Proposed Entry Summary */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Proposed Schedule Entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Batch:</span>
                <div className="text-muted-foreground">{proposedEntry.batchName}</div>
              </div>
              <div>
                <span className="font-medium">Subject:</span>
                <div className="text-muted-foreground">{proposedEntry.subjectName}</div>
              </div>
              <div>
                <span className="font-medium">Faculty:</span>
                <div className="text-muted-foreground">{proposedEntry.facultyName}</div>
              </div>
              <div>
                <span className="font-medium">Time:</span>
                <div className="text-muted-foreground">
                  {proposedEntry.dayOfWeek} • {proposedEntry.timeSlotName}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="conflicts" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Conflicts ({conflicts.length})
            </TabsTrigger>
            <TabsTrigger value="timeslots" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Alternative Times
            </TabsTrigger>
            <TabsTrigger value="days" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Alternative Days
            </TabsTrigger>
          </TabsList>

          {/* Conflicts Tab */}
          <TabsContent value="conflicts" className="space-y-4">
            {/* Conflict Summary */}
            <Alert className={hasBlockingConflicts ? "border-red-200 bg-red-50" : "border-orange-200 bg-orange-50"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">
                  {hasBlockingConflicts ? 'Critical conflicts detected!' : 'Conflicts require attention'}
                </div>
                <p className="text-sm mt-1">
                  {hasBlockingConflicts 
                    ? 'These conflicts prevent the schedule entry from being created safely.'
                    : 'These conflicts may cause issues but can be overridden if necessary.'}
                </p>
              </AlertDescription>
            </Alert>

            {/* Critical Conflicts */}
            {criticalConflicts.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-destructive flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Critical Conflicts ({criticalConflicts.length})
                </h3>
                {criticalConflicts.map((conflict, index) => {
                  const severity = getConflictSeverity(conflict.type)
                  const description = getConflictDescription(conflict)
                  const Icon = severity.icon

                  return (
                    <Card key={index} className="border-red-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Icon className="h-4 w-4 text-red-500" />
                          {description.title}
                          <Badge variant={severity.color as any} className="ml-auto">
                            {severity.level.toUpperCase()}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">{description.description}</p>
                        
                        {conflict.details && conflict.details.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Conflicting Entries:</div>
                            {conflict.details.map((detail, detailIndex) => (
                              <div key={detailIndex} className="bg-muted p-2 rounded text-sm">
                                <div className="font-medium">
                                  {detail.subject?.name || detail.name} 
                                  {detail.faculty?.name && ` • ${detail.faculty.name}`}
                                </div>
                                <div className="text-muted-foreground">
                                  {detail.batch?.name && `${detail.batch.name} • `}
                                  {detail.timeSlot?.name}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="bg-blue-50 p-3 rounded">
                          <div className="text-sm font-medium text-blue-800 mb-1">Recommendation:</div>
                          <p className="text-sm text-blue-700">{description.recommendation}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Other Conflicts */}
            {Object.entries(groupedConflicts)
              .filter(([severity]) => severity !== 'critical')
              .map(([severity, severityConflicts]) => (
                <div key={severity} className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2 capitalize">
                    <AlertCircle className="h-4 w-4" />
                    {severity} Conflicts ({severityConflicts.length})
                  </h3>
                  {severityConflicts.map((conflict, index) => {
                    const conflictSeverity = getConflictSeverity(conflict.type)
                    const description = getConflictDescription(conflict)
                    const Icon = conflictSeverity.icon

                    return (
                      <Card key={index} className="border-orange-200">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Icon className="h-4 w-4 text-orange-500 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{description.title}</span>
                                <Badge variant={conflictSeverity.color as any} className="text-xs">
                                  {conflictSeverity.level.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{conflict.message}</p>
                              <p className="text-xs text-blue-600">{description.recommendation}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ))}
          </TabsContent>

          {/* Alternative Time Slots Tab */}
          <TabsContent value="timeslots" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">
                Alternative time slots for {proposedEntry.dayOfWeek}
              </span>
            </div>

            {alternativeTimeSlots.length > 0 ? (
              <div className="grid gap-3">
                {alternativeTimeSlots.map((slot, index) => (
                  <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="font-medium">{slot.timeSlotName}</div>
                            <div className="text-sm text-muted-foreground">
                              {slot.startTime} - {slot.endTime}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {slot.conflictCount === 0 ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Available
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              {slot.conflictCount} conflicts
                            </Badge>
                          )}
                          <Button size="sm" variant="outline">
                            Select
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <div className="text-muted-foreground">No alternative time slots available for this day</div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Alternative Days Tab */}
          <TabsContent value="days" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">
                Alternative days for {proposedEntry.timeSlotName}
              </span>
            </div>

            {alternativeDays.length > 0 ? (
              <div className="grid gap-3">
                {alternativeDays.map((day, index) => (
                  <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="font-medium">{day.dayOfWeek}</div>
                            <div className="text-sm text-muted-foreground">{day.date}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-muted-foreground">
                            {day.availableSlots} slots available
                          </div>
                          <Button size="sm" variant="outline">
                            Select
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <div className="text-muted-foreground">No alternative days available for this time slot</div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <Separator />
        <div className="flex justify-between gap-3 pt-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="outline" onClick={onModifyEntry}>
              Modify Entry
            </Button>
          </div>
          
          <div className="flex gap-2">
            {onAutoResolve && (
              <Button variant="outline" onClick={onAutoResolve}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Auto Resolve
              </Button>
            )}
            <Button 
              variant="destructive" 
              onClick={onForceCreate}
              disabled={hasBlockingConflicts}
            >
              {hasBlockingConflicts ? 'Cannot Force Create' : 'Force Create Anyway'}
            </Button>
          </div>
        </div>

        {hasBlockingConflicts && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Critical conflicts prevent force creation. Please resolve conflicts or choose alternative times/days.
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  )
}