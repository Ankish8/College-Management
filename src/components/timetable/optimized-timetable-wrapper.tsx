"use client"

import { useState, useMemo } from 'react'
import { CalendarEvent } from '@/types/timetable'
import { VirtualTimetableList } from './virtual-timetable-list'
import { VirtualTimetableGrid, WeeklyTimetableGrid } from './virtual-timetable-grid'
import { TraditionalTimetableView } from './traditional-timetable-view'
import { CalendarWeekView } from './calendar-week-view'
import { CalendarDayView } from './calendar-day-view'
import { CalendarMonthView } from './calendar-month-view'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Grid3X3, 
  List, 
  Calendar, 
  CalendarDays,
  Zap,
  Info
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface OptimizedTimetableWrapperProps {
  date: Date
  events: CalendarEvent[]
  view: 'traditional' | 'calendar-week' | 'calendar-day' | 'calendar-month'
  batchId?: string
  onEventClick?: (event: CalendarEvent) => void
  onEventCreate?: (date: Date, timeSlot?: string) => void
  onQuickCreate?: (data: any) => void
  subjects?: any[]
  faculty?: any[]
  batches?: any[]
  timeSlots?: any[]
  holidays?: any[]
  draggedEvent?: CalendarEvent | null
  onDragEnd?: (event: any) => void
  onViewChange?: (view: string) => void
  className?: string
}

// Threshold for switching to virtual scrolling
const VIRTUAL_SCROLLING_THRESHOLD = 200

export function OptimizedTimetableWrapper({
  date,
  events,
  view,
  batchId,
  onEventClick,
  onEventCreate,
  onQuickCreate,
  subjects = [],
  faculty = [],
  batches = [],
  timeSlots = [],
  holidays = [],
  draggedEvent,
  onDragEnd,
  onViewChange,
  className = ""
}: OptimizedTimetableWrapperProps) {
  
  const [virtualMode, setVirtualMode] = useState(false)
  const [listGrouping, setListGrouping] = useState<'day' | 'subject' | 'faculty' | 'batch'>('day')

  // Determine if we should use virtual scrolling
  const shouldUseVirtualScrolling = useMemo(() => {
    return events.length > VIRTUAL_SCROLLING_THRESHOLD || virtualMode
  }, [events.length, virtualMode])

  // Convert calendar events to timetable entries format for virtual components
  const timetableEntries = useMemo(() => {
    return events.map(event => ({
      id: event.id,
      dayOfWeek: event.extendedProps?.dayOfWeek || 'MONDAY',
      date: event.start ? new Date(event.start) : undefined,
      timeSlot: {
        name: event.extendedProps?.timeSlotName || 'Unknown',
        startTime: event.start ? new Date(event.start).toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : '09:00',
        endTime: event.end ? new Date(event.end).toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : '10:00',
      },
      subject: event.extendedProps?.subjectName ? {
        name: event.extendedProps.subjectName,
        code: event.extendedProps.subjectCode || ''
      } : undefined,
      faculty: event.extendedProps?.facultyName ? {
        name: event.extendedProps.facultyName
      } : undefined,
      batch: event.extendedProps?.batchName ? {
        name: event.extendedProps.batchName
      } : undefined,
      customEventTitle: event.title,
      customEventColor: event.backgroundColor,
      entryType: event.extendedProps?.entryType || 'REGULAR',
      notes: event.extendedProps?.notes
    }))
  }, [events])

  const renderVirtualView = () => {
    if (view === 'traditional' || view === 'calendar-week') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                <Zap className="h-3 w-3 mr-1" />
                Virtual Mode
              </Badge>
              <span className="text-sm text-muted-foreground">
                {events.length} entries
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={listGrouping} onValueChange={(value: any) => setListGrouping(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">By Day</SelectItem>
                  <SelectItem value="subject">By Subject</SelectItem>
                  <SelectItem value="faculty">By Faculty</SelectItem>
                  <SelectItem value="batch">By Batch</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVirtualMode(false)}
              >
                <Grid3X3 className="h-4 w-4 mr-1" />
                Grid View
              </Button>
            </div>
          </div>
          
          <VirtualTimetableList
            entries={timetableEntries}
            height={600}
            groupBy={listGrouping}
            onEdit={(entry) => {
              const event = events.find(e => e.id === entry.id)
              if (event && onEventClick) onEventClick(event)
            }}
            onDelete={(entryId) => {
              const event = events.find(e => e.id === entryId)
              if (event && onEventClick) onEventClick(event)
            }}
            onCopy={(entry) => {
              // Handle copy functionality
              console.log('Copy entry:', entry)
            }}
          />
        </div>
      )
    } else {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              <Zap className="h-3 w-3 mr-1" />
              Virtual Grid ({events.length} entries)
            </Badge>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVirtualMode(false)}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Calendar View
            </Button>
          </div>
          
          <WeeklyTimetableGrid
            entries={timetableEntries}
            timeSlots={timeSlots}
            height={600}
            onEntryClick={(entry) => {
              const event = events.find(e => e.id === entry.id)
              if (event && onEventClick) onEventClick(event)
            }}
            onSlotClick={(day, timeSlotId) => {
              // Handle slot click for creating new entries
              if (onEventCreate) {
                onEventCreate(date, timeSlotId)
              }
            }}
          />
        </div>
      )
    }
  }

  const renderStandardView = () => {
    const commonProps = {
      date,
      events,
      batchId,
      onEventClick,
      onEventCreate,
      onQuickCreate,
      subjects,
      faculty,
      batches,
      timeSlots,
      holidays,
      draggedEvent,
      onDragEnd
    }

    switch (view) {
      case 'traditional':
        return <TraditionalTimetableView {...commonProps} />
      case 'calendar-week':
        return <CalendarWeekView {...commonProps} />
      case 'calendar-day':
        return <CalendarDayView {...commonProps} />
      case 'calendar-month':
        return <CalendarMonthView {...commonProps} />
      default:
        return <TraditionalTimetableView {...commonProps} />
    }
  }

  return (
    <div className={className}>
      {/* Performance notification */}
      {events.length > VIRTUAL_SCROLLING_THRESHOLD && !virtualMode && (
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            Large dataset detected ({events.length} entries). 
            <Button
              variant="link"
              className="p-0 ml-1 text-blue-600 underline"
              onClick={() => setVirtualMode(true)}
            >
              Enable virtual scrolling
            </Button>
            {' '}for better performance.
          </AlertDescription>
        </Alert>
      )}

      {/* Force virtual mode toggle */}
      {events.length <= VIRTUAL_SCROLLING_THRESHOLD && (
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVirtualMode(!virtualMode)}
          >
            {virtualMode ? (
              <>
                <Grid3X3 className="h-4 w-4 mr-1" />
                Standard View
              </>
            ) : (
              <>
                <List className="h-4 w-4 mr-1" />
                Virtual Mode
              </>
            )}
          </Button>
        </div>
      )}

      {/* Render appropriate view */}
      {shouldUseVirtualScrolling ? renderVirtualView() : renderStandardView()}
    </div>
  )
}