"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  Calendar, 
  User, 
  Settings,
  Lightbulb,
  Target,
  AlertTriangle,
  ArrowRight,
  Zap
} from 'lucide-react'
import { ConflictInfo } from '@/types/timetable'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

interface AutoResolveStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: any
  duration?: number
}

interface AutoResolveStrategy {
  id: string
  name: string
  description: string
  priority: number
  enabled: boolean
  parameters: {
    [key: string]: any
  }
}

interface AutoResolveWizardProps {
  isOpen: boolean
  onClose: () => void
  conflicts: ConflictInfo[]
  originalEntry: {
    batchId: string
    subjectId: string
    facultyId: string
    timeSlotId: string
    dayOfWeek: string
    date?: string
  }
  onResolutionComplete: (resolvedEntry: any) => void
}

// API function
const executeAutoResolve = async (params: {
  originalEntry: any
  conflicts: ConflictInfo[]
  strategies: AutoResolveStrategy[]
}) => {
  const response = await fetch('/api/timetable/auto-resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!response.ok) throw new Error('Auto-resolve failed')
  return response.json()
}

const defaultStrategies: AutoResolveStrategy[] = [
  {
    id: 'find-next-slot',
    name: 'Find Next Available Time Slot',
    description: 'Find the next available time slot on the same day',
    priority: 1,
    enabled: true,
    parameters: {
      sameDay: true,
      maxHoursAhead: 4,
      preferMorning: false
    }
  },
  {
    id: 'find-next-day',
    name: 'Find Next Available Day',
    description: 'Find the same time slot on the next available day',
    priority: 2,
    enabled: true,
    parameters: {
      sameTimeSlot: true,
      maxDaysAhead: 7,
      skipWeekends: false,
      skipHolidays: true
    }
  },
  {
    id: 'alternative-faculty',
    name: 'Find Alternative Faculty',
    description: 'Find an alternative faculty member for the same time',
    priority: 3,
    enabled: false,
    parameters: {
      sameDepartment: true,
      minimumExperience: 2,
      checkWorkload: true
    }
  },
  {
    id: 'split-session',
    name: 'Split into Multiple Sessions',
    description: 'Split the class into smaller time slots',
    priority: 4,
    enabled: false,
    parameters: {
      maxSessions: 2,
      minimumDuration: 30,
      preferConsecutive: true
    }
  },
  {
    id: 'reschedule-conflict',
    name: 'Reschedule Conflicting Entry',
    description: 'Move the conflicting entry to a different time',
    priority: 5,
    enabled: false,
    parameters: {
      onlyLowerPriority: true,
      requireApproval: true,
      notifyAffected: true
    }
  }
]

export function AutoResolveWizard({
  isOpen,
  onClose,
  conflicts,
  originalEntry,
  onResolutionComplete,
}: AutoResolveWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [strategies, setStrategies] = useState<AutoResolveStrategy[]>(defaultStrategies)
  const [resolveSteps, setResolveSteps] = useState<AutoResolveStep[]>([])
  const [isResolving, setIsResolving] = useState(false)
  const [resolution, setResolution] = useState<any>(null)
  const [selectedResolution, setSelectedResolution] = useState<string>('')

  const autoResolveMutation = useMutation({
    mutationFn: executeAutoResolve,
    onSuccess: (data) => {
      setResolution(data)
      setCurrentStep(2) // Move to results step
      setIsResolving(false)
      toast.success('Auto-resolve completed successfully')
    },
    onError: (error: Error) => {
      setIsResolving(false)
      toast.error(error.message || 'Auto-resolve failed')
    }
  })

  const steps = [
    {
      title: 'Configure Strategies',
      description: 'Choose which resolution strategies to apply'
    },
    {
      title: 'Resolving Conflicts',
      description: 'Automatically finding the best solution'
    },
    {
      title: 'Review Solutions',
      description: 'Review and select the best resolution'
    }
  ]

  const handleStrategyToggle = (strategyId: string, enabled: boolean) => {
    setStrategies(prev => prev.map(strategy => 
      strategy.id === strategyId ? { ...strategy, enabled } : strategy
    ))
  }

  const handleParameterChange = (strategyId: string, parameter: string, value: any) => {
    setStrategies(prev => prev.map(strategy => 
      strategy.id === strategyId 
        ? { 
            ...strategy, 
            parameters: { ...strategy.parameters, [parameter]: value }
          } 
        : strategy
    ))
  }

  const startAutoResolve = () => {
    setCurrentStep(1)
    setIsResolving(true)
    
    const enabledStrategies = strategies.filter(s => s.enabled)
    const steps: AutoResolveStep[] = [
      {
        id: 'analyze-conflicts',
        title: 'Analyzing Conflicts',
        description: 'Understanding the nature and severity of conflicts',
        status: 'pending'
      },
      ...enabledStrategies.map(strategy => ({
        id: strategy.id,
        title: strategy.name,
        description: strategy.description,
        status: 'pending' as const
      })),
      {
        id: 'evaluate-solutions',
        title: 'Evaluating Solutions',
        description: 'Ranking and selecting the best solutions',
        status: 'pending'
      }
    ]
    
    setResolveSteps(steps)
    
    // Start the auto-resolve process
    autoResolveMutation.mutate({
      originalEntry,
      conflicts,
      strategies: enabledStrategies
    })
  }

  const handleResolutionSelect = () => {
    if (selectedResolution && resolution) {
      const selected = resolution.solutions.find((s: any) => s.id === selectedResolution)
      if (selected) {
        onResolutionComplete(selected)
        onClose()
      }
    }
  }

  const getStepIcon = (stepIndex: number) => {
    if (stepIndex < currentStep) return <CheckCircle className="h-5 w-5 text-green-500" />
    if (stepIndex === currentStep) return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
    return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
  }

  const getConflictSeverityCount = () => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 }
    conflicts.forEach(conflict => {
      switch (conflict.type) {
        case 'BATCH_DOUBLE_BOOKING':
        case 'FACULTY_CONFLICT':
          counts.critical++
          break
        case 'MODULE_OVERLAP':
          counts.high++
          break
        case 'HOLIDAY_SCHEDULING':
          counts.medium++
          break
        case 'EXAM_PERIOD_CONFLICT':
          counts.low++
          break
      }
    })
    return counts
  }

  const conflictCounts = getConflictSeverityCount()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Auto-Resolve Conflicts
          </DialogTitle>
          <DialogDescription>
            Automatically find and apply the best solution for scheduling conflicts using intelligent strategies.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div className="flex items-center gap-2">
                  {getStepIcon(index)}
                  <div className={`text-sm ${index <= currentStep ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.title}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground mx-4" />
                )}
              </div>
            ))}
          </div>
          <Progress value={(currentStep / (steps.length - 1)) * 100} className="w-full" />
        </div>

        {/* Step 0: Configure Strategies */}
        {currentStep === 0 && (
          <div className="space-y-6">
            {/* Conflict Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Conflict Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-red-600">{conflictCounts.critical}</div>
                    <div className="text-sm text-muted-foreground">Critical</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{conflictCounts.high}</div>
                    <div className="text-sm text-muted-foreground">High</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{conflictCounts.medium}</div>
                    <div className="text-sm text-muted-foreground">Medium</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{conflictCounts.low}</div>
                    <div className="text-sm text-muted-foreground">Low</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Strategy Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Resolution Strategies</h3>
              {strategies.map((strategy, index) => (
                <Card key={strategy.id} className={strategy.enabled ? 'border-blue-200' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={strategy.enabled}
                        onCheckedChange={(checked) => handleStrategyToggle(strategy.id, checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{strategy.name}</span>
                          <Badge variant="outline">Priority {strategy.priority}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{strategy.description}</p>
                        
                        {strategy.enabled && (
                          <div className="space-y-2 pl-4 border-l-2 border-blue-200">
                            {strategy.id === 'find-next-slot' && (
                              <>
                                <div className="flex items-center gap-2">
                                  <Checkbox 
                                    checked={strategy.parameters.sameDay}
                                    onCheckedChange={(checked) => handleParameterChange(strategy.id, 'sameDay', checked)}
                                  />
                                  <Label className="text-sm">Keep same day</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Checkbox 
                                    checked={strategy.parameters.preferMorning}
                                    onCheckedChange={(checked) => handleParameterChange(strategy.id, 'preferMorning', checked)}
                                  />
                                  <Label className="text-sm">Prefer morning slots</Label>
                                </div>
                              </>
                            )}
                            {strategy.id === 'find-next-day' && (
                              <>
                                <div className="flex items-center gap-2">
                                  <Checkbox 
                                    checked={strategy.parameters.skipWeekends}
                                    onCheckedChange={(checked) => handleParameterChange(strategy.id, 'skipWeekends', checked)}
                                  />
                                  <Label className="text-sm">Skip weekends</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Checkbox 
                                    checked={strategy.parameters.skipHolidays}
                                    onCheckedChange={(checked) => handleParameterChange(strategy.id, 'skipHolidays', checked)}
                                  />
                                  <Label className="text-sm">Skip holidays</Label>
                                </div>
                              </>
                            )}
                            {strategy.id === 'alternative-faculty' && (
                              <>
                                <div className="flex items-center gap-2">
                                  <Checkbox 
                                    checked={strategy.parameters.sameDepartment}
                                    onCheckedChange={(checked) => handleParameterChange(strategy.id, 'sameDepartment', checked)}
                                  />
                                  <Label className="text-sm">Same department only</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Checkbox 
                                    checked={strategy.parameters.checkWorkload}
                                    onCheckedChange={(checked) => handleParameterChange(strategy.id, 'checkWorkload', checked)}
                                  />
                                  <Label className="text-sm">Check faculty workload</Label>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                Strategies will be executed in priority order. Higher priority strategies are tried first.
                You can customize parameters for each enabled strategy.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 1: Resolving */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <RefreshCw className="h-12 w-12 mx-auto text-blue-500 animate-spin mb-4" />
              <h3 className="text-lg font-medium mb-2">Resolving Conflicts</h3>
              <p className="text-muted-foreground">
                Please wait while we analyze conflicts and find the best solutions...
              </p>
            </div>

            {resolveSteps.map((step, index) => (
              <Card key={step.id} className={step.status === 'completed' ? 'border-green-200' : step.status === 'running' ? 'border-blue-200' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {step.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                    {step.status === 'running' && <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />}
                    {step.status === 'pending' && <div className="h-5 w-5 rounded-full border-2 border-gray-300" />}
                    {step.status === 'failed' && <AlertTriangle className="h-5 w-5 text-red-500" />}
                    
                    <div>
                      <div className="font-medium">{step.title}</div>
                      <div className="text-sm text-muted-foreground">{step.description}</div>
                      {step.duration && step.status === 'completed' && (
                        <div className="text-xs text-green-600">Completed in {step.duration}ms</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Step 2: Review Solutions */}
        {currentStep === 2 && resolution && (
          <div className="space-y-6">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Auto-resolve found {resolution.solutions?.length || 0} potential solutions. 
                Select the best option for your needs.
              </AlertDescription>
            </Alert>

            <RadioGroup value={selectedResolution} onValueChange={setSelectedResolution}>
              {resolution.solutions?.map((solution: any, index: number) => (
                <Card key={solution.id} className={selectedResolution === solution.id ? 'border-blue-500' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value={solution.id} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{solution.name}</span>
                          <Badge variant="default">Score: {solution.score}/100</Badge>
                          {solution.recommended && <Badge variant="secondary">Recommended</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{solution.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">New Time:</span>
                            <div className="text-muted-foreground">
                              {solution.newTimeSlot} on {solution.newDay}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Impact:</span>
                            <div className="text-muted-foreground">{solution.impact}</div>
                          </div>
                        </div>

                        {solution.warnings && solution.warnings.length > 0 && (
                          <Alert className="mt-3">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <div className="font-medium mb-1">Considerations:</div>
                              <ul className="list-disc list-inside text-sm">
                                {solution.warnings.map((warning: string, wIndex: number) => (
                                  <li key={wIndex}>{warning}</li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </RadioGroup>

            {(!resolution.solutions || resolution.solutions.length === 0) && (
              <Card>
                <CardContent className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 mx-auto text-orange-500 mb-3" />
                  <div className="text-muted-foreground mb-2">No automatic solutions found</div>
                  <p className="text-sm text-muted-foreground">
                    The conflicts are too complex for automatic resolution. 
                    Please resolve them manually or adjust the conflict parameters.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          
          <div className="flex gap-2">
            {currentStep === 0 && (
              <Button 
                onClick={startAutoResolve}
                disabled={!strategies.some(s => s.enabled)}
              >
                <Zap className="h-4 w-4 mr-2" />
                Start Auto-Resolve
              </Button>
            )}
            
            {currentStep === 2 && (
              <Button 
                onClick={handleResolutionSelect}
                disabled={!selectedResolution}
              >
                Apply Selected Solution
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}