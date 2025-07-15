"use client"

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Clock, AlertTriangle, CheckCircle, Copy, Lightbulb } from 'lucide-react'
import { toast } from 'sonner'

const timeSlotSchema = z.object({
  name: z.string().min(1, "Time slot name is required"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid start time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid end time format"),
  autoGenerateName: z.boolean().default(false),
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

type TimeSlotFormData = z.infer<typeof timeSlotSchema>

interface AddTimeSlotModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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

function generateTimeSlotName(startTime: string, endTime: string, format: 'simple' | '12hour' | '24hour' = 'simple'): string {
  switch (format) {
    case '12hour':
      return `${format12Hour(startTime)} - ${format12Hour(endTime)}`
    case '24hour':
      return `${startTime} - ${endTime}`
    default:
      return `${startTime}-${endTime}`
  }
}

// Common time slot suggestions
const COMMON_DURATIONS = [
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '45 minutes', minutes: 45 },
  { label: '1 hour', minutes: 60 },
  { label: '1.5 hours', minutes: 90 },
  { label: '2 hours', minutes: 120 },
  { label: '3 hours', minutes: 180 },
  { label: '4 hours', minutes: 240 },
]

const COMMON_START_TIMES = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00'
]

export function AddTimeSlotModal({ open, onOpenChange }: AddTimeSlotModalProps) {
  const queryClient = useQueryClient()
  const [startTimeSlider, setStartTimeSlider] = useState([540]) // 9:00 AM in minutes
  const [durationSlider, setDurationSlider] = useState([60]) // 1 hour
  const [conflicts, setConflicts] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])

  const form = useForm<TimeSlotFormData>({
    resolver: zodResolver(timeSlotSchema) as any,
    defaultValues: {
      name: '',
      startTime: '09:00',
      endTime: '10:00',
      autoGenerateName: true,
    }
  })

  const watchedValues = form.watch()

  // Update form when sliders change
  useEffect(() => {
    const startTime = minutesToTime(startTimeSlider[0])
    const endTime = minutesToTime(startTimeSlider[0] + durationSlider[0])
    
    form.setValue('startTime', startTime)
    form.setValue('endTime', endTime)
    
    if (watchedValues.autoGenerateName) {
      form.setValue('name', generateTimeSlotName(startTime, endTime))
    }
  }, [startTimeSlider, durationSlider, form, watchedValues.autoGenerateName])

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

  // Generate name suggestions
  useEffect(() => {
    if (watchedValues.startTime && watchedValues.endTime) {
      const suggestions = [
        generateTimeSlotName(watchedValues.startTime, watchedValues.endTime, 'simple'),
        generateTimeSlotName(watchedValues.startTime, watchedValues.endTime, '12hour'),
        generateTimeSlotName(watchedValues.startTime, watchedValues.endTime, '24hour'),
        `Period ${watchedValues.startTime}`,
        `Class ${watchedValues.startTime}`,
      ]
      setSuggestions(suggestions.filter((s, i, arr) => arr.indexOf(s) === i)) // Remove duplicates
    }
  }, [watchedValues.startTime, watchedValues.endTime])

  // Create time slot mutation
  const createMutation = useMutation({
    mutationFn: async (data: TimeSlotFormData) => {
      const response = await fetch('/api/timeslots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          startTime: data.startTime,
          endTime: data.endTime,
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create time slot')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeSlots'] })
      toast.success('Time slot created successfully')
      onOpenChange(false)
      form.reset()
    },
    onError: (error: any) => {
      if (error.message.includes('overlap')) {
        setConflicts(error.overlapping || [])
      }
      toast.error(error.message || 'Failed to create time slot')
    }
  })

  // Check for conflicts in real-time
  useEffect(() => {
    if (watchedValues.startTime && watchedValues.endTime && open) {
      const checkConflicts = async () => {
        try {
          const params = new URLSearchParams({
            startTime: watchedValues.startTime,
            endTime: watchedValues.endTime,
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
  }, [watchedValues.startTime, watchedValues.endTime, open])

  const onSubmit = (data: TimeSlotFormData) => {
    createMutation.mutate(data)
  }

  const applyCommonDuration = (minutes: number) => {
    setDurationSlider([minutes])
  }

  const applyCommonStartTime = (time: string) => {
    const minutes = timeToMinutes(time)
    setStartTimeSlider([minutes])
  }

  const applySuggestion = (suggestion: string) => {
    form.setValue('name', suggestion)
    form.setValue('autoGenerateName', false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Create New Time Slot
          </DialogTitle>
          <DialogDescription>
            Create a new time slot for your timetable. Use the visual controls or enter times manually.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Visual Time Picker */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Visual Time Picker</CardTitle>
                <CardDescription>
                  Drag the sliders to select your time slot visually
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
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>7:00 AM</span>
                    <span>8:00 PM</span>
                  </div>
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

            {/* Quick Options */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Quick Options</CardTitle>
                <CardDescription>
                  Common durations and start times
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Common Durations */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Common Durations</label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_DURATIONS.map((duration) => (
                      <Button
                        key={duration.minutes}
                        type="button"
                        variant={durationSlider[0] === duration.minutes ? "default" : "outline"}
                        size="sm"
                        onClick={() => applyCommonDuration(duration.minutes)}
                      >
                        {duration.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Common Start Times */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Common Start Times</label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_START_TIMES.map((time) => (
                      <Button
                        key={time}
                        type="button"
                        variant={minutesToTime(startTimeSlider[0]) === time ? "default" : "outline"}
                        size="sm"
                        onClick={() => applyCommonStartTime(time)}
                      >
                        {format12Hour(time)}
                      </Button>
                    ))}
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
                      <Input {...field} placeholder="09:00" />
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
                      <Input {...field} placeholder="10:00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Name Field */}
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

            {/* Auto Generate Name */}
            <FormField
              control={form.control}
              name="autoGenerateName"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Auto-generate name</FormLabel>
                    <FormDescription>
                      Automatically generate name based on time range
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

            {/* Name Suggestions */}
            {suggestions.length > 0 && !watchedValues.autoGenerateName && (
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Name Suggestions
                </label>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applySuggestion(suggestion)}
                      className="h-8"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}

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
                  No conflicts detected. This time slot is available.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || conflicts.length > 0}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Time Slot'}
              </Button>
            </DialogFooter>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}