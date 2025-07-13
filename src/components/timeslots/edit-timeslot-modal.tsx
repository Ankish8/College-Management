"use client"

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Shield, 
  Users, 
  Calendar,
  Activity,
  Database,
  Eye,
  EyeOff,
  Lightbulb
} from 'lucide-react'
import { toast } from 'sonner'

const editTimeSlotSchema = z.object({
  name: z.string().min(1, "Time slot name is required"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid start time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid end time format"),
  isActive: z.boolean(),
  sortOrder: z.number().min(0),
}).refine(
  (data) => {
    const startMinutes = timeToMinutes(data.startTime)
    const endMinutes = timeToMinutes(data.endTime)
    return endMinutes > startMinutes
  },
  {
    message: "End time must be after start time",
    path: ["endTime"]
  }
)

type EditTimeSlotFormData = z.infer<typeof editTimeSlotSchema>

interface EditTimeSlotModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  timeSlotId: string | null
}

interface TimeSlotDetails {
  id: string
  name: string
  startTime: string
  endTime: string
  duration: number
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  usageCount: number
  inUse: boolean
  adjacentSlots: any[]
  timetableEntries: any[]
  _count: {
    timetableEntries: number
    timetableTemplates: number
  }
}

// Helper functions
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

function formatDuration(startTime: string, endTime: string): string {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  const duration = endMinutes - startMinutes
  
  const hours = Math.floor(duration / 60)
  const mins = duration % 60
  
  if (hours === 0) return `${mins} minutes`
  if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
  return `${hours}h ${mins}m`
}

