"use client"

import React, { useState, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Calendar, Users, AlertTriangle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'

interface TimeSlotOption {
  id: string
  name: string
  startTime: string
  endTime: string
  duration: number
  sortOrder: number
  isActive: boolean
}

interface TimeSlotConflict {
  batchName: string
  subjectName: string
  facultyName: string
}

interface TimeSlotPickerProps {
  selectedTimeSlotId?: string
  selectedDate?: Date
  selectedBatchId?: string
  selectedFacultyId?: string
  selectedDayOfWeek?: string
  onTimeSlotChange: (timeSlotId: string, timeSlot: TimeSlotOption | null) => void
  showConflicts?: boolean
  allowCustomTime?: boolean
  className?: string
}

// API functions
const fetchTimeSlots = async (): Promise<TimeSlotOption[]> => {
  const response = await fetch('/api/timeslots?active=true&includeInactive=false')
  if (!response.ok) throw new Error('Failed to fetch time slots')
  const data = await response.json()
  return data.timeSlots || data
}

const checkTimeSlotConflicts = async (params: {
  timeSlotId: string
  batchId?: string
  facultyId?: string
  date?: string
  dayOfWeek?: string
}): Promise<TimeSlotConflict[]> => {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.append(key, value)
  })
  
  const response = await fetch(`/api/timetable/conflicts/timeslot?${searchParams}`)
  if (!response.ok) throw new Error('Failed to check conflicts')
  return response.json()
}

