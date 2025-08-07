"use client"

import { memo, useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { DayOfWeek, EntryType, ConflictInfo } from '@/types/timetable'

// Types for day of week and entry type (using strings as per schema)
const DayOfWeekValues = {
  MONDAY: 'MONDAY' as const,
  TUESDAY: 'TUESDAY' as const, 
  WEDNESDAY: 'WEDNESDAY' as const,
  THURSDAY: 'THURSDAY' as const,
  FRIDAY: 'FRIDAY' as const,
  SATURDAY: 'SATURDAY' as const,
  SUNDAY: 'SUNDAY' as const
}

const EntryTypeValues = {
  REGULAR: 'REGULAR' as const,
  MAKEUP: 'MAKEUP' as const,
  EXTRA: 'EXTRA' as const,
  EXAM: 'EXAM' as const
} as const
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { SubjectFacultySelector } from './subject-faculty-selector'
import { TimeSlotPicker } from './time-slot-picker'

// Form validation schema
const createTimetableEntrySchema = z.object({
  batchId: z.string().min(1, "Batch is required"),
  subjectId: z.string().min(1, "Subject is required"),
  facultyId: z.string().min(1, "Faculty is required"),
  timeSlotId: z.string().min(1, "Time slot is required"),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
  date: z.string().optional(),
  entryType: z.enum(['REGULAR', 'MAKEUP', 'EXTRA', 'EXAM']).default("REGULAR"),
  notes: z.string().optional(),
  // Recurrence configuration
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.enum(['daily', 'weekly', 'monthly']).optional(),
  endDate: z.string().optional(),
  endAfterHours: z.number().min(1).optional(),
  endAfterOccurrences: z.number().min(1).optional(),
  endConditionType: z.enum(['date', 'hours', 'occurrences', 'semester_end']).optional(),
})

type CreateTimetableEntryFormData = z.infer<typeof createTimetableEntrySchema>

interface CreateTimetableEntryModalProps {
  isOpen: boolean
  onClose: () => void
  defaultDate?: Date
  defaultTimeSlot?: string
  defaultBatchId?: string
  onSuccess?: (entry: any) => void
}

interface BatchOption {
  id: string
  name: string
  semester: number
  program: { name: string; shortName: string }
  specialization: { id: string; name: string; shortName: string }
}

interface SubjectOption {
  id: string
  name: string
  code: string
  credits: number
  primaryFacultyId?: string
  batchId: string
}

interface FacultyOption {
  id: string
  name: string
  email: string
}

interface TimeSlotOption {
  id: string
  name: string
  startTime: string
  endTime: string
  duration: number
}

// API functions
const fetchBatches = async (): Promise<BatchOption[]> => {
  const response = await fetch('/api/batches?include=program,specialization')
  if (!response.ok) throw new Error('Failed to fetch batches')
  return response.json()
}

const fetchSubjects = async (batchId?: string): Promise<SubjectOption[]> => {
  if (!batchId) return []
  const response = await fetch(`/api/subjects?batchId=${batchId}&include=primaryFaculty`)
  if (!response.ok) throw new Error('Failed to fetch subjects')
  return response.json()
}

const fetchFaculty = async (): Promise<FacultyOption[]> => {
  const response = await fetch('/api/faculty')
  if (!response.ok) throw new Error('Failed to fetch faculty')
  return response.json()
}

const fetchTimeSlots = async (): Promise<TimeSlotOption[]> => {
  const response = await fetch('/api/timeslots?active=true')
  if (!response.ok) throw new Error('Failed to fetch time slots')
  return response.json()
}

const checkConflicts = async (data: CreateTimetableEntryFormData): Promise<ConflictInfo[]> => {
  const response = await fetch('/api/timetable/conflicts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to check conflicts')
  return response.json()
}

const createTimetableEntry = async (data: CreateTimetableEntryFormData) => {
  const response = await fetch('/api/timetable/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create timetable entry')
  }
  return response.json()
}

const createRecurringEntries = async (data: CreateTimetableEntryFormData) => {
  const response = await fetch('/api/timetable/bulk-create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create recurring entries')
  }
  return response.json()
}

