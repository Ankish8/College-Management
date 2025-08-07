"use client"

import { useState } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { 
  Pencil, 
  Trash2, 
  Calendar,
  Info,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { CalendarEvent } from '@/types/timetable'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { EventDetailsModal } from './event-details-modal'
import { EventEditModal } from './event-edit-modal'

interface TimetableEntryContextMenuProps {
  event: CalendarEvent
  children: React.ReactNode
  onEdit?: (event: CalendarEvent) => void
  onDelete?: (event: CalendarEvent) => void
  onMarkAttendance?: (event: CalendarEvent) => void
  canEdit?: boolean
  canDelete?: boolean
  canMarkAttendance?: boolean
}

export function TimetableEntryContextMenu({
  event,
  children,
  onEdit,
  onDelete,
  onMarkAttendance,
  canEdit = true,
  canDelete = true,
  canMarkAttendance = false
}: TimetableEntryContextMenuProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  
  // Determine event type
  const eventType = event.extendedProps?.type || (event.allDay ? 'holiday' : 'class')

  const handleViewDetails = () => {
    setShowDetailsModal(true)
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit(event)
    } else {
      setShowEditModal(true)
    }
  }

  const handleDelete = async () => {
    if (onDelete) {
      onDelete(event)
    } else {
      // Confirm deletion
      if (!confirm(`Are you sure you want to delete this ${eventType === 'holiday' ? 'holiday' : eventType === 'custom' ? 'event' : 'class'}?`)) {
        return
      }

      try {
        // Use the correct ID for holidays
        const deleteId = eventType === 'holiday' 
          ? event.extendedProps?.holidayId || event.id
          : event.id
          
        const endpoint = eventType === 'holiday' 
          ? `/api/settings/holidays/${deleteId}`
          : `/api/timetable/entries/${deleteId}`

        const response = await fetch(endpoint, {
          method: 'DELETE',
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to delete entry')
        }

        toast({
          title: "Success",
          description: `${eventType === 'holiday' ? 'Holiday' : eventType === 'custom' ? 'Event' : 'Class'} deleted successfully`,
        })

        // Refresh the page to show updated data
        router.refresh()
      } catch (error) {
        console.error('Delete operation failed:', error)
        toast({
          title: "Error",
          description: "Failed to delete entry. Please try again.",
          variant: "destructive"
        })
      }
    }
  }

  const handleMarkAttendance = () => {
    if (onMarkAttendance) {
      onMarkAttendance(event)
    } else if (eventType === 'class' && event.extendedProps?.subjectId && event.extendedProps?.batchId) {
      // Navigate to attendance page for this specific class
      const dateStr = new Date(event.start).toISOString().split('T')[0]
      router.push(`/dashboard/attendance?batchId=${event.extendedProps.batchId}&subjectId=${event.extendedProps.subjectId}&date=${dateStr}`)
    }
  }

  const handleCancelClass = async () => {
    try {
      const response = await fetch(`/api/timetable/entries/${event.id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelled: true })
      })

      if (!response.ok) {
        throw new Error('Failed to cancel class')
      }

      toast({
        title: "Class Cancelled",
        description: `${event.title || event.extendedProps?.subjectName} has been marked as cancelled`,
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel class. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleReschedule = () => {
    toast({
      title: "Reschedule",
      description: "Reschedule feature coming soon!",
    })
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56 z-[9999]">
          <ContextMenuItem 
            onClick={handleViewDetails}
            className="flex items-center gap-2"
          >
            <Info className="h-4 w-4" />
            View Details
          </ContextMenuItem>
          
          {canEdit && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem 
                onClick={handleEdit}
                className="flex items-center gap-2"
              >
                <Pencil className="h-4 w-4" />
                Edit {eventType === 'holiday' ? 'Holiday' : eventType === 'custom' ? 'Event' : 'Class'}
              </ContextMenuItem>
            </>
          )}

          {eventType === 'class' && (
            <>
              <ContextMenuSeparator />
              {canMarkAttendance && (
                <ContextMenuItem 
                  onClick={handleMarkAttendance}
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark Attendance
                </ContextMenuItem>
              )}
              <ContextMenuItem 
                onClick={handleCancelClass}
                className="flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Cancel Class
              </ContextMenuItem>
              <ContextMenuItem 
                onClick={handleReschedule}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Reschedule
              </ContextMenuItem>
            </>
          )}

          {canDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem 
                onClick={handleDelete}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Delete {eventType === 'holiday' ? 'Holiday' : eventType === 'custom' ? 'Event' : 'Entry'}
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Modals */}
      <EventDetailsModal
        event={event}
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
      />
      
      <EventEditModal
        event={event}
        open={showEditModal}
        onOpenChange={setShowEditModal}
      />
    </>
  )
}