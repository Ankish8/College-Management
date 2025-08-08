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
  XCircle,
  Users,
  UserX
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
  onRefresh?: () => void
  canEdit?: boolean
  canDelete?: boolean
  canMarkAttendance?: boolean
}

export function TimetableEntryContextMenu({
  event,
  children,
  onEdit,
  onDelete,
  onRefresh,
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

  const handleBulkAttendance = async (status: 'present' | 'absent', scope: 'slot' | 'fullday') => {
    if (eventType !== 'class' || !event.extendedProps?.subjectId || !event.extendedProps?.batchId) {
      return
    }

    try {
      const dateStr = new Date(event.start).toISOString().split('T')[0]
      const response = await fetch('/api/timetable/bulk-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: event.extendedProps.batchId,
          subjectId: event.extendedProps.subjectId,
          date: dateStr,
          status,
          scope,
          timeSlotId: event.extendedProps.timeSlotId
        })
      })

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        })
        
        // Refresh the calendar view
        if (onRefresh) {
          onRefresh()
        } else {
          router.refresh()
        }
      } else {
        throw new Error(result.error || 'Failed to mark attendance')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark attendance. Please try again.",
        variant: "destructive"
      })
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
                <>
                  <ContextMenuItem 
                    onClick={() => handleBulkAttendance('present', 'slot')}
                    className="flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Mark All Present
                  </ContextMenuItem>
                  <ContextMenuItem 
                    onClick={() => handleBulkAttendance('absent', 'slot')}
                    className="flex items-center gap-2"
                  >
                    <UserX className="h-4 w-4" />
                    Mark All Absent
                  </ContextMenuItem>
                  <ContextMenuItem 
                    onClick={() => handleBulkAttendance('present', 'fullday')}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    All Present - Full Day
                  </ContextMenuItem>
                  <ContextMenuItem 
                    onClick={() => handleBulkAttendance('absent', 'fullday')}
                    className="flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    All Absent - Full Day
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                </>
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