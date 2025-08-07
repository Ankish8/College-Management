"use client"

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CalendarEvent } from '@/types/timetable'
import { format } from 'date-fns'
import { Calendar, Clock, Users, MapPin, BookOpen, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface EventDetailsModalProps {
  event: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EventDetailsModal({ event, open, onOpenChange }: EventDetailsModalProps) {
  if (!event) return null

  const eventType = event.extendedProps?.type || (event.allDay ? 'holiday' : 'class')
  const isHoliday = eventType === 'holiday' || event.allDay
  const isCustom = event.extendedProps?.isCustomEvent
  const isClass = !event.allDay && !event.extendedProps?.isCustomEvent

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isHoliday && "🎊 Holiday Details"}
            {isCustom && "📅 Event Details"}
            {isClass && "📚 Class Details"}
          </DialogTitle>
          <DialogDescription>
            Complete information about this {isHoliday ? 'holiday' : isCustom ? 'event' : 'class'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Title/Name */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">
              {isClass ? 'Subject' : 'Title'}
            </div>
            <div className="font-semibold">
              {event.title || event.extendedProps?.subjectName || event.extendedProps?.customEventTitle}
            </div>
          </div>

          {/* Date & Time */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(event.start, 'EEEE, MMMM d, yyyy')}</span>
          </div>

          {!event.allDay && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
              </span>
            </div>
          )}

          {/* Faculty (for classes) */}
          {isClass && event.extendedProps?.facultyName && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Faculty</div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{event.extendedProps.facultyName}</span>
              </div>
            </div>
          )}

          {/* Subject Code (for classes) */}
          {isClass && event.extendedProps?.subjectCode && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Subject Code</div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span>{event.extendedProps.subjectCode}</span>
              </div>
            </div>
          )}

          {/* Batch (for classes) */}
          {isClass && event.extendedProps?.batchName && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Batch</div>
              <span>{event.extendedProps.batchName}</span>
            </div>
          )}

          {/* Room (if available) - TODO: Add room support to CalendarEvent type */}
          {/* {event.extendedProps?.room && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Room</div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{event.extendedProps.room}</span>
              </div>
            </div>
          )} */}

          {/* Entry Type */}
          {isClass && event.extendedProps?.entryType && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Type</div>
              <Badge variant="secondary">
                {event.extendedProps.entryType}
              </Badge>
            </div>
          )}

          {/* Credits (for classes) */}
          {isClass && event.extendedProps?.credits && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Credits</div>
              <span>{event.extendedProps.credits}</span>
            </div>
          )}

          {/* Description/Notes */}
          {(event.extendedProps?.notes || event.extendedProps?.holidayDescription) && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">
                {isHoliday ? 'Description' : 'Notes'}
              </div>
              <div className="text-sm text-muted-foreground">
                {event.extendedProps?.notes || event.extendedProps?.holidayDescription}
              </div>
            </div>
          )}

          {/* Holiday Type */}
          {isHoliday && event.extendedProps?.holidayType && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Holiday Type</div>
              <Badge variant={event.extendedProps.holidayType === 'MANDATORY' ? 'destructive' : 'secondary'}>
                {event.extendedProps.holidayType}
              </Badge>
            </div>
          )}

          {/* Attendance Status (for classes) */}
          {isClass && event.extendedProps?.attendance?.isMarked && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Attendance</div>
              <div className="flex items-center gap-2">
                <div className="text-sm">
                  {event.extendedProps.attendance.presentStudents}/{event.extendedProps.attendance.totalStudents} students present
                </div>
                <Badge variant="outline">
                  {event.extendedProps.attendance.attendancePercentage}%
                </Badge>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}