export const CreateTimetableEntryModal = memo(function CreateTimetableEntryModal({
  isOpen,
  onClose,
  defaultDate,
  defaultTimeSlot,
  defaultBatchId,
  onSuccess,
}: CreateTimetableEntryModalProps) {
  const queryClient = useQueryClient()
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([])
  const [showConflicts, setShowConflicts] = useState(false)
  const [forceCreate, setForceCreate] = useState(false)
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateTimetableEntryFormData>({
    resolver: zodResolver(createTimetableEntrySchema) as any,
    defaultValues: {
      batchId: defaultBatchId || '',
      entryType: 'REGULAR',
      isRecurring: false,
      endConditionType: 'semester_end',
    }
  })

  const watchedBatchId = watch('batchId')
  const watchedSubjectId = watch('subjectId')
  const watchedIsRecurring = watch('isRecurring')
  const watchedEndConditionType = watch('endConditionType')

  // Fetch data
  const { data: batches = [], isLoading: loadingBatches } = useQuery({
    queryKey: ['batches'],
    queryFn: fetchBatches,
  })

  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects', watchedBatchId],
    queryFn: () => fetchSubjects(watchedBatchId),
    enabled: !!watchedBatchId,
  })

  const { data: faculty = [], isLoading: loadingFaculty } = useQuery({
    queryKey: ['faculty'],
    queryFn: fetchFaculty,
  })

  const { data: timeSlots = [], isLoading: loadingTimeSlots } = useQuery({
    queryKey: ['timeslots'],
    queryFn: fetchTimeSlots,
  })

  // Mutations
  const createEntryMutation = useMutation({
    mutationFn: createTimetableEntry,
    onSuccess: (data) => {
      toast.success('Timetable entry created successfully')
      queryClient.invalidateQueries({ queryKey: ['timetable-entries'] })
      onSuccess?.(data)
      handleClose()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create timetable entry')
    }
  })

  const createRecurringMutation = useMutation({
    mutationFn: createRecurringEntries,
    onSuccess: (data) => {
      toast.success(`${data.count} timetable entries created successfully`)
      queryClient.invalidateQueries({ queryKey: ['timetable-entries'] })
      onSuccess?.(data)
      handleClose()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create recurring entries')
    }
  })

  // Auto-fill primary faculty when subject is selected
  useEffect(() => {
    if (watchedSubjectId) {
      const subject = subjects.find(s => s.id === watchedSubjectId)
      if (subject?.primaryFacultyId) {
        setValue('facultyId', subject.primaryFacultyId)
      }
    }
  }, [watchedSubjectId, subjects, setValue])

  // Set initial values from props
  useEffect(() => {
    if (defaultDate) {
      setValue('date', defaultDate.toISOString().split('T')[0])
      setValue('dayOfWeek', getDayOfWeekFromDate(defaultDate))
    }
  }, [defaultDate, setValue])

  useEffect(() => {
    if (defaultTimeSlot && timeSlots && timeSlots.length > 0) {
      const timeSlot = timeSlots.find(ts => ts.name === defaultTimeSlot)
      if (timeSlot) {
        setValue('timeSlotId', timeSlot.id)
      }
    }
  }, [defaultTimeSlot, timeSlots, setValue])

  useEffect(() => {
    if (defaultBatchId) {
      setValue('batchId', defaultBatchId)
    }
  }, [defaultBatchId, setValue])

  const getDayOfWeekFromDate = (date: Date): DayOfWeek => {
    const days: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
    return days[date.getDay()]
  }

  const handleClose = () => {
    reset()
    setConflicts([])
    setShowConflicts(false)
    setForceCreate(false)
    onClose()
  }

  const handleFormSubmit = async (data: CreateTimetableEntryFormData) => {
    if (!forceCreate) {
      // Check for conflicts first
      setIsCheckingConflicts(true)
      try {
        const detectedConflicts = await checkConflicts(data)
        if (detectedConflicts.length > 0) {
          setConflicts(detectedConflicts)
          setShowConflicts(true)
          setIsCheckingConflicts(false)
          return
        }
      } catch (error) {
        toast.error('Failed to check conflicts')
        setIsCheckingConflicts(false)
        return
      }
      setIsCheckingConflicts(false)
    }

    // Create entry(ies)
    if (data.isRecurring) {
      createRecurringMutation.mutate(data)
    } else {
      createEntryMutation.mutate(data)
    }
  }

  const handleForceCreate = () => {
    setForceCreate(true)
    setShowConflicts(false)
    // Re-submit the form
    handleSubmit(handleFormSubmit)()
  }

  const getConflictSeverity = (type: string) => {
    switch (type) {
      case 'BATCH_DOUBLE_BOOKING':
      case 'FACULTY_CONFLICT':
        return 'critical'
      case 'MODULE_OVERLAP':
        return 'high'
      case 'HOLIDAY_SCHEDULING':
        return 'medium'
      case 'EXAM_PERIOD_CONFLICT':
        return 'low'
      default:
        return 'medium'
    }
  }

  const getConflictColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'secondary'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create Timetable Entry
          </DialogTitle>
          <DialogDescription>
            Create a new class schedule entry. Fill in the required fields and configure recurrence if needed.
          </DialogDescription>
        </DialogHeader>

        {showConflicts && conflicts.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertDescription className="space-y-3">
              <div className="font-medium">Scheduling conflicts detected:</div>
              <div className="space-y-2">
                {conflicts.map((conflict, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Badge variant={getConflictColor(getConflictSeverity(conflict.type)) as any}>
                      {getConflictSeverity(conflict.type).toUpperCase()}
                    </Badge>
                    <span className="text-sm">{conflict.message}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConflicts(false)}
                >
                  Modify Entry
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleForceCreate}
                >
                  Force Create Anyway
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="recurrence">Recurrence Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6">
              {/* Hidden batch field - pre-selected from parent */}
              <input type="hidden" {...register('batchId')} />
              
              {/* Display selected batch info */}
              {defaultBatchId && batches.find((b: any) => b.id === defaultBatchId) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Adding Class For</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      {(() => {
                        const batch = batches.find((b: any) => b.id === defaultBatchId)
                        return batch ? (
                          <>
                            <Badge variant="outline">{batch.name}</Badge>
                            {batch.specialization && (
                              <Badge variant="secondary">{batch.specialization.shortName}</Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {batch.program?.name}
                            </span>
                          </>
                        ) : null
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Subject and Faculty Selection */}
              <div className="space-y-4">
                <SubjectFacultySelector
                  selectedSubjectId={watchedSubjectId}
                  selectedFacultyId={watch('facultyId')}
                  batchId={watchedBatchId}
                  onSubjectChange={(subjectId, subject) => {
                    setValue('subjectId', subjectId)
                  }}
                  onFacultyChange={(facultyId, faculty) => {
                    setValue('facultyId', facultyId)
                  }}
                  allowFacultyOverride={true}
                  showWorkload={true}
                />
                {errors.subjectId && (
                  <p className="text-sm text-destructive">{errors.subjectId.message}</p>
                )}
                {errors.facultyId && (
                  <p className="text-sm text-destructive">{errors.facultyId.message}</p>
                )}
              </div>

              {/* Time Slot Selection */}
              <div className="space-y-4">
                <TimeSlotPicker
                  selectedTimeSlotId={watch('timeSlotId')}
                  selectedDate={defaultDate}
                  selectedBatchId={watchedBatchId}
                  selectedFacultyId={watch('facultyId')}
                  selectedDayOfWeek={watch('dayOfWeek')}
                  onTimeSlotChange={(timeSlotId, timeSlot) => {
                    setValue('timeSlotId', timeSlotId)
                  }}
                  showConflicts={true}
                  allowCustomTime={true}
                />
                {errors.timeSlotId && (
                  <p className="text-sm text-destructive">{errors.timeSlotId.message}</p>
                )}
              </div>

              {/* Additional Configuration */}
              <div className="grid grid-cols-2 gap-4">

                {/* Day of Week */}
                <div className="space-y-2">
                  <Label htmlFor="dayOfWeek">Day of Week *</Label>
                  <Controller
                    name="dayOfWeek"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const).map((day) => (
                            <SelectItem key={day} value={day}>
                              {day.charAt(0) + day.slice(1).toLowerCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.dayOfWeek && (
                    <p className="text-sm text-destructive">{errors.dayOfWeek.message}</p>
                  )}
                </div>

                {/* Entry Type */}
                <div className="space-y-2">
                  <Label htmlFor="entryType">Entry Type</Label>
                  <Controller
                    name="entryType"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select entry type" />
                        </SelectTrigger>
                        <SelectContent>
                          {(['REGULAR', 'MAKEUP', 'EXTRA', 'EXAM'] as const).map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.charAt(0) + type.slice(1).toLowerCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  {...register('notes')}
                  placeholder="Add any additional notes or comments..."
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="recurrence" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recurrence Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Enable Recurrence */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      {...register('isRecurring')}
                      id="isRecurring"
                      className="h-4 w-4"
                    />
                    <Label htmlFor="isRecurring">Enable recurring schedule</Label>
                  </div>

                  {watchedIsRecurring && (
                    <>
                      {/* Recurrence Pattern */}
                      <div className="space-y-2">
                        <Label htmlFor="recurrencePattern">Recurrence Pattern *</Label>
                        <Controller
                          name="recurrencePattern"
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select pattern" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      {/* End Condition Type */}
                      <div className="space-y-2">
                        <Label htmlFor="endConditionType">End Condition *</Label>
                        <Controller
                          name="endConditionType"
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select end condition" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="semester_end">End of Semester</SelectItem>
                                <SelectItem value="date">Specific Date</SelectItem>
                                <SelectItem value="hours">After Completing Hours</SelectItem>
                                <SelectItem value="occurrences">After Number of Classes</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      {/* Conditional End Condition Fields */}
                      {watchedEndConditionType === 'date' && (
                        <div className="space-y-2">
                          <Label htmlFor="endDate">End Date *</Label>
                          <input
                            type="date"
                            {...register('endDate')}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>
                      )}

                      {watchedEndConditionType === 'hours' && (
                        <div className="space-y-2">
                          <Label htmlFor="endAfterHours">Total Hours to Complete *</Label>
                          <input
                            type="number"
                            {...register('endAfterHours', { valueAsNumber: true })}
                            min="1"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            placeholder="Enter total hours"
                          />
                        </div>
                      )}

                      {watchedEndConditionType === 'occurrences' && (
                        <div className="space-y-2">
                          <Label htmlFor="endAfterOccurrences">Number of Classes *</Label>
                          <input
                            type="number"
                            {...register('endAfterOccurrences', { valueAsNumber: true })}
                            min="1"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            placeholder="Enter number of classes"
                          />
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || isCheckingConflicts}
            >
              {isCheckingConflicts ? 'Checking Conflicts...' : 
               isSubmitting ? 'Creating...' : 
               watchedIsRecurring ? 'Create Recurring Entries' : 'Create Entry'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
})