function format12Hour(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const hour12 = hours % 12 || 12
  const ampm = hours < 12 ? 'AM' : 'PM'
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`
}

export function EditTimeSlotModal({ open, onOpenChange, timeSlotId }: EditTimeSlotModalProps) {
  const queryClient = useQueryClient()
  const [startTimeSlider, setStartTimeSlider] = useState([540]) // 9:00 AM in minutes
  const [durationSlider, setDurationSlider] = useState([60]) // 1 hour
  const [conflicts, setConflicts] = useState<any[]>([])
  const [showUsageDetails, setShowUsageDetails] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const form = useForm<EditTimeSlotFormData>({
    resolver: zodResolver(editTimeSlotSchema),
  })

  const watchedValues = form.watch()

  // Fetch time slot details
  const { data: timeSlotDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['timeSlot', timeSlotId],
    queryFn: async () => {
      if (!timeSlotId) return null
      const response = await fetch(`/api/timeslots/${timeSlotId}`)
      if (!response.ok) throw new Error('Failed to fetch time slot details')
      return response.json() as TimeSlotDetails
    },
    enabled: !!timeSlotId && open
  })

  // Initialize form when data is loaded
  useEffect(() => {
    if (timeSlotDetails && open) {
      form.reset({
        name: timeSlotDetails.name,
        startTime: timeSlotDetails.startTime,
        endTime: timeSlotDetails.endTime,
        isActive: timeSlotDetails.isActive,
        sortOrder: timeSlotDetails.sortOrder,
      })
      
      const startMinutes = timeToMinutes(timeSlotDetails.startTime)
      const endMinutes = timeToMinutes(timeSlotDetails.endTime)
      setStartTimeSlider([startMinutes])
      setDurationSlider([endMinutes - startMinutes])
      setHasUnsavedChanges(false)
    }
  }, [timeSlotDetails, form, open])

  // Track changes
  useEffect(() => {
    if (timeSlotDetails) {
      const hasChanges = (
        watchedValues.name !== timeSlotDetails.name ||
        watchedValues.startTime !== timeSlotDetails.startTime ||
        watchedValues.endTime !== timeSlotDetails.endTime ||
        watchedValues.isActive !== timeSlotDetails.isActive ||
        watchedValues.sortOrder !== timeSlotDetails.sortOrder
      )
      setHasUnsavedChanges(hasChanges)
    }
  }, [watchedValues, timeSlotDetails])

  // Update form when sliders change
  useEffect(() => {
    if (timeSlotDetails) {
      const startTime = minutesToTime(startTimeSlider[0])
      const endTime = minutesToTime(startTimeSlider[0] + durationSlider[0])
      
      form.setValue('startTime', startTime)
      form.setValue('endTime', endTime)
    }
  }, [startTimeSlider, durationSlider, form, timeSlotDetails])

  // Update sliders when form values change manually
  useEffect(() => {
    if (watchedValues.startTime && watchedValues.endTime) {
      const startMinutes = timeToMinutes(watchedValues.startTime)
      const endMinutes = timeToMinutes(watchedValues.endTime)
      const duration = endMinutes - startMinutes
      
      if (duration > 0) {
        setStartTimeSlider([startMinutes])
        setDurationSlider([duration])
      }
    }
  }, [watchedValues.startTime, watchedValues.endTime])

  // Update time slot mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EditTimeSlotFormData) => {
      if (!timeSlotId) throw new Error('No time slot ID provided')
      
      const response = await fetch(`/api/timeslots/${timeSlotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update time slot')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeSlots'] })
      queryClient.invalidateQueries({ queryKey: ['timeSlot', timeSlotId] })
      toast.success('Time slot updated successfully')
      onOpenChange(false)
    },
    onError: (error: any) => {
      if (error.message.includes('overlap')) {
        setConflicts(error.overlapping || [])
      }
      toast.error(error.message || 'Failed to update time slot')
    }
  })

  // Check for conflicts in real-time
  useEffect(() => {
    if (watchedValues.startTime && watchedValues.endTime && open && timeSlotId) {
      const checkConflicts = async () => {
        try {
          const params = new URLSearchParams({
            startTime: watchedValues.startTime,
            endTime: watchedValues.endTime,
            excludeId: timeSlotId,
            checkConflicts: 'true'
          })
          
          const response = await fetch(`/api/timeslots/check-conflicts?${params}`)
          if (response.ok) {
            const data = await response.json()
            setConflicts(data.conflicts || [])
          }
        } catch (error) {
          // Ignore errors in conflict checking
        }
      }
      
      const debounceTimer = setTimeout(checkConflicts, 500)
      return () => clearTimeout(debounceTimer)
    }
  }, [watchedValues.startTime, watchedValues.endTime, open, timeSlotId])

  const onSubmit = (data: EditTimeSlotFormData) => {
    updateMutation.mutate(data)
  }

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        onOpenChange(false)
      }
    } else {
      onOpenChange(false)
    }
  }

  const getImpactLevel = (usageCount: number) => {
    if (usageCount === 0) return { level: 'none', color: 'bg-gray-100 text-gray-600', text: 'No Impact' }
    if (usageCount < 5) return { level: 'low', color: 'bg-green-100 text-green-600', text: 'Low Impact' }
    if (usageCount < 15) return { level: 'medium', color: 'bg-yellow-100 text-yellow-600', text: 'Medium Impact' }
    return { level: 'high', color: 'bg-red-100 text-red-600', text: 'High Impact' }
  }

  if (!timeSlotId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Edit Time Slot
            {timeSlotDetails && (
              <Badge variant={timeSlotDetails.isActive ? "default" : "secondary"}>
                {timeSlotDetails.isActive ? "Active" : "Inactive"}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Modify the time slot settings. Be careful when changing times for slots that are currently in use.
          </DialogDescription>
        </DialogHeader>

        {isLoadingDetails ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : timeSlotDetails ? (
          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="edit">Edit Details</TabsTrigger>
              <TabsTrigger value="usage">Usage Analysis</TabsTrigger>
              <TabsTrigger value="impact">Impact Assessment</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-6">
              {/* Usage Warning */}
              {timeSlotDetails.inUse && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">This time slot is currently in use</div>
                    <p className="text-sm">
                      This time slot is used in {timeSlotDetails.usageCount} schedule entries. 
                      Changing the time will affect existing timetables and may cause conflicts.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  
                  {/* Visual Time Picker */}
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">Visual Time Picker</CardTitle>
                      <CardDescription>
                        Drag the sliders to adjust your time slot
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      
                      {/* Start Time Slider */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Start Time</label>
                          <Badge variant="secondary">
                            {minutesToTime(startTimeSlider[0])} ({format12Hour(minutesToTime(startTimeSlider[0]))})
                          </Badge>
                        </div>
                        <Slider
                          value={startTimeSlider}
                          onValueChange={setStartTimeSlider}
                          min={420} // 7:00 AM
                          max={1200} // 8:00 PM
                          step={15}
                          className="w-full"
                          disabled={timeSlotDetails.inUse}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>7:00 AM</span>
                          <span>8:00 PM</span>
                        </div>
                        {timeSlotDetails.inUse && (
                          <p className="text-xs text-amber-600">Time changes disabled - slot is in use</p>
                        )}
                      </div>

                      {/* Duration Slider */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Duration</label>
                          <Badge variant="secondary">
                            {formatDuration(minutesToTime(startTimeSlider[0]), minutesToTime(startTimeSlider[0] + durationSlider[0]))}
                          </Badge>
                        </div>
                        <Slider
                          value={durationSlider}
                          onValueChange={setDurationSlider}
                          min={15}
                          max={480} // 8 hours
                          step={15}
                          className="w-full"
                          disabled={timeSlotDetails.inUse}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>15 min</span>
                          <span>8 hours</span>
                        </div>
                      </div>

                      {/* Time Preview */}
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {format12Hour(minutesToTime(startTimeSlider[0]))} - {format12Hour(minutesToTime(startTimeSlider[0] + durationSlider[0]))}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {minutesToTime(startTimeSlider[0])} - {minutesToTime(startTimeSlider[0] + durationSlider[0])} • {formatDuration(minutesToTime(startTimeSlider[0]), minutesToTime(startTimeSlider[0] + durationSlider[0]))}
                          </div>
                        </div>
                      </div>

                    </CardContent>
                  </Card>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="09:00" disabled={timeSlotDetails.inUse} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="10:00" disabled={timeSlotDetails.inUse} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time Slot Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="09:00-10:00" />
                          </FormControl>
                          <FormDescription>
                            A descriptive name for this time slot
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sortOrder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sort Order</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="0"
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Lower numbers appear first in lists
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Status Toggle */}
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Active Status</FormLabel>
                          <FormDescription>
                            Inactive time slots are hidden from new timetable entries
                          </FormDescription>
                        </div>
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Conflicts */}
                  {conflicts.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-medium mb-2">Time slot conflicts detected:</div>
                        <ul className="list-disc pl-4 space-y-1">
                          {conflicts.map((conflict, index) => (
                            <li key={index}>
                              {conflict.name} ({conflict.startTime} - {conflict.endTime})
                            </li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Success Indicator */}
                  {conflicts.length === 0 && watchedValues.startTime && watchedValues.endTime && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        No conflicts detected. Changes are safe to apply.
                      </AlertDescription>
                    </Alert>
                  )}

                </form>
              </Form>
            </TabsContent>

            <TabsContent value="usage" className="space-y-6">
              {/* Usage Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{timeSlotDetails.usageCount}</div>
                    <p className="text-xs text-muted-foreground">
                      Schedule entries using this slot
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Entries</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{timeSlotDetails._count.timetableEntries}</div>
                    <p className="text-xs text-muted-foreground">
                      Current timetable entries
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Templates</CardTitle>
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{timeSlotDetails._count.timetableTemplates}</div>
                    <p className="text-xs text-muted-foreground">
                      Template references
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Usage Details */}
              {timeSlotDetails.timetableEntries && timeSlotDetails.timetableEntries.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Recent Schedule Entries</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowUsageDetails(!showUsageDetails)}
                      >
                        {showUsageDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {showUsageDetails ? 'Hide' : 'Show'} Details
                      </Button>
                    </div>
                    <CardDescription>
                      Classes and events currently using this time slot
                    </CardDescription>
                  </CardHeader>
                  {showUsageDetails && (
                    <CardContent>
                      <div className="space-y-3">
                        {timeSlotDetails.timetableEntries.slice(0, 10).map((entry, index) => (
                          <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                            <div>
                              <div className="font-medium">{entry.subject?.name || 'Unknown Subject'}</div>
                              <div className="text-sm text-muted-foreground">
                                {entry.batch?.name} • {entry.faculty?.name}
                              </div>
                            </div>
                            <Badge variant="outline">
                              {entry.dayOfWeek}
                            </Badge>
                          </div>
                        ))}
                        {timeSlotDetails.timetableEntries.length > 10 && (
                          <p className="text-sm text-muted-foreground text-center">
                            And {timeSlotDetails.timetableEntries.length - 10} more entries...
                          </p>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}
            </TabsContent>

            <TabsContent value="impact" className="space-y-6">
              {/* Impact Assessment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Change Impact Assessment
                  </CardTitle>
                  <CardDescription>
                    Understanding the potential impact of your changes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <div className="font-medium">Overall Impact Level</div>
                      <div className="text-sm text-muted-foreground">
                        Based on current usage and proposed changes
                      </div>
                    </div>
                    <Badge className={getImpactLevel(timeSlotDetails.usageCount).color}>
                      {getImpactLevel(timeSlotDetails.usageCount).text}
                    </Badge>
                  </div>

                  {timeSlotDetails.inUse && (
                    <Alert>
                      <Users className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-medium mb-2">Affected Users</div>
                        <p className="text-sm">
                          Changes to this time slot will affect students, faculty, and administrators 
                          who rely on the current schedule. Consider notifying them in advance.
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}

                  {timeSlotDetails.adjacentSlots && timeSlotDetails.adjacentSlots.length > 0 && (
                    <Alert>
                      <Lightbulb className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-medium mb-2">Adjacent Time Slots Detected</div>
                        <p className="text-sm mb-2">
                          This time slot is adjacent to other slots. Consider merging or 
                          adjusting gaps for better scheduling efficiency.
                        </p>
                        <div className="space-y-1">
                          {timeSlotDetails.adjacentSlots.map((slot, index) => (
                            <div key={index} className="text-xs bg-muted p-2 rounded">
                              {slot.name} ({slot.startTime} - {slot.endTime}) - {slot.position}
                            </div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="font-medium text-sm">Recommended Actions:</div>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {timeSlotDetails.inUse ? (
                          <>
                            <li>• Schedule changes during low-activity periods</li>
                            <li>• Notify affected users 24-48 hours in advance</li>
                            <li>• Consider creating a replacement slot first</li>
                          </>
                        ) : (
                          <>
                            <li>• Changes can be made safely</li>
                            <li>• No existing schedules will be affected</li>
                            <li>• Test the new timing before deployment</li>
                          </>
                        )}
                      </ul>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="font-medium text-sm">Potential Risks:</div>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {timeSlotDetails.inUse ? (
                          <>
                            <li>• Schedule conflicts with other classes</li>
                            <li>• Confusion among students and faculty</li>
                            <li>• Need to update printed schedules</li>
                          </>
                        ) : (
                          <>
                            <li>• Minimal risk as slot is unused</li>
                            <li>• May affect future schedule planning</li>
                            <li>• Check compatibility with break times</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Failed to load time slot details</p>
          </div>
        )}

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCancel}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={form.handleSubmit(onSubmit)}
            disabled={updateMutation.isPending || conflicts.length > 0 || !hasUnsavedChanges}
          >
            {updateMutation.isPending ? 'Updating...' : 'Update Time Slot'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}