export function TimeSlotPicker({
  selectedTimeSlotId,
  selectedDate,
  selectedBatchId,
  selectedFacultyId,
  selectedDayOfWeek,
  onTimeSlotChange,
  showConflicts = true,
  allowCustomTime = false,
  className = "",
}: TimeSlotPickerProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showAll, setShowAll] = useState(false)

  // Fetch time slots
  const { data: timeSlots = [], isLoading } = useQuery({
    queryKey: ['timeslots'],
    queryFn: fetchTimeSlots,
  })

  // Fetch conflicts for selected parameters
  const { data: conflicts = [] } = useQuery({
    queryKey: ['timeslot-conflicts', selectedTimeSlotId, selectedBatchId, selectedFacultyId, selectedDate, selectedDayOfWeek],
    queryFn: () => checkTimeSlotConflicts({
      timeSlotId: selectedTimeSlotId!,
      batchId: selectedBatchId,
      facultyId: selectedFacultyId,
      date: selectedDate?.toISOString().split('T')[0],
      dayOfWeek: selectedDayOfWeek,
    }),
    enabled: !!(selectedTimeSlotId && showConflicts),
  })

  // Group time slots by time of day
  const groupedTimeSlots = useMemo(() => {
    const groups = {
      morning: [] as TimeSlotOption[],
      afternoon: [] as TimeSlotOption[],
      evening: [] as TimeSlotOption[],
    }

    // Ensure timeSlots is an array before processing
    if (Array.isArray(timeSlots)) {
      timeSlots.forEach(slot => {
        const startHour = parseInt(slot.startTime.split(':')[0])
        
        if (startHour < 12) {
          groups.morning.push(slot)
        } else if (startHour < 17) {
          groups.afternoon.push(slot)
        } else {
          groups.evening.push(slot)
        }
      })
    }

    // Sort each group by start time
    Object.values(groups).forEach(group => {
      group.sort((a, b) => a.sortOrder - b.sortOrder)
    })

    return groups
  }, [timeSlots])

  // Filter slots for display
  const displayTimeSlots = useMemo(() => {
    if (!Array.isArray(timeSlots)) return []
    if (showAll) return timeSlots
    return timeSlots.slice(0, 12) // Show first 12 slots by default
  }, [timeSlots, showAll])

  const formatTime = (timeString: string) => {
    try {
      // Handle both HH:mm and HH:mm:ss formats
      const [hours, minutes] = timeString.split(':').map(Number)
      const date = new Date()
      date.setHours(hours, minutes, 0, 0)
      return format(date, 'h:mm a')
    } catch {
      return timeString // Return original if parsing fails
    }
  }

  const getDurationLabel = (duration: number) => {
    const hours = Math.floor(duration / 60)
    const mins = duration % 60
    
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  const getTimeSlotColor = (timeSlot: TimeSlotOption) => {
    const startHour = parseInt(timeSlot.startTime.split(':')[0])
    
    if (startHour < 12) return 'bg-blue-50 border-blue-200 text-blue-900'
    if (startHour < 17) return 'bg-green-50 border-green-200 text-green-900'
    return 'bg-purple-50 border-purple-200 text-purple-900'
  }

  const handleTimeSlotChange = (timeSlotId: string) => {
    const timeSlot = Array.isArray(timeSlots) ? timeSlots.find(ts => ts.id === timeSlotId) || null : null
    onTimeSlotChange(timeSlotId, timeSlot)
  }

  const selectedTimeSlot = Array.isArray(timeSlots) ? timeSlots.find(ts => ts.id === selectedTimeSlotId) : undefined

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label htmlFor="timeSlot">Time Slot *</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
          <Button
            type="button"
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="space-y-4">
          {/* Morning Slots */}
          {groupedTimeSlots.morning.length > 0 && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Morning (6 AM - 12 PM)
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {groupedTimeSlots.morning.map(timeSlot => (
                  <Card
                    key={timeSlot.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTimeSlotId === timeSlot.id 
                        ? 'ring-2 ring-primary shadow-md' 
                        : getTimeSlotColor(timeSlot)
                    }`}
                    onClick={() => handleTimeSlotChange(timeSlot.id)}
                  >
                    <CardContent className="p-3">
                      <div className="text-sm font-medium">{timeSlot.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(timeSlot.startTime)} - {formatTime(timeSlot.endTime)}
                      </div>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {getDurationLabel(timeSlot.duration)}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Afternoon Slots */}
          {groupedTimeSlots.afternoon.length > 0 && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Afternoon (12 PM - 5 PM)
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {groupedTimeSlots.afternoon.map(timeSlot => (
                  <Card
                    key={timeSlot.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTimeSlotId === timeSlot.id 
                        ? 'ring-2 ring-primary shadow-md' 
                        : getTimeSlotColor(timeSlot)
                    }`}
                    onClick={() => handleTimeSlotChange(timeSlot.id)}
                  >
                    <CardContent className="p-3">
                      <div className="text-sm font-medium">{timeSlot.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(timeSlot.startTime)} - {formatTime(timeSlot.endTime)}
                      </div>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {getDurationLabel(timeSlot.duration)}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Evening Slots */}
          {groupedTimeSlots.evening.length > 0 && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Evening (5 PM onwards)
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {groupedTimeSlots.evening.map(timeSlot => (
                  <Card
                    key={timeSlot.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTimeSlotId === timeSlot.id 
                        ? 'ring-2 ring-primary shadow-md' 
                        : getTimeSlotColor(timeSlot)
                    }`}
                    onClick={() => handleTimeSlotChange(timeSlot.id)}
                  >
                    <CardContent className="p-3">
                      <div className="text-sm font-medium">{timeSlot.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(timeSlot.startTime)} - {formatTime(timeSlot.endTime)}
                      </div>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {getDurationLabel(timeSlot.duration)}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Select value={selectedTimeSlotId} onValueChange={handleTimeSlotChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select time slot" />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {Object.entries(groupedTimeSlots).map(([period, slots]) => {
              if (slots.length === 0) return null
              
              return (
                <div key={period}>
                  <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground border-b capitalize">
                    {period}
                  </div>
                  {slots.map(timeSlot => (
                    <SelectItem key={timeSlot.id} value={timeSlot.id}>
                      <div className="flex items-center gap-3 w-full">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium">{timeSlot.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatTime(timeSlot.startTime)} - {formatTime(timeSlot.endTime)} 
                            <span className="ml-2">({getDurationLabel(timeSlot.duration)})</span>
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </div>
              )
            })}
          </SelectContent>
        </Select>
      )}

      {/* Selected Time Slot Info */}
      {selectedTimeSlot && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Selected Time Slot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Time Slot:</span>
                <div className="text-muted-foreground">{selectedTimeSlot.name}</div>
              </div>
              <div>
                <span className="font-medium">Duration:</span>
                <div className="text-muted-foreground">{getDurationLabel(selectedTimeSlot.duration)}</div>
              </div>
              <div className="col-span-2">
                <span className="font-medium">Schedule:</span>
                <div className="text-muted-foreground">
                  {formatTime(selectedTimeSlot.startTime)} - {formatTime(selectedTimeSlot.endTime)}
                </div>
              </div>
            </div>

            {/* Conflicts Display */}
            {showConflicts && conflicts.length > 0 && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  Potential Conflicts
                </div>
                <div className="space-y-1 text-sm">
                  {conflicts.map((conflict, index) => (
                    <div key={index} className="text-yellow-700">
                      {conflict.batchName}: {conflict.subjectName} with {conflict.facultyName}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show More Button */}
      {timeSlots.length > 12 && !showAll && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAll(true)}
          className="w-full"
        >
          Show All {timeSlots.length} Time Slots
        </Button>
      )}

      {/* Custom Time Option */}
      {allowCustomTime && (
        <Card className="border-dashed">
          <CardContent className="p-4 text-center">
            <Button type="button" variant="outline" className="w-full">
              <Clock className="h-4 w-4 mr-2" />
              Create Custom Time Slot
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Create a new time slot if existing ones don't match your needs
            </p>
          </CardContent>
        </Card>
      )}

      {/* No Time Slots Available */}
      {timeSlots.length === 0 && (
        <Card>
          <CardContent className="text-center py-6">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <div className="text-muted-foreground mb-2">No time slots available</div>
            <Button type="button" variant="outline" size="sm">
              Create Time Slots